import nodemailer from 'nodemailer';
import { query } from '@/lib/db';
import { formatIDR } from '@/lib/format';

// ─── Transport ────────────────────────────────────────────────────────────────

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Replace every {key} in content with the matching value in vars. */
export function renderTemplate(content: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce(
    (out, [k, v]) => out.replace(new RegExp(`\\{${k}\\}`, 'g'), v ?? ''),
    content
  );
}

/** Send a single email. Throws on failure. */
export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM ?? process.env.GMAIL_USER,
    to,
    subject,
    html,
  });
}

// ─── Notification helper ──────────────────────────────────────────────────────

/**
 * Fetch invoice + payment data, render the `payment_paid` template,
 * send the email, and mark `is_email_paid_sent = true`.
 *
 * Designed to be called AFTER the DB transaction that sets status = PAID.
 * Swallows errors so a failing email never rolls back the status change.
 */
export async function sendPaidEmail(invoiceId: number, invoiceCreatedAt: string) {
  try {
    // 1. Fetch invoice + payment method + concatenated instructions
    const res = await query(
      `SELECT
         i.donor_name_snapshot  AS nama,
         i.donor_email,
         i.invoice_code,
         i.base_amount          AS nominal,
         i.total_amount         AS total_transfer,
         i.va_number,
         pm.name                AS metode,
         pm.name                AS bank_name,
         COALESCE(
           (SELECT string_agg(pi2.content, E'\\n' ORDER BY pi2.sort_order)
            FROM payment_instructions pi2
            WHERE pi2.payment_method_id = i.payment_method_id),
           ''
         ) AS instruksi
       FROM invoices i
       LEFT JOIN payment_methods pm ON pm.id = i.payment_method_id
       WHERE i.id = $1 AND i.created_at = $2`,
      [invoiceId, invoiceCreatedAt]
    );

    if (res.rows.length === 0) {
      console.warn(`[email] Invoice ${invoiceId} not found — skipping email`);
      return;
    }

    const inv = res.rows[0];

    if (!inv.donor_email) {
      console.info(`[email] Invoice ${inv.invoice_code} has no donor email — skipping`);
      return;
    }

    // 2. Fetch active template
    const tplRes = await query(
      `SELECT subject, message_content
       FROM notification_templates
       WHERE event_trigger = 'payment_paid' AND channel = 'EMAIL' AND is_active = true
       LIMIT 1`
    );

    if (tplRes.rows.length === 0) {
      console.warn(`[email] No active payment_paid template — skipping email for ${inv.invoice_code}`);
      return;
    }

    const tpl = tplRes.rows[0];

    // 3. Render & send
    const vars: Record<string, string> = {
      nama:           inv.nama ?? '',
      invoice_code:   inv.invoice_code ?? '',
      nominal:        formatIDR(Number(inv.nominal)),
      total_transfer: formatIDR(Number(inv.total_transfer)),
      metode:         inv.metode ?? '',
      va_number:      inv.va_number ?? '',
      bank_name:      inv.bank_name ?? '',
      instruksi:      inv.instruksi ?? '',
    };

    const html    = renderTemplate(tpl.message_content, vars);
    const subject = renderTemplate(tpl.subject, vars);

    await sendEmail({ to: inv.donor_email, subject, html });

    // 4. Mark sent
    await query(
      `UPDATE invoices SET is_email_paid_sent = true WHERE id = $1 AND created_at = $2`,
      [invoiceId, invoiceCreatedAt]
    );

    console.info(`[email] payment_paid sent to ${inv.donor_email} (${inv.invoice_code})`);
  } catch (err) {
    console.error(`[email] Failed to send payment_paid for invoice ${invoiceId}:`, err);
    // Intentionally swallowed — email failure must not affect invoice status
  }
}

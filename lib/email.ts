import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

interface Attachment {
  filename: string;
  content: Buffer;
  contentType: string;
}

export async function sendEmail({
  to,
  subject,
  html,
  attachments,
}: {
  to: string;
  subject: string;
  html: string;
  attachments?: Attachment[];
}) {
  const from = process.env.EMAIL_FROM || `"LAZ Darul Hikam" <${process.env.GMAIL_USER}>`;
  await transporter.sendMail({ from, to, subject, html, attachments });
}

export function renderTemplate(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce(
    (str, [key, value]) => str.replaceAll(`{${key}}`, value ?? ''),
    template
  );
}

export function buildPaidEmailHtml(vars: {
  nama: string;
  invoice_code: string;
  nominal: string;
  metode: string;
  tanggal: string;
  program: string;
}): { subject: string; html: string } {
  const subject = `Konfirmasi Donasi Berhasil - ${vars.invoice_code}`;
  const html = `<!DOCTYPE html>
<html lang="id">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:sans-serif">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table width="100%" style="max-width:560px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)">
  <tr><td style="background:#1a6b3a;padding:32px 32px 24px;text-align:center">
    <p style="margin:0;color:#fff;font-size:22px;font-weight:700">LAZ Darul Hikam</p>
    <p style="margin:8px 0 0;color:rgba(255,255,255,.8);font-size:13px">Donasi Anda Telah Diterima</p>
  </td></tr>
  <tr><td style="padding:32px">
    <p style="margin:0 0 8px;color:#374151;font-size:15px">Assalamu'alaikum, <strong>${vars.nama}</strong></p>
    <p style="margin:0 0 24px;color:#6b7280;font-size:14px">Jazakumullahu khairan atas donasi Anda. Berikut detail konfirmasi pembayaran:</p>
    <table width="100%" style="border-collapse:collapse;font-size:14px">
      <tr><td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#6b7280">No. Invoice</td><td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#111827;font-weight:600;text-align:right">${vars.invoice_code}</td></tr>
      <tr><td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#6b7280">Program</td><td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#111827;text-align:right">${vars.program}</td></tr>
      <tr><td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#6b7280">Metode Pembayaran</td><td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#111827;text-align:right">${vars.metode}</td></tr>
      <tr><td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#6b7280">Tanggal</td><td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#111827;text-align:right">${vars.tanggal}</td></tr>
      <tr><td style="padding:14px 0 0;color:#6b7280">Total Donasi</td><td style="padding:14px 0 0;color:#1a6b3a;font-size:18px;font-weight:700;text-align:right">${vars.nominal}</td></tr>
    </table>
    <p style="margin:24px 0 0;padding:16px;background:#f0fdf4;border-radius:10px;color:#166534;font-size:13px;text-align:center">
      Semoga Allah SWT memberikan pahala berlipat ganda atas kebaikan Anda.
    </p>
  </td></tr>
  <tr><td style="padding:16px 32px 24px;text-align:center;border-top:1px solid #f1f5f9">
    <p style="margin:0;color:#9ca3af;font-size:12px">LAZ Darul Hikam &bull; lazdarulhikam.com</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
  return { subject, html };
}

import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import dotenv from 'dotenv';

neonConfig.webSocketConstructor = ws;
dotenv.config();
dotenv.config({ path: '.env.local' });

const CHECKOUT_PENDING_HTML = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
  <div style="background: #83b64e; padding: 32px 24px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 22px;">Konfirmasi Donasi Anda</h1>
  </div>
  <div style="background: #ffffff; padding: 32px 24px; border: 1px solid #e5e7eb; border-top: none;">
    <p>Assalamu'alaikum <strong>{nama}</strong>,</p>
    <p>Terima kasih telah berdonasi. Berikut detail pembayaran Anda:</p>

    <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 8px 0; color: #6b7280; font-size: 13px;">Kode Invoice</td><td style="padding: 8px 0; font-weight: bold; text-align: right;">{invoice_code}</td></tr>
        <tr><td style="padding: 8px 0; color: #6b7280; font-size: 13px;">Nominal Donasi</td><td style="padding: 8px 0; font-weight: bold; text-align: right;">{nominal}</td></tr>
        <tr><td style="padding: 8px 0; color: #6b7280; font-size: 13px;">Kode Unik</td><td style="padding: 8px 0; text-align: right;">(sudah termasuk)</td></tr>
        <tr style="border-top: 2px solid #e5e7eb;"><td style="padding: 12px 0; font-weight: bold;">Total Transfer</td><td style="padding: 12px 0; font-weight: bold; text-align: right; color: #83b64e; font-size: 18px;">{total_transfer}</td></tr>
      </table>
    </div>

    <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <p style="margin: 0 0 8px 0; font-weight: bold; color: #1d4ed8;">Instruksi Pembayaran via {metode}</p>
      <p style="margin: 0 0 8px 0; color: #374151; font-size: 14px;"><strong>Nomor Rekening / VA:</strong> <span style="font-size: 20px; font-weight: bold; letter-spacing: 2px; color: #1d4ed8;">{va_number}</span></p>
      <p style="margin: 0 0 8px 0; color: #374151; font-size: 14px;"><strong>Bank:</strong> {bank_name}</p>
      <div style="margin-top: 12px; font-size: 13px; color: #374151; white-space: pre-line;">{instruksi}</div>
    </div>

    <p style="font-size: 13px; color: #6b7280;">Pastikan jumlah transfer sesuai dengan total di atas agar donasi Anda dapat diverifikasi otomatis.</p>
    <p style="font-size: 13px; color: #6b7280;">Jika ada pertanyaan, hubungi kami melalui kontak yang tertera di website.</p>
  </div>
  <div style="background: #f9fafb; padding: 16px 24px; text-align: center; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="margin: 0; font-size: 12px; color: #9ca3af;">LAZ Darul Hikam — Bersama Membantu Sesama</p>
  </div>
</div>
`.trim();

const PAYMENT_PAID_HTML = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
  <div style="background: #83b64e; padding: 32px 24px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 22px;">✅ Pembayaran Diterima</h1>
  </div>
  <div style="background: #ffffff; padding: 32px 24px; border: 1px solid #e5e7eb; border-top: none;">
    <p>Assalamu'alaikum <strong>{nama}</strong>,</p>
    <p>Alhamdulillah, pembayaran Anda telah kami terima. Semoga donasi Anda menjadi amal jariyah yang berkah.</p>

    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 8px 0; color: #6b7280; font-size: 13px;">Kode Invoice</td><td style="padding: 8px 0; font-weight: bold; text-align: right;">{invoice_code}</td></tr>
        <tr><td style="padding: 8px 0; color: #6b7280; font-size: 13px;">Jumlah Donasi</td><td style="padding: 8px 0; font-weight: bold; text-align: right; color: #16a34a;">{nominal}</td></tr>
        <tr><td style="padding: 8px 0; color: #6b7280; font-size: 13px;">Metode Pembayaran</td><td style="padding: 8px 0; text-align: right;">{metode}</td></tr>
      </table>
    </div>

    <p style="font-size: 13px; color: #6b7280;">Jazakumullah khairan atas kepercayaan Anda. Donasi Anda akan segera kami salurkan kepada yang membutuhkan.</p>
  </div>
  <div style="background: #f9fafb; padding: 16px 24px; text-align: center; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="margin: 0; font-size: 12px; color: #9ca3af;">LAZ Darul Hikam — Bersama Membantu Sesama</p>
  </div>
</div>
`.trim();

const DONATION_REMINDER_HTML = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
  <div style="background: #f59e0b; padding: 32px 24px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 22px;">⏰ Reminder Pembayaran</h1>
  </div>
  <div style="background: #ffffff; padding: 32px 24px; border: 1px solid #e5e7eb; border-top: none;">
    <p>Assalamu'alaikum <strong>{nama}</strong>,</p>
    <p>Kami ingin mengingatkan bahwa donasi Anda dengan kode <strong>{invoice_code}</strong> belum diselesaikan.</p>

    <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 8px 0; color: #6b7280; font-size: 13px;">Kode Invoice</td><td style="padding: 8px 0; font-weight: bold; text-align: right;">{invoice_code}</td></tr>
        <tr><td style="padding: 8px 0; color: #6b7280; font-size: 13px;">Total Transfer</td><td style="padding: 8px 0; font-weight: bold; text-align: right; color: #d97706;">{total_transfer}</td></tr>
        <tr><td style="padding: 8px 0; color: #6b7280; font-size: 13px;">Metode</td><td style="padding: 8px 0; text-align: right;">{metode}</td></tr>
      </table>
    </div>

    <p style="font-size: 13px; color: #6b7280;">Segera selesaikan pembayaran Anda agar donasi dapat disalurkan.</p>
  </div>
  <div style="background: #f9fafb; padding: 16px 24px; text-align: center; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="margin: 0; font-size: 12px; color: #9ca3af;">LAZ Darul Hikam — Bersama Membantu Sesama</p>
  </div>
</div>
`.trim();

const templates = [
  {
    event_trigger: 'checkout_pending',
    channel: 'EMAIL',
    subject: 'Instruksi Pembayaran Donasi Anda - {invoice_code}',
    message_content: CHECKOUT_PENDING_HTML,
    is_active: true,
  },
  {
    event_trigger: 'payment_paid',
    channel: 'EMAIL',
    subject: 'Pembayaran Diterima - Terima Kasih atas Donasi Anda',
    message_content: PAYMENT_PAID_HTML,
    is_active: true,
  },
  {
    event_trigger: 'donation_reminder',
    channel: 'EMAIL',
    subject: 'Reminder: Selesaikan Pembayaran Donasi Anda - {invoice_code}',
    message_content: DONATION_REMINDER_HTML,
    is_active: true,
  },
];

async function seed() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL is not set.');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    console.log('⏳ Seeding notification templates...');

    for (const t of templates) {
      await pool.query(
        `INSERT INTO notification_templates (event_trigger, channel, subject, message_content, is_active)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (event_trigger) DO NOTHING`,
        [t.event_trigger, t.channel, t.subject, t.message_content, t.is_active]
      );
      console.log(`  ✅ ${t.event_trigger} — inserted (or already exists, skipped)`);
    }

    console.log('✅ Seeding complete. No data was dropped or deleted.');
  } finally {
    await pool.end();
  }
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});

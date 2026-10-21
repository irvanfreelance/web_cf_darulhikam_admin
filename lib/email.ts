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

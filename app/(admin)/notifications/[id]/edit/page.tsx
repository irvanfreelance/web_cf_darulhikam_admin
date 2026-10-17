import { query } from '@/lib/db';
import { notFound } from 'next/navigation';
import { NotificationTemplateForm } from '../../NotificationTemplateForm';

export default async function EditNotificationTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await query('SELECT * FROM notification_templates WHERE id = $1', [id]);
  if (res.rowCount === 0) notFound();

  const template = res.rows[0];

  return (
    <NotificationTemplateForm
      mode="edit"
      initialData={{
        id: template.id,
        event_trigger: template.event_trigger,
        channel: template.channel,
        subject: template.subject || '',
        message_content: template.message_content,
        is_active: template.is_active,
      }}
    />
  );
}

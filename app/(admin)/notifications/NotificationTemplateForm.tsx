"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Loader2, ArrowLeft, Info, Code, Eye, Monitor } from 'lucide-react';
import { toast } from 'sonner';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface FormData {
  event_trigger: string;
  channel: string;
  subject: string;
  message_content: string;
  is_active: boolean;
}

interface Props {
  initialData?: Partial<FormData> & { id?: number };
  mode: 'create' | 'edit';
}

const VARIABLES = ['{nama}', '{nominal}', '{invoice_code}', '{metode}', '{va_number}', '{bank_name}', '{rekening}', '{instruksi}', '{total_transfer}'];

export function NotificationTemplateForm({ initialData, mode }: Props) {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    event_trigger: initialData?.event_trigger || '',
    channel: initialData?.channel || 'EMAIL',
    subject: initialData?.subject || '',
    message_content: initialData?.message_content || '',
    is_active: initialData?.is_active ?? true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  // 'visual' | 'html' | 'preview'
  const [editorMode, setEditorMode] = useState<'visual' | 'html' | 'preview'>('visual');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const method = mode === 'edit' ? 'PATCH' : 'POST';
      const body = mode === 'edit' ? { id: initialData?.id, ...formData } : formData;
      const res = await fetch('/api/notification-templates', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save template');
      }
      toast.success(mode === 'edit' ? 'Template diperbarui' : 'Template berhasil dibuat');
      router.push('/notifications');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isEmail = formData.channel === 'EMAIL';

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push('/notifications')}
          className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-normal text-slate-800 tracking-tight">
            {mode === 'edit' ? 'Edit Template Notifikasi' : 'Buat Template Baru'}
          </h1>
          <p className="text-sm text-slate-400 font-medium mt-1">
            {mode === 'edit' ? `Mengubah template #${initialData?.id}` : 'Template baru untuk sistem notifikasi'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-8 space-y-6">
          {/* Event trigger + channel */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-2 uppercase tracking-widest">Event trigger</label>
              <input
                required
                value={formData.event_trigger}
                onChange={(e) => setFormData({ ...formData, event_trigger: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-normal text-slate-900 placeholder:text-slate-300 outline-none focus:border-blue-500 transition-all"
                placeholder="Cth: checkout_pending"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-2 uppercase tracking-widest">Channel</label>
              <select
                value={formData.channel}
                onChange={(e) => setFormData({ ...formData, channel: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-normal text-slate-900 outline-none focus:border-blue-500 transition-all"
              >
                <option value="EMAIL">EMAIL</option>
                <option value="WHATSAPP">WHATSAPP</option>
                <option value="SMS">SMS</option>
              </select>
            </div>
          </div>

          {/* Subject (email only) */}
          {isEmail && (
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-2 uppercase tracking-widest">Subject email</label>
              <input
                required={isEmail}
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-normal text-slate-900 placeholder:text-slate-300 outline-none focus:border-blue-500 transition-all"
                placeholder="Cth: Konfirmasi donasi Anda - {invoice_code}"
              />
            </div>
          )}

          {/* Message content */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
                {isEmail ? 'Body email (HTML)' : 'Konten pesan'}
              </label>
              {isEmail && (
                <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
                  {([
                    { key: 'visual' as const,   icon: <Eye size={11} />,     label: 'Visual' },
                    { key: 'html' as const,      icon: <Code size={11} />,    label: 'HTML' },
                    { key: 'preview' as const,   icon: <Monitor size={11} />, label: 'Preview' },
                  ]).map(({ key, icon, label }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setEditorMode(key)}
                      className={cn(
                        "flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all",
                        editorMode === key
                          ? "bg-white text-slate-800 shadow-sm"
                          : "text-slate-400 hover:text-slate-600"
                      )}
                    >
                      {icon}{label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {isEmail ? (
              editorMode === 'visual' ? (
                <RichTextEditor
                  value={formData.message_content}
                  onChange={(v) => setFormData({ ...formData, message_content: v })}
                  placeholder="Tulis isi email di sini..."
                />
              ) : editorMode === 'html' ? (
                <textarea
                  required
                  rows={12}
                  value={formData.message_content}
                  onChange={(e) => setFormData({ ...formData, message_content: e.target.value })}
                  className="w-full bg-slate-950 text-green-300 border border-slate-700 rounded-xl py-4 px-4 text-xs font-mono leading-relaxed outline-none focus:border-blue-500 transition-all"
                  placeholder="<p>Gunakan HTML untuk memformat email...</p>"
                />
              ) : (
                /* Preview mode: render HTML in sandboxed iframe */
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                  <div className="px-4 py-2 bg-slate-100 border-b border-slate-200 flex items-center gap-2 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                    <Monitor size={11} /> Tampilan email sebenarnya
                  </div>
                  <iframe
                    srcDoc={formData.message_content || '<p style="font-family:sans-serif;padding:24px;color:#6b7280">Belum ada konten</p>'}
                    sandbox="allow-same-origin"
                    className="w-full border-0"
                    style={{ height: '500px' }}
                    title="Email Preview"
                  />
                </div>
              )
            ) : (
              <textarea
                required
                rows={6}
                value={formData.message_content}
                onChange={(e) => setFormData({ ...formData, message_content: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 px-4 text-sm font-normal text-slate-900 leading-relaxed outline-none focus:border-blue-500 transition-all font-sans"
                placeholder="Gunakan variabel seperti {nama}, {nominal}, dll..."
              />
            )}
          </div>

          {/* Variable hints */}
          <div className="flex items-start gap-2 text-blue-600 bg-blue-50 p-4 rounded-xl border border-blue-100 shadow-sm">
            <Info size={16} className="shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] font-semibold mb-2 uppercase tracking-widest">Variabel yang tersedia</p>
              <div className="flex flex-wrap gap-1.5">
                {VARIABLES.map((v) => (
                  <code
                    key={v}
                    className="text-[10px] font-mono bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md border border-blue-200 cursor-pointer hover:bg-blue-200 transition-colors"
                    onClick={() => {
                      // Only append in html or non-email mode (visual editor handles its own cursor)
                      if (isEmail && editorMode === 'visual') return;
                      setFormData((prev) => ({ ...prev, message_content: prev.message_content + v }));
                    }}
                  >
                    {v}
                  </code>
                ))}
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
              className={cn(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                formData.is_active ? "bg-emerald-500" : "bg-slate-200"
              )}
            >
              <span className={cn(
                "inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow",
                formData.is_active ? "translate-x-6" : "translate-x-1"
              )} />
            </button>
            <span className="text-sm text-slate-600 font-normal">
              Template {formData.is_active ? 'aktif' : 'nonaktif'}
            </span>
          </div>
        </div>

        <div className="px-8 py-6 bg-slate-50/50 border-t border-slate-100 flex gap-3">
          <button
            type="button"
            onClick={() => router.push('/notifications')}
            className="flex-1 py-3 px-6 rounded-2xl text-sm font-normal text-slate-400 hover:text-slate-600 border border-slate-200 hover:bg-white transition-all"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-[2] bg-blue-600 text-white py-4 px-6 rounded-2xl text-sm font-normal shadow-xl shadow-blue-500/30 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-60"
          >
            {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} Simpan template
          </button>
        </div>
      </form>
    </div>
  );
}

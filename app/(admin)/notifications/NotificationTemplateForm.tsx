"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Loader2, ArrowLeft, Info, Code, Eye, Monitor, Bold, Italic, Underline, List, ListOrdered, Table, Heading2, Heading3, Link } from 'lucide-react';
import { toast } from 'sonner';
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
  // ref for contenteditable visual editor — avoids React re-render conflicts
  const visualEditorRef = useRef<HTMLDivElement>(null);
  const colorPickerRef = useRef<HTMLInputElement>(null);
  // save selection before color picker opens (focus leaves editor)
  const savedRangeRef = useRef<Range | null>(null);

  // Sync HTML into contenteditable when switching TO visual mode
  useEffect(() => {
    if (editorMode === 'visual' && visualEditorRef.current) {
      visualEditorRef.current.innerHTML = formData.message_content;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editorMode]);

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
                /* Visual mode: contenteditable renders inline-styled HTML as-is.
                   User edits text visually; innerHTML (with all styles intact) is saved back. */
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                  {/* Toolbar */}
                  <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center gap-1">
                    {[
                      { icon: <Bold size={13} />, cmd: 'bold', title: 'Bold' },
                      { icon: <Italic size={13} />, cmd: 'italic', title: 'Italic' },
                      { icon: <Underline size={13} />, cmd: 'underline', title: 'Underline' },
                    ].map(({ icon, cmd, title }) => (
                      <button
                        key={cmd}
                        type="button"
                        title={title}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          document.execCommand(cmd, false);
                          if (visualEditorRef.current) {
                            setFormData(prev => ({ ...prev, message_content: visualEditorRef.current!.innerHTML }));
                          }
                        }}
                        className="p-1.5 rounded hover:bg-slate-200 text-slate-600 transition-colors"
                      >
                        {icon}
                      </button>
                    ))}
                    <div className="w-px h-4 bg-slate-300 mx-1" />
                    <button
                      type="button"
                      title="Heading 2"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        document.execCommand('formatBlock', false, 'h2');
                        if (visualEditorRef.current) {
                          setFormData(prev => ({ ...prev, message_content: visualEditorRef.current!.innerHTML }));
                        }
                      }}
                      className="p-1.5 rounded hover:bg-slate-200 text-slate-600 transition-colors"
                    >
                      <Heading2 size={13} />
                    </button>
                    <button
                      type="button"
                      title="Heading 3"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        document.execCommand('formatBlock', false, 'h3');
                        if (visualEditorRef.current) {
                          setFormData(prev => ({ ...prev, message_content: visualEditorRef.current!.innerHTML }));
                        }
                      }}
                      className="p-1.5 rounded hover:bg-slate-200 text-slate-600 transition-colors"
                    >
                      <Heading3 size={13} />
                    </button>
                    <div className="w-px h-4 bg-slate-300 mx-1" />
                    <button
                      type="button"
                      title="Bullet list"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        document.execCommand('insertUnorderedList', false);
                        if (visualEditorRef.current) {
                          setFormData(prev => ({ ...prev, message_content: visualEditorRef.current!.innerHTML }));
                        }
                      }}
                      className="p-1.5 rounded hover:bg-slate-200 text-slate-600 transition-colors"
                    >
                      <List size={13} />
                    </button>
                    <button
                      type="button"
                      title="Numbered list"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        document.execCommand('insertOrderedList', false);
                        if (visualEditorRef.current) {
                          setFormData(prev => ({ ...prev, message_content: visualEditorRef.current!.innerHTML }));
                        }
                      }}
                      className="p-1.5 rounded hover:bg-slate-200 text-slate-600 transition-colors"
                    >
                      <ListOrdered size={13} />
                    </button>
                    <div className="w-px h-4 bg-slate-300 mx-1" />
                    <button
                      type="button"
                      title="Insert table 3×3"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        const table = `<table style="border-collapse:collapse;width:100%;margin:8px 0"><thead><tr>${Array(3).fill('<th style="border:1px solid #cbd5e1;padding:6px 10px;background:#f8fafc;font-size:12px;text-align:left">Judul</th>').join('')}</tr></thead><tbody>${Array(2).fill(`<tr>${Array(3).fill('<td style="border:1px solid #cbd5e1;padding:6px 10px;font-size:12px">Isi</td>').join('')}</tr>`).join('')}</tbody></table>`;
                        document.execCommand('insertHTML', false, table);
                        if (visualEditorRef.current) {
                          setFormData(prev => ({ ...prev, message_content: visualEditorRef.current!.innerHTML }));
                        }
                      }}
                      className="p-1.5 rounded hover:bg-slate-200 text-slate-600 transition-colors"
                    >
                      <Table size={13} />
                    </button>
                    <button
                      type="button"
                      title="Insert link"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        const url = prompt('URL link:');
                        if (url) {
                          document.execCommand('createLink', false, url);
                          if (visualEditorRef.current) {
                            setFormData(prev => ({ ...prev, message_content: visualEditorRef.current!.innerHTML }));
                          }
                        }
                      }}
                      className="p-1.5 rounded hover:bg-slate-200 text-slate-600 transition-colors"
                    >
                      <Link size={13} />
                    </button>
                    <div className="w-px h-4 bg-slate-300 mx-1" />
                    {/* Font color picker */}
                    <div className="relative" title="Warna teks">
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          // save current selection before focus leaves editor
                          const sel = window.getSelection();
                          if (sel && sel.rangeCount > 0) {
                            savedRangeRef.current = sel.getRangeAt(0).cloneRange();
                          }
                          colorPickerRef.current?.click();
                        }}
                        className="p-1.5 rounded hover:bg-slate-200 text-slate-600 transition-colors flex flex-col items-center gap-0.5"
                      >
                        <span className="text-[11px] font-bold leading-none">A</span>
                        <span
                          className="w-3.5 h-1 rounded-full"
                          style={{ background: colorPickerRef.current?.value || '#000000' }}
                        />
                      </button>
                      <input
                        ref={colorPickerRef}
                        type="color"
                        defaultValue="#000000"
                        className="absolute opacity-0 w-0 h-0 pointer-events-none"
                        onChange={(e) => {
                          const color = e.target.value;
                          // restore selection then apply color
                          if (savedRangeRef.current) {
                            const sel = window.getSelection();
                            sel?.removeAllRanges();
                            sel?.addRange(savedRangeRef.current);
                          }
                          document.execCommand('foreColor', false, color);
                          if (visualEditorRef.current) {
                            setFormData(prev => ({ ...prev, message_content: visualEditorRef.current!.innerHTML }));
                          }
                        }}
                      />
                    </div>
                    <div className="ml-auto text-[10px] font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                      <Eye size={11} /> Klik teks untuk mengedit
                    </div>
                  </div>
                  {/* Info: warna yang tampil = warna asli email */}
                  <div className="px-3 py-1.5 bg-amber-50 border-b border-amber-100 flex items-center gap-2 text-[10px] text-amber-700">
                    <Info size={11} className="shrink-0" />
                    Warna teks di sini = warna yang diterima di inbox. Teks abu-abu akan tetap abu-abu. Klik <strong>Preview</strong> untuk verifikasi tampilan akhir sebelum simpan.
                  </div>
                  <div
                    ref={visualEditorRef}
                    contentEditable
                    suppressContentEditableWarning
                    onInput={() => {
                      if (visualEditorRef.current) {
                        setFormData(prev => ({ ...prev, message_content: visualEditorRef.current!.innerHTML }));
                      }
                    }}
                    className="w-full min-h-[480px] outline-none focus:ring-2 focus:ring-inset focus:ring-blue-200 p-2"
                    style={{ lineHeight: 'normal' }}
                  />
                </div>
              ) : editorMode === 'html' ? (
                <textarea
                  required
                  rows={14}
                  value={formData.message_content}
                  onChange={(e) => setFormData({ ...formData, message_content: e.target.value })}
                  className="w-full bg-slate-950 text-green-300 border border-slate-700 rounded-xl py-4 px-4 text-xs font-mono leading-relaxed outline-none focus:border-blue-500 transition-all"
                  placeholder="<p>Gunakan HTML untuk memformat email...</p>"
                  spellCheck={false}
                />
              ) : (
                /* Preview mode: render HTML in sandboxed iframe — exact email render */
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                  <div className="px-4 py-2 bg-slate-100 border-b border-slate-200 flex items-center gap-2 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                    <Monitor size={11} /> Tampilan email sebenarnya
                  </div>
                  <iframe
                    srcDoc={formData.message_content || '<p style="font-family:sans-serif;padding:24px;color:#6b7280">Belum ada konten</p>'}
                    sandbox="allow-same-origin"
                    className="w-full border-0"
                    style={{ height: '520px' }}
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
                      if (isEmail && editorMode === 'visual') {
                        // Insert at cursor in contenteditable
                        const sel = window.getSelection();
                        if (sel && sel.rangeCount > 0) {
                          const range = sel.getRangeAt(0);
                          range.deleteContents();
                          range.insertNode(document.createTextNode(v));
                          range.collapse(false);
                          sel.removeAllRanges();
                          sel.addRange(range);
                        }
                        if (visualEditorRef.current) {
                          setFormData(prev => ({ ...prev, message_content: visualEditorRef.current!.innerHTML }));
                        }
                        return;
                      }
                      if (isEmail && editorMode === 'preview') return;
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

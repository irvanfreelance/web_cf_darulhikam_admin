"use client";

import React, { useState, useEffect } from 'react';
import useSWR, { mutate } from 'swr';
import { Settings as SettingsIcon, Globe, Save, Check, Bell, Plus, Edit, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileUpload } from '@/components/ui/file-upload';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function SettingsPage() {
  const { data: config, isLoading: configLoading } = useSWR('/api/ngo-config', fetcher);
  
  const [formData, setFormData] = useState({
    ngo_name: '', 
    short_description: '', 
    address: '', 
    legal_info: '',
    primary_color: '#1086b1', 
    logo_url: '',
    favicon_url: '',
    whatsapp_number: '',
    instagram_url: '',
    facebook_url: '',
    meta_pixel_id: '',
    meta_capi_token: '',
    google_ads_id: '',
    google_developer_token: '',
    tiktok_pixel_id: '',
    tiktok_events_api_token: '',
    google_analytic_id: ''
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Tabs state
  const [activeTab, setActiveTab] = useState<'UMUM' | 'USER' | 'PIXEL'>('UMUM');

  // Templates state
  const { data: templates, mutate: mutateTemplates } = useSWR('/api/notification-templates', fetcher);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [templateForm, setTemplateForm] = useState({ event_trigger: '', channel: 'WHATSAPP', message_content: '', is_active: true });

  // Pixel Events State
  const { data: pixelEvents, mutate: mutatePixelEvents, isLoading: pixelEventsLoading } = useSWR('/api/pixel-events', fetcher);
  const [isPixelModalOpen, setIsPixelModalOpen] = useState(false);
  const [editingPixel, setEditingPixel] = useState<any>(null);
  const [pixelForm, setPixelForm] = useState({ screen_name: '', meta_event: '', tiktok_event: '', google_event: '', is_active: true });

  // ── User Management State ──────────────────────────────────────────────
  const [adminSearch, setAdminSearch] = useState('');
  const [adminPage, setAdminPage] = useState(1);
  const adminLimit = 10;
  const adminOffset = (adminPage - 1) * adminLimit;

  const { data: adminsData, isLoading: adminsLoading, mutate: mutateAdmins } = useSWR(
    `/api/admins?limit=${adminLimit}&offset=${adminOffset}&search=${adminSearch}`,
    fetcher
  );
  const adminTotalCount = adminsData?.[0]?.total_count || 0;
  const adminTotalPages = Math.ceil(adminTotalCount / adminLimit);

  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<any>(null);
  const [adminForm, setAdminForm] = useState({ name: '', email: '', role: 'ADMIN', status: 'ACTIVE' });
  const [adminSubmitting, setAdminSubmitting] = useState(false);

  const handleOpenAdminModal = (admin: any = null) => {
    setEditingAdmin(admin);
    setAdminForm(admin
      ? { name: admin.name, email: admin.email, role: admin.role, status: admin.status }
      : { name: '', email: '', role: 'ADMIN', status: 'ACTIVE' }
    );
    setIsAdminModalOpen(true);
  };

  const handleSaveAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminSubmitting(true);
    try {
      const method = editingAdmin ? 'PATCH' : 'POST';
      const body = editingAdmin ? { id: editingAdmin.id, ...adminForm } : adminForm;
      const res = await fetch('/api/admins', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Gagal menyimpan data admin');
      toast.success(editingAdmin ? 'Akun admin diperbarui' : 'Admin baru berhasil didaftarkan');
      mutateAdmins();
      setIsAdminModalOpen(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setAdminSubmitting(false);
    }
  };

  const handleDeleteAdmin = (id: number) => {
    toast('Hapus akun admin ini?', {
      action: {
        label: 'Hapus',
        onClick: async () => {
          try {
            const res = await fetch(`/api/admins?id=${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Gagal menghapus admin');
            toast.success('Admin berhasil dihapus');
            mutateAdmins();
          } catch (err: any) {
            toast.error(err.message);
          }
        }
      }
    });
  };

  const handleOpenTemplate = (t: any = null) => {
    setEditingTemplate(t);
    setTemplateForm(t ? t : { event_trigger: '', channel: 'WHATSAPP', message_content: '', is_active: true });
    setIsTemplateModalOpen(true);
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const method = editingTemplate ? 'PATCH' : 'POST';
      const body = editingTemplate ? { id: editingTemplate.id, ...templateForm } : templateForm;
      const res = await fetch('/api/notification-templates', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error('Failed to save template');
      toast.success('Template disimpan');
      mutateTemplates();
      setIsTemplateModalOpen(false);
    } catch (err) {
      toast.error('Gagal menyimpan template');
    }
  };

  const handleDeleteTemplate = async (id: number) => {
    toast('Hapus template ini?', {
      action: {
        label: 'Hapus',
        onClick: async () => {
          await fetch(`/api/notification-templates?id=${id}`, { method: 'DELETE' });
          toast.success('Template dihapus');
          mutateTemplates();
        }
      }
    });
  };

  const handleOpenPixel = (p: any = null) => {
    setEditingPixel(p);
    setPixelForm(p ? p : { screen_name: '', meta_event: '', tiktok_event: '', google_event: '', is_active: true });
    setIsPixelModalOpen(true);
  };

  const handleSavePixel = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const method = editingPixel ? 'PATCH' : 'POST';
      const body = editingPixel ? { id: editingPixel.id, ...pixelForm } : pixelForm;
      const res = await fetch('/api/pixel-events', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error('Failed to save pixel event');
      toast.success('Pixel Event disimpan');
      mutatePixelEvents();
      setIsPixelModalOpen(false);
    } catch (err) {
      toast.error('Gagal menyimpan pixel event');
    }
  };

  const handleDeletePixel = async (id: number) => {
    toast('Hapus pixel event ini?', {
      action: {
        label: 'Hapus',
        onClick: async () => {
          await fetch(`/api/pixel-events?id=${id}`, { method: 'DELETE' });
          toast.success('Pixel Event dihapus');
          mutatePixelEvents();
        }
      }
    });
  };

  useEffect(() => {
    if (config && !configLoading) {
      setFormData({
        ngo_name: config.ngo_name || '',
        short_description: config.short_description || '',
        address: config.address || '',
        legal_info: config.legal_info || '',
        primary_color: config.primary_color || '#1086b1',
        logo_url: config.logo_url || '',
        favicon_url: config.favicon_url || '',
        whatsapp_number: config.whatsapp_number || '',
        instagram_url: config.instagram_url || '',
        facebook_url: config.facebook_url || '',
        meta_pixel_id: config.meta_pixel_id || '',
        meta_capi_token: config.meta_capi_token || '',
        google_ads_id: config.google_ads_id || '',
        google_developer_token: config.google_developer_token || '',
        tiktok_pixel_id: config.tiktok_pixel_id || '',
        tiktok_events_api_token: config.tiktok_events_api_token || '',
        google_analytic_id: config.google_analytic_id || ''
      });
    }
  }, [config, configLoading]);

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/ngo-config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        await mutate('/api/ngo-config');
        setSaved(true);
        toast.success('Pengaturan disimpan. Memperbarui halaman...');
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Gagal menyimpan ke server');
      }
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyimpan pengaturan');
    } finally {
      setSaving(false);
    }
  };

  const roleBadge = (role: string) => {
    if (role === 'SUPERADMIN') return 'bg-indigo-100 text-indigo-700 border-indigo-200';
    if (role === 'FINANCE') return 'bg-amber-100 text-amber-700 border-amber-200';
    return 'bg-slate-100 text-slate-600 border-slate-200';
  };

  const roleLabel = (role: string) => {
    if (role === 'SUPERADMIN') return 'Super Admin';
    if (role === 'FINANCE') return 'Finance';
    return 'Admin';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20 text-left">
      <PageHeader
        title="Pengaturan Sistem"
        description="Konfigurasi identitas organisasi secara umum"
      />

      <div className="flex border-b border-slate-100 bg-white p-2 rounded-2xl shadow-sm mb-6 gap-1">
        <button
          onClick={() => setActiveTab('UMUM')}
          className={cn(
            "flex items-center gap-2 px-8 py-4 text-sm font-bold transition-all rounded-xl",
            activeTab === 'UMUM' ? "bg-teal-50 text-teal-600" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
          )}
        >
          <SettingsIcon size={18} /> Konfigurasi Umum
        </button>

        <button
          onClick={() => setActiveTab('USER')}
          className={cn(
            "flex items-center gap-2 px-8 py-4 text-sm font-bold transition-all rounded-xl",
            activeTab === 'USER' ? "bg-indigo-50 text-indigo-600" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
          )}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          Manajemen User
        </button>

        <button
          onClick={() => setActiveTab('PIXEL')}
          className={cn(
            "flex items-center gap-2 px-8 py-4 text-sm font-bold transition-all rounded-xl",
            activeTab === 'PIXEL' ? "bg-rose-50 text-rose-600" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
          )}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-current"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
          Pixel Events
        </button>
      </div>

      {activeTab === 'UMUM' ? (
        <div className="space-y-8 animate-in fade-in duration-300">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 space-y-8">
            <section className="space-y-6">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 border-b border-slate-50 pb-4">
                <SettingsIcon size={20} className="text-primary" /> Identitas NGO
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-5">
                  <div className="text-left">
                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Nama Organisasi</label>
                    <Input 
                      type="text" 
                      value={formData.ngo_name} 
                      onChange={(e) => setFormData({...formData, ngo_name: e.target.value})} 
                      placeholder="Contoh: Yayasan Peduli Sesama"
                    />
                  </div>

                  <div className="text-left">
                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Logo Organisasi</label>
                    <div className="w-40">
                      <FileUpload
                        value={formData.logo_url}
                        onChange={(url) => setFormData({...formData, logo_url: url})}
                        className="aspect-square"
                      />
                    </div>
                  </div>

                  <div className="text-left">
                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Favicon</label>
                    <div className="w-24">
                      <FileUpload
                        value={formData.favicon_url}
                        onChange={(url) => setFormData({...formData, favicon_url: url})}
                        className="aspect-square"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="text-left">
                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Warna Utama (Theme)</label>
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-12 h-12 rounded-xl border border-slate-200 shadow-sm" 
                        style={{ backgroundColor: formData.primary_color }}
                      />
                      <input 
                        type="color" 
                        value={formData.primary_color} 
                        onChange={(e) => setFormData({...formData, primary_color: e.target.value})}
                        className="h-12 bg-slate-50 border border-slate-100 rounded-xl px-2 cursor-pointer focus:outline-none"
                      />
                      <Input 
                        type="text" 
                        value={formData.primary_color} 
                        onChange={(e) => setFormData({...formData, primary_color: e.target.value})}
                        className="w-32 uppercase font-mono"
                      />
                    </div>
                  </div>

                  <div className="text-left">
                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">WhatsApp Organisasi</label>
                    <Input type="text" value={formData.whatsapp_number} onChange={(e) => setFormData({...formData, whatsapp_number: e.target.value})} placeholder="628123456789" />
                  </div>
                </div>
              </div>

              <div className="space-y-5">
                <div className="text-left">
                  <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Deskripsi singkat</label>
                  <textarea rows={3} value={formData.short_description} onChange={(e) => setFormData({...formData, short_description: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 px-4 text-sm font-normal text-slate-900 focus:outline-none focus:border-teal-500/50" />
                </div>
                <div className="text-left">
                  <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Alamat kantor</label>
                  <textarea rows={2} value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 px-4 text-sm font-normal text-slate-900 focus:outline-none focus:border-teal-500/50" />
                </div>
                <div className="text-left">
                  <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Informasi Legal (SK Kemenkumham, dll)</label>
                  <textarea rows={2} value={formData.legal_info} onChange={(e) => setFormData({...formData, legal_info: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 px-4 text-sm font-normal text-slate-900 focus:outline-none focus:border-teal-500/50" />
                </div>
              </div>
            </section>

            <section className="space-y-6 pt-4">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 border-b border-slate-50 pb-4">
                <Globe size={20} className="text-indigo-500" /> Media Sosial
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="text-left">
                  <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Instagram URL</label>
                  <Input type="url" value={formData.instagram_url} onChange={(e) => setFormData({...formData, instagram_url: e.target.value})} placeholder="https://instagram.com/organisasi" />
                </div>
                <div className="text-left">
                  <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Facebook URL</label>
                  <Input type="url" value={formData.facebook_url} onChange={(e) => setFormData({...formData, facebook_url: e.target.value})} placeholder="https://facebook.com/organisasi" />
                </div>
              </div>
            </section>

            <section className="space-y-6 pt-4">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 border-b border-slate-50 pb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-rose-500"><path d="M21 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h7"/><path d="M16 5V3"/><path d="M8 5V3"/><path d="M3 9h18"/><path d="M16 19h6"/><path d="M19 16v6"/></svg> 
                Tracking & Marketing Pixels
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Meta / FB */}
                <div className="space-y-4 p-5 bg-slate-50/50 rounded-2xl border border-slate-100">
                  <p className="text-xs font-bold text-slate-400 mb-2">Meta (Facebook) Pixel</p>
                  <div className="text-left">
                    <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Pixel ID</label>
                    <Input type="text" value={formData.meta_pixel_id} onChange={(e) => setFormData({...formData, meta_pixel_id: e.target.value})} />
                  </div>
                  <div className="text-left">
                    <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">CAPI Token</label>
                    <textarea rows={2} value={formData.meta_capi_token} onChange={(e) => setFormData({...formData, meta_capi_token: e.target.value})} className="w-full bg-white border border-slate-100 rounded-xl py-3 px-4 text-xs font-normal text-slate-900 focus:outline-none focus:border-teal-500/50" />
                  </div>
                </div>

                {/* Google Ads */}
                <div className="space-y-4 p-5 bg-slate-50/50 rounded-2xl border border-slate-100">
                  <p className="text-xs font-bold text-slate-400 mb-2">Google Ads</p>
                  <div className="text-left">
                    <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Google Ads ID</label>
                    <Input type="text" value={formData.google_ads_id} onChange={(e) => setFormData({...formData, google_ads_id: e.target.value})} />
                  </div>
                  <div className="text-left">
                    <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Developer Token</label>
                    <Input type="text" value={formData.google_developer_token} onChange={(e) => setFormData({...formData, google_developer_token: e.target.value})} />
                  </div>
                  <div className="text-left">
                    <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Google Analytics ID</label>
                    <Input type="text" value={formData.google_analytic_id} onChange={(e) => setFormData({...formData, google_analytic_id: e.target.value})} placeholder="G-XXXXXXXXXX" />
                  </div>
                </div>

                {/* TikTok */}
                <div className="space-y-4 p-5 bg-slate-50/50 rounded-2xl border border-slate-100">
                  <p className="text-xs font-bold text-slate-400 mb-2">TikTok Pixel</p>
                  <div className="text-left">
                    <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Pixel ID</label>
                    <Input type="text" value={formData.tiktok_pixel_id} onChange={(e) => setFormData({...formData, tiktok_pixel_id: e.target.value})} />
                  </div>
                  <div className="text-left">
                    <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Events API Token</label>
                    <textarea rows={2} value={formData.tiktok_events_api_token} onChange={(e) => setFormData({...formData, tiktok_events_api_token: e.target.value})} className="w-full bg-white border border-slate-100 rounded-xl py-3 px-4 text-xs font-normal text-slate-900 focus:outline-none focus:border-teal-500/50" />
                  </div>
                </div>
              </div>
            </section>

            <div className="pt-8 flex justify-end sticky bottom-0 bg-white/80 backdrop-blur-md py-4 border-t border-slate-50">
              <Button onClick={handleSaveConfig} disabled={saving} size="lg" variant={saved ? "primary" : "secondary"}>
                {saved ? <Check size={18} /> : <Save size={18} />} {saved ? 'Tersimpan' : saving ? 'Menyimpan...' : 'Simpan semua perubahan'}
              </Button>
            </div>
          </div>
        </div>
      ) : activeTab === 'USER' ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 animate-in fade-in duration-300">
          <div className="p-6 border-b border-slate-100 flex flex-wrap gap-4 justify-between items-center">
            <div>
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-500"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                Manajemen User Admin
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Kelola akun dan hak akses administrator panel</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                <input
                  type="text"
                  placeholder="Cari nama atau email..."
                  value={adminSearch}
                  onChange={(e) => { setAdminSearch(e.target.value); setAdminPage(1); }}
                  className="pl-9 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-indigo-300 w-60"
                />
              </div>
              <button
                onClick={() => handleOpenAdminModal()}
                className="flex items-center gap-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 rounded-xl transition-all shadow-sm shadow-indigo-200"
              >
                <Plus size={16} /> Tambah Admin
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-3 px-6 text-[10px] font-semibold text-slate-400 uppercase tracking-wider w-10">#</th>
                  <th className="text-left py-3 px-6 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Administrator</th>
                  <th className="text-left py-3 px-6 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Role</th>
                  <th className="text-left py-3 px-6 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="text-left py-3 px-6 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Didaftarkan</th>
                  <th className="text-center py-3 px-6 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {adminsLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="py-4 px-6"><div className="h-3 w-4 bg-slate-100 rounded" /></td>
                      <td className="py-4 px-6"><div className="flex items-center gap-3"><div className="w-9 h-9 bg-slate-100 rounded-xl"/><div className="space-y-1.5"><div className="h-3 w-32 bg-slate-100 rounded"/><div className="h-2.5 w-40 bg-slate-100 rounded"/></div></div></td>
                      <td className="py-4 px-6"><div className="h-5 w-16 bg-slate-100 rounded-full"/></td>
                      <td className="py-4 px-6"><div className="h-5 w-12 bg-slate-100 rounded-full"/></td>
                      <td className="py-4 px-6"><div className="h-3 w-24 bg-slate-100 rounded"/></td>
                      <td className="py-4 px-6"><div className="flex justify-center gap-1"><div className="w-8 h-8 bg-slate-100 rounded-lg"/><div className="w-8 h-8 bg-slate-100 rounded-lg"/></div></td>
                    </tr>
                  ))
                ) : !adminsData?.length ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-sm text-slate-400 italic">Tidak ada data admin ditemukan.</td>
                  </tr>
                ) : (
                  adminsData.map((admin: any, idx: number) => (
                    <tr key={admin.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="py-4 px-6 text-xs text-slate-400 font-normal">{adminOffset + idx + 1}</td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-semibold text-xs shadow-md flex-shrink-0">
                            {admin.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-slate-800 text-sm leading-tight">{admin.name}</p>
                            <p className="text-[11px] text-slate-400 leading-tight mt-0.5">{admin.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className={cn("text-[10px] font-bold px-2.5 py-1 rounded-full border", roleBadge(admin.role))}>
                          {roleLabel(admin.role)}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className={cn(
                          "text-[10px] font-bold px-2.5 py-1 rounded-full border",
                          admin.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                        )}>
                          {admin.status === 'ACTIVE' ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-xs text-slate-500 font-normal whitespace-nowrap">
                        {new Date(admin.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleOpenAdminModal(admin)}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                            title="Edit"
                          >
                            <Edit size={15} />
                          </button>
                          <button
                            onClick={() => handleDeleteAdmin(admin.id)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                            title="Hapus"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {adminTotalPages > 1 && (
            <div className="p-4 border-t border-slate-100 flex items-center justify-between">
              <p className="text-xs text-slate-400">
                Menampilkan {adminOffset + 1}–{Math.min(adminOffset + adminLimit, adminTotalCount)} dari {adminTotalCount} admin
              </p>
              <div className="flex gap-1">
                <button
                  onClick={() => setAdminPage(p => Math.max(1, p - 1))}
                  disabled={adminPage === 1}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-100 text-slate-500 hover:bg-slate-50 disabled:opacity-40 transition-all"
                >Prev</button>
                {Array.from({ length: adminTotalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === adminTotalPages || Math.abs(p - adminPage) <= 1)
                  .map((p, i, arr) => (
                    <React.Fragment key={p}>
                      {i > 0 && arr[i - 1] !== p - 1 && (
                        <span className="px-2 py-1.5 text-xs text-slate-300">…</span>
                      )}
                      <button
                        onClick={() => setAdminPage(p)}
                        className={cn(
                          "px-3 py-1.5 text-xs font-medium rounded-lg border transition-all",
                          p === adminPage ? "bg-indigo-600 text-white border-indigo-600" : "border-slate-100 text-slate-500 hover:bg-slate-50"
                        )}
                      >{p}</button>
                    </React.Fragment>
                  ))
                }
                <button
                  onClick={() => setAdminPage(p => Math.min(adminTotalPages, p + 1))}
                  disabled={adminPage === adminTotalPages}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-100 text-slate-500 hover:bg-slate-50 disabled:opacity-40 transition-all"
                >Next</button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 animate-in fade-in duration-300">
          <div className="p-6 border-b border-slate-100 flex flex-wrap gap-4 justify-between items-center">
            <div>
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-rose-500"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
                Manajemen Pixel Events
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Kelola event tracking untuk Meta, TikTok, dan Google Ads</p>
            </div>
            <button
              onClick={() => handleOpenPixel()}
              className="flex items-center gap-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 rounded-xl transition-all shadow-sm shadow-indigo-200"
            >
              <Plus size={16} /> Tambah Event
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left py-4 px-6 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Screen Name</th>
                  <th className="text-left py-4 px-6 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Meta Event</th>
                  <th className="text-left py-4 px-6 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">TikTok Event</th>
                  <th className="text-left py-4 px-6 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Google Event</th>
                  <th className="text-center py-4 px-6 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="text-center py-4 px-6 text-[10px] font-semibold text-slate-400 uppercase tracking-wider w-24">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {pixelEventsLoading ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-sm text-slate-400 italic">Memuat data...</td>
                  </tr>
                ) : !pixelEvents?.length ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-sm text-slate-400 italic">Tidak ada event ditemukan.</td>
                  </tr>
                ) : (
                  pixelEvents.map((event: any) => (
                    <tr key={event.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="py-4 px-6 font-medium text-slate-700">{event.screen_name}</td>
                      <td className="py-4 px-6 text-slate-600">{event.meta_event || '-'}</td>
                      <td className="py-4 px-6 text-slate-600">{event.tiktok_event || '-'}</td>
                      <td className="py-4 px-6 text-slate-600">{event.google_event || '-'}</td>
                      <td className="py-4 px-6 text-center">
                        <span className={cn(
                          "text-[10px] font-bold px-2.5 py-1 rounded-full border inline-block",
                          event.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200'
                        )}>
                          {event.is_active ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleOpenPixel(event)}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                            title="Edit"
                          >
                            <Edit size={15} />
                          </button>
                          <button
                            onClick={() => handleDeletePixel(event.id)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                            title="Hapus"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Editor Modal for Pixel Events */}
      {isPixelModalOpen && (
        <div className="fixed inset-0 z-50 flex justify-center items-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
           <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl flex flex-col animate-in zoom-in-95 duration-200">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                 <h3 className="font-bold text-slate-800">{editingPixel ? 'Edit Pixel Event' : 'Tambah Pixel Event'}</h3>
                 <button onClick={() => setIsPixelModalOpen(false)} className="text-slate-400 hover:text-slate-800 transition-colors"><X size={20} /></button>
              </div>
              <form onSubmit={handleSavePixel} className="p-6 space-y-4">
                 <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Screen Name / Trigger</label>
                    <Input 
                      value={pixelForm.screen_name} 
                      onChange={(e) => setPixelForm({...pixelForm, screen_name: e.target.value})} 
                      placeholder="e.g. page_view, purchase_success" 
                      required 
                    />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Meta (Facebook) Event</label>
                      <Input 
                        value={pixelForm.meta_event} 
                        onChange={(e) => setPixelForm({...pixelForm, meta_event: e.target.value})} 
                        placeholder="e.g. PageView, Purchase" 
                      />
                   </div>
                   <div>
                      <label className="text-xs font-semibold text-slate-500 mb-1.5 block">TikTok Event</label>
                      <Input 
                        value={pixelForm.tiktok_event} 
                        onChange={(e) => setPixelForm({...pixelForm, tiktok_event: e.target.value})} 
                        placeholder="e.g. ViewContent" 
                      />
                   </div>
                 </div>
                 <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Google Ads Event</label>
                    <Input 
                      value={pixelForm.google_event} 
                      onChange={(e) => setPixelForm({...pixelForm, google_event: e.target.value})} 
                      placeholder="e.g. purchase, view_item" 
                    />
                 </div>
                 <div className="flex items-center gap-2 pt-2">
                    <input 
                      type="checkbox" 
                      id="pixel-active" 
                      checked={pixelForm.is_active} 
                      onChange={(e) => setPixelForm({...pixelForm, is_active: e.target.checked})} 
                      className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                    />
                    <label htmlFor="pixel-active" className="text-sm text-slate-700 select-none">Aktif (Enabled)</label>
                 </div>
                 <div className="flex gap-2 justify-end pt-5 border-t border-slate-100">
                    <Button type="button" variant="secondary" onClick={() => setIsPixelModalOpen(false)}>Batal</Button>
                    <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white">Simpan</Button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {/* Editor Modal for Templates */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-50 flex justify-center items-center p-4 bg-slate-900/40 backdrop-blur-sm">
           <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl flex flex-col">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                 <h3 className="font-bold text-slate-800">{editingTemplate ? 'Edit Template' : 'Tambah Template'}</h3>
                 <button onClick={() => setIsTemplateModalOpen(false)} className="text-slate-400 hover:text-slate-800"><X size={20} /></button>
              </div>
              <form onSubmit={handleSaveTemplate} className="p-6 space-y-4">
                 <div>
                    <label className="text-xs font-medium text-slate-500 mb-1 block">Trigger Event</label>
                    <Input value={templateForm.event_trigger} onChange={(e) => setTemplateForm({...templateForm, event_trigger: e.target.value})} placeholder="INVOICE_CREATED, PAYMENT_SUCCESS" required />
                 </div>
                 <div>
                    <label className="text-xs font-medium text-slate-500 mb-1 block">Channel</label>
                    <select value={templateForm.channel} onChange={(e) => setTemplateForm({...templateForm, channel: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 px-4 text-sm font-normal text-slate-900 focus:outline-none focus:border-teal-500/50">
                       <option value="WHATSAPP">WhatsApp</option>
                       <option value="EMAIL">Email</option>
                    </select>
                 </div>
                 <div>
                    <label className="text-xs font-medium text-slate-500 mb-1 block">Isi Pesan</label>
                    <textarea rows={5} value={templateForm.message_content} onChange={(e) => setTemplateForm({...templateForm, message_content: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 px-4 text-sm font-normal text-slate-900 focus:outline-none focus:border-teal-500/50" required placeholder="Gunakan {{name}}, {{amount}} dll sebagai variabel"></textarea>
                 </div>
                 <div className="flex gap-2 justify-end pt-4 border-t border-slate-100">
                    <Button type="button" variant="secondary" onClick={() => setIsTemplateModalOpen(false)}>Batal</Button>
                    <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white">Simpan</Button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {/* Admin Create/Edit Modal */}
      {isAdminModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-800/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-800">
                {editingAdmin ? 'Edit Admin' : 'Tambah Admin Baru'}
              </h2>
              <button onClick={() => setIsAdminModalOpen(false)} className="p-2 hover:bg-white rounded-full transition-all text-slate-400">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveAdmin} className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Nama Lengkap</label>
                <input
                  required
                  value={adminForm.name}
                  onChange={(e) => setAdminForm({...adminForm, name: e.target.value})}
                  placeholder="Masukkan nama lengkap..."
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 px-4 text-sm font-normal text-slate-900 focus:outline-none focus:border-indigo-300 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Email Login</label>
                <input
                  required
                  type="email"
                  value={adminForm.email}
                  onChange={(e) => setAdminForm({...adminForm, email: e.target.value})}
                  placeholder="alamat@email.com"
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 px-4 text-sm font-normal text-slate-900 focus:outline-none focus:border-indigo-300 transition-all"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Hak Akses</label>
                  <select
                    value={adminForm.role}
                    onChange={(e) => setAdminForm({...adminForm, role: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 px-4 text-sm font-normal text-slate-900 focus:outline-none focus:border-indigo-300 transition-all"
                  >
                    <option value="ADMIN">Admin</option>
                    <option value="FINANCE">Finance</option>
                    <option value="SUPERADMIN">Super Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Status</label>
                  <select
                    value={adminForm.status}
                    onChange={(e) => setAdminForm({...adminForm, status: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 px-4 text-sm font-normal text-slate-900 focus:outline-none focus:border-indigo-300 transition-all"
                  >
                    <option value="ACTIVE">Aktif</option>
                    <option value="INACTIVE">Nonaktif</option>
                  </select>
                </div>
              </div>
              {!editingAdmin && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                  <p className="text-xs text-amber-700 font-medium">
                    ⚠️ Password default akan diatur oleh sistem. Admin baru perlu mengganti password setelah login pertama.
                  </p>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdminModalOpen(false)}
                  className="flex-1 py-3 border border-slate-200 rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-50 transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={adminSubmitting}
                  className="flex-[2] py-3 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-200 flex items-center justify-center gap-2"
                >
                  {adminSubmitting
                    ? <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                    : <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                  }
                  {editingAdmin ? 'Simpan Perubahan' : 'Daftarkan Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import React, { useState, useEffect } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2, Save, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';

const fetcher = (url: string) => fetch(url).then(res => res.json());
const textareaClass = "w-full bg-slate-50 border border-slate-100 rounded-xl py-3 px-4 text-sm font-normal text-slate-900 focus:outline-none focus:border-teal-500/50";

function ContentSection() {
  const { data: about, mutate, isLoading } = useSWR('/api/web-about', fetcher);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    hero_title: '',
    hero_subtitle: '',
    sejarah_heading: '',
    sejarah_paragraph_1: '',
    sejarah_paragraph_2: '',
    visi_text: '',
  });

  useEffect(() => {
    if (about) {
      setFormData({
        hero_title: about.hero_title || '',
        hero_subtitle: about.hero_subtitle || '',
        sejarah_heading: about.sejarah_heading || '',
        sejarah_paragraph_1: about.sejarah_paragraph_1 || '',
        sejarah_paragraph_2: about.sejarah_paragraph_2 || '',
        visi_text: about.visi_text || '',
      });
    }
  }, [about]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch('/api/web-about', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        mutate();
        toast.success('Konten berhasil disimpan');
      } else {
        const err = await res.json();
        toast.error(err.error || 'Gagal menyimpan konten');
      }
    } catch (e) {
      toast.error('Terjadi kesalahan sistem');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 animate-pulse h-64" />;
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden p-6">
      <h2 className="text-sm font-bold text-slate-800 mb-4">Hero, Sejarah &amp; Visi</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Judul Hero *</label>
          <Input
            required
            value={formData.hero_title}
            onChange={e => setFormData({ ...formData, hero_title: e.target.value })}
            className="text-slate-900"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Subjudul Hero</label>
          <textarea rows={2} className={textareaClass} value={formData.hero_subtitle} onChange={e => setFormData({ ...formData, hero_subtitle: e.target.value })} />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Judul Sejarah</label>
          <Input
            value={formData.sejarah_heading}
            onChange={e => setFormData({ ...formData, sejarah_heading: e.target.value })}
            className="text-slate-900"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Sejarah - Paragraf 1</label>
          <textarea rows={3} className={textareaClass} value={formData.sejarah_paragraph_1} onChange={e => setFormData({ ...formData, sejarah_paragraph_1: e.target.value })} />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Sejarah - Paragraf 2</label>
          <textarea rows={3} className={textareaClass} value={formData.sejarah_paragraph_2} onChange={e => setFormData({ ...formData, sejarah_paragraph_2: e.target.value })} />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Teks Visi</label>
          <textarea rows={3} className={textareaClass} value={formData.visi_text} onChange={e => setFormData({ ...formData, visi_text: e.target.value })} />
        </div>
        <div className="flex justify-end pt-2 border-t border-slate-100">
          <Button type="submit" disabled={isSaving}>
            {isSaving ? <Loader2 size={16} className="animate-spin mr-2" /> : <Save size={16} className="mr-2" />}
            Simpan
          </Button>
        </div>
      </form>
    </div>
  );
}

function TimelineSection() {
  const { data: items, mutate, isLoading } = useSWR('/api/web-history', fetcher);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ year: '', description: '', is_active: true, display_order: 0 });

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData({ year: '', description: '', is_active: true, display_order: (items?.length || 0) + 1 });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      year: item.year || '',
      description: item.description || '',
      is_active: item.is_active ?? true,
      display_order: item.display_order ?? 0,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const url = '/api/web-history';
      const method = editingItem ? 'PATCH' : 'POST';
      const body = editingItem ? { id: editingItem.id, ...formData } : formData;
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (res.ok) {
        setIsModalOpen(false);
        mutate();
        toast.success(editingItem ? 'Linimasa berhasil diperbarui' : 'Linimasa berhasil ditambahkan');
      } else {
        const err = await res.json();
        toast.error(err.error || 'Gagal menyimpan linimasa');
      }
    } catch (e) {
      toast.error('Terjadi kesalahan sistem');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus entri linimasa ini?')) return;
    const res = await fetch(`/api/web-history?id=${id}`, { method: 'DELETE' });
    if (res.ok) {
      mutate();
      toast.success('Entri linimasa berhasil dihapus');
    } else {
      toast.error('Gagal menghapus data');
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-sm font-bold text-slate-800">Linimasa Sejarah</h2>
        <Button size="sm" onClick={handleOpenCreate}>
          <Plus size={16} strokeWidth={3} className="mr-1" /> Tambah
        </Button>
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-slate-100 rounded-xl" />)}</div>
      ) : items?.length > 0 ? (
        <div className="space-y-2">
          {items.map((item: any) => (
            <div key={item.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="w-14 shrink-0 text-center font-cabin font-bold text-teal-600 text-sm">{item.year}</div>
              <div className="flex-1 text-sm text-slate-700">{item.description}</div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${item.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                {item.is_active ? 'Aktif' : 'Non-Aktif'}
              </span>
              <button onClick={() => handleOpenEdit(item)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Edit2 size={14} /></button>
              <button onClick={() => handleDelete(item.id)} className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-slate-400 font-medium text-sm">Belum ada entri linimasa.</div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingItem ? 'Edit Entri Linimasa' : 'Tambah Entri Linimasa'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tahun *</label>
              <Input required placeholder="2026" value={formData.year} onChange={e => setFormData({ ...formData, year: e.target.value })} className="text-slate-900" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">Urutan</label>
              <Input type="number" value={formData.display_order} onChange={e => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })} className="text-slate-900" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Deskripsi Peristiwa *</label>
            <textarea required rows={3} className={textareaClass} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
            <select className="w-full p-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-900" value={formData.is_active ? '1' : '0'} onChange={e => setFormData({ ...formData, is_active: e.target.value === '1' })}>
              <option value="1">Aktif</option>
              <option value="0">Non-Aktif</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Batal</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 size={16} className="animate-spin mr-2" /> : <Save size={16} className="mr-2" />}
              Simpan
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function MissionSection() {
  const { data: items, mutate, isLoading } = useSWR('/api/web-mission', fetcher);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ content: '', is_active: true, display_order: 0 });

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData({ content: '', is_active: true, display_order: (items?.length || 0) + 1 });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: any) => {
    setEditingItem(item);
    setFormData({ content: item.content || '', is_active: item.is_active ?? true, display_order: item.display_order ?? 0 });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const url = '/api/web-mission';
      const method = editingItem ? 'PATCH' : 'POST';
      const body = editingItem ? { id: editingItem.id, ...formData } : formData;
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (res.ok) {
        setIsModalOpen(false);
        mutate();
        toast.success(editingItem ? 'Poin misi berhasil diperbarui' : 'Poin misi berhasil ditambahkan');
      } else {
        const err = await res.json();
        toast.error(err.error || 'Gagal menyimpan poin misi');
      }
    } catch (e) {
      toast.error('Terjadi kesalahan sistem');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus poin misi ini?')) return;
    const res = await fetch(`/api/web-mission?id=${id}`, { method: 'DELETE' });
    if (res.ok) {
      mutate();
      toast.success('Poin misi berhasil dihapus');
    } else {
      toast.error('Gagal menghapus data');
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-sm font-bold text-slate-800">Poin Misi</h2>
        <Button size="sm" onClick={handleOpenCreate}>
          <Plus size={16} strokeWidth={3} className="mr-1" /> Tambah
        </Button>
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-slate-100 rounded-xl" />)}</div>
      ) : items?.length > 0 ? (
        <div className="space-y-2">
          {items.map((item: any) => (
            <div key={item.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex-1 text-sm text-slate-700">{item.content}</div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${item.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                {item.is_active ? 'Aktif' : 'Non-Aktif'}
              </span>
              <button onClick={() => handleOpenEdit(item)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Edit2 size={14} /></button>
              <button onClick={() => handleDelete(item.id)} className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-slate-400 font-medium text-sm">Belum ada poin misi.</div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingItem ? 'Edit Poin Misi' : 'Tambah Poin Misi'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Isi Poin Misi *</label>
            <textarea required rows={2} className={textareaClass} value={formData.content} onChange={e => setFormData({ ...formData, content: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Urutan</label>
              <Input type="number" value={formData.display_order} onChange={e => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })} className="text-slate-900" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
              <select className="w-full p-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-900" value={formData.is_active ? '1' : '0'} onChange={e => setFormData({ ...formData, is_active: e.target.value === '1' })}>
                <option value="1">Aktif</option>
                <option value="0">Non-Aktif</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Batal</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 size={16} className="animate-spin mr-2" /> : <Save size={16} className="mr-2" />}
              Simpan
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default function WebAboutPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Tentang Kami"
        description="Kelola konten halaman Tentang Kami: hero, sejarah, linimasa, visi, dan misi"
      />
      <ContentSection />
      <TimelineSection />
      <MissionSection />
    </div>
  );
}

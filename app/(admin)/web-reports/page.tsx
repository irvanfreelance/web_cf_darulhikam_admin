"use client";

import React, { useState } from 'react';
import useSWR from 'swr';
import { FileCheck, Plus, Search, Edit2, Trash2, Save, Loader2, Download, FileText } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { FileUpload } from '@/components/ui/file-upload';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function ReportsPage() {
  const [search, setSearch] = useState('');
  const { data: reports, error, mutate, isLoading } = useSWR(`/api/web-reports?search=${search}`, fetcher);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    report_type: 'annual',
    period_label: '',
    period_year: new Date().getFullYear(),
    period_quarter: '',
    audit_status: 'kap_audited',
    file_url: '',
    file_size_kb: 0,
    is_published: true,
  });

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData({
      title: '',
      report_type: 'annual',
      period_label: '',
      period_year: new Date().getFullYear(),
      period_quarter: '',
      audit_status: 'kap_audited',
      file_url: '',
      file_size_kb: 0,
      is_published: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      title: item.title || '',
      report_type: item.report_type || 'annual',
      period_label: item.period_label || '',
      period_year: item.period_year || new Date().getFullYear(),
      period_quarter: item.period_quarter ? String(item.period_quarter) : '',
      audit_status: item.audit_status || 'kap_audited',
      file_url: item.file_url || '',
      file_size_kb: item.file_size_kb || 0,
      is_published: item.is_published ?? true,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.file_url) {
      alert('Silakan upload file laporan PDF');
      return;
    }
    setIsSubmitting(true);
    try {
      const url = '/api/web-reports';
      const method = editingItem ? 'PATCH' : 'POST';
      const payload = {
        ...formData,
        period_quarter: formData.period_quarter ? parseInt(formData.period_quarter) : null
      };
      const body = editingItem ? { id: editingItem.id, ...payload } : payload;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setIsModalOpen(false);
        mutate();
      } else {
        const err = await res.json();
        alert(err.error || 'Gagal menyimpan laporan keuangan');
      }
    } catch (e) {
      alert('Terjadi kesalahan sistem');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus laporan keuangan ini?')) return;
    try {
      const res = await fetch(`/api/web-reports?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        mutate();
      } else {
        const err = await res.json();
        alert(err.error || 'Gagal menghapus data');
      }
    } catch (e) {
      alert('Gagal menghapus data');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Laporan Keuangan & Transparansi" 
        description="Kelola publikasi berkas PDF laporan keuangan tahunan, triwulan, dan hasil audit KAP"
      >
        <Button onClick={handleOpenCreate} className="shrink-0">
          <Plus size={18} strokeWidth={3} className="mr-2" /> Upload Laporan
        </Button>
      </PageHeader>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <Input 
              placeholder="Cari judul laporan atau periode..." 
              className="pl-10 text-slate-900"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="animate-pulse space-y-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-slate-100 rounded-xl"></div>)}
          </div>
        ) : reports?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-separate border-spacing-0">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                  <th className="px-6 py-4 rounded-tl-xl">Judul Laporan</th>
                  <th className="px-6 py-4">Tipe & Periode</th>
                  <th className="px-6 py-4">Status Audit</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 rounded-tr-xl text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reports.map((item: any) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
                          <FileText size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                          <a href={item.file_url} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 hover:underline flex items-center gap-1 mt-0.5">
                            <Download size={12} /> Unduh PDF
                          </a>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs font-bold text-slate-700 uppercase">{item.report_type}</p>
                      <p className="text-xs text-slate-500">{item.period_label} ({item.period_year})</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide
                        ${item.audit_status === 'kap_audited' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>
                        {item.audit_status === 'kap_audited' ? 'Audit KAP WTP' : item.audit_status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${item.is_published ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                        {item.is_published ? 'Published' : 'Draft'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button onClick={() => handleOpenEdit(item)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(item.id)} className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-slate-400 font-medium">Belum ada data laporan keuangan.</div>
        )}
      </div>

      {/* Form Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Edit Laporan Keuangan' : 'Upload Laporan Keuangan'}
        description="Isi detail informasi dan upload berkas PDF laporan"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Judul Laporan *</label>
            <Input 
              required
              placeholder="Contoh: Laporan Keuangan Tahunan 2024 (Audited)"
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
              className="text-slate-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tipe Laporan *</label>
              <select
                className="w-full p-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-900"
                value={formData.report_type}
                onChange={e => setFormData({...formData, report_type: e.target.value})}
              >
                <option value="annual">Tahunan (Annual)</option>
                <option value="quarterly">Triwulan (Quarterly)</option>
                <option value="monthly">Bulanan (Monthly)</option>
                <option value="special_audit">Audit Khusus</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Label Periode *</label>
              <Input 
                required
                placeholder="Contoh: Tahunan 2024 / Q2 2025"
                value={formData.period_label}
                onChange={e => setFormData({...formData, period_label: e.target.value})}
                className="text-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tahun *</label>
              <Input 
                type="number"
                required
                value={formData.period_year}
                onChange={e => setFormData({...formData, period_year: parseInt(e.target.value) || new Date().getFullYear()})}
                className="text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Kuartal (Optional)</label>
              <select
                className="w-full p-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-900"
                value={formData.period_quarter}
                onChange={e => setFormData({...formData, period_quarter: e.target.value})}
              >
                <option value="">Tidak Ada / Tahunan</option>
                <option value="1">Q1</option>
                <option value="2">Q2</option>
                <option value="3">Q3</option>
                <option value="4">Q4</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Status Audit *</label>
              <select
                className="w-full p-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-900"
                value={formData.audit_status}
                onChange={e => setFormData({...formData, audit_status: e.target.value})}
              >
                <option value="kap_audited">Audit KAP (WTP)</option>
                <option value="internally_reviewed">Internal Review</option>
                <option value="unaudited">Unaudited</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Status Publikasi</label>
            <select
              className="w-full p-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-900"
              value={formData.is_published ? '1' : '0'}
              onChange={e => setFormData({...formData, is_published: e.target.value === '1'})}
            >
              <option value="1">Terbitkan (Published)</option>
              <option value="0">Draft</option>
            </select>
          </div>

          <div>
            <FileUpload 
              label="Berkas Dokumen PDF Laporan *"
              accept=".pdf"
              hint="Max 10MB • File PDF"
              value={formData.file_url}
              onChange={(url) => setFormData({...formData, file_url: url})}
            />
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

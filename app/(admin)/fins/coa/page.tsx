"use client";

import React, { useState, useRef } from 'react';
import useSWR from 'swr';
import * as XLSX from 'xlsx';
import { Plus, Search, Edit2, Trash2, Save, Loader2, Download, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { DataTable } from '@/components/shared/data-table';
import { Pagination } from '@/components/shared/pagination';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { cn } from '@/lib/utils';

const fetcher = (url: string) => fetch(url).then(res => res.json());
const LIMIT = 10;

function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn('flex items-center gap-2', disabled && 'opacity-50 cursor-not-allowed')}
    >
      <span className={cn('w-10 h-6 rounded-full transition-colors relative shrink-0', checked ? 'bg-indigo-600' : 'bg-slate-200')}>
        <span className={cn('absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform', checked && 'translate-x-4')} />
      </span>
      <span className="text-sm font-medium text-slate-700">{label}</span>
    </button>
  );
}

const stripTags = (s: string) => (s || '').replace(/<\/?[^>]+>/g, '');

const emptyForm = () => ({
  coa: '',
  nama_coa: '',
  coa_parent: '',
  group_coa: '',
  id_kantor: '',
  id_jabatan: '',
  active: 'y' as 'y' | 'n',
  saldo: 'd' as 'd' | 'k',
  is_postable: true,
});

export default function ChartOfAccountsPage() {
  const { data: masters } = useSWR('/api/fins/masters', fetcher);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('all');
  const [parentFilter, setParentFilter] = useState('all');
  const [activeFilter, setActiveFilter] = useState('all');
  const [page, setPage] = useState(1);

  const queryParams = new URLSearchParams({
    search, group: groupFilter, parent: parentFilter, active: activeFilter,
    page: String(page), limit: String(LIMIT),
  });
  const { data, mutate, isLoading } = useSWR(`/api/fins/coa?${queryParams.toString()}`, fetcher);
  const rows = data?.rows || [];
  const totalCount = data?.totalCount || 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / LIMIT));
  const groups: string[] = data?.groups || [];

  // Loaded separately (unfiltered, unpaginated) so the Parent/COA Parent
  // pickers always offer the full tree regardless of the current list filter.
  const { data: allCoaData } = useSWR('/api/fins/coa?limit=2000&page=1', fetcher);
  const allCoa: any[] = allCoaData?.rows || [];
  const parentOptions = allCoa
    .filter(c => c.parent === 'y')
    .map(c => ({ id: c.coa, name: `${c.coa} — ${stripTags(c.nama_coa)}` }));
  const coaParentPickerOptions = [{ id: '', name: '— Tanpa Induk (Level 1) —' }, ...allCoa.map(c => ({ id: c.coa, name: `${c.coa} — ${stripTags(c.nama_coa)}` }))];

  const kantorOptions = [{ id: '', name: '— Tidak diset —' }, ...(masters?.offices || []).map((o: { id: number; nama: string }) => ({ id: String(o.id), name: o.nama }))];
  const jabatanOptions = [{ id: '', name: '— Tidak diset —' }, ...(masters?.jabatan || []).map((j: { id: number; nama: string }) => ({ id: String(j.id), name: j.nama }))];

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [deletingItem, setDeletingItem] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [formData, setFormData] = useState(emptyForm());

  const hasChildren = (coa: string) => allCoa.some(c => c.coa_parent === coa);

  const computedLevel = (() => {
    if (!formData.coa_parent) return 1;
    const parentRow = allCoa.find(c => c.coa === formData.coa_parent);
    return parentRow ? Number(parentRow.level) + 1 : 1;
  })();

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData(emptyForm());
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      coa: item.coa || '',
      nama_coa: stripTags(item.nama_coa) || '',
      coa_parent: item.coa_parent && item.coa_parent !== '0' ? item.coa_parent : '',
      group_coa: item.group_coa || '',
      id_kantor: item.id_kantor || '',
      id_jabatan: item.id_jabatan || '',
      active: item.active === 'h' ? 'n' : item.active,
      saldo: item.saldo,
      is_postable: item.parent === 'n',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const url = '/api/fins/coa';
      const method = editingItem ? 'PATCH' : 'POST';
      const body = editingItem ? { ...formData, coa: editingItem.coa } : formData;

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
        toast.error(typeof err.error === 'string' ? err.error : 'Gagal menyimpan data');
      }
    } catch (err) {
      toast.error('Terjadi kesalahan sistem');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingItem) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/fins/coa?coa=${encodeURIComponent(deletingItem.coa)}`, { method: 'DELETE' });
      if (res.ok) {
        setDeletingItem(null);
        mutate();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Gagal menghapus data');
      }
    } catch (err) {
      toast.error('Gagal menghapus data');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExport = async () => {
    try {
      const res = await fetch(`/api/fins/coa?search=${search}&group=${groupFilter}&parent=${parentFilter}&active=${activeFilter}&page=1&limit=5000`);
      const exportData = await res.json();
      const worksheet = XLSX.utils.json_to_sheet((exportData.rows || []).map((item: any) => ({
        'COA': item.coa,
        'Nama Akun': item.nama_coa,
        'COA Parent': item.coa_parent || '0',
        'Level': item.level,
        'Group': item.group_coa,
        'ID Kantor': item.id_kantor,
        'ID Jabatan': item.id_jabatan,
        'Status': item.active === 'y' ? 'Aktif' : 'Non Aktif',
        'Saldo': item.saldo === 'd' ? 'Debet' : 'Kredit',
        'Include Buku': item.parent === 'n' ? 'Ya' : 'Tidak',
      })));
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Chart of Accounts');
      XLSX.writeFile(workbook, `Export_COA_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (err) {
      toast.error('Gagal export data');
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      const rows = json.map(r => ({
        coa: String(r['COA'] ?? '').trim(),
        nama_coa: String(r['Nama Akun'] ?? '').trim(),
        coa_parent: String(r['COA Parent'] ?? '').trim(),
        group_coa: String(r['Group'] ?? '').trim(),
        id_kantor: String(r['ID Kantor'] ?? '').trim(),
        id_jabatan: String(r['ID Jabatan'] ?? '').trim(),
        active: String(r['Status'] ?? 'Aktif').toLowerCase().startsWith('aktif') && !String(r['Status'] ?? '').toLowerCase().includes('non') ? 'y' : 'n',
        saldo: String(r['Saldo'] ?? 'Debet').toLowerCase().startsWith('d') ? 'd' : 'k',
        is_postable: String(r['Include Buku'] ?? 'Ya').toLowerCase().startsWith('y') || String(r['Include Buku'] ?? 'Ya').toLowerCase().startsWith('ya'),
      }));

      const res = await fetch('/api/fins/coa/import', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows }),
      });
      const result = await res.json();
      if (!res.ok) {
        toast.error(result.error || 'Gagal import data');
        return;
      }
      toast.success(`Import selesai: ${result.imported} baru, ${result.updated} diperbarui${result.skipped ? `, ${result.skipped} gagal` : ''}`);
      if (result.errors?.length) {
        console.error('Import errors:', result.errors);
      }
      mutate();
    } catch (err) {
      toast.error('Gagal membaca file. Pastikan format .xlsx/.csv sesuai template.');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Chart of Accounts"
        description="Master hierarki akun (COA) beserta kantor, jabatan, dan group penyajian"
      >
        <Button onClick={handleOpenCreate} className="shrink-0">
          <Plus size={18} strokeWidth={3} className="mr-2" /> Tambah Akun
        </Button>
      </PageHeader>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <Input
                placeholder="Cari kode atau nama akun..."
                className="pl-10 text-slate-900"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <select value={groupFilter} onChange={e => { setGroupFilter(e.target.value); setPage(1); }}
              className="bg-white border border-slate-200 rounded-xl py-2.5 px-3 text-sm text-slate-900 focus:outline-none focus:border-indigo-500">
              <option value="all">Group: Semua</option>
              {groups.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
            <select value={parentFilter} onChange={e => { setParentFilter(e.target.value); setPage(1); }}
              className="bg-white border border-slate-200 rounded-xl py-2.5 px-3 text-sm text-slate-900 focus:outline-none focus:border-indigo-500 max-w-[240px]">
              <option value="all">Induk: Semua</option>
              <option value="root">Induk: Tanpa Induk (Level 1)</option>
              {parentOptions.map((p: { id: string; name: string }) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select value={activeFilter} onChange={e => { setActiveFilter(e.target.value); setPage(1); }}
              className="bg-white border border-slate-200 rounded-xl py-2.5 px-3 text-sm text-slate-900 focus:outline-none focus:border-indigo-500">
              <option value="all">Status: Semua</option>
              <option value="y">Status: Aktif</option>
              <option value="n">Status: Non Aktif</option>
            </select>
          </div>
          <div className="flex gap-3 shrink-0">
            <input ref={fileInputRef} type="file" accept=".xlsx,.csv" className="hidden" onChange={handleImportFile} />
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isImporting}>
              {isImporting ? <Loader2 size={16} className="animate-spin mr-2" /> : <Upload size={16} className="mr-2" />}
              Import
            </Button>
            <Button variant="outline" onClick={handleExport}>
              <Download size={16} className="mr-2" /> Export
            </Button>
          </div>
        </div>

        <DataTable
          columns={[
            {
              header: 'COA',
              cell: (item: any) => (
                <span
                  className={cn('font-mono text-xs', item.parent === 'y' ? 'font-bold text-slate-800' : 'text-slate-600')}
                  style={{ paddingLeft: (Number(item.level) - 1) * 16 }}
                >
                  {item.coa}
                </span>
              ),
            },
            {
              header: 'Nama Akun',
              cell: (item: any) => (
                <span
                  className={cn('text-sm', item.parent === 'y' ? 'font-bold text-slate-800' : 'text-slate-700')}
                  style={{ paddingLeft: (Number(item.level) - 1) * 16 }}
                >
                  {stripTags(item.nama_coa)}
                </span>
              ),
            },
            {
              header: 'Parent COA',
              cell: (item: any) => <span className="font-mono text-xs text-slate-400">{item.coa_parent && item.coa_parent !== '0' ? item.coa_parent : '–'}</span>,
            },
            { header: 'Level', align: 'center', cell: (item: any) => <span className="text-sm text-slate-600">{item.level}</span> },
            { header: 'Kantor', cell: (item: any) => <span className="text-sm text-slate-600">{item.kantor_nama || '–'}</span> },
            { header: 'Jabatan', cell: (item: any) => <span className="text-sm text-slate-600">{item.jabatan_nama || '–'}</span> },
            {
              header: 'Group',
              cell: (item: any) => (
                <div className="flex flex-wrap gap-1">
                  {String(item.group_coa || '').split(',').filter(Boolean).map((g: string) => (
                    <span key={g} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{g.trim()}</span>
                  ))}
                  {!item.group_coa && <span className="text-slate-300">–</span>}
                </div>
              ),
            },
            {
              header: 'Status',
              align: 'center',
              cell: (item: any) => (
                <span className={cn('text-[11px] font-semibold px-2.5 py-1 rounded-full', item.active === 'y' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600')}>
                  {item.active === 'y' ? 'Aktif' : 'Non Aktif'}
                </span>
              ),
            },
            {
              header: 'Aksi',
              align: 'right',
              cell: (item: any) => {
                const blocked = hasChildren(item.coa);
                return (
                  <div className="flex justify-end gap-2">
                    <button onClick={() => handleOpenEdit(item)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => !blocked && setDeletingItem(item)}
                      disabled={blocked}
                      title={blocked ? 'Hapus dulu akun anak di bawahnya' : 'Hapus'}
                      className={cn('p-2 rounded-lg transition-colors', blocked ? 'text-slate-300 cursor-not-allowed' : 'text-rose-600 hover:bg-rose-50')}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                );
              },
            },
          ]}
          data={rows}
          isLoading={isLoading}
          emptyMessage="Belum ada data akun."
          className="rounded-none border-0 shadow-none"
        />

        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalCount={totalCount}
          offset={(page - 1) * LIMIT}
          limit={LIMIT}
          onPageChange={setPage}
          isLoading={isLoading}
        />
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Edit Akun' : 'Tambah Akun'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Kode COA</label>
              <Input
                required
                disabled={!!editingItem}
                placeholder="cth. 101.04.000.000"
                value={formData.coa}
                onChange={e => setFormData({ ...formData, coa: e.target.value })}
                className="text-slate-900 font-mono disabled:bg-slate-50 disabled:text-slate-400"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nama Akun</label>
              <Input
                required
                value={formData.nama_coa}
                onChange={e => setFormData({ ...formData, nama_coa: e.target.value })}
                className="text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">COA Parent</label>
            <SearchableSelect options={coaParentPickerOptions} value={formData.coa_parent} onChange={val => setFormData({ ...formData, coa_parent: String(val) })} placeholder="— Tanpa Induk (Level 1) —" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Level Otomatis</label>
              <Input readOnly value={`Level ${computedLevel}`} className="text-slate-500 bg-slate-50" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Group</label>
              <Input
                placeholder="cth. 1,9"
                list="coa-group-suggestions"
                value={formData.group_coa}
                onChange={e => setFormData({ ...formData, group_coa: e.target.value })}
                className="text-slate-900"
              />
              <datalist id="coa-group-suggestions">
                {groups.map(g => <option key={g} value={g} />)}
              </datalist>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">ID Kantor</label>
              <SearchableSelect options={kantorOptions} value={formData.id_kantor} onChange={val => setFormData({ ...formData, id_kantor: String(val) })} placeholder="— Tidak diset —" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">ID Jabatan</label>
              <SearchableSelect options={jabatanOptions} value={formData.id_jabatan} onChange={val => setFormData({ ...formData, id_jabatan: String(val) })} placeholder="— Tidak diset —" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Saldo Normal</label>
            <select
              value={formData.saldo}
              onChange={e => setFormData({ ...formData, saldo: e.target.value as 'd' | 'k' })}
              className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-3 text-sm text-slate-900 focus:outline-none focus:border-indigo-500"
            >
              <option value="d">Debet</option>
              <option value="k">Kredit</option>
            </select>
          </div>

          <div className="flex items-center gap-8 pt-2">
            <Toggle checked={formData.active === 'y'} onChange={v => setFormData({ ...formData, active: v ? 'y' : 'n' })} label="Aktif" />
            <Toggle
              checked={formData.is_postable}
              disabled={!!editingItem && hasChildren(formData.coa)}
              onChange={v => setFormData({ ...formData, is_postable: v })}
              label="Include Buku"
            />
          </div>
          {!!editingItem && hasChildren(formData.coa) && (
            <p className="text-xs text-amber-600 -mt-2">Akun ini punya akun anak, sehingga tidak bisa diaktifkan sebagai akun postable (Include Buku).</p>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Batal</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 size={16} className="animate-spin mr-2" /> : <Save size={16} className="mr-2" />}
              Simpan
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={!!deletingItem}
        onClose={() => setDeletingItem(null)}
        onConfirm={handleDelete}
        isLoading={isDeleting}
        title="Hapus Akun"
        description={`Apakah Anda yakin ingin menghapus akun "${deletingItem?.coa} — ${deletingItem?.nama_coa}"? Tindakan ini tidak dapat dibatalkan.`}
      />
    </div>
  );
}

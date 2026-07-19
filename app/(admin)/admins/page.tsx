"use client";

import React, { useState } from 'react';
import useSWR from 'swr';
import { 
  ShieldCheck, UserPlus, Search, Edit, Trash2, X, Save, Loader2, Key,
  Eye, Calendar, Hash, Mail, User, ShieldAlert, CheckCircle2, XCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/shared/page-header';
import { DataTable } from '@/components/shared/data-table';
import { Pagination } from '@/components/shared/pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Badge } from '@/components/ui/badge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function AdminsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const offset = (page - 1) * limit;

  const { data: admins, error, isLoading, mutate } = useSWR(
    `/api/admins?limit=${limit}&offset=${offset}&search=${search}`, 
    fetcher
  );

  const totalCount = admins?.[0]?.total_count || 0;
  const totalPages = Math.ceil(totalCount / limit);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<any>(null);
  const [formData, setFormData] = useState({ 
    name: '', email: '', role: 'ADMIN', status: 'ACTIVE' 
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenModal = (admin: any = null) => {
    setSelectedAdmin(admin);
    if (admin) {
      setFormData({ 
        name: admin.name, 
        email: admin.email, 
        role: admin.role, 
        status: admin.status 
      });
    } else {
      setFormData({ name: '', email: '', role: 'ADMIN', status: 'ACTIVE' });
    }
    setIsModalOpen(true);
  };

  const handleOpenDetail = (admin: any) => {
    setSelectedAdmin(admin);
    setIsDetailOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const method = selectedAdmin ? 'PATCH' : 'POST';
      const body = selectedAdmin ? { id: selectedAdmin.id, ...formData } : formData;
      const res = await fetch('/api/admins', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed to save admin user');
      toast.success(selectedAdmin ? 'Akun admin diperbarui' : 'Admin baru berhasil didaftarkan');
      mutate();
      setIsModalOpen(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id: number) => {
    toast('Hapus akun admin ini?', {
      action: {
        label: 'Hapus',
        onClick: async () => {
          try {
            const res = await fetch(`/api/admins?id=${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete admin');
            toast.success('Admin berhasil dihapus');
            mutate();
          } catch (err: any) {
            toast.error(err.message);
          }
        }
      }
    });
  };

  if (error) return <div className="p-8 text-rose-500 font-normal bg-rose-50 rounded-2xl border border-rose-100 italic">Error: {error.message}</div>;

  const columns = [
    { 
      header: '#', 
      headerClassName: "w-12 text-center",
      className: "text-center text-xs font-normal text-slate-400",
      cell: (_: any, idx: number) => offset + idx + 1
    },
    { 
      header: 'Administrator', 
      cell: (admin: any) => (
        <div className="flex items-center gap-3 text-left">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-medium text-xs shadow-lg">
            {admin.name.charAt(0)}
          </div>
          <div className="flex flex-col">
            <span className="font-normal text-slate-800 tracking-tight text-sm">{admin.name}</span>
            <span className="text-[10px] text-slate-400 font-medium leading-tight">{admin.email}</span>
          </div>
        </div>
      )
    },
    { 
      header: 'Role', 
      cell: (admin: any) => (
        <Badge variant={admin.role === 'SUPERADMIN' ? 'info' : admin.role === 'FINANCE' ? 'warning' : 'secondary'}>
          {admin.role === 'SUPERADMIN' ? 'Super Admin' : admin.role === 'FINANCE' ? 'Finance' : 'Admin'}
        </Badge>
      )
    },
    { 
      header: 'Status', 
      className: "text-center",
      cell: (admin: any) => (
        <Badge variant={admin.status === 'ACTIVE' ? 'success' : 'destructive'}>
          {admin.status === 'ACTIVE' ? 'Aktif' : 'Nonaktif'}
        </Badge>
      )
    },
    { 
      header: 'Didaftarkan', 
      className: "text-xs text-slate-400 font-normal whitespace-nowrap",
      cell: (admin: any) => new Date(admin.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
    },
    { 
      header: 'Aksi', 
      className: "text-center",
      cell: (admin: any) => (
        <div className="flex justify-center gap-1 transition-opacity">
           <button onClick={() => handleOpenDetail(admin)} className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all shadow-sm"><Eye size={18} /></button>
           <button onClick={() => router.push(`/admins/${admin.id}/edit`)} className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all shadow-sm"><Edit size={18} /></button>
           <button onClick={() => handleDelete(admin.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all shadow-sm"><Trash2 size={18} /></button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 text-left">
      <PageHeader
        title="Manajemen Admin"
        description="Kelola hak akses panel"
      >
        <Button 
          onClick={() => router.push('/admins/new')}
          variant="secondary"
        >
          <UserPlus size={18} strokeWidth={3} /> Tambah Admin
        </Button>
      </PageHeader>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[300px] group">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
          <Input 
            type="text" 
            placeholder="Cari nama atau email admin..." 
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-10" 
          />
        </div>
      </div>

      <DataTable 
        columns={columns}
        data={admins || []}
        isLoading={isLoading}
        emptyMessage="Belum ada admin ditemukan."
      />

       <Pagination 
        currentPage={page}
        totalPages={totalPages}
        totalCount={totalCount}
        offset={offset}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={(newLimit) => { setLimit(newLimit); setPage(1); }}
        isLoading={isLoading}
      />

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-800/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-xl font-normal text-slate-800 tracking-tight text-left">Pengaturan Akses Admin</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white rounded-full transition-all text-slate-400"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6 text-left">
              <div className="text-left">
                <label className="block text-[10px] font-normal text-slate-500 mb-2 font-sans">Nama lengkap</label>
                <Input required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Masukkan nama lengkap..." />
              </div>
              <div className="text-left font-sans">
                <label className="block text-[10px] font-normal text-slate-500 mb-2">Email login</label>
                <Input required type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} placeholder="alamat@email.com" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-left font-sans">
                  <label className="block text-[10px] font-normal text-slate-500 mb-2">Hak akses</label>
                  <SearchableSelect 
                    value={formData.role}
                    onChange={(val) => setFormData({...formData, role: String(val)})}
                    options={[
                      { id: 'ADMIN', name: 'ADMIN' },
                      { id: 'FINANCE', name: 'FINANCE' },
                      { id: 'SUPERADMIN', name: 'SUPERADMIN' }
                    ]}
                  />
                </div>
                <div className="text-left font-sans">
                  <label className="block text-[10px] font-normal text-slate-500 mb-2">Status akun</label>
                  <SearchableSelect 
                    value={formData.status}
                    onChange={(val) => setFormData({...formData, status: String(val)})}
                    options={[
                      { id: 'ACTIVE', name: 'ACTIVE' },
                      { id: 'INACTIVE', name: 'INACTIVE' }
                    ]}
                  />
                </div>
              </div>
              <div className="pt-4 flex gap-3 text-left">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="flex-1 text-[10px] uppercase font-sans">Batal</Button>
                <Button disabled={isSubmitting} variant="secondary" className="flex-[2] text-[10px] uppercase font-sans">
                  {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <ShieldCheck size={18} />} Simpan akses
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {isDetailOpen && selectedAdmin && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-800/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-xl font-normal text-slate-800 tracking-tight text-left">Profil Administrator</h2>
              <button onClick={() => setIsDetailOpen(false)} className="p-2 hover:bg-white rounded-full transition-all text-slate-400"><X size={20} /></button>
            </div>
            <div className="p-8 space-y-8 text-left">
               <div className="flex items-center gap-6">
                 <div className="w-24 h-24 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-4xl font-normal shadow-2xl shadow-indigo-100">
                   {selectedAdmin.name.charAt(0)}
                 </div>
                 <div className="text-left font-sans">
                   <h3 className="text-3xl font-bold text-slate-800 tracking-tight leading-tight mb-1">{selectedAdmin.name}</h3>
                   <div className="flex items-center gap-3">
                       <span className={cn(
                         "px-3 py-1 rounded-xl text-[10px] font-bold shadow-sm border",
                         selectedAdmin.role === 'SUPERADMIN' ? "bg-indigo-600 text-white border-indigo-500 shadow-indigo-100" : "bg-slate-100 text-slate-600 border-slate-200"
                       )}>{selectedAdmin.role === 'SUPERADMIN' ? 'Super admin' : selectedAdmin.role === 'FINANCE' ? 'Finance' : 'Admin'}</span>
                       <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-bold border",
                        selectedAdmin.status === 'ACTIVE' ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-rose-50 text-rose-700 border-rose-100"
                      )}>{selectedAdmin.status === 'ACTIVE' ? 'Aktif' : 'Nonaktif'}</span>
                   </div>
                 </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-sans">
                  <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 text-left">
                    <p className="text-[10px] font-normal text-slate-400 mb-2 flex items-center gap-1.5"><Mail size={12}/> Email login</p>
                    <p className="text-sm font-normal text-slate-700 tracking-tight">{selectedAdmin.email}</p>
                  </div>
                  <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                    <p className="text-[10px] font-normal text-slate-400 mb-2 flex items-center gap-1.5"><Calendar size={12}/> Didaftarkan pada</p>
                    <p className="text-sm font-normal text-slate-700 tracking-tight">
                      {new Date(selectedAdmin.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
               </div>

               <div className="bg-slate-800 p-8 rounded-2xl shadow-xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 text-white/5 group-hover:text-white/10 transition-colors">
                    <ShieldAlert size={120} strokeWidth={1} />
                  </div>
                  <div className="relative z-10 text-left font-sans">
                    <p className="text-[10px] font-normal text-amber-400 mb-4">Security & credentials</p>
                    <div className="flex items-center gap-4 text-white/60 mb-6">
                       <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center">
                          <Key size={20} />
                       </div>
                       <div>
                          <p className="text-white text-sm font-bold tracking-tight">Kata sandi terenkripsi</p>
                          <p className="text-[10px] font-normal text-white/40 tracking-widest">Argon2id Hash Protocol</p>
                       </div>
                    </div>
                    <div className="flex gap-2">
                       <button className="bg-white/10 text-white px-4 py-2 rounded-xl text-[10px] font-bold border border-white/10 hover:bg-white/20 transition-all font-sans">Reset password</button>
                    </div>
                  </div>
               </div>

               <div className="flex gap-3 pt-2 font-sans">
                  <button onClick={() => { setIsDetailOpen(false); handleOpenModal(selectedAdmin); }} className="flex-1 py-4 bg-white border border-slate-200 rounded-2xl text-[10px] font-bold uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all">EDIT PROFIL</button>
                  <button onClick={() => setIsDetailOpen(false)} className="flex-1 py-4 bg-slate-800 text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest shadow-xl active:scale-95 transition-all">TUTUP</button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

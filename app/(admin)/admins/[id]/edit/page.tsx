"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import useSWR from 'swr';
import { 
  ChevronLeft, ShieldCheck, Mail, User, ShieldAlert, Loader2, Save
} from 'lucide-react';
import { toast } from 'sonner';
import { SearchableSelect } from '@/components/ui/searchable-select';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function EditAdminPage() {
  const router = useRouter();
  const { id } = useParams();
  const { data: admin, isLoading: isFetching } = useSWR(`/api/admins?id=${id}`, fetcher);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<any>(null);

  useEffect(() => {
    if (admin) {
      // API returns an array for list or object for detail? 
      // Checking app/api/admins/route.ts... it handles GET with searchParams.
      // Usually it returns rows.
      const data = Array.isArray(admin) ? admin[0] : admin;
      if (data) {
        setFormData({
          name: data.name,
          email: data.email,
          role: data.role,
          status: data.status
        });
      }
    }
  }, [admin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admins', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...formData }),
      });
      if (!res.ok) throw new Error('Failed to update admin');
      toast.success('Akun admin berhasil diperbarui');
      router.push('/admins');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isFetching || !formData) return <div className="p-8 animate-pulse text-center">Loading admin data...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => router.back()}
          className="p-3 bg-white border border-slate-100 rounded-2xl text-slate-400 hover:text-slate-800 transition-all shadow-sm"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="text-left">
          <h1 className="text-2xl font-normal text-slate-800 tracking-tight">Edit Administrator</h1>
          <p className="text-sm text-slate-400 font-medium mt-1 text-left">Sesuaikan detail akun dan hak akses</p>
        </div>
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
        <form onSubmit={handleSubmit} className="space-y-8">
           <div className="space-y-6">
              <div className="text-left">
                <label className="block text-xs font-normal text-slate-500 mb-2 flex items-center gap-2">
                  <User size={12}/> Nama Lengkap
                </label>
                <input 
                  required 
                  value={formData.name} 
                  onChange={(e) => setFormData({...formData, name: e.target.value})} 
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 text-sm font-normal text-slate-900 focus:outline-none focus:border-slate-900/50 transition-all" 
                />
              </div>

              <div className="text-left">
                <label className="block text-[10px] font-normal text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Mail size={12}/> Email Login
                </label>
                <input 
                  required 
                  type="email"
                  value={formData.email} 
                  onChange={(e) => setFormData({...formData, email: e.target.value})} 
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 text-sm font-normal text-slate-900 focus:outline-none focus:border-slate-900/50 transition-all" 
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                 <div className="text-left">
                    <label className="block text-xs font-normal text-slate-500 mb-2">Hak Akses</label>
                    <SearchableSelect
                      value={formData.role}
                      onChange={(val) => setFormData({...formData, role: String(val)})}
                      options={[
                        { id: 'ADMIN', name: 'Admin' },
                        { id: 'FINANCE', name: 'Finance' },
                        { id: 'SUPERADMIN', name: 'Super Admin' }
                      ]}
                      placeholder="Pilih role..."
                    />
                 </div>
                 <div className="text-left">
                    <label className="block text-xs font-normal text-slate-500 mb-2">Status Akun</label>
                    <div className="flex gap-2">
                       {['ACTIVE', 'INACTIVE'].map((s) => (
                         <button
                           key={s}
                           type="button"
                           onClick={() => setFormData({...formData, status: s})}
                           className={`flex-1 py-4 px-4 rounded-2xl text-[10px] font-normal transition-all border ${
                             formData.status === s 
                               ? 'bg-indigo-600 text-white border-slate-900' 
                               : 'bg-white text-slate-400 border-slate-100 hover:bg-slate-50'
                           }`}
                         >
                           {s}
                         </button>
                       ))}
                    </div>
                 </div>
              </div>
           </div>

           <button 
             type="submit"
             disabled={isSubmitting}
             className="w-full bg-slate-900 text-white py-5 rounded-2xl text-sm font-normal shadow-xl shadow-slate-900/20 hover:bg-black transition-all active:scale-95 flex items-center justify-center gap-3"
           >
             {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
             Simpan Perubahan
           </button>
        </form>
      </div>
    </div>
  );
}

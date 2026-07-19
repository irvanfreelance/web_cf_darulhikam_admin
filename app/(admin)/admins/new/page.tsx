"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ChevronLeft, ShieldCheck, Mail, User, ShieldAlert, Loader2, Save
} from 'lucide-react';
import { toast } from 'sonner';

export default function NewAdminPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ 
    name: '', email: '', role: 'ADMIN', status: 'ACTIVE' 
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error('Failed to create admin');
      toast.success('Admin baru berhasil didaftarkan');
      router.push('/admins');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

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
          <h1 className="text-2xl font-normal text-slate-800 tracking-tight">Tambah Administrator</h1>
          <p className="text-sm text-slate-400 font-medium mt-1 text-left">Daftarkan akun admin baru untuk kelola panel</p>
        </div>
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
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
                  placeholder="Masukkan nama lengkap admin..."
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 text-sm font-normal text-slate-900 focus:outline-none focus:border-slate-900/50 transition-all" 
                />
              </div>

              <div className="text-left">
                <label className="block text-xs font-normal text-slate-500 mb-2 flex items-center gap-2">
                  <Mail size={12}/> Email Login
                </label>
                <input 
                  required 
                  type="email"
                  value={formData.email} 
                  onChange={(e) => setFormData({...formData, email: e.target.value})} 
                  placeholder="admin@lenteradonasi.org"
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 text-sm font-normal text-slate-900 focus:outline-none focus:border-slate-900/50 transition-all" 
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                 <div className="text-left">
                    <label className="block text-xs font-normal text-slate-500 mb-2">Hak Akses</label>
                    <select 
                      value={formData.role} 
                      onChange={(e) => setFormData({...formData, role: e.target.value})} 
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 text-sm font-normal text-slate-900 bg-white outline-none focus:border-slate-900/50 transition-all"
                    >
                      <option value="ADMIN">ADMIN</option>
                      <option value="FINANCE">FINANCE</option>
                      <option value="SUPERADMIN">SUPERADMIN</option>
                    </select>
                 </div>
                 <div className="text-left">
                    <label className="block text-xs font-normal text-slate-500 mb-2">Status Akun</label>
                    <label className="block text-xs font-medium text-slate-500 mb-2">Status Akun</label>
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

           <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex items-start gap-4 text-left">
              <div className="p-2 bg-white rounded-xl text-amber-500 shadow-sm"><ShieldAlert size={20}/></div>
              <div>
                <p className="text-xs font-normal text-slate-800 tracking-tight">Catatan Keamanan</p>
                <p className="text-[10px] font-normal text-slate-400 mt-1 leading-relaxed">Setelah disimpan, sistem akan mengirimkan instruksi setel password ke email yang didaftarkan. Pastikan email aktif.</p>
              </div>
           </div>

           <button 
             type="submit"
             disabled={isSubmitting}
             className="w-full bg-indigo-600 text-white py-5 rounded-2xl text-sm font-normal shadow-xl shadow-slate-900/20 hover:bg-black transition-all active:scale-95 flex items-center justify-center gap-3"
           >
             {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <ShieldCheck size={20} />}
             Simpan Akses Admin
           </button>
        </form>
      </div>
    </div>
  );
}

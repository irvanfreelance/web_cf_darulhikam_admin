"use client";

import React from 'react';
import dynamic from 'next/dynamic';
import { X, Users, Heart, Sprout, BookOpen, HandHeart, BriefcaseMedical } from 'lucide-react';
import { cn } from '@/lib/utils';

// Dynamically import the map component so Leaflet doesn't break SSR
const DynamicDistributionMap = dynamic(
  () => import('./distribution-map'),
  { 
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-slate-100 animate-pulse flex items-center justify-center">
        <span className="text-slate-400 font-medium">Memuat Peta...</span>
      </div>
    )
  }
);

interface DistributionMapModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DistributionMapModal({ isOpen, onClose }: DistributionMapModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 sm:p-6" onClick={onClose}>
      <div 
        className="w-full max-w-6xl h-[90vh] sm:h-[80vh] bg-white rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header / Brand Area */}
        <div className="h-16 bg-[#76b541] flex items-center justify-between px-6 shrink-0 z-10 relative">
           <div>
             <h2 className="text-white font-extrabold text-xl tracking-tight">Peta Sebaran</h2>
             <p className="text-white/80 text-sm font-medium">LAZ Darul Hikam</p>
           </div>
           
           <button 
             onClick={onClose}
             className="w-8 h-8 flex items-center justify-center bg-black/10 hover:bg-black/20 text-white rounded-full transition-colors"
           >
             <X size={18} strokeWidth={3} />
           </button>
        </div>

        {/* Map Area */}
        <div className="flex-1 relative flex flex-col md:flex-row bg-[#f8faf9] overflow-hidden">
           
           {/* Map Container */}
           <div className="w-full md:w-[65%] h-[40vh] md:h-full relative shrink-0">
             <DynamicDistributionMap />
           </div>

           {/* Stats Overlay Container (Right Side) */}
           <div className="flex-1 md:h-full overflow-y-auto custom-scrollbar p-6 space-y-8 bg-white border-l border-slate-100">
             
             {/* Total Beneficiaries Overview */}
             <div className="text-center md:text-left space-y-1">
               <div className="text-slate-500 font-bold text-sm uppercase tracking-widest">Total</div>
               <div className="flex items-center justify-center md:justify-start gap-3 text-[#76b541]">
                 <Users size={48} className="shrink-0 opacity-80" />
                 <div className="flex -space-x-4">
                    <Users size={32} className="opacity-60" />
                    <Users size={24} className="opacity-40" />
                 </div>
               </div>
               <div className="text-4xl md:text-5xl font-extrabold text-[#76b541] tracking-tighter mt-2">
                 225.780
               </div>
               <div className="text-slate-500 font-semibold">Penerima Manfaat</div>
             </div>

             <div className="w-full h-px bg-slate-100"></div>

             {/* Locations List */}
             <div>
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-4">Wilayah Terjangkau</h3>
                <div className="grid grid-cols-2 gap-x-4 gap-y-6">
                  {/* Indonesia */}
                  <div>
                    <div className="font-bold text-sm text-slate-700 mb-2 border-b border-slate-100 pb-1">Indonesia</div>
                    <ul className="space-y-1.5 text-xs text-slate-500">
                      <li>Jawa Barat (Bandung, Sumedang, Garut, Tasikmalaya, Cianjur, Sukabumi)</li>
                      <li>DKI Jakarta</li>
                      <li>Banten</li>
                      <li>Jawa Tengah</li>
                      <li>Jawa Timur</li>
                      <li>Kalimantan</li>
                      <li>Sumatera (Aceh, Sumut, Sumbar)</li>
                      <li>Bengkulu</li>
                      <li>Kepulauan Riau (Natuna)</li>
                      <li>Sulawesi (Barat, Selatan, Makassar)</li>
                      <li>Bali</li>
                      <li>Nusa Tenggara Timur (Alor)</li>
                      <li>Maluku (Ambon)</li>
                    </ul>
                  </div>
                  
                  {/* Global */}
                  <div>
                    <div className="font-bold text-sm text-slate-700 mb-2 border-b border-slate-100 pb-1">Global</div>
                    <ul className="space-y-1.5 text-xs text-slate-500 font-medium">
                      <li>Palestina</li>
                      <li>Myanmar</li>
                      <li>Jepang</li>
                      <li>Uganda</li>
                      <li>Yordania</li>
                      <li>Mesir</li>
                    </ul>
                  </div>
                </div>
             </div>
             
           </div>
        </div>

        {/* Bottom "Jejak Kebaikan" Stats (Mimicking Gambar 2 Bottom Section) */}
        <div className="bg-[#76b541] p-6 text-white shrink-0 grid grid-cols-2 md:grid-cols-4 gap-6 relative overflow-hidden">
           {/* Decorative background logo would go here ideally */}
           
           <div className="col-span-2 md:col-span-4 mb-2">
              <h2 className="text-3xl font-serif font-bold italic tracking-tight">Jejak Kebaikan</h2>
              <p className="text-white/80 font-medium text-sm">LAZ DARUL HIKAM</p>
           </div>
           
           <StatItem icon={BookOpen} label="Peduli Pendidikan" value="8.983" />
           <StatItem icon={Sprout} label="Peduli Lingkungan" value="16.014" />
           <StatItem icon={HandHeart} label="Peduli Umat" value="49.678" />
           <StatItem icon={BriefcaseMedical} label="Peduli Kesehatan" value="2.941" />
           <StatItem icon={Heart} label="Peduli Ekonomi" value="9.849" />
           <StatItem icon={Heart} label="Program Khusus" value="147.298" />
        </div>

      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 5px; }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb { background: #94a3b8; }
      `}} />
    </div>
  );
}

function StatItem({ icon: Icon, label, value }: { icon: any, label: string, value: string }) {
  return (
    <div className="flex flex-col">
      <div className="w-10 h-10 mb-2 flex items-center justify-center">
        <Icon size={28} className="text-white" />
      </div>
      <div className="font-semibold text-white/90 text-sm leading-tight mb-1">{label}</div>
      <div className="text-2xl font-extrabold tracking-tight">{value}</div>
      <div className="text-[10px] text-white/70 font-medium uppercase tracking-wider mt-0.5">Penerima Manfaat</div>
    </div>
  )
}

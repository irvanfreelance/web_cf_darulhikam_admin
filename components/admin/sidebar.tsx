"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Megaphone, Receipt, Users, Settings,
  Menu, LogOut, Heart, Tags, CreditCard, BellRing,
  ShieldCheck, History, Wallet, MessageSquare, User,
  Globe, FileText, BarChart2, PieChart, Users2, Shield,
  Building, HelpCircle, Star, Activity, FileCheck, BookOpen, Info, HeartHandshake,
  Send, Truck, Repeat, MapPin, ClipboardCheck,
  Landmark, Lock, FileBarChart, IdCard, Folder, Mail,
  Hash, FileSpreadsheet, Building2, BadgeCheck, Calculator,
  Briefcase, Calendar, Book, BookText, Scale, CalendarCheck, ListChecks,
  ChevronDown, ChevronRight
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import useSWR from 'swr';
import { useSession, signOut } from 'next-auth/react';
import Image from 'next/image';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// FINS / Penyaluran / HCM / Document module menus — grouped into collapsible
// accordion categories (unlike crowdfund/website, which stay flat lists) so
// the ~30 combined items don't push the sidebar into an endless scroll.
// Mirrors the prototype's src/components/Sidebar.jsx MODULE_GROUPS.
type AccordionItem = { icon: any; label: string; href: string };
type AccordionGroup = { category: string; items: AccordionItem[] };

const finsMenus: AccordionGroup[] = [
  { category: 'Home', items: [
    { icon: LayoutDashboard, label: 'Dashboard Cash Bank', href: '/fins/coming-soon?title=Dashboard+Cash+Bank' },
    { icon: FileText, label: 'Pengajuan CA', href: '/fins/pengajuan-ca' },
    { icon: Send, label: 'Pencairan', href: '/fins/coming-soon?title=Pencairan' },
    { icon: ClipboardCheck, label: 'Pertanggungjawaban CA', href: '/fins/coming-soon?title=Pertanggungjawaban+CA' },
    { icon: Receipt, label: 'Pengeluaran', href: '/fins/coming-soon?title=Pengeluaran' },
    { icon: Wallet, label: 'Penerimaan', href: '/fins/coming-soon?title=Penerimaan' },
    { icon: BookOpen, label: 'Buku Harian', href: '/fins/coming-soon?title=Buku+Harian' },
    { icon: Lock, label: 'Penutupan', href: '/fins/coming-soon?title=Penutupan' },
    { icon: FileBarChart, label: 'Resume Dana Pengelola', href: '/fins/coming-soon?title=Resume+Dana+Pengelola' },
  ]},
  { category: 'Akuntansi', items: [
    { icon: Landmark, label: 'Saldo Awal', href: '/fins/coming-soon?title=Saldo+Awal' },
    { icon: BookText, label: 'Rekap Jurnal', href: '/fins/coming-soon?title=Rekap+Jurnal' },
    { icon: Book, label: 'Buku Besar', href: '/fins/coming-soon?title=Buku+Besar' },
    { icon: Scale, label: 'Trial Balance', href: '/fins/coming-soon?title=Trial+Balance' },
  ]},
  { category: 'Laporan', items: [
    { icon: BarChart2, label: 'Laporan Keuangan', href: '/fins/coming-soon?title=Laporan+Keuangan' },
    { icon: Calendar, label: 'Laporan Bulanan', href: '/fins/coming-soon?title=Laporan+Bulanan' },
  ]},
  { category: 'Aset', items: [
    { icon: Building2, label: 'Entry Aset', href: '/fins/coming-soon?title=Entry+Aset' },
    { icon: FileSpreadsheet, label: 'List Aset', href: '/fins/coming-soon?title=List+Aset' },
  ]},
  { category: 'Setting Configuration', items: [
    { icon: Briefcase, label: 'Profile Lembaga', href: '/fins/coming-soon?title=Profile+Lembaga' },
    { icon: Settings, label: 'Program', href: '/fins/coming-soon?title=Program' },
  ]},
  { category: 'FINS', items: [
    { icon: Hash, label: 'Kode Bank', href: '/fins/coming-soon?title=Kode+Bank' },
    { icon: CreditCard, label: 'Rekening Bank', href: '/fins/coming-soon?title=Rekening+Bank' },
    { icon: FileSpreadsheet, label: 'Chart of Accounts', href: '/fins/coming-soon?title=Chart+of+Accounts' },
    { icon: Building2, label: 'COA Kantor', href: '/fins/coming-soon?title=COA+Kantor' },
    { icon: Wallet, label: 'Saldo Dana', href: '/fins/coming-soon?title=Saldo+Dana' },
    { icon: BadgeCheck, label: 'Level Approve', href: '/fins/coming-soon?title=Level+Approve' },
    { icon: Calculator, label: 'Rumus Report', href: '/fins/coming-soon?title=Rumus+Report' },
  ]},
];

const penyaluranMenus: AccordionGroup[] = [
  { category: 'Operasional', items: [
    { icon: MapPin, label: 'Peta Penyaluran', href: '/fins/coming-soon?title=Peta+Penyaluran' },
    { icon: Send, label: 'Pengajuan Penyaluran', href: '/fins/coming-soon?title=Pengajuan+Penyaluran' },
    { icon: Users, label: 'Penerima Manfaat', href: '/fins/coming-soon?title=Penerima+Manfaat' },
    { icon: Repeat, label: 'Distribusi Massal', href: '/fins/coming-soon?title=Distribusi+Massal' },
  ]},
  { category: 'Pertanggungjawaban', items: [
    { icon: ClipboardCheck, label: 'Pertanggungjawaban', href: '/fins/coming-soon?title=Pertanggungjawaban' },
  ]},
  { category: 'Laporan', items: [
    { icon: BarChart2, label: 'Laporan Penyaluran', href: '/fins/coming-soon?title=Laporan+Penyaluran' },
  ]},
];

const hcmMenus: AccordionGroup[] = [
  { category: 'Kepegawaian', items: [
    { icon: Users, label: 'Data Karyawan', href: '/fins/coming-soon?title=Data+Karyawan' },
  ]},
  { category: 'Presensi', items: [
    { icon: CalendarCheck, label: 'Kehadiran Karyawan', href: '/fins/coming-soon?title=Kehadiran+Karyawan' },
  ]},
  { category: 'Produktivitas', items: [
    { icon: ListChecks, label: 'Aktivitas Harian', href: '/fins/coming-soon?title=Aktivitas+Harian' },
  ]},
];

const documentMenus: AccordionGroup[] = [
  { category: 'Kearsipan', items: [
    { icon: FileText, label: 'Daftar Dokumen', href: '/fins/coming-soon?title=Daftar+Dokumen' },
    { icon: Mail, label: 'Surat Menyurat', href: '/fins/coming-soon?title=Surat+Menyurat' },
  ]},
];

type AdminModule = 'crowdfund' | 'website' | 'tutorial' | 'penyaluran' | 'fins' | 'hcm' | 'document';

const MODULE_ACCENT: Record<string, { bg: string; text: string; border?: string }> = {
  penyaluran: { bg: 'bg-sky-500/10', text: 'text-sky-400' },
  fins: { bg: 'bg-amber-500/10', text: 'text-amber-400' },
  hcm: { bg: 'bg-rose-500/10', text: 'text-rose-400' },
  document: { bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
};

// Crowdfunding Module Menus
const crowdfundMenus = [
  { group: null, items: [{ icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' }] },
  { group: 'MANAJEMEN', items: [
    { icon: Megaphone, label: 'Kampanye', href: '/campaigns' },
    { icon: MessageSquare, label: 'Kabar Penyaluran', href: '/campaign-updates' },
    { icon: Tags, label: 'Kategori', href: '/categories' },
    { icon: Receipt, label: 'Transaksi', href: '/transactions' },
    { icon: Users, label: 'Donatur', href: '/donors' },
    { icon: Heart, label: 'Afiliasi', href: '/affiliates' },
    { icon: Wallet, label: 'Penarikan', href: '/withdrawals' },
  ]},
  { group: 'SISTEM', items: [
    { icon: BellRing, label: 'Notifikasi', href: '/notifications' },
    { icon: ShieldCheck, label: 'Admin', href: '/admins' },
    { icon: CreditCard, label: 'Payment Channels', href: '/payment-channels' },
    { icon: History, label: 'Log Sistem', href: '/logs' },
    { icon: Settings, label: 'Pengaturan', href: '/settings' },
  ]}
];

// Website (CMS) Module Menus
const websiteMenus = [
  { group: 'KONTEN', items: [
    { icon: FileText, label: 'Artikel', href: '/web-articles' },
    { icon: Tags, label: 'Kategori Artikel', href: '/web-article-categories' },
    { icon: MessageSquare, label: 'Testimoni', href: '/web-testimonials' },
    { icon: Users2, label: 'Mitra', href: '/web-partners' },
    { icon: HeartHandshake, label: 'Program Peduli', href: '/web-care-categories' },
  ]},
  { group: 'TRANSPARANSI', items: [
    { icon: FileCheck, label: 'Laporan Keuangan', href: '/web-reports' },
    { icon: BarChart2, label: 'Impact Metrics', href: '/web-metrics' },
  ]},
  { group: 'ORGANISASI', items: [
    { icon: Info, label: 'Tentang Kami', href: '/web-about' },
    { icon: Users, label: 'Tim & Pengurus', href: '/web-team' },
    { icon: Shield, label: 'Legalitas', href: '/web-legality' },
    { icon: Building, label: 'Rekening Resmi', href: '/web-banks' },
  ]},
  { group: 'LAYANAN', items: [
    { icon: HelpCircle, label: 'FAQ', href: '/web-faqs' },
  ]}
];

// Tutorial Menus — jump links into /tutorial, grouped the same way as the two modules
const tutorialMenus = [
  { group: 'WEBSITE CMS', items: [
    { icon: FileText, label: 'Artikel', href: '/tutorial#web-articles' },
    { icon: Tags, label: 'Kategori Artikel', href: '/tutorial#web-article-categories' },
    { icon: MessageSquare, label: 'Testimoni', href: '/tutorial#web-testimonials' },
    { icon: Users2, label: 'Mitra', href: '/tutorial#web-partners' },
    { icon: HeartHandshake, label: 'Program Peduli', href: '/tutorial#web-care-categories' },
    { icon: FileCheck, label: 'Laporan Keuangan', href: '/tutorial#web-reports' },
    { icon: BarChart2, label: 'Impact Metrics', href: '/tutorial#web-metrics' },
    { icon: Info, label: 'Tentang Kami', href: '/tutorial#web-about' },
    { icon: Users, label: 'Tim & Pengurus', href: '/tutorial#web-team' },
    { icon: Shield, label: 'Legalitas', href: '/tutorial#web-legality' },
    { icon: Building, label: 'Rekening Resmi', href: '/tutorial#web-banks' },
    { icon: HelpCircle, label: 'FAQ', href: '/tutorial#web-faqs' },
  ]},
  { group: 'CROWDFUNDING', items: [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/tutorial#dashboard' },
    { icon: Megaphone, label: 'Kampanye', href: '/tutorial#campaigns' },
    { icon: MessageSquare, label: 'Kabar Penyaluran', href: '/tutorial#campaign-updates' },
    { icon: Tags, label: 'Kategori', href: '/tutorial#categories' },
    { icon: Receipt, label: 'Transaksi', href: '/tutorial#transactions' },
    { icon: Users, label: 'Donatur', href: '/tutorial#donors' },
    { icon: Heart, label: 'Afiliasi', href: '/tutorial#affiliates' },
    { icon: Wallet, label: 'Penarikan', href: '/tutorial#withdrawals' },
    { icon: BellRing, label: 'Notifikasi', href: '/tutorial#notifications' },
    { icon: ShieldCheck, label: 'Admin', href: '/tutorial#admins' },
    { icon: CreditCard, label: 'Payment Channels', href: '/tutorial#payment-channels' },
    { icon: History, label: 'Log Sistem', href: '/tutorial#logs' },
    { icon: Settings, label: 'Pengaturan', href: '/tutorial#settings' },
  ]},
];

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function Sidebar({ isOpen, toggle }: { isOpen: boolean, toggle: () => void }) {
  const pathname = usePathname();
  const { data: config } = useSWR('/api/ngo-config', fetcher);
  const { data: session } = useSession();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [activeModule, setActiveModule] = useState<AdminModule>('crowdfund');
  const ACCORDION_MODULES = new Set(['penyaluran', 'fins', 'hcm', 'document']);
  const ACCORDION_GROUPS: Record<string, AccordionGroup[]> = {
    penyaluran: penyaluranMenus, fins: finsMenus, hcm: hcmMenus, document: documentMenus,
  };
  const [openGroup, setOpenGroup] = useState<Record<string, string | null>>(() => {
    const initial: Record<string, string | null> = {};
    Object.entries(ACCORDION_GROUPS).forEach(([mod, groups]) => { initial[mod] = groups[0]?.category ?? null; });
    return initial;
  });

  // Load active module from local storage on mount
  useEffect(() => {
    const savedModule = localStorage.getItem('active_admin_module');
    if (['crowdfund', 'website', 'tutorial', 'penyaluran', 'fins', 'hcm', 'document'].includes(savedModule || '')) {
      setActiveModule(savedModule as AdminModule);
    }
  }, []);

  // Visiting /tutorial directly (bookmark, refresh, browser back) forces the Tutorial rail + nav on
  // arrival, but only then — it must not keep overriding manual Crowdfund/Website clicks afterwards,
  // since those buttons don't navigate away from /tutorial (they just swap which menu list shows).
  useEffect(() => {
    if (pathname === '/tutorial') setActiveModule('tutorial');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const handleModuleChange = (mod: AdminModule) => {
    setActiveModule(mod);
    localStorage.setItem('active_admin_module', mod);
  };

  const toggleGroup = (moduleKey: string, category: string) => {
    setOpenGroup(prev => ({ ...prev, [moduleKey]: prev[moduleKey] === category ? null : category }));
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await signOut({ callbackUrl: '/login' });
  };

  const userName = session?.user?.name ?? 'Admin';
  const userRole = session?.user?.role ?? '';
  const userImage = session?.user?.image;

  const currentMenus = activeModule === 'crowdfund' ? crowdfundMenus : activeModule === 'website' ? websiteMenus : tutorialMenus;
  const isWebsite = activeModule === 'website';
  const isTutorial = activeModule === 'tutorial';
  const isCrowdfund = activeModule === 'crowdfund';

  return (
    <aside className="h-full flex flex-shrink-0 z-50">
      
      {/* Primary Rail */}
      <div className="w-[72px] h-full bg-[#0b1120] flex flex-col items-center py-4 border-r border-slate-800">
        <div className="mb-6">
          <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center shadow-lg">
             <Heart size={20} className="text-white fill-white/20" />
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-4 w-full px-2">
          <button 
            onClick={() => handleModuleChange('crowdfund')}
            title="Crowdfunding"
            className={cn(
              "flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all",
              isCrowdfund ? "bg-teal-500/20 text-teal-400" : "text-slate-500 hover:text-slate-300 hover:bg-slate-800"
            )}
          >
            <LayoutDashboard size={22} strokeWidth={isCrowdfund ? 2.5 : 2} />
            <span className="text-[9px] font-bold tracking-tight">CROWDFUND</span>
          </button>
          
          <button
            onClick={() => handleModuleChange('website')}
            title="Website CMS"
            className={cn(
              "flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all",
              isWebsite ? "bg-indigo-500/20 text-indigo-400" : "text-slate-500 hover:text-slate-300 hover:bg-slate-800"
            )}
          >
            <Globe size={22} strokeWidth={isWebsite ? 2.5 : 2} />
            <span className="text-[9px] font-bold tracking-tight">WEBSITE</span>
          </button>

          <div className="w-full h-px bg-slate-800 my-1" />

          <button
            onClick={() => handleModuleChange('penyaluran')}
            title="Penyaluran"
            className={cn(
              "flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all",
              activeModule === 'penyaluran' ? "bg-sky-500/20 text-sky-400" : "text-slate-500 hover:text-slate-300 hover:bg-slate-800"
            )}
          >
            <Truck size={22} strokeWidth={activeModule === 'penyaluran' ? 2.5 : 2} />
            <span className="text-[9px] font-bold tracking-tight">PENYALURAN</span>
          </button>

          <button
            onClick={() => handleModuleChange('fins')}
            title="FINS"
            className={cn(
              "flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all",
              activeModule === 'fins' ? "bg-amber-500/20 text-amber-400" : "text-slate-500 hover:text-slate-300 hover:bg-slate-800"
            )}
          >
            <Landmark size={22} strokeWidth={activeModule === 'fins' ? 2.5 : 2} />
            <span className="text-[9px] font-bold tracking-tight">FINS</span>
          </button>

          <button
            onClick={() => handleModuleChange('hcm')}
            title="HCM"
            className={cn(
              "flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all",
              activeModule === 'hcm' ? "bg-rose-500/20 text-rose-400" : "text-slate-500 hover:text-slate-300 hover:bg-slate-800"
            )}
          >
            <IdCard size={22} strokeWidth={activeModule === 'hcm' ? 2.5 : 2} />
            <span className="text-[9px] font-bold tracking-tight">HCM</span>
          </button>

          <button
            onClick={() => handleModuleChange('document')}
            title="Document"
            className={cn(
              "flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all",
              activeModule === 'document' ? "bg-emerald-500/20 text-emerald-400" : "text-slate-500 hover:text-slate-300 hover:bg-slate-800"
            )}
          >
            <Folder size={22} strokeWidth={activeModule === 'document' ? 2.5 : 2} />
            <span className="text-[9px] font-bold tracking-tight">DOCUMENT</span>
          </button>

          <div className="w-full h-px bg-slate-800 my-1" />

          <Link
            href="/tutorial"
            onClick={() => handleModuleChange('tutorial')}
            title="Tutorial"
            className={cn(
              "flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all",
              isTutorial ? "bg-violet-500/20 text-violet-400" : "text-slate-500 hover:text-slate-300 hover:bg-slate-800"
            )}
          >
            <BookOpen size={22} strokeWidth={isTutorial ? 2.5 : 2} />
            <span className="text-[9px] font-bold tracking-tight">TUTORIAL</span>
          </Link>
        </div>
      </div>

      {/* Secondary Sidebar (Sub-menu) */}
      <div 
        className={cn(
          "h-full bg-slate-900 transition-all duration-300 flex flex-col border-r border-slate-800",
          isOpen ? "w-60" : "w-0 overflow-hidden border-r-0"
        )}
      >
        <div className="h-16 flex items-center px-6 border-b border-slate-800/80 shrink-0">
           <h2 className="text-slate-200 font-bold tracking-tight">
             {isTutorial ? "Tutorial" : isWebsite ? "Website CMS" : isCrowdfund ? "Crowdfunding"
               : activeModule === 'penyaluran' ? "Penyaluran" : activeModule === 'fins' ? "FINS"
               : activeModule === 'hcm' ? "HCM" : "Document"}
           </h2>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-4 custom-scrollbar">
          {ACCORDION_MODULES.has(activeModule) ? (
            (() => {
              const accent = MODULE_ACCENT[activeModule];
              return ACCORDION_GROUPS[activeModule].map(group => {
                const isGroupOpen = openGroup[activeModule] === group.category;
                return (
                  <div key={group.category}>
                    <button
                      type="button"
                      onClick={() => toggleGroup(activeModule, group.category)}
                      className="w-full flex items-center justify-between px-3 mb-1 py-1.5 text-[10px] font-bold text-slate-500 tracking-wider hover:text-slate-300 transition-colors"
                    >
                      <span>{group.category.toUpperCase()}</span>
                      <ChevronDown size={13} className={cn("transition-transform", isGroupOpen && "rotate-180")} />
                    </button>
                    {isGroupOpen && (
                      <div className="space-y-1 mb-2">
                        {group.items.map(item => {
                          const isActive = pathname.startsWith('/fins/pengajuan-ca') && item.href === '/fins/pengajuan-ca';
                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group",
                                isActive ? cn(accent.bg, accent.text) : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                              )}
                            >
                              <item.icon size={18} className={cn(isActive ? accent.text : "text-slate-500 group-hover:text-slate-300")} />
                              <span className={cn("font-medium text-sm truncate", isActive && "font-bold")}>{item.label}</span>
                              {isActive && <ChevronRight size={14} className="ml-auto shrink-0" />}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              });
            })()
          ) : (
            currentMenus.map((menuGroup: any, idx: number) => (
              <div key={idx}>
                {menuGroup.group && (
                  <div className="px-3 mb-2 text-[10px] font-bold text-slate-500 tracking-wider">
                    {menuGroup.group}
                  </div>
                )}
                <div className="space-y-1">
                  {menuGroup.items.map((item: any) => {
                    const isActive = pathname.startsWith(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group",
                          isActive
                            ? (isTutorial ? "bg-violet-500/10 text-violet-400" : isWebsite ? "bg-indigo-500/10 text-indigo-400" : "bg-teal-500/10 text-teal-400")
                            : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                        )}
                      >
                        <item.icon size={18} className={cn(
                          isActive ? (isTutorial ? "text-violet-400" : isWebsite ? "text-indigo-400" : "text-teal-400") : "text-slate-500 group-hover:text-slate-300"
                        )} />
                        <span className={cn(
                          "font-medium text-sm truncate",
                          isActive && "font-bold"
                        )}>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* User Card & Logout */}
        <div className="p-3 border-t border-slate-800 shrink-0 space-y-1">
          <div className="flex items-center gap-3 px-3 py-2.5 mb-2 rounded-xl bg-slate-800/50">
            <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center overflow-hidden shrink-0">
              {userImage ? (
                <Image src={userImage} alt={userName} width={32} height={32} className="w-full h-full object-cover" />
              ) : (
                <User size={16} className="text-slate-400" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-200 truncate leading-none mb-0.5">{userName}</p>
              <p className="text-[10px] text-slate-500 capitalize truncate">{userRole.toLowerCase()}</p>
            </div>
          </div>

          <button
            onClick={toggle}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-800/80 transition-all group text-slate-400"
          >
            <Menu size={18} />
            <span className="text-sm font-medium">Collapse Menu</span>
          </button>

          <button
            id="btn-sidebar-logout"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-rose-500/10 transition-all group disabled:opacity-60 disabled:cursor-not-allowed text-slate-400 hover:text-rose-400"
          >
            <LogOut size={18} />
            <span className="text-sm font-medium">
              {isLoggingOut ? 'Keluar...' : 'Keluar'}
            </span>
          </button>
        </div>
      </div>
      
      {/* Global styles for custom scrollbar in sidebar */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb { background: #475569; }
      `}} />
    </aside>
  );
}

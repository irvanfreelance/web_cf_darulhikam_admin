"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Megaphone, Receipt, Users, Settings,
  Menu, LogOut, Heart, Tags, CreditCard, BellRing,
  ShieldCheck, History, Wallet, MessageSquare, User,
  Globe, FileText, BarChart2, PieChart, Users2, Shield,
  Building, HelpCircle, Star, Activity, FileCheck, BookOpen, Info, HeartHandshake
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import useSWR from 'swr';
import { useSession, signOut } from 'next-auth/react';
import Image from 'next/image';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

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
  const [activeModule, setActiveModule] = useState<'crowdfund' | 'website' | 'tutorial'>('crowdfund');

  // Load active module from local storage on mount
  useEffect(() => {
    const savedModule = localStorage.getItem('active_admin_module');
    if (savedModule === 'crowdfund' || savedModule === 'website' || savedModule === 'tutorial') {
      setActiveModule(savedModule);
    }
  }, []);

  // Visiting /tutorial directly (bookmark, refresh, browser back) forces the Tutorial rail + nav on
  // arrival, but only then — it must not keep overriding manual Crowdfund/Website clicks afterwards,
  // since those buttons don't navigate away from /tutorial (they just swap which menu list shows).
  useEffect(() => {
    if (pathname === '/tutorial') setActiveModule('tutorial');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const handleModuleChange = (mod: 'crowdfund' | 'website' | 'tutorial') => {
    setActiveModule(mod);
    localStorage.setItem('active_admin_module', mod);
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
             {isTutorial ? "Tutorial" : isWebsite ? "Website CMS" : "Crowdfunding"}
           </h2>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-4 custom-scrollbar">
          {currentMenus.map((menuGroup, idx) => (
            <div key={idx}>
              {menuGroup.group && (
                <div className="px-3 mb-2 text-[10px] font-bold text-slate-500 tracking-wider">
                  {menuGroup.group}
                </div>
              )}
              <div className="space-y-1">
                {menuGroup.items.map(item => {
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
          ))}
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

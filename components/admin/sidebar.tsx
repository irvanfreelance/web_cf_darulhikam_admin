"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Megaphone, Receipt, Users, Settings,
  Menu, LogOut, Heart, Tags, CreditCard, BellRing,
  ShieldCheck, History, Wallet, MessageSquare, User
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import useSWR from 'swr';
import { useSession, signOut } from 'next-auth/react';
import Image from 'next/image';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: Megaphone, label: 'Kampanye', href: '/campaigns' },
  { icon: MessageSquare, label: 'Kabar Penyaluran', href: '/campaign-updates' },
  { icon: Tags, label: 'Kategori', href: '/categories' },
  { icon: Receipt, label: 'Transaksi', href: '/transactions' },
  { icon: Users, label: 'Donatur', href: '/donors' },
  { icon: Heart, label: 'Afiliasi', href: '/affiliates' },
  { icon: Wallet, label: 'Penarikan', href: '/withdrawals' },
  { icon: BellRing, label: 'Notifikasi', href: '/notifications' },
  { icon: ShieldCheck, label: 'Admin', href: '/admins' },
  { icon: CreditCard, label: 'Payment Channels', href: '/payment-channels' },
  { icon: History, label: 'Log Sistem', href: '/logs' },
  { icon: Settings, label: 'Pengaturan', href: '/settings' },
];

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function Sidebar({ isOpen, toggle }: { isOpen: boolean, toggle: () => void }) {
  const pathname = usePathname();
  const { data: config } = useSWR('/api/ngo-config', fetcher);
  const { data: session } = useSession();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await signOut({ callbackUrl: '/login' });
  };

  const userName = session?.user?.name ?? 'Admin';
  const userRole = session?.user?.role ?? '';
  const userImage = session?.user?.image;

  return (
    <aside 
      className={cn(
        "fixed left-0 top-0 h-full bg-slate-800 text-slate-300 transition-all duration-300 z-50 flex flex-col shadow-2xl",
        isOpen ? "w-64" : "w-20"
      )}
    >
      {/* Logo Section */}
      <div className={cn(
        "flex items-center gap-3 border-b border-slate-700/50 transition-all duration-300",
        isOpen ? "p-6" : "p-4 justify-center"
      )}>
        <div className={cn(
          "shrink-0 overflow-hidden flex items-center justify-center transition-all",
          config?.logo_url ? "w-20 h-20" : "w-12 h-12 rounded-xl bg-primary border border-white/10 shadow-lg"
        )}>
          {config?.logo_url ? (
            <img src={config.logo_url} alt="Logo" className="w-full h-full object-contain" />
          ) : (
            <Heart size={24} className="text-white fill-white/20" />
          )}
        </div>
        {isOpen && (
          <div className="font-bold text-sm text-white truncate animate-in fade-in duration-500 leading-tight">
            {config?.ngo_name || 'Lentera Donasi'}
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all group",
                isActive 
                  ? "bg-primary text-white shadow-lg shadow-primary/20" 
                  : "hover:bg-slate-800 hover:text-slate-100"
              )}
            >
              <item.icon size={20} className={cn(isActive ? "text-white" : "text-slate-400 group-hover:text-slate-200")} />
              {isOpen && <span className="font-medium text-sm animate-in slide-in-from-left-2 duration-300">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer / Toggle + User Info */}
      <div className="p-4 border-t border-slate-700/50 space-y-1">
        {/* User card (only when expanded) */}
        {isOpen && (
          <div className="flex items-center gap-3 px-3 py-2.5 mb-2 rounded-xl bg-slate-700/40">
            <div className="w-8 h-8 rounded-lg bg-slate-600 flex items-center justify-center overflow-hidden shrink-0 border border-slate-500/50">
              {userImage ? (
                <Image src={userImage} alt={userName} width={32} height={32} className="w-full h-full object-cover" />
              ) : (
                <User size={16} className="text-slate-300" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate leading-none mb-0.5">{userName}</p>
              <p className="text-[10px] text-slate-400 capitalize truncate">{userRole.toLowerCase()}</p>
            </div>
          </div>
        )}

        <button
          onClick={toggle}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-700/60 transition-all group"
        >
          <Menu size={20} className="text-slate-400 group-hover:text-slate-200" />
          {isOpen && <span className="text-sm font-medium text-slate-300 group-hover:text-white">Collapse Menu</span>}
        </button>

        <button
          id="btn-sidebar-logout"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-rose-500/10 transition-all group disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <LogOut size={20} className="text-slate-400 group-hover:text-rose-400 transition-colors" />
          {isOpen && (
            <span className="text-sm font-medium text-slate-400 group-hover:text-rose-400 transition-colors">
              {isLoggingOut ? 'Keluar...' : 'Keluar'}
            </span>
          )}
        </button>
      </div>
    </aside>
  );
}

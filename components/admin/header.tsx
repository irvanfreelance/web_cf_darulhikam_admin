"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Search, Bell, User, LogOut, ChevronDown, Shield } from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';
import Image from 'next/image';

export default function Header({ title }: { title: string }) {
  const { data: session } = useSession();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await signOut({ callbackUrl: '/login' });
  };

  const userName = session?.user?.name ?? 'Admin';
  const userEmail = session?.user?.email ?? '';
  const userRole = session?.user?.role ?? 'Admin';
  const userImage = session?.user?.image;

  return (
    <header className="h-16 border-b border-slate-100 bg-white flex items-center justify-between px-8 sticky top-0 z-40">
      <h1 className="text-xl font-normal text-slate-800">{title}</h1>

      <div className="flex items-center gap-6">
        {/* Search Bar */}
        <div className="relative hidden md:block group">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" />
          <input
            type="text"
            placeholder="Search anything..."
            className="bg-slate-50 border border-slate-100 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/5 transition-all w-64"
          />
        </div>

        {/* Action Icons */}
        <div className="flex items-center gap-3">
          <button className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all relative">
            <Bell size={20} />
            <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white" />
          </button>

          <div className="h-8 w-px bg-slate-100 mx-2" />

          {/* User Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              id="btn-user-dropdown"
              onClick={() => setDropdownOpen((v) => !v)}
              className="flex items-center gap-3 cursor-pointer group rounded-xl px-2 py-1.5 hover:bg-slate-50 transition-all"
            >
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-slate-800 leading-none mb-1">{userName}</p>
                <p className="text-[10px] font-medium text-slate-400 capitalize">{userRole.toLowerCase()}</p>
              </div>

              {/* Avatar */}
              <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 group-hover:ring-2 group-hover:ring-primary/30 transition-all border border-slate-200 overflow-hidden shrink-0">
                {userImage ? (
                  <Image
                    src={userImage}
                    alt={userName}
                    width={36}
                    height={36}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User size={18} />
                )}
              </div>

              <ChevronDown
                size={14}
                className={`text-slate-400 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                {/* User info */}
                <div className="px-4 py-3 border-b border-slate-50 bg-slate-50/80">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                      {userImage ? (
                        <Image
                          src={userImage}
                          alt={userName}
                          width={40}
                          height={40}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User size={20} className="text-slate-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{userName}</p>
                      <p className="text-xs text-slate-400 truncate">{userEmail}</p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-1.5">
                    <Shield size={12} className="text-teal-500" />
                    <span className="text-[11px] font-medium text-teal-600 capitalize">{userRole.toLowerCase()}</span>
                  </div>
                </div>

                {/* Logout */}
                <div className="p-2">
                  <button
                    id="btn-header-logout"
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-rose-600 hover:bg-rose-50 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <LogOut size={16} />
                    {isLoggingOut ? 'Keluar...' : 'Keluar'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

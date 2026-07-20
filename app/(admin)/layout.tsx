"use client";

import React, { useState } from 'react';
import useSWR from 'swr';
import Sidebar from '@/components/admin/sidebar';
import Header from '@/components/admin/header';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { data: config } = useSWR('/api/ngo-config', (url) => fetch(url).then(res => res.json()));


  return (
    <div className="h-screen bg-slate-50 flex overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        toggle={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <Header title={config?.ngo_name || "Lentera Donasi Admin"} />

        <main className="flex-1 overflow-y-auto p-8 animate-in fade-in slide-in-from-bottom-2 duration-200">
          {children}

          {/* Footer */}
          <footer className="mt-8 text-center pb-4">
            <p className="text-xs text-slate-400 font-medium tracking-wide">
              &copy; {new Date().getFullYear()} Lentera Donasi.
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
}

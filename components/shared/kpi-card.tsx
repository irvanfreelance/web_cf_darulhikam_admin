import React from 'react';
import { LucideIcon } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface KPICardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
  bg: string;
  trend?: string;
  trendUp?: boolean;
}

export default function KPICard({ title, value, icon: Icon, color, bg, trend, trendUp }: KPICardProps) {
  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-5 transition-all hover:shadow-md hover:border-slate-200">
      <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm", bg, color)}>
        <Icon size={24} />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-slate-400 mb-1">{title}</p>
        <div className="flex items-center gap-2">
          <h3 className="text-2xl font-normal text-slate-800 tracking-tight">{value}</h3>
          {trend && (
            <span className={cn(
              "text-[10px] font-normal px-1.5 py-0.5 rounded-full",
              trendUp ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
            )}>
              {trend}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

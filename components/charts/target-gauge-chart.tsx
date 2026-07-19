"use client";

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

export default function TargetGaugeChart({ value, max, color = '#14b8a6' }: { value: number; max: number; color?: string }) {
  const percentage = Math.min((value / max) * 100, 100);
  const data = [
    { name: 'Achieved', value: percentage },
    { name: 'Remaining', value: 100 - percentage },
  ];

  return (
    <div className="w-full h-[200px] relative flex flex-col items-center justify-center">
      <ResponsiveContainer width="100%" height="100%" minHeight={200}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            startAngle={180}
            endAngle={0}
            innerRadius={60}
            outerRadius={80}
            paddingAngle={0}
            dataKey="value"
            stroke="none"
            cornerRadius={10}
          >
            <Cell key={`cell-0`} fill={color} />
            <Cell key={`cell-1`} fill="#f1f5f9" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      
      {/* Center Text */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-2 text-center">
        <span className="text-3xl font-extrabold text-slate-800 leading-none">{percentage.toFixed(1)}%</span>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Tercapai</p>
      </div>
    </div>
  );
}

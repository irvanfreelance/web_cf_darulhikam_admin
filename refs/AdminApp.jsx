"use client";

import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, Megaphone, Tags, Users, Receipt, CreditCard, BellRing,
  ShieldCheck, Settings, Plus, Search, Filter, Edit, Trash2, CheckCircle,
  XCircle, Save, Image as ImageIcon, Palette, Share2, Heart, User,
  ChevronLeft, Menu, TrendingUp, Eye, Mail, MessageSquare, Clock, BarChart3,
  ArrowUpRight, Newspaper
} from 'lucide-react';

// --- MOCK DATA FOR ADMIN ---
const dashboardSummary = {
  totalRevenue: 850450000,
  targetRevenue: 1500000000, // Target kumulatif NGO
  totalDonors: 4231,
  activeCampaigns: 12,
  successTransactions: 5120
};

// Data tren 7 hari (Mock)
const revenueTrendData = [
  { day: 'Sen', value: 15000000 },
  { day: 'Sel', value: 22000000 },
  { day: 'Rab', value: 18000000 },
  { day: 'Kam', value: 35000000 },
  { day: 'Jum', value: 55000000 }, // Lonjakan di hari Jumat
  { day: 'Sab', value: 28000000 },
  { day: 'Min', value: 20000000 },
];

const mockCampaigns = [
  { id: 1, title: 'Bantu Adik Rina Sembuh', category: 'Medis', target: 150000000, collected: 105000000, status: 'Active', type: 'Open Amount', views: 12400 },
  { id: 2, title: 'Tunaikan Zakat Profesi', category: 'Zakat', target: 500000000, collected: 125000000, status: 'Active', type: 'Zakat', views: 8900 },
  { id: 3, title: 'Qurban Pedalaman Sapi Utuh', category: 'Qurban', target: 420000000, collected: 360000000, status: 'Active', type: 'Qurban', views: 4200 },
  { id: 4, title: 'Infaq Operasional Dakwah', category: 'Infaq', target: null, collected: 15450000, status: 'Active', type: 'No Target', views: 15600 },
  { id: 5, title: 'Pembangunan Masjid Al-Ikhlas', category: 'Pembangunan', target: 1000000000, collected: 850000000, status: 'Active', type: 'Open Amount', views: 25000 },
];

const mockTransactions = [
  { id: 'TRX-9921', date: '12 Okt 2026 14:30', donor: 'Andi Dermawan', campaign: 'Bantu Adik Rina', amount: 100000, method: 'GoPay', status: 'Success' },
  { id: 'TRX-9922', date: '12 Okt 2026 15:10', donor: 'Hamba Allah', campaign: 'Tunaikan Zakat', amount: 500000, method: 'BCA VA', status: 'Pending' },
  { id: 'TRX-9923', date: '12 Okt 2026 16:05', donor: 'Budi Santoso', campaign: 'Qurban Sapi Utuh', amount: 21000000, method: 'Mandiri VA', status: 'Success' },
  { id: 'TRX-9924', date: '11 Okt 2026 09:15', donor: 'Siti Aminah', campaign: 'Pembangunan Masjid', amount: 5000000, method: 'BSI VA', status: 'Success' },
];

const mockCategories = [
  { id: 1, name: 'Zakat', count: 2, color: 'emerald' },
  { id: 2, name: 'Qurban', count: 3, color: 'amber' },
  { id: 3, name: 'Medis', count: 5, color: 'rose' },
  { id: 4, name: 'Panti Asuhan', count: 2, color: 'teal' },
];

const mockDonors = [
  { id: 'DNR-001', name: 'Andi Dermawan', email: 'andi@email.com', phone: '08123456789', totalDonated: 1500000, joinDate: '10 Jan 2026' },
  { id: 'DNR-002', name: 'Budi Santoso', email: 'budi.s@email.com', phone: '08567890123', totalDonated: 25000000, joinDate: '15 Mar 2026' },
  { id: 'DNR-003', name: 'Siti Aminah', email: 'siti@email.com', phone: '08198765432', totalDonated: 350000, joinDate: '01 Okt 2026' },
];

const mockPayments = [
  { id: 1, name: 'GoPay', provider: 'Midtrans', type: 'E-Wallet', fee: '2%', status: 'Active' },
  { id: 2, name: 'BCA Virtual Account', provider: 'Xendit', type: 'Bank Transfer', fee: 'Rp 4.000', status: 'Active' },
  { id: 3, name: 'Mandiri Virtual Account', provider: 'Xendit', type: 'Bank Transfer', fee: 'Rp 4.000', status: 'Active' },
];

const mockAdmins = [
  { id: 1, name: 'Ahmad Fulan', email: 'ahmad@ngo.org', role: 'Super Admin', status: 'Active' },
  { id: 2, name: 'Rina Keuangan', email: 'rina@ngo.org', role: 'Finance', status: 'Active' },
];

// --- HELPER FORMATTER ---
const formatIDR = (amount) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount || 0);
const formatCompactNumber = (number) => {
  if (number >= 1e9) return (number / 1e9).toFixed(1) + 'M';
  if (number >= 1e6) return (number / 1e6).toFixed(1) + 'Jt';
  if (number >= 1e3) return (number / 1e3).toFixed(1) + 'Rb';
  return number;
};

// --- CUSTOM SVG CHARTS ---

// Custom Line Chart Component
const SimpleLineChart = ({ data, color = '#0ea5e9' }) => {
  if (!data || data.length === 0) return null;

  const height = 180;
  const width = 1000; // viewBox width
  const padding = 20;

  const maxVal = Math.max(...data.map(d => d.value));
  const minVal = 0; // Mulai dari 0

  // Skala sumbu
  const scaleX = (width - padding * 2) / (data.length - 1);
  const scaleY = (height - padding * 2) / (maxVal - minVal || 1);

  // Buat path (d) untuk kurva
  const pathD = data.map((d, i) => {
    const x = padding + i * scaleX;
    const y = height - padding - ((d.value - minVal) * scaleY);
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  // Buat area untuk gradient fill
  const areaD = `${pathD} L ${width - padding} ${height - padding} L ${padding} ${height - padding} Z`;

  return (
    <div className="w-full h-full relative" style={{ minHeight: '200px' }}>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
        <defs>
          <linearGradient id={`gradient-${color}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.2} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>

        {/* Grid lines (horizontal) */}
        {[0, 0.5, 1].map((ratio, i) => (
          <g key={`grid-${i}`}>
            <line
              x1={padding} y1={height - padding - (height - padding * 2) * ratio}
              x2={width - padding} y2={height - padding - (height - padding * 2) * ratio}
              stroke="#e2e8f0" strokeDasharray="4 4" strokeWidth="1"
            />
            {/* Y Axis Labels */}
            <text x={0} y={height - padding - (height - padding * 2) * ratio + 4} fontSize="10" fill="#94a3b8" textAnchor="start">
              {formatCompactNumber(maxVal * ratio)}
            </text>
          </g>
        ))}

        {/* Fill Area */}
        <path d={areaD} fill={`url(#gradient-${color})`} />

        {/* Line */}
        <path d={pathD} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

        {/* Data points & X Axis Labels */}
        {data.map((d, i) => {
          const x = padding + i * scaleX;
          const y = height - padding - ((d.value - minVal) * scaleY);
          return (
            <g key={i}>
              <circle cx={x} cy={y} r="4" fill="#fff" stroke={color} strokeWidth="2" className="transition-all hover:r-6" />
              {/* X Axis Labels */}
              <text x={x} y={height} fontSize="12" fill="#64748b" textAnchor="middle">{d.day}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

// Custom Gauge Chart Component
const SimpleGaugeChart = ({ value, max, color = '#10b981', title }) => {
  const radius = 60;
  const strokeWidth = 12;
  const cx = 80;
  const cy = 80;

  // Menghitung keliling lingkaran
  const circumference = 2 * Math.PI * radius;

  // Gauge biasanya setengah lingkaran (180 derajat)
  // Kita offset agar mulai dari kiri bawah
  const strokeDashoffset = circumference;

  // Rasio progres (dibatasi maks 100%)
  const percentage = max ? Math.min((value / max), 1) : 0;
  const displayPercentage = max ? ((value / max) * 100).toFixed(1) : 0;

  // Karena kita mau setengah lingkaran, nilai progresnya dikali 0.5
  const progressOffset = circumference - (percentage * circumference * 0.5);

  return (
    <div className="flex flex-col items-center justify-center relative w-40 h-32 mx-auto">
      <svg viewBox="0 0 160 100" className="w-full h-full overflow-visible">
        {/* Background Arc (Setengah Lingkaran) */}
        <circle
          cx={cx} cy={cy} r={radius}
          fill="none"
          stroke="#f1f5f9"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * 0.5} // Tampilkan hanya setengah
          strokeLinecap="round"
          transform={`rotate(180 ${cx} ${cy})`}
        />
        {/* Progress Arc */}
        <circle
          cx={cx} cy={cy} r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={progressOffset}
          strokeLinecap="round"
          transform={`rotate(180 ${cx} ${cy})`}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      {/* Text inside gauge */}
      <div className="absolute bottom-4 flex flex-col items-center">
        <span className="text-2xl font-bold text-slate-800 leading-none">{displayPercentage}%</span>
        {title && <span className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">{title}</span>}
      </div>
    </div>
  );
};


export default function AdminPanel() {
  // States
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isFormMode, setIsFormMode] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  // Campaign Form State
  const [campForm, setCampForm] = useState({
    title: '', category: '', image: '', description: '',
    isZakat: false, isQurban: false, isFixedAmount: false, hasNoTarget: false, hasNoTimeLimit: false,
    target: '', daysLeft: '', packagePrice: '', packageName: '',
    qurbanVariants: [{ name: '', price: '', namesPerQty: 1 }]
  });

  // Inject Font
  useEffect(() => {
    document.title = "Admin Dashboard - DonasiOnline";
    const icon = document.querySelector("link[rel~='icon']");
    if (icon) {
      icon.href = "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>⚙️</text></svg>";
    }
    const style = document.createElement('style');
    style.innerHTML = `@import url('https://fonts.googleapis.com/css2?family=Source+Sans+Pro:wght@300;400;600;700&display=swap');`;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  // Navigation Helper
  const navigateTo = (tab) => {
    setActiveTab(tab);
    setIsFormMode(false);
    setSelectedItem(null);
  };

  // --- NAVIGATION COMPONENT ---
  const SidebarItem = ({ icon: Icon, label, id }) => (
    <button
      onClick={() => navigateTo(id)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium ${(activeTab === id || (id === 'campaigns' && isFormMode && activeTab === 'campaign_form') || (id === 'campaigns' && selectedItem && (activeTab === 'campaigns' || activeTab === 'campaign_updates')))
        ? 'bg-teal-500 text-white shadow-md shadow-teal-500/20'
        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
        }`}
    >
      <Icon size={18} />
      {label}
    </button>
  );

  // --- COMPONENT RENDERERS ---

  const renderDashboard = () => {
    // Sort campaigns by collected to get Top 5
    const topCampaigns = [...mockCampaigns].sort((a, b) => b.collected - a.collected).slice(0, 5);

    return (
      <div className="animate-in fade-in duration-300">
        <h1 className="text-2xl font-bold text-slate-800 mb-6">Dashboard Summary</h1>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {[
            { title: 'Total Donasi Terkumpul', value: formatIDR(dashboardSummary.totalRevenue), icon: Receipt, color: 'text-teal-600', bg: 'bg-teal-100' },
            { title: 'Total Donatur', value: dashboardSummary.totalDonors, icon: Users, color: 'text-blue-600', bg: 'bg-blue-100' },
            { title: 'Kampanye Aktif', value: dashboardSummary.activeCampaigns, icon: Megaphone, color: 'text-amber-600', bg: 'bg-amber-100' },
            { title: 'Transaksi Berhasil', value: dashboardSummary.successTransactions, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-100' },
          ].map((stat, i) => (
            <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center ${stat.bg} ${stat.color} shrink-0`}>
                <stat.icon size={24} />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">{stat.title}</p>
                <h3 className="text-xl font-bold text-slate-800">{stat.value}</h3>
              </div>
            </div>
          ))}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Line Chart: Tren Donasi */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 lg:col-span-2">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Tren Donasi</h3>
                <p className="text-xs text-slate-500">7 Hari Terakhir</p>
              </div>
              <div className="flex items-center gap-2 text-sm font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                <TrendingUp size={16} /> +12.5%
              </div>
            </div>
            <SimpleLineChart data={revenueTrendData} color="#0ea5e9" />
          </div>

          {/* Gauge Chart: Pencapaian Target NGO */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center">
            <h3 className="font-bold text-slate-800 text-lg mb-2">Pencapaian Target NGO</h3>
            <p className="text-xs text-slate-500 mb-6">Tahun Berjalan (YTD)</p>

            <SimpleGaugeChart
              value={dashboardSummary.totalRevenue}
              max={dashboardSummary.targetRevenue}
              color="#14b8a6"
              title="Tercapai"
            />

            <div className="mt-4 w-full bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-500">Terkumpul:</span>
                <span className="font-bold text-teal-600">{formatCompactNumber(dashboardSummary.totalRevenue)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Target:</span>
                <span className="font-bold text-slate-800">{formatCompactNumber(dashboardSummary.targetRevenue)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Top Campaigns & Recent Transactions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top 5 Campaigns */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <BarChart3 size={20} className="text-teal-600" />
                <h2 className="font-bold text-slate-800">Top 5 Kampanye</h2>
              </div>
              <button onClick={() => navigateTo('campaigns')} className="text-sm text-teal-600 font-semibold hover:underline">Semua</button>
            </div>
            <div className="p-4">
              <div className="space-y-4">
                {topCampaigns.map((camp, i) => (
                  <div key={camp.id} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-slate-100" onClick={() => { navigateTo('campaigns'); setSelectedItem(camp); }}>
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs">{i + 1}</div>
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm max-w-[200px] truncate">{camp.title}</h4>
                        <span className="text-[10px] text-slate-500">{camp.category}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-teal-600 text-sm">{formatIDR(camp.collected)}</p>
                      {camp.target && <p className="text-[10px] text-slate-400">{((camp.collected / camp.target) * 100).toFixed(0)}% terkumpul</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Transactions Preview */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="font-bold text-slate-800">Transaksi Terbaru</h2>
              <button onClick={() => navigateTo('transactions')} className="text-sm text-teal-600 font-semibold hover:underline">Semua</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                    <th className="p-4 font-semibold">Donatur</th>
                    <th className="p-4 font-semibold">Nominal</th>
                    <th className="p-4 font-semibold text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="text-sm text-slate-700 divide-y divide-slate-100">
                  {mockTransactions.slice(0, 5).map((trx, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <p className="font-medium text-slate-800">{trx.donor}</p>
                        <p className="text-[10px] text-slate-400">{trx.date}</p>
                      </td>
                      <td className="p-4 font-bold text-slate-800">{formatIDR(trx.amount)}</td>
                      <td className="p-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${trx.status === 'Success' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {trx.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderCampaigns = () => {
    if (isFormMode) return renderCampaignForm();
    if (selectedItem) return renderCampaignDetail();

    return (
      <div className="animate-in fade-in duration-300">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-slate-800">Manajemen Kampanye</h1>
          <button onClick={() => setIsFormMode(true)} className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors shadow-sm">
            <Plus size={18} /> Buat Kampanye
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex gap-4">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
              <input type="text" placeholder="Cari nama kampanye..." className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500" />
            </div>
            <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50"><Filter size={16} /> Filter</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                  <th className="p-4 font-semibold">Judul Kampanye</th>
                  <th className="p-4 font-semibold">Kategori</th>
                  <th className="p-4 font-semibold">Terkumpul</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="text-sm text-slate-700 divide-y divide-slate-100">
                {mockCampaigns.map((camp, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <span className="font-bold text-slate-800 block max-w-[250px] truncate">
                        {camp.title}
                      </span>
                      <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 mt-1 inline-block">{camp.type}</span>
                    </td>
                    <td className="p-4"><span className="bg-slate-50 border border-slate-200 px-2 py-1 rounded text-xs font-semibold text-slate-600">{camp.category}</span></td>
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-800">{formatIDR(camp.collected)}</span>
                        <span className="text-xs text-slate-500">{camp.target ? `dari ${formatIDR(camp.target)}` : 'Tanpa Target'}</span>
                      </div>
                    </td>
                    <td className="p-4"><span className="bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full text-xs font-bold">Aktif</span></td>
                    <td className="p-4">
                      <div className="flex justify-center gap-2">
                        {/* Tombol Lihat Detail Performa ditambahkan di sini */}
                        <button onClick={() => setSelectedItem(camp)} className="p-1.5 text-teal-600 hover:text-teal-800 hover:bg-teal-50 rounded" title="Lihat Detail Performa"><Eye size={16} /></button>
                        <button onClick={() => { setSelectedItem(camp); setActiveTab('campaign_updates'); setIsFormMode(false); }} className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded" title="Kelola Kabar Terbaru"><Newspaper size={16} /></button>
                        <button className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="Edit Kampanye"><Edit size={16} /></button>
                        <button className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded" title="Hapus Kampanye"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderCampaignDetail = () => {
    const camp = selectedItem;
    const progress = camp.target ? (camp.collected / camp.target) * 100 : 0;

    // Mock data grafik spesifik kampanye
    const campTrendData = revenueTrendData.map(d => ({ ...d, value: d.value * (Math.random() * 0.5 + 0.2) }));

    return (
      <div className="animate-in fade-in duration-300">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button onClick={() => setSelectedItem(null)} className="p-2 bg-white rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"><ChevronLeft size={20} /></button>
            <div>
              <h1 className="text-2xl font-bold text-slate-800 leading-tight">{camp.title}</h1>
              <p className="text-sm text-slate-500 font-semibold">{camp.category} • {camp.type}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-2"><Edit size={16} /> Edit</button>
            <button className="px-4 py-2 bg-teal-600 rounded-lg text-sm font-bold text-white hover:bg-teal-700 flex items-center gap-2"><Share2 size={16} /> Bagikan Link</button>
          </div>
        </div>

        {/* Dashboard Performa Kampanye */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Detail Pendanaan & Gauge */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center">
            <h3 className="font-bold text-slate-800 text-lg mb-2">Status Pendanaan</h3>

            {camp.target ? (
              <>
                <p className="text-xs text-slate-500 mb-6">Pencapaian dari Target</p>
                <SimpleGaugeChart
                  value={camp.collected}
                  max={camp.target}
                  color="#14b8a6"
                  title="Terkumpul"
                />
                <div className="mt-4 w-full bg-slate-50 p-4 rounded-xl border border-slate-100 text-left">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-500 font-medium">Terkumpul</span>
                    <span className="font-bold text-teal-600">{formatIDR(camp.collected)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 font-medium">Kekurangan</span>
                    <span className="font-bold text-rose-500">{formatIDR(camp.target - camp.collected)}</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full w-full py-8">
                <div className="w-20 h-20 bg-teal-50 rounded-full flex items-center justify-center mb-4">
                  <Heart size={32} className="text-teal-500 fill-teal-100" />
                </div>
                <p className="text-sm text-slate-500 mb-1">Total Terkumpul (Tanpa Target)</p>
                <h2 className="text-3xl font-extrabold text-teal-600">{formatIDR(camp.collected)}</h2>
              </div>
            )}
          </div>

          {/* Line Chart & Metrics */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-2 mb-2 text-slate-500"><Users size={16} /> <span className="text-sm font-semibold">Donatur</span></div>
                <h2 className="text-2xl font-bold text-slate-800">{camp.donors || 1245}</h2>
              </div>
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-2 mb-2 text-slate-500"><Eye size={16} /> <span className="text-sm font-semibold">Views</span></div>
                <h2 className="text-2xl font-bold text-slate-800">{(camp.views || 0).toLocaleString()}</h2>
              </div>
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-2 mb-2 text-slate-500"><Clock size={16} /> <span className="text-sm font-semibold">Sisa Hari</span></div>
                <h2 className="text-2xl font-bold text-slate-800">{camp.target ? '12' : '∞'}</h2>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex-1">
              <h3 className="font-bold text-slate-800 text-base mb-4">Pertumbuhan Donasi (7 Hari Terakhir)</h3>
              <SimpleLineChart data={campTrendData} color="#8b5cf6" />
            </div>
          </div>
        </div>

        {/* Tab Data Spesifik Kampanye (Riwayat & Update) */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex border-b border-slate-100 px-4">
            <button className="px-4 py-4 font-bold text-teal-600 border-b-2 border-teal-600 text-sm">Riwayat Transaksi</button>
            <button className="px-4 py-4 font-bold text-slate-400 hover:text-slate-600 border-b-2 border-transparent text-sm">Kabar Penyaluran</button>
            <button className="px-4 py-4 font-bold text-slate-400 hover:text-slate-600 border-b-2 border-transparent text-sm">Pencairan Dana (Withdraw)</button>
          </div>
          <div className="p-4">
            {/* Simulasi List Transaksi Kampanye */}
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                  <th className="p-3 font-semibold">Tanggal</th>
                  <th className="p-3 font-semibold">Donatur</th>
                  <th className="p-3 font-semibold">Nominal</th>
                  <th className="p-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="text-sm text-slate-700 divide-y divide-slate-100">
                <tr className="hover:bg-slate-50">
                  <td className="p-3 text-slate-500">12 Okt, 14:30</td>
                  <td className="p-3 font-bold">Andi Dermawan</td>
                  <td className="p-3 font-bold text-teal-600">{formatIDR(150000)}</td>
                  <td className="p-3"><span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-xs font-bold">Success</span></td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="p-3 text-slate-500">12 Okt, 10:15</td>
                  <td className="p-3 font-bold">Hamba Allah</td>
                  <td className="p-3 font-bold text-teal-600">{formatIDR(50000)}</td>
                  <td className="p-3"><span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-xs font-bold">Success</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderCampaignUpdates = () => {
    const camp = selectedItem;
    if (!camp) return null;

    return (
      <div className="animate-in fade-in duration-300">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <button onClick={() => { setActiveTab('campaigns'); setSelectedItem(null); setIsFormMode(false); }} className="p-2 bg-white rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"><ChevronLeft size={20} /></button>
            <div>
              <h1 className="text-2xl font-bold text-slate-800 leading-tight">Kabar Terbaru</h1>
              <p className="text-sm text-slate-500 font-semibold">Kampanye: {camp.title}</p>
            </div>
          </div>
          <button onClick={() => setIsFormMode(!isFormMode)} className="bg-teal-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm">
            {isFormMode ? 'Batal' : <><Plus size={18} /> Tambah Kabar</>}
          </button>
        </div>

        {isFormMode && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-6 max-w-4xl">
            <h3 className="font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Buat Kabar / Update Penyaluran</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-2">Judul Kabar</label>
                <input type="text" className="w-full border border-slate-200 rounded-xl p-2.5 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500" placeholder="Cth: Penyaluran Tahap 1: Biaya Obat" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Tanggal</label>
                <input type="date" className="w-full border border-slate-200 rounded-xl p-2.5 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">URL Gambar (Opsional)</label>
                <input type="text" className="w-full border border-slate-200 rounded-xl p-2.5 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500" placeholder="https://..." />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-2">Deskripsi Singkat (Excerpt - Tampil di Timeline)</label>
                <textarea rows="2" className="w-full border border-slate-200 rounded-xl p-3 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500" placeholder="Ringkasan singkat kabar..."></textarea>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-2">Isi Lengkap Kabar</label>
                <textarea rows="5" className="w-full border border-slate-200 rounded-xl p-3 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500" placeholder="Ceritakan detail penyaluran dana secara transparan..."></textarea>
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <button className="px-6 py-2.5 rounded-xl font-bold bg-teal-600 text-white flex items-center gap-2"><Save size={18} /> Simpan & Publikasikan</button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                  <th className="p-4 font-semibold">Tanggal</th>
                  <th className="p-4 font-semibold">Judul Kabar</th>
                  <th className="p-4 font-semibold w-1/2">Excerpt</th>
                  <th className="p-4 font-semibold text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="text-sm text-slate-700 divide-y divide-slate-100">
                {camp.updates && camp.updates.length > 0 ? camp.updates.map((update, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 whitespace-nowrap text-slate-500">{update.date}</td>
                    <td className="p-4 font-bold text-slate-800">{update.title}</td>
                    <td className="p-4 text-slate-500 truncate max-w-[300px]">{update.excerpt}</td>
                    <td className="p-4 text-center whitespace-nowrap">
                      <button className="p-1.5 text-slate-400 hover:text-blue-600 rounded mr-2" title="Edit"><Edit size={16} /></button>
                      <button className="p-1.5 text-slate-400 hover:text-rose-600 rounded" title="Hapus"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="4" className="p-8 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center">
                        <Newspaper size={32} className="text-slate-300 mb-2" />
                        <p>Belum ada kabar terbaru untuk kampanye ini.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderCampaignForm = () => (
    <div className="animate-in fade-in duration-300 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => setIsFormMode(false)} className="p-2 bg-white rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"><ChevronLeft size={20} /></button>
        <h1 className="text-2xl font-bold text-slate-800">Buat Kampanye Baru</h1>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-6">
        <h3 className="font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">1. Informasi Dasar</h3>
        <div className="grid grid-cols-2 gap-6 mb-4">
          <div className="col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-2">Judul Kampanye</label>
            <input type="text" className="w-full border border-slate-200 rounded-xl p-3 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none" placeholder="Cth: Bantu Pembangunan Sekolah..." />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Kategori</label>
            <select className="w-full border border-slate-200 rounded-xl p-3 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none bg-white">
              <option>Pilih Kategori</option><option>Medis</option><option>Pendidikan</option><option>Bencana</option><option>Zakat</option><option>Qurban</option><option>Infaq</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">URL Gambar Banner</label>
            <input type="text" className="w-full border border-slate-200 rounded-xl p-3 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none" placeholder="https://..." />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-2">Deskripsi / Cerita</label>
            <textarea rows="4" className="w-full border border-slate-200 rounded-xl p-3 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none" placeholder="Tuliskan latar belakang kampanye..."></textarea>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-6">
        <h3 className="font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">2. Pengaturan Tipe & Target</h3>

        {/* Type Toggles */}
        <div className="flex flex-wrap gap-4 mb-6">
          <label className="flex items-center gap-2 cursor-pointer bg-slate-50 p-2 rounded-lg border border-slate-200">
            <input type="checkbox" checked={campForm.hasNoTarget} onChange={(e) => setCampForm({ ...campForm, hasNoTarget: e.target.checked })} className="w-4 h-4 text-teal-600 accent-teal-600" />
            <span className="text-sm font-medium text-slate-700">Tanpa Target Dana</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer bg-slate-50 p-2 rounded-lg border border-slate-200">
            <input type="checkbox" checked={campForm.hasNoTimeLimit} onChange={(e) => setCampForm({ ...campForm, hasNoTimeLimit: e.target.checked })} className="w-4 h-4 text-teal-600 accent-teal-600" />
            <span className="text-sm font-medium text-slate-700">Tanpa Batas Waktu (Selalu Buka)</span>
          </label>
          <div className="w-full h-px bg-slate-100 my-1"></div>
          <label className="flex items-center gap-2 cursor-pointer bg-emerald-50 p-2 rounded-lg border border-emerald-200">
            <input type="checkbox" checked={campForm.isZakat} onChange={(e) => setCampForm({ ...campForm, isZakat: e.target.checked, isQurban: false, isFixedAmount: false })} className="w-4 h-4 text-emerald-600 accent-emerald-600" />
            <span className="text-sm font-medium text-emerald-800">Kampanye Zakat (Gunakan Kalkulator)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer bg-amber-50 p-2 rounded-lg border border-amber-200">
            <input type="checkbox" checked={campForm.isQurban} onChange={(e) => setCampForm({ ...campForm, isQurban: e.target.checked, isZakat: false, isFixedAmount: true })} className="w-4 h-4 text-amber-600 accent-amber-600" />
            <span className="text-sm font-medium text-amber-800">Kampanye Qurban</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer bg-blue-50 p-2 rounded-lg border border-blue-200">
            <input type="checkbox" checked={campForm.isFixedAmount && !campForm.isQurban} onChange={(e) => setCampForm({ ...campForm, isFixedAmount: e.target.checked, isZakat: false, isQurban: false })} className="w-4 h-4 text-blue-600 accent-blue-600" />
            <span className="text-sm font-medium text-blue-800">Sistem Paket (Fixed Amount)</span>
          </label>
        </div>

        {/* Conditional Fields based on Toggles */}
        <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-100">

          {!campForm.hasNoTarget && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Target Nominal (Rp)</label>
              <input type="number" className="w-full border border-slate-200 rounded-lg p-2.5 outline-none" placeholder="Cth: 10000000" />
            </div>
          )}
          {!campForm.hasNoTimeLimit && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Batas Waktu (Hari)</label>
              <input type="number" className="w-full border border-slate-200 rounded-lg p-2.5 outline-none" placeholder="Cth: 30" />
            </div>
          )}

          {campForm.isFixedAmount && !campForm.isQurban && (
            <>
              <div className="col-span-2 h-px bg-slate-200 my-2"></div>
              <div>
                <label className="block text-sm font-semibold text-blue-800 mb-2">Nama Paket</label>
                <input type="text" className="w-full border border-blue-200 rounded-lg p-2.5 outline-none" placeholder="Cth: Paket Sembako" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-blue-800 mb-2">Harga Per Paket (Rp)</label>
                <input type="number" className="w-full border border-blue-200 rounded-lg p-2.5 outline-none" placeholder="Cth: 50000" />
              </div>
            </>
          )}

          {campForm.isQurban && (
            <div className="col-span-2">
              <div className="h-px bg-slate-200 my-2 mb-4"></div>
              <div className="flex justify-between items-center mb-3">
                <label className="block text-sm font-semibold text-amber-800">Konfigurasi Varian Qurban</label>
                <button className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded font-bold">+ Tambah Varian</button>
              </div>
              <div className="flex gap-3 mb-3">
                <input type="text" placeholder="Nama Varian (Cth: Kambing)" className="flex-2 border border-amber-200 rounded-lg p-2 text-sm w-full" />
                <input type="number" placeholder="Harga (Rp)" className="flex-1 border border-amber-200 rounded-lg p-2 text-sm w-full" />
                <input type="number" placeholder="Kuota Nama (Cth: 1 atau 7)" className="flex-1 border border-amber-200 rounded-lg p-2 text-sm w-full" />
                <button className="bg-rose-50 text-rose-500 p-2 rounded-lg border border-rose-100"><Trash2 size={16} /></button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-4 pb-10">
        <button onClick={() => setIsFormMode(false)} className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100">Batal</button>
        <button className="px-6 py-3 rounded-xl font-bold bg-teal-600 text-white shadow-lg shadow-teal-500/30 flex items-center gap-2"><Save size={18} /> Simpan & Terbitkan</button>
      </div>
    </div>
  );

  const renderCategories = () => (
    <div className="animate-in fade-in duration-300">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Kategori Program</h1>
        <button onClick={() => setIsFormMode(!isFormMode)} className="bg-teal-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm">
          {isFormMode ? 'Batal' : <><Plus size={18} /> Tambah Kategori</>}
        </button>
      </div>

      {isFormMode && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-6">
          <h3 className="font-bold text-slate-800 mb-4">Buat Kategori Baru</h3>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-slate-700 mb-2">Nama Kategori</label>
              <input type="text" className="w-full border border-slate-200 rounded-xl p-2.5 outline-none" placeholder="Cth: Beasiswa" />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-semibold text-slate-700 mb-2">Warna Identitas</label>
              <select className="w-full border border-slate-200 rounded-xl p-2.5 outline-none">
                <option>Teal</option><option>Rose</option><option>Emerald</option><option>Amber</option><option>Blue</option>
              </select>
            </div>
            <div className="flex items-end">
              <button className="px-6 py-2.5 rounded-xl font-bold bg-teal-600 text-white"><Save size={18} className="inline mr-2" />Simpan</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
              <th className="p-4 font-semibold">Nama Kategori</th>
              <th className="p-4 font-semibold text-center">Jumlah Kampanye</th>
              <th className="p-4 font-semibold text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="text-sm text-slate-700 divide-y divide-slate-100">
            {mockCategories.map((cat, i) => (
              <tr key={i} className="hover:bg-slate-50">
                <td className="p-4">
                  <span className={`bg-${cat.color}-100 text-${cat.color}-700 px-3 py-1 rounded-lg font-bold`}>{cat.name}</span>
                </td>
                <td className="p-4 text-center font-bold text-slate-600">{cat.count}</td>
                <td className="p-4 text-center">
                  <button className="p-1.5 text-slate-400 hover:text-blue-600 rounded mr-2"><Edit size={16} /></button>
                  <button className="p-1.5 text-slate-400 hover:text-rose-600 rounded"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderDonors = () => (
    <div className="animate-in fade-in duration-300">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Database Donatur</h1>
        <button className="border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-slate-50">
          <Share2 size={18} /> Export CSV
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex gap-4">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
            <input type="text" placeholder="Cari nama, email, atau nomor HP..." className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-10 pr-4 text-sm outline-none" />
          </div>
        </div>
        <table className="w-full text-left border-collapse min-w-[800px] overflow-x-auto">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
              <th className="p-4 font-semibold">ID</th>
              <th className="p-4 font-semibold">Nama Lengkap</th>
              <th className="p-4 font-semibold">Kontak</th>
              <th className="p-4 font-semibold">Total Donasi</th>
              <th className="p-4 font-semibold">Bergabung Sejak</th>
            </tr>
          </thead>
          <tbody className="text-sm text-slate-700 divide-y divide-slate-100">
            {mockDonors.map((donor, i) => (
              <tr key={i} className="hover:bg-slate-50">
                <td className="p-4 font-mono text-xs text-slate-400">{donor.id}</td>
                <td className="p-4 font-bold text-slate-800">{donor.name}</td>
                <td className="p-4">
                  <p>{donor.email}</p>
                  <p className="text-xs text-slate-500">{donor.phone}</p>
                </td>
                <td className="p-4 font-bold text-teal-600">{formatIDR(donor.totalDonated)}</td>
                <td className="p-4 text-slate-500">{donor.joinDate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderTransactions = () => (
    <div className="animate-in fade-in duration-300">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Transaksi Donasi</h1>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex gap-4">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
            <input type="text" placeholder="Cari ID Transaksi / Nama Donatur..." className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-10 pr-4 text-sm outline-none" />
          </div>
          <select className="border border-slate-200 rounded-lg px-4 text-sm text-slate-600 outline-none">
            <option>Semua Status</option><option>Success</option><option>Pending</option><option>Failed</option>
          </select>
        </div>
        <table className="w-full text-left border-collapse min-w-[800px] overflow-x-auto">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
              <th className="p-4 font-semibold">Waktu</th>
              <th className="p-4 font-semibold">ID Transaksi</th>
              <th className="p-4 font-semibold">Donatur</th>
              <th className="p-4 font-semibold">Kampanye</th>
              <th className="p-4 font-semibold">Metode</th>
              <th className="p-4 font-semibold">Nominal</th>
              <th className="p-4 font-semibold text-center">Status</th>
            </tr>
          </thead>
          <tbody className="text-sm text-slate-700 divide-y divide-slate-100">
            {mockTransactions.map((trx, i) => (
              <tr key={i} className="hover:bg-slate-50">
                <td className="p-4 text-xs text-slate-500">{trx.date}</td>
                <td className="p-4 font-mono text-xs">{trx.id}</td>
                <td className="p-4 font-medium">{trx.donor}</td>
                <td className="p-4 text-slate-500 truncate max-w-[150px]">{trx.campaign}</td>
                <td className="p-4 text-xs bg-slate-50 rounded font-semibold">{trx.method}</td>
                <td className="p-4 font-bold text-slate-800">{formatIDR(trx.amount)}</td>
                <td className="p-4 text-center">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${trx.status === 'Success' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {trx.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderPayments = () => (
    <div className="animate-in fade-in duration-300">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Metode Pembayaran</h1>
        <button onClick={() => setIsFormMode(!isFormMode)} className="bg-teal-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm">
          {isFormMode ? 'Batal' : <><Plus size={18} /> Tambah Metode</>}
        </button>
      </div>

      {isFormMode && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-6">
          <h3 className="font-bold text-slate-800 mb-4">Integrasi Payment Gateway Baru</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Nama Tampilan (Cth: BCA VA)</label>
              <input type="text" className="w-full border border-slate-200 rounded-xl p-2.5 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Tipe</label>
              <select className="w-full border border-slate-200 rounded-xl p-2.5 outline-none">
                <option>Bank Transfer (VA)</option><option>E-Wallet</option><option>QRIS</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Provider Gateway</label>
              <select className="w-full border border-slate-200 rounded-xl p-2.5 outline-none">
                <option>Midtrans</option><option>Xendit</option><option>Manual Transfer</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Biaya Admin (Ditanggung Donatur)</label>
              <input type="text" placeholder="Cth: Rp 4000 atau 2%" className="w-full border border-slate-200 rounded-xl p-2.5 outline-none" />
            </div>
          </div>
          <button className="px-6 py-2.5 rounded-xl font-bold bg-teal-600 text-white"><Save size={18} className="inline mr-2" />Simpan Metode</button>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
              <th className="p-4 font-semibold">Metode</th>
              <th className="p-4 font-semibold">Tipe</th>
              <th className="p-4 font-semibold">Provider</th>
              <th className="p-4 font-semibold">Biaya Admin</th>
              <th className="p-4 font-semibold text-center">Status</th>
            </tr>
          </thead>
          <tbody className="text-sm text-slate-700 divide-y divide-slate-100">
            {mockPayments.map((pay, i) => (
              <tr key={i} className="hover:bg-slate-50">
                <td className="p-4 font-bold text-slate-800">{pay.name}</td>
                <td className="p-4 text-slate-500">{pay.type}</td>
                <td className="p-4"><span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-bold">{pay.provider}</span></td>
                <td className="p-4 text-slate-500">{pay.fee}</td>
                <td className="p-4 text-center"><span className="text-emerald-600 font-bold text-xs"><CheckCircle size={16} className="inline mr-1" /> Aktif</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderNotifications = () => (
    <div className="animate-in fade-in duration-300">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Template Notifikasi</h1>
        <button onClick={() => setIsFormMode(!isFormMode)} className="bg-teal-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm">
          {isFormMode ? 'Batal' : <><Plus size={18} /> Tambah Template</>}
        </button>
      </div>

      {isFormMode && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-6">
          <h3 className="font-bold text-slate-800 mb-4">Setup Template Otomatis</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Event Trigger (Pemicu)</label>
              <select className="w-full border border-slate-200 rounded-xl p-2.5 outline-none">
                <option>Invoice / Pending Payment</option><option>Donasi Berhasil</option><option>Update Penyaluran</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Kanal Pengiriman</label>
              <select className="w-full border border-slate-200 rounded-xl p-2.5 outline-none">
                <option>WhatsApp</option><option>Email</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-2">Isi Pesan (Gunakan variabel seperti {'{nama}'} , {'{nominal}'})</label>
              <textarea rows="4" placeholder="Halo {nama}, terima kasih atas donasinya sebesar {nominal}..." className="w-full border border-slate-200 rounded-xl p-3 focus:border-teal-500 outline-none font-mono text-sm"></textarea>
            </div>
          </div>
          <button className="px-6 py-2.5 rounded-xl font-bold bg-teal-600 text-white"><Save size={18} className="inline mr-2" />Simpan Template</button>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
              <th className="p-4 font-semibold">Event (Pemicu)</th>
              <th className="p-4 font-semibold">Kanal</th>
              <th className="p-4 font-semibold">Preview Pesan</th>
              <th className="p-4 font-semibold text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="text-sm text-slate-700 divide-y divide-slate-100">
            <tr className="hover:bg-slate-50">
              <td className="p-4 font-bold text-slate-800">Donasi Berhasil</td>
              <td className="p-4"><span className="bg-green-100 text-green-700 px-2 py-1 flex items-center w-fit rounded text-xs font-bold"><MessageSquare size={12} className="mr-1" /> WhatsApp</span></td>
              <td className="p-4 text-slate-500 truncate max-w-[300px]">Alhamdulillah, donasi {`{nominal}`} Anda telah kami terima...</td>
              <td className="p-4 text-center"><button className="text-blue-600 hover:underline text-xs font-bold">Edit</button></td>
            </tr>
            <tr className="hover:bg-slate-50">
              <td className="p-4 font-bold text-slate-800">Invoice Tagihan</td>
              <td className="p-4"><span className="bg-blue-100 text-blue-700 px-2 py-1 flex items-center w-fit rounded text-xs font-bold"><Mail size={12} className="mr-1" /> Email</span></td>
              <td className="p-4 text-slate-500 truncate max-w-[300px]">Halo {`{nama}`}, silakan selesaikan pembayaran untuk...</td>
              <td className="p-4 text-center"><button className="text-blue-600 hover:underline text-xs font-bold">Edit</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderAdmins = () => (
    <div className="animate-in fade-in duration-300">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Manajemen Admin</h1>
        <button onClick={() => setIsFormMode(!isFormMode)} className="bg-teal-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm">
          {isFormMode ? 'Batal' : <><Plus size={18} /> Tambah Staff</>}
        </button>
      </div>

      {isFormMode && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-6 max-w-2xl">
          <h3 className="font-bold text-slate-800 mb-4">Registrasi Akun Staff</h3>
          <div className="flex flex-col gap-4 mb-4">
            <input type="text" placeholder="Nama Lengkap" className="w-full border border-slate-200 rounded-xl p-2.5 outline-none" />
            <input type="email" placeholder="Alamat Email Akses" className="w-full border border-slate-200 rounded-xl p-2.5 outline-none" />
            <input type="password" placeholder="Password Sementara" className="w-full border border-slate-200 rounded-xl p-2.5 outline-none" />
            <select className="w-full border border-slate-200 rounded-xl p-2.5 outline-none">
              <option>Pilih Role</option><option>Super Admin</option><option>Finance (Keuangan)</option><option>Content Editor</option>
            </select>
          </div>
          <button className="px-6 py-2.5 rounded-xl font-bold bg-teal-600 text-white w-full">Buat Akun</button>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
              <th className="p-4 font-semibold">Nama Staff</th>
              <th className="p-4 font-semibold">Email</th>
              <th className="p-4 font-semibold">Role Akses</th>
              <th className="p-4 font-semibold text-center">Status</th>
              <th className="p-4 font-semibold text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="text-sm text-slate-700 divide-y divide-slate-100">
            {mockAdmins.map((adm, i) => (
              <tr key={i} className="hover:bg-slate-50">
                <td className="p-4 font-bold text-slate-800">{adm.name}</td>
                <td className="p-4 text-slate-500">{adm.email}</td>
                <td className="p-4"><span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-bold">{adm.role}</span></td>
                <td className="p-4 text-center"><span className="text-emerald-600 font-bold text-xs">Aktif</span></td>
                <td className="p-4 text-center">
                  <button className="p-1.5 text-slate-400 hover:text-rose-600 rounded"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="animate-in fade-in duration-300 max-w-4xl pb-10">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Konfigurasi Lembaga</h1>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-6">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-100 pb-3"><ImageIcon size={18} className="text-slate-400" /> Identitas Visual</h3>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Nama Lembaga / NGO</label>
            <input type="text" defaultValue="Yayasan Peduli Sesama" className="w-full border border-slate-200 rounded-xl p-3 focus:border-teal-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">URL Logo</label>
            <input type="text" placeholder="https://..." className="w-full border border-slate-200 rounded-xl p-3 focus:border-teal-500 outline-none" />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-2">Deskripsi Singkat (Tampil di Footer App)</label>
            <textarea rows="3" defaultValue="Lembaga filantropi independen yang berdedikasi untuk menyalurkan kebaikan donatur secara transparan, profesional, dan tepat sasaran." className="w-full border border-slate-200 rounded-xl p-3 focus:border-teal-500 outline-none"></textarea>
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-2">Alamat Lengkap & Legalitas</label>
            <textarea rows="2" defaultValue="Jl. Kebaikan Bangsa No. 99, Jakarta. SK Kemenkumham RI No. AHU-00123." className="w-full border border-slate-200 rounded-xl p-3 focus:border-teal-500 outline-none"></textarea>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-6">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-100 pb-3"><Share2 size={18} className="text-slate-400" /> Media Sosial & Kontak</h3>
        <div className="grid grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Instagram (URL)</label>
            <input type="text" placeholder="https://instagram.com/..." className="w-full border border-slate-200 rounded-xl p-3 focus:border-teal-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Facebook (URL)</label>
            <input type="text" placeholder="https://facebook.com/..." className="w-full border border-slate-200 rounded-xl p-3 focus:border-teal-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">WhatsApp CS</label>
            <input type="text" placeholder="62812..." className="w-full border border-slate-200 rounded-xl p-3 focus:border-teal-500 outline-none" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-6">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-100 pb-3"><Palette size={18} className="text-slate-400" /> Tema Aplikasi (Tone Color)</h3>
        <div className="flex gap-4 items-center">
          <label className="text-sm font-semibold text-slate-700">Warna Utama (Primary):</label>
          <div className="flex gap-2">
            <button className="w-8 h-8 rounded-full bg-teal-500 ring-2 ring-offset-2 ring-teal-500"></button>
            <button className="w-8 h-8 rounded-full bg-blue-500 border-2 border-white"></button>
            <button className="w-8 h-8 rounded-full bg-indigo-500 border-2 border-white"></button>
            <button className="w-8 h-8 rounded-full bg-rose-500 border-2 border-white"></button>
          </div>
          <input type="text" defaultValue="#14B8A6" className="ml-4 border border-slate-200 rounded-lg p-2 w-24 text-center font-mono text-sm uppercase" />
        </div>
      </div>

      <div className="flex justify-end gap-4">
        <button className="px-6 py-3 rounded-xl font-bold bg-slate-800 text-white shadow-lg flex items-center gap-2"><Save size={18} /> Simpan Pengaturan</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans" style={{ fontFamily: "'Source Sans Pro', sans-serif" }}>
      {/* OVERLAY FOR MOBILE SIDEBAR */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      {/* SIDEBAR (Toggleable) */}
      <aside
        className={`bg-slate-900 text-white flex flex-col h-screen overflow-y-auto shrink-0 fixed md:static z-50 transition-all duration-300 ease-in-out ${isSidebarOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full md:translate-x-0 overflow-hidden border-r-0'
          }`}
      >
        <div className="p-6 flex items-center gap-3 border-b border-slate-800 shrink-0 w-64">
          <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center">
            <Heart size={16} className="text-white fill-white" />
          </div>
          <span className="font-bold text-lg tracking-tight">NGO<span className="text-teal-400">Admin</span></span>
        </div>

        <div className="p-4 flex flex-col gap-1 flex-1 w-64">
          <p className="px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 mt-2">Main Menu</p>
          <SidebarItem icon={LayoutDashboard} label="Dashboard" id="dashboard" />
          <SidebarItem icon={Megaphone} label="Manajemen Kampanye" id="campaigns" />
          <SidebarItem icon={Tags} label="Kategori Program" id="categories" />
          <SidebarItem icon={Users} label="Data Donatur" id="donors" />

          <p className="px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 mt-6">Finansial & Laporan</p>
          <SidebarItem icon={Receipt} label="Transaksi Donasi" id="transactions" />
          <SidebarItem icon={CreditCard} label="Metode Pembayaran" id="payments" />

          <p className="px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 mt-6">Sistem</p>
          <SidebarItem icon={BellRing} label="Template Notifikasi" id="notifications" />
          <SidebarItem icon={ShieldCheck} label="Manajemen Admin" id="admins" />
          <SidebarItem icon={Settings} label="Config Lembaga" id="settings" />
        </div>

        <div className="p-4 border-t border-slate-800 w-64 shrink-0">
          <div className="flex items-center gap-3 px-4 py-2">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center"><User size={16} /></div>
            <div>
              <p className="text-sm font-bold leading-tight">Admin Utama</p>
              <p className="text-[10px] text-slate-400">Superadmin</p>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Top Header Mobile / Title */}
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <Menu size={22} />
            </button>
            <h2 className="font-bold text-slate-700 capitalize hidden sm:block">
              {activeTab === 'campaign_form' ? 'Buat Kampanye' : activeTab.replace('_', ' ')}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <button className="relative text-slate-400 hover:text-slate-600">
              <BellRing size={20} />
              <div className="absolute top-0 right-0 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></div>
            </button>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-50/50">
          <div className="max-w-6xl mx-auto">
            {activeTab === 'dashboard' && renderDashboard()}
            {activeTab === 'campaigns' && renderCampaigns()}
            {activeTab === 'campaign_updates' && renderCampaignUpdates()}
            {activeTab === 'settings' && renderSettings()}
            {activeTab === 'categories' && renderCategories()}
            {activeTab === 'donors' && renderDonors()}
            {activeTab === 'transactions' && renderTransactions()}
            {activeTab === 'payments' && renderPayments()}
            {activeTab === 'notifications' && renderNotifications()}
            {activeTab === 'admins' && renderAdmins()}
          </div>
        </div>
      </main>

    </div>
  );
}
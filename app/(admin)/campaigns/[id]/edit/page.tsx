"use client";

import React, { useState, useEffect } from 'react';
import useSWR from 'swr';
import { useRouter, useParams } from 'next/navigation';
import { 
  ChevronLeft, Save, Loader2, X, Image as ImageIcon,
  CheckCircle2, AlertCircle, Plus, Trash2, QrCode, Package, Tags, Download
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { toast } from 'sonner';
import { NumberInput } from '@/components/ui/number-input';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { FileUpload } from '@/components/ui/file-upload';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function EditCampaignPage() {
  const router = useRouter();
  const { id } = useParams();
  const { data: categories } = useSWR('/api/categories', fetcher);
  const { data: campaign, isLoading: isFetching } = useSWR(`/api/campaigns/${id}`, fetcher);
  const { data: allCampaigns } = useSWR('/api/campaigns?limit=200&offset=0', fetcher);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<any>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [variants, setVariants] = useState<any[]>([]);
  const [bundles, setBundles] = useState<any[]>([]);
  const [qrisStatic, setQrisStatic] = useState<any[]>([]);

  useEffect(() => {
    if (campaign) {
      setFormData({
        title: campaign.title,
        category_id: campaign.category_id,
        slug: campaign.slug,
        image_url: campaign.image_url || '',
        description: campaign.description || '',
        target_amount: campaign.target_amount || 0,
        end_date: campaign.end_date ? new Date(campaign.end_date).toISOString().split('T')[0] : '',
        // Bool flags
        is_zakat: campaign.is_zakat || false,
        is_qurban: campaign.is_qurban || false,
        is_urgent: campaign.is_urgent || false,
        is_verified: campaign.is_verified ?? true,
        is_fixed_amount: campaign.is_fixed_amount || false,
        is_bundle: campaign.is_bundle || false,
        is_carousel: campaign.is_carousel || false,
        has_no_target: campaign.has_no_target || false,
        has_no_time_limit: campaign.has_no_time_limit || false,
        // Numeric
        minimum_amount: campaign.minimum_amount || 10000,
        base_commission_pct: campaign.base_commission_pct || 0,
        sort: campaign.sort || 0,
        // Array
        suggestion_amounts: campaign.suggestion_amounts ? campaign.suggestion_amounts.join(', ') : '10000, 25000, 50000, 100000, 200000, 500000',
        status: campaign.status || 'ACTIVE'
      });
      if (campaign.variants) setVariants(campaign.variants);
      if (campaign.bundles) setBundles(campaign.bundles);
      if (campaign.qris_static) setQrisStatic(campaign.qris_static);
    }
  }, [campaign]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      let finalImageUrl = formData.image_url;
      if (imageFile) {
        toast('Mengupload gambar ke server...');
        const fileForm = new FormData();
        fileForm.append('file', imageFile);
        
        const response = await fetch(`/api/upload?filename=${imageFile.name}`, {
          method: 'POST',
          body: imageFile,
        });
        if (!response.ok) throw new Error('Gagal mengupload gambar');
        const blobRes = await response.json();
        finalImageUrl = blobRes.url;
      }

      // 1. Update Core Campaign — parse suggestion_amounts back to array
      const payload = {
        ...formData,
        image_url: finalImageUrl,
        suggestion_amounts: formData.suggestion_amounts
          ? formData.suggestion_amounts.split(',').map((s: string) => parseInt(s.trim())).filter(Boolean)
          : null,
      };
      const res = await fetch('/api/campaigns', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...payload }),
      });
      if (!res.ok) throw new Error('Failed to update core campaign');

      // 2. Sync Relational Arrays
      const nestedRes = await fetch(`/api/campaigns/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variants, bundles, qris_static: qrisStatic }),
      });
      if (!nestedRes.ok) throw new Error('Failed to update related arrays');

      toast.success('Kampanye berhasil diperbarui');
      router.push(`/campaigns/${id}`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const downloadQR = (id: string, name: string) => {
    const canvas = document.getElementById(id) as HTMLCanvasElement;
    if (!canvas) return;
    const pngUrl = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
    let downloadLink = document.createElement("a");
    downloadLink.href = pngUrl;
    downloadLink.download = `QRIS_${name}.png`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  if (isFetching || !formData) return <div className="p-8 animate-pulse text-center">Loading campaign data...</div>;

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
          <h1 className="text-2xl font-normal text-slate-800 tracking-tight">Edit Kampanye</h1>
          <p className="text-sm text-slate-400 font-medium mt-1 text-left">Sesuaikan detail program penggalangan dana</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 space-y-6">
            <div className="text-left">
              <label className="block text-xs font-semibold text-slate-500 mb-2 font-sans">Judul Kampanye</label>
              <input 
                required 
                value={formData.title} 
                onChange={(e) => setFormData({...formData, title: e.target.value})} 
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 text-sm font-semibold text-slate-900 focus:outline-none focus:border-teal-500/50 transition-all" 
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="text-left">
                <label className="block text-xs font-semibold text-slate-500 mb-2">Slug URL</label>
                <input 
                  required 
                  value={formData.slug} 
                  onChange={(e) => setFormData({...formData, slug: e.target.value.toLowerCase().replace(/ /g, '-')})} 
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 text-sm font-normal text-slate-900 focus:outline-none focus:border-teal-500/50 transition-all font-mono" 
                />
              </div>
              <div className="text-left">
                <label className="block text-xs font-semibold text-slate-500 mb-2">Kategori</label>
                <SearchableSelect
                  options={(categories || []).map((cat: any) => ({ id: cat.id, name: cat.name }))}
                  value={formData.category_id}
                  onChange={(val) => setFormData({...formData, category_id: Number(val)})}
                  placeholder="Pilih kategori..."
                />
              </div>
            </div>

            <div className="text-left">
              <label className="block text-xs font-semibold text-slate-500 mb-2">Deskripsi Lengkap</label>
              <RichTextEditor
                value={formData.description || ''} 
                onChange={(val) => setFormData({...formData, description: val})} 
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl text-sm font-normal text-slate-900 overflow-hidden" 
              />
            </div>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 space-y-6">
            <h3 className="text-sm font-normal text-slate-800 tracking-tight text-left">Target & Status</h3>
            <div className="grid grid-cols-2 gap-6">
              <div className="text-left">
                <label className="block text-xs font-semibold text-slate-500 mb-2">Target Dana (IDR)</label>
                <NumberInput 
                  disabled={formData.has_no_target}
                  value={formData.target_amount} 
                  onChange={(val) => setFormData({...formData, target_amount: val})} 
                  prefix="Rp"
                />
              </div>
              <div className="text-left">
                <label className="block text-xs font-semibold text-slate-500 mb-2">Tanggal Berakhir</label>
                <input 
                  type="date" 
                  value={formData.end_date} 
                  disabled={formData.has_no_time_limit}
                  onChange={(e) => setFormData({...formData, end_date: e.target.value})} 
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 text-sm font-normal text-slate-900 focus:outline-none focus:border-teal-500/50 transition-all disabled:opacity-40" 
                />
              </div>
              <div className="text-left">
                <label className="block text-xs font-semibold text-slate-500 mb-2">Minimum Donasi (Rp)</label>
                <NumberInput 
                  value={formData.minimum_amount} 
                  onChange={(val) => setFormData({...formData, minimum_amount: val})} 
                  prefix="Rp"
                />
              </div>
              <div className="text-left">
                <label className="block text-xs font-semibold text-slate-500 mb-2">Komisi Dasar (%)</label>
                <input 
                  type="number"
                  step="0.01"
                  min={0}
                  max={100}
                  value={formData.base_commission_pct}
                  onChange={(e) => setFormData({...formData, base_commission_pct: parseFloat(e.target.value) || 0})}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 text-sm font-normal text-slate-900 focus:outline-none focus:border-teal-500/50 transition-all" 
                />
              </div>
            </div>

            <div className="text-left">
              <label className="block text-xs font-semibold text-slate-500 mb-2">Nominal Saran (pisahkan dengan koma)</label>
              <input 
                value={formData.suggestion_amounts}
                onChange={(e) => setFormData({...formData, suggestion_amounts: e.target.value})}
                placeholder="10000, 25000, 50000, 100000, 200000, 500000"
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 text-sm font-normal text-slate-900 focus:outline-none focus:border-teal-500/50 transition-all font-mono"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50">
              <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 cursor-pointer text-left">
                <input 
                  type="checkbox" 
                  checked={formData.has_no_target} 
                  onChange={(e) => setFormData({...formData, has_no_target: e.target.checked})} 
                  className="w-5 h-5 text-teal-600 rounded-lg border-slate-200" 
                />
                <span className="text-xs font-semibold text-slate-700">Terima Tanpa Batas Target</span>
              </label>
              <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 cursor-pointer text-left">
                <input 
                  type="checkbox" 
                  checked={formData.has_no_time_limit} 
                  onChange={(e) => setFormData({...formData, has_no_time_limit: e.target.checked})} 
                  className="w-5 h-5 text-teal-600 rounded-lg border-slate-200" 
                />
                <span className="text-xs font-semibold text-slate-700">Tanpa Batas Waktu</span>
              </label>
              <div className="text-left">
                <label className="block text-[10px] font-normal text-slate-400 uppercase tracking-widest mb-1 mx-2">Urutan (Sort)</label>
                <input
                  type="number"
                  value={formData.sort}
                  onChange={(e) => setFormData({...formData, sort: parseInt(e.target.value) || 0})}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-4 text-xs font-normal text-slate-800"
                />
              </div>
              <div className="text-left">
                <label className="block text-[10px] font-normal text-slate-400 uppercase tracking-widest mb-1 mx-2">Status Program</label>
                <select 
                  value={formData.status} 
                  onChange={(e) => setFormData({...formData, status: e.target.value})} 
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-4 text-xs font-normal text-slate-800 bg-white"
                >
                  <option value="ACTIVE">AKTIF</option>
                  <option value="INACTIVE">NONAKTIF</option>
                  <option value="DRAFT">DRAFT</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 space-y-6">
            <h3 className="text-sm font-normal text-slate-800 tracking-tight text-left">Cover Foto</h3>
            <FileUpload 
              value={formData.image_url}
              onChange={(url) => setFormData({...formData, image_url: url})}
              deferred
              onFileSelect={(file) => setImageFile(file)}
            />
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 space-y-4">
             <h3 className="text-sm font-normal text-slate-800 tracking-tight text-left">Atribut & Tipe</h3>
             <div className="grid grid-cols-2 gap-3">
             {[
               { id: 'is_urgent', label: 'Darurat', icon: AlertCircle, color: 'text-rose-500' },
               { id: 'is_carousel', label: 'Carousel', icon: ImageIcon, color: 'text-indigo-500' },
               { id: 'is_zakat', label: 'Zakat', icon: CheckCircle2, color: 'text-emerald-500' },
               { id: 'is_qurban', label: 'Qurban', icon: CheckCircle2, color: 'text-amber-500' },
               { id: 'is_verified', label: 'Verified', icon: CheckCircle2, color: 'text-blue-500' },
               { id: 'is_fixed_amount', label: 'Nominal Tetap', icon: CheckCircle2, color: 'text-purple-500' },
               { id: 'is_bundle', label: 'Tipe Bundle', icon: Package, color: 'text-orange-500' },
             ].map((item) => (
                <label key={item.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 cursor-pointer">
                  <div className="flex items-center gap-3">
                    <item.icon size={16} className={item.color} />
                    <span className="text-xs font-normal text-slate-600">{item.label}</span>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={(formData as any)[item.id]} 
                    onChange={(e) => setFormData({...formData, [item.id]: e.target.checked})} 
                    className="w-5 h-5 text-teal-600 rounded-lg border-slate-200" 
                  />
                </label>
             ))}
             </div>
          </div>

          <button 
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-emerald-600 text-white py-5 rounded-2xl text-sm font-normal shadow-xl shadow-emerald-500/20 hover:bg-emerald-700 transition-all active:scale-95 flex items-center justify-center gap-3"
          >
            {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
            Perbarui Kampanye
          </button>
        </div>

        {/* ── Full-width Relational Sections ── */}
        <div className="lg:col-span-3 space-y-6">

          {/* ─ Campaign Variants ─ */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <div className="flex items-center gap-2 text-left">
                <Tags size={18} className="text-indigo-500" />
                <h3 className="font-semibold text-slate-800 text-sm">Varian Paket / Harga</h3>
                <span className="text-[10px] bg-indigo-50 text-indigo-500 px-2 py-0.5 rounded font-semibold">{variants.length} item</span>
              </div>
              <button
                type="button"
                onClick={() => setVariants([...variants, { name: '', price: 0, names_per_qty: 1, stock_limit: '', is_active: true }])}
                className="flex items-center gap-2 text-xs font-semibold text-white bg-indigo-500 hover:bg-indigo-600 px-4 py-2.5 rounded-xl transition-all"
              >
                <Plus size={14} /> Tambah Varian
              </button>
            </div>
            {variants.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm italic">Belum ada varian paket. Klik "Tambah Varian" untuk menambahkan.</div>
            ) : (
              <div className="p-4 space-y-3">
                {variants.map((v: any, i: number) => (
                  <div key={i} className="grid grid-cols-12 gap-3 items-center bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
                    <div className="col-span-4">
                      <label className="text-[10px] font-semibold text-slate-400 uppercase mb-1 block">Nama Varian</label>
                      <input
                        value={v.name}
                        onChange={(e) => { const u = [...variants]; u[i].name = e.target.value; setVariants(u); }}
                        placeholder="Contoh: Sapi 1 Ekor"
                        className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-sm text-slate-800 focus:outline-none focus:border-indigo-400"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-[10px] font-semibold text-slate-400 uppercase mb-1 block">Harga (Rp)</label>
                      <input
                        type="number"
                        value={v.price}
                        onChange={(e) => { const u = [...variants]; u[i].price = parseInt(e.target.value) || 0; setVariants(u); }}
                        className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-sm text-slate-800 focus:outline-none focus:border-indigo-400"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-[10px] font-semibold text-slate-400 uppercase mb-1 block">Nama/Qty</label>
                      <input
                        type="number"
                        value={v.names_per_qty}
                        onChange={(e) => { const u = [...variants]; u[i].names_per_qty = parseInt(e.target.value) || 1; setVariants(u); }}
                        className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-sm text-slate-800 focus:outline-none focus:border-indigo-400"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-[10px] font-semibold text-slate-400 uppercase mb-1 block">Limit Stok</label>
                      <input
                        type="number"
                        value={v.stock_limit || ''}
                        placeholder="∞"
                        onChange={(e) => { const u = [...variants]; u[i].stock_limit = e.target.value ? parseInt(e.target.value) : null; setVariants(u); }}
                        className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-sm text-slate-800 focus:outline-none focus:border-indigo-400"
                      />
                    </div>
                    <div className="col-span-1 flex flex-col items-center gap-1">
                      <label className="text-[10px] font-semibold text-slate-400 uppercase">Aktif</label>
                      <input
                        type="checkbox"
                        checked={v.is_active}
                        onChange={(e) => { const u = [...variants]; u[i].is_active = e.target.checked; setVariants(u); }}
                        className="w-5 h-5 text-indigo-600"
                      />
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setVariants(variants.filter((_: any, idx: number) => idx !== i))}
                        className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ─ Campaign Bundles ─ */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <div className="flex items-center gap-2 text-left">
                <Package size={18} className="text-amber-500" />
                <h3 className="font-semibold text-slate-800 text-sm">Bundling Kampanye</h3>
                <span className="text-[10px] bg-amber-50 text-amber-500 px-2 py-0.5 rounded font-semibold">{bundles.length} item</span>
              </div>
              <button
                type="button"
                onClick={() => setBundles([...bundles, { item_campaign_id: '', qty: 1 }])}
                className="flex items-center gap-2 text-xs font-semibold text-white bg-amber-500 hover:bg-amber-600 px-4 py-2.5 rounded-xl transition-all"
              >
                <Plus size={14} /> Tambah Bundle
              </button>
            </div>
            {bundles.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm italic">Belum ada relasi bundling. Klik "Tambah Bundle" untuk menambahkan.</div>
            ) : (
              <div className="p-4 space-y-3">
                {bundles.map((b: any, i: number) => (
                  <div key={i} className="grid grid-cols-12 gap-3 items-center bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
                    <div className="col-span-8">
                      <label className="text-[10px] font-semibold text-slate-400 uppercase mb-1 block">Kampanye Item</label>
                      <SearchableSelect
                        options={(allCampaigns?.filter((c: any) => String(c.id) !== String(id)) || []).map((c: any) => ({ id: c.id, name: c.title }))}
                        value={b.item_campaign_id}
                        onChange={(val) => { const u = [...bundles]; u[i].item_campaign_id = Number(val) || ''; setBundles(u); }}
                        placeholder="-- Pilih Kampanye --"
                        className="[&>button]:rounded-lg [&>button]:h-9 [&>button]:border-slate-200 [&>button]:bg-white [&>button]:focus:border-amber-400"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-[10px] font-semibold text-slate-400 uppercase mb-1 block">Qty</label>
                      <input
                        type="number"
                        min={1}
                        value={b.qty}
                        onChange={(e) => { const u = [...bundles]; u[i].qty = parseInt(e.target.value) || 1; setBundles(u); }}
                        className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-sm text-slate-800 focus:outline-none focus:border-amber-400"
                      />
                    </div>
                    <div className="col-span-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setBundles(bundles.filter((_: any, idx: number) => idx !== i))}
                        className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ─ QRIS Static ─ */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <div className="flex items-center gap-2 text-left">
                <QrCode size={18} className="text-teal-500" />
                <h3 className="font-semibold text-slate-800 text-sm">QRIS Statis</h3>
                <span className="text-[10px] bg-teal-50 text-teal-500 px-2 py-0.5 rounded font-semibold">{qrisStatic.length} item</span>
              </div>
              <button
                type="button"
                onClick={() => setQrisStatic([...qrisStatic, { external_id: '', qris_string: '', status: 'ACTIVE' }])}
                className="flex items-center gap-2 text-xs font-semibold text-white bg-teal-500 hover:bg-teal-600 px-4 py-2.5 rounded-xl transition-all"
              >
                <Plus size={14} /> Tambah QRIS
              </button>
            </div>
            {qrisStatic.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm italic">Belum ada QRIS statis terdaftar. Klik "Tambah QRIS" untuk menambahkan.</div>
            ) : (
              <div className="p-4 space-y-3">
                {qrisStatic.map((q: any, i: number) => (
                  <div key={i} className="grid grid-cols-12 gap-3 items-start bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
                    <div className="col-span-2">
                      <label className="text-[10px] font-semibold text-slate-400 uppercase mb-1 block">External ID</label>
                      <input
                        value={q.external_id}
                        onChange={(e) => { const u = [...qrisStatic]; u[i].external_id = e.target.value; setQrisStatic(u); }}
                        placeholder="External ID"
                        className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-xs text-slate-800 focus:outline-none focus:border-teal-400"
                      />
                    </div>
                    <div className="col-span-5">
                      <label className="text-[10px] font-semibold text-slate-400 uppercase mb-1 block">QRIS String</label>
                      <textarea
                        rows={2}
                        value={q.qris_string}
                        onChange={(e) => { const u = [...qrisStatic]; u[i].qris_string = e.target.value; setQrisStatic(u); }}
                        placeholder="Raw QR String"
                        className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-xs text-slate-800 focus:outline-none focus:border-teal-400 font-mono"
                      />
                    </div>
                    <div className="col-span-2 flex flex-col items-center">
                      <label className="text-[10px] font-semibold text-slate-400 uppercase mb-1 block">Preview</label>
                      <div className="bg-white p-1 rounded-lg border border-slate-200 relative group">
                        {q.qris_string ? (
                          <>
                            <QRCodeCanvas
                              id={`qris-canvas-${i}`}
                              value={q.qris_string}
                              size={60}
                              level="M"
                              includeMargin={false}
                            />
                            <button
                              type="button"
                              onClick={() => downloadQR(`qris-canvas-${i}`, q.external_id || `qris-${i}`)}
                              className="absolute inset-0 bg-teal-600/80 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg"
                            >
                              <Download size={16} />
                            </button>
                          </>
                        ) : (
                          <div className="w-[60px] h-[60px] flex items-center justify-center text-[8px] text-slate-300 text-center leading-tight">
                            Input string<br/>dulu
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <label className="text-[10px] font-semibold text-slate-400 uppercase mb-1 block">Status</label>
                      <select
                        value={q.status}
                        onChange={(e) => { const u = [...qrisStatic]; u[i].status = e.target.value; setQrisStatic(u); }}
                        className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-xs text-slate-800 focus:outline-none focus:border-teal-400"
                      >
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="INACTIVE">INACTIVE</option>
                      </select>
                    </div>
                    <div className="col-span-1 flex justify-end pt-5">
                      <button
                        type="button"
                        onClick={() => setQrisStatic(qrisStatic.filter((_: any, idx: number) => idx !== i))}
                        className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ─ Final Save Button ─ */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-emerald-600 text-white py-5 rounded-2xl text-sm font-semibold shadow-xl shadow-emerald-500/20 hover:bg-emerald-700 transition-all active:scale-95 flex items-center justify-center gap-3"
          >
            {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
            Simpan Semua Perubahan
          </button>
        </div>
      </form>
    </div>
  );
}

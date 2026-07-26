import React from 'react';
import Link from 'next/link';
import {
  FileText, Tags, MessageSquare, Users2, FileCheck, BarChart2, Users, Shield,
  Building, HelpCircle, LayoutDashboard, Megaphone, Receipt, Heart, Wallet,
  BellRing, ShieldCheck, CreditCard, History, Settings, ArrowUpRight,
  AlertTriangle, Info, ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const PUBLIC_BASE = 'https://web-cf-darulhikam.vercel.app';

type Req = 'wajib' | 'opsional' | 'otomatis';

interface Field {
  name: string;
  req: Req;
  note: string;
}

interface Entry {
  id: string;
  module: 'website' | 'crowdfunding';
  route: string;
  icon: React.ElementType;
  title: string;
  governs: string;
  publicUrl?: string;
  publicImg?: string;
  publicCaption?: string;
  adminImg: string;
  siteWide?: boolean;
  fields?: Field[];
  actions?: string[];
  note?: { type: 'warning' | 'info'; text: React.ReactNode };
  readOnly?: string;
}

const reqStyle: Record<Req, string> = {
  wajib: 'bg-rose-50 text-rose-600 border-rose-100',
  opsional: 'bg-slate-50 text-slate-500 border-slate-100',
  otomatis: 'bg-indigo-50 text-indigo-600 border-indigo-100',
};
const reqLabel: Record<Req, string> = { wajib: 'Wajib', opsional: 'Opsional', otomatis: 'Otomatis' };

const entries: Entry[] = [
  // ---------------- WEBSITE CMS ----------------
  {
    id: 'web-articles', module: 'website', route: '/web-articles', icon: FileText, title: 'Artikel',
    governs: 'Mengatur bagian “Kabar Kebaikan” dan blok “Berita & Laporan Terbaru” di beranda.',
    publicUrl: `${PUBLIC_BASE}/kabar-kebaikan`, publicImg: 'public-website-home-articles.jpg',
    publicCaption: 'Kartu artikel di beranda — datanya persis dari daftar Artikel.',
    adminImg: 'admin-web-articles.jpg',
    fields: [
      { name: 'title', req: 'wajib', note: 'Judul artikel' },
      { name: 'excerpt', req: 'wajib', note: 'Ringkasan singkat' },
      { name: 'body', req: 'wajib', note: 'Isi lengkap — rich text editor' },
      { name: 'category_id', req: 'wajib', note: 'Dropdown dari menu Kategori Artikel' },
      { name: 'featured_image_url', req: 'opsional', note: 'Gambar sampul' },
      { name: 'is_featured', req: 'opsional', note: 'Tampilkan di beranda' },
      { name: 'status', req: 'opsional', note: 'draft / published / archived' },
      { name: 'slug', req: 'otomatis', note: 'Dibuat dari judul, tidak bisa diedit' },
    ],
    actions: ['Tulis Artikel', 'Edit', 'Hapus'],
    note: { type: 'warning', text: <>Hapus di sini = <b>soft delete</b> — artikel diarsipkan, datanya tetap ada di database, hanya hilang dari tampilan publik. Kategori wajib sudah ada dulu sebelum artikel bisa disimpan.</> },
  },
  {
    id: 'web-article-categories', module: 'website', route: '/web-article-categories', icon: Tags, title: 'Kategori Artikel',
    governs: 'Mengatur filter kategori di halaman Kabar Kebaikan (tombol “Semua”, “Berita Program”, “Kisah Inspiratif”, dst).',
    publicUrl: `${PUBLIC_BASE}/kabar-kebaikan`, publicImg: 'public-website-home-articles.jpg',
    publicCaption: 'Kategori menentukan label pada setiap kartu artikel di atas.',
    adminImg: 'admin-web-article-categories.jpg',
    fields: [
      { name: 'name', req: 'wajib', note: 'Nama kategori' },
      { name: 'slug', req: 'wajib', note: 'Otomatis dari nama, bisa diedit manual' },
      { name: 'is_active', req: 'opsional', note: 'Aktif / Tidak Aktif' },
    ],
    actions: ['Tambah', 'Edit', 'Hapus'],
    note: { type: 'warning', text: <>Tidak bisa dihapus kalau masih ada artikel memakai kategori tsb. Kategori selalu tampil urut abjad — tidak ada pengaturan urutan manual.</> },
  },
  {
    id: 'web-testimonials', module: 'website', route: '/web-testimonials', icon: MessageSquare, title: 'Testimoni',
    governs: 'Mengatur blok “Suara Mereka yang Merasakan Dampaknya” di beranda.',
    publicUrl: PUBLIC_BASE, publicImg: 'public-website-home-testimonials.jpg',
    adminImg: 'admin-web-testimonials.jpg',
    fields: [
      { name: 'person_name', req: 'wajib', note: 'Nama' },
      { name: 'person_role', req: 'wajib', note: 'Peran/lokasi, mis. “Pengusaha, Jakarta”' },
      { name: 'quote', req: 'wajib', note: 'Isi kutipan' },
      { name: 'person_type', req: 'opsional', note: 'Donatur (muzakki) / Penerima (mustahiq)' },
      { name: 'avatar_url', req: 'opsional', note: 'Kosong → pakai inisial nama' },
      { name: 'display_order', req: 'opsional', note: 'Angka manual, makin kecil makin duluan tampil' },
    ],
    actions: ['Tambah', 'Edit', 'Hapus (permanen)'],
  },
  {
    id: 'web-partners', module: 'website', route: '/web-partners', icon: Users2, title: 'Mitra',
    governs: 'Mengatur blok “Dipercaya Lembaga Terkemuka” di beranda.',
    publicUrl: PUBLIC_BASE, publicImg: 'public-website-home-partners.jpg',
    adminImg: 'admin-web-partners.jpg',
    fields: [
      { name: 'name', req: 'wajib', note: 'Nama mitra' },
      { name: 'partner_type', req: 'opsional', note: 'Korporat / Pemerintah / NGO / Akademik / Media' },
      { name: 'website_url', req: 'opsional', note: 'Link website mitra' },
      { name: 'logo_url', req: 'opsional', note: 'PNG/SVG transparan disarankan' },
      { name: 'display_order', req: 'opsional', note: 'Urutan tampil (angka manual)' },
    ],
    actions: ['Tambah', 'Edit', 'Hapus'],
  },
  {
    id: 'web-reports', module: 'website', route: '/web-reports', icon: FileCheck, title: 'Laporan Keuangan',
    governs: 'Mengatur bagian “Unduh Laporan Audit” di halaman Transparansi.',
    publicUrl: `${PUBLIC_BASE}/transparansi`, publicImg: 'public-website-reports.jpg',
    adminImg: 'admin-web-reports.jpg',
    fields: [
      { name: 'title', req: 'wajib', note: 'Judul laporan' },
      { name: 'period_label', req: 'wajib', note: 'mis. “Q2 2025”' },
      { name: 'period_year', req: 'wajib', note: 'Tahun periode' },
      { name: 'file_url', req: 'wajib', note: 'PDF, maks ±10MB' },
      { name: 'report_type', req: 'opsional', note: 'Tahunan / Triwulan / Bulanan / Audit Khusus' },
      { name: 'audit_status', req: 'opsional', note: 'Diaudit KAP / Ditinjau Internal / Belum Diaudit' },
      { name: 'is_published', req: 'opsional', note: 'Terbitkan / Draft' },
    ],
    actions: ['Upload Laporan', 'Edit', 'Hapus'],
    note: { type: 'warning', text: <>Tidak bisa disimpan tanpa file PDF. Urutan tampil otomatis dari tahun + kuartal terbaru — tidak perlu diatur manual.</> },
  },
  {
    id: 'web-metrics', module: 'website', route: '/web-metrics', icon: BarChart2, title: 'Impact Metrics',
    governs: 'Mengatur angka statistik di beranda dan blok “Angka Kumulatif” di halaman Transparansi.',
    publicUrl: `${PUBLIC_BASE}/transparansi`, publicImg: 'public-website-metrics.jpg',
    adminImg: 'admin-web-metrics.jpg',
    fields: [
      { name: 'metric_key', req: 'wajib', note: 'Kunci unik, mis. total_funds_distributed_m' },
      { name: 'label', req: 'wajib', note: 'mis. “Dana Tersalurkan (Rp)”' },
      { name: 'value', req: 'wajib', note: 'Nilai angka' },
      { name: 'suffix', req: 'opsional', note: 'mis. “M+”, “rb+”' },
      { name: 'display_order', req: 'opsional', note: 'Urutan tampil' },
    ],
    actions: ['Tambah', 'Edit', 'Hapus'],
    note: { type: 'warning', text: <>Hati-hati mengetik <code>metric_key</code> — sistem tidak memvalidasi duplikat. Salah ketik bisa membuat angka tidak muncul di web publik.</> },
  },
  {
    id: 'web-team', module: 'website', route: '/web-team', icon: Users, title: 'Tim & Pengurus',
    governs: 'Mengatur blok “Tim Kepemimpinan” di halaman Tentang Kami.',
    publicUrl: `${PUBLIC_BASE}/tentang-kami`, publicImg: 'public-website-team.jpg',
    adminImg: 'admin-web-team.jpg',
    fields: [
      { name: 'name', req: 'wajib', note: 'Nama lengkap + gelar' },
      { name: 'title', req: 'wajib', note: 'Jabatan' },
      { name: 'department', req: 'opsional', note: 'Divisi' },
      { name: 'bio', req: 'opsional', note: 'Bio singkat' },
      { name: 'avatar_url', req: 'opsional', note: 'Kosong → inisial nama' },
      { name: 'display_order', req: 'opsional', note: 'Urutan tampil' },
    ],
    actions: ['Tambah Pengurus', 'Edit', 'Hapus'],
  },
  {
    id: 'web-legality', module: 'website', route: '/web-legality', icon: Shield, title: 'Legalitas',
    governs: 'Mengatur blok “Dokumen Resmi” di halaman Tentang Kami (SK Kemenag, NPWP, Akta Notaris, Reg. BAZNAS).',
    publicUrl: `${PUBLIC_BASE}/tentang-kami`, publicImg: 'public-website-legality.jpg',
    adminImg: 'admin-web-legality.jpg',
    fields: [
      { name: 'title', req: 'wajib', note: 'Nama dokumen' },
      { name: 'document_number', req: 'opsional', note: 'mis. “SK Nomor 792 Tahun 2020”' },
      { name: 'issued_by', req: 'opsional', note: 'Institusi penerbit' },
      { name: 'issued_date', req: 'opsional', note: 'Tanggal terbit' },
      { name: 'file_url', req: 'opsional', note: 'PDF/gambar pendukung' },
    ],
    actions: ['Tambah Dokumen', 'Edit', 'Hapus'],
    note: { type: 'info', text: <>Beda dari Laporan Keuangan: file di sini <b>opsional</b>. Tanpa file, entri tetap tampil (judul & nomor saja, tanpa link unduh).</> },
  },
  {
    id: 'web-banks', module: 'website', route: '/web-banks', icon: Building, title: 'Rekening Resmi',
    governs: 'Mengatur blok “Rekening Donasi Terpercaya” di halaman Layanan ZISWAF — rekening untuk transfer manual.',
    publicUrl: `${PUBLIC_BASE}/layanan-ziswaf`, publicImg: 'public-website-banks.jpg',
    adminImg: 'admin-web-banks.jpg',
    fields: [
      { name: 'bank_name', req: 'wajib', note: 'Nama bank' },
      { name: 'account_number', req: 'wajib', note: 'Nomor rekening' },
      { name: 'account_name', req: 'wajib', note: 'Default “LAZ Darul Hikam”' },
      { name: 'bank_code', req: 'opsional', note: 'Kode transfer/kliring' },
      { name: 'logo_url', req: 'opsional', note: 'Logo bank' },
    ],
    actions: ['Tambah Rekening', 'Edit', 'Hapus'],
    note: { type: 'info', text: <>Khusus <b>transfer manual</b>. Metode digital (QRIS/VA/e-wallet) diatur di menu <Link href="#payment-channels" className="underline underline-offset-2 hover:text-indigo-700">Payment Channels</Link> pada modul Crowdfunding.</> },
  },
  {
    id: 'web-faqs', module: 'website', route: '/web-faqs', icon: HelpCircle, title: 'FAQ',
    governs: 'Mengatur bagian “Pertanyaan Umum” di halaman Kontak.',
    publicUrl: `${PUBLIC_BASE}/kontak`, publicImg: 'public-website-faq.jpg',
    adminImg: 'admin-web-faqs.jpg',
    fields: [
      { name: 'question', req: 'wajib', note: 'Pertanyaan' },
      { name: 'answer', req: 'wajib', note: 'Jawaban' },
      { name: 'category', req: 'opsional', note: 'Umum / Donasi & Transfer / Zakat & Nisab / Program & Penyaluran / Kemitraan / Teknis & Akun' },
    ],
    actions: ['Tambah FAQ', 'Edit', 'Hapus'],
    note: { type: 'info', text: <>Kategori adalah daftar tetap — tidak bisa bikin kategori baru dari admin panel.</> },
  },

  // ---------------- CROWDFUNDING ----------------
  {
    id: 'dashboard', module: 'crowdfunding', route: '/dashboard', icon: LayoutDashboard, title: 'Dashboard',
    governs: 'Ringkasan kinerja untuk admin.',
    adminImg: 'admin-dashboard.jpg',
    readOnly: 'Tidak mengubah apa pun di web publik — murni ringkasan: total donasi, total donatur, kampanye aktif, transaksi berhasil, tren 7 hari, dan pencapaian target NGO tahunan. Read-only, tidak ada tombol simpan.',
  },
  {
    id: 'campaigns', module: 'crowdfunding', route: '/campaigns', icon: Megaphone, title: 'Kampanye',
    governs: 'Mengatur semua kartu program di halaman Program dan carousel di beranda.',
    publicUrl: `${PUBLIC_BASE}/program`, publicImg: 'public-cf-campaigns-list.jpg',
    adminImg: 'admin-campaigns.jpg',
    fields: [
      { name: 'title / slug', req: 'wajib', note: 'Judul & URL kampanye' },
      { name: 'category_id', req: 'wajib', note: 'Kategori kampanye' },
      { name: 'description', req: 'wajib', note: 'Cerita lengkap — rich text' },
      { name: 'cover_image', req: 'wajib', note: 'Foto sampul' },
      { name: 'target_amount', req: 'opsional', note: 'Nonaktif bila “tanpa target”' },
      { name: 'end_date', req: 'opsional', note: 'Nonaktif bila “tanpa batas waktu”' },
      { name: 'base_commission_pct', req: 'opsional', note: 'Komisi afiliasi default kampanye ini' },
      { name: 'flags', req: 'opsional', note: 'Darurat, Carousel, Zakat, Qurban, Terverifikasi, Bundel, dll' },
    ],
    actions: ['Tambah Kampanye', 'Lihat', 'Edit', 'Duplikat', 'Hapus'],
    note: { type: 'warning', text: <>Di halaman edit juga ada <b>Varian/Paket harga</b>, <b>Bundling</b> ke kampanye lain, dan <b>QRIS statis</b> khusus kampanye ini. Duplikat hanya menyalin data dasar — ketiganya tidak ikut tersalin.</> },
  },
  {
    id: 'campaign-updates', module: 'crowdfunding', route: '/campaign-updates', icon: MessageSquare, title: 'Kabar Penyaluran',
    governs: 'Mengatur tab “Info Terbaru” di halaman detail kampanye publik.',
    publicUrl: `${PUBLIC_BASE}/donasi/tolongindedesembuh`, publicImg: 'public-cf-campaign-updates.jpg',
    adminImg: 'admin-campaign-updates.jpg',
    fields: [
      { name: 'campaign_id', req: 'wajib', note: 'Kampanye terkait' },
      { name: 'title / excerpt', req: 'wajib', note: 'Judul & ringkasan update' },
      { name: 'content', req: 'wajib', note: 'Isi lengkap — rich text' },
      { name: 'image_url', req: 'opsional', note: 'Foto dokumentasi' },
    ],
    actions: ['Tambah', 'Edit', 'Hapus'],
    note: { type: 'info', text: <>Tidak ada status draft — begitu disimpan langsung tampil di web publik. CRUD yang sama juga tersedia langsung di tab kampanye terkait.</> },
  },
  {
    id: 'categories', module: 'crowdfunding', route: '/categories', icon: Tags, title: 'Kategori',
    governs: 'Mengatur label/badge kategori pada kartu kampanye di halaman Program (mis. “Medis”, “Qurban”).',
    publicUrl: `${PUBLIC_BASE}/program`, publicImg: 'public-cf-campaigns-list.jpg',
    publicCaption: 'Badge kategori di setiap kartu kampanye.',
    adminImg: 'admin-categories.jpg',
    fields: [
      { name: 'name', req: 'wajib', note: 'Nama kategori' },
      { name: 'color_theme', req: 'opsional', note: 'Palet tetap: rose, blue, orange, teal, emerald, amber, indigo, slate' },
      { name: 'is_active', req: 'opsional', note: 'Tampil/sembunyi di publik' },
    ],
    actions: ['Tambah', 'Edit', 'Hapus', 'Lihat detail'],
    note: { type: 'warning', text: <>Kategori yang masih dipakai kampanye kemungkinan tidak bisa dihapus (muncul pesan error).</> },
  },
  {
    id: 'transactions', module: 'crowdfunding', route: '/transactions', icon: Receipt, title: 'Transaksi',
    governs: 'Sumber angka “Terkumpul” dan “Donatur” pada setiap kampanye, serta tab Donatur di halaman detail kampanye.',
    publicUrl: `${PUBLIC_BASE}/donasi/tolongindedesembuh`, publicImg: 'public-cf-campaign-detail.jpg',
    publicCaption: 'Progres dana & jumlah donatur berasal dari data transaksi.',
    adminImg: 'admin-transactions.jpg',
    actions: ['Tandai Lunas', 'Lihat bukti transfer', 'Lihat Detail', 'Export Excel', 'Hapus'],
    note: { type: 'warning', text: <>Tabel <code>transactions</code>/<code>invoices</code> di-<i>partition</i> per <code>created_at</code> — update status & hapus selalu menyertakan kombinasi <code>id</code> + <code>created_at</code>. Ini ditangani otomatis oleh sistem, admin cukup pakai tombol yang tersedia.</> },
  },
  {
    id: 'donors', module: 'crowdfunding', route: '/donors', icon: Users, title: 'Donatur',
    governs: 'Database donatur (CRM) — terkumpul otomatis dari riwayat transaksi.',
    adminImg: 'admin-donors.jpg',
    fields: [
      { name: 'name / email / phone', req: 'opsional', note: 'Bisa diedit manual' },
      { name: 'total_donated', req: 'otomatis', note: 'Dihitung sistem, tidak bisa diedit' },
      { name: 'donation_count', req: 'otomatis', note: 'Dihitung sistem, tidak bisa diedit' },
    ],
    actions: ['Tambah manual', 'Edit', 'Hapus', 'Lihat profil', 'Export Excel'],
    note: { type: 'info', text: <>Tidak ada halaman publik khusus — data donatur hanya terlihat publik lewat jumlah “Donatur” di tiap kampanye (dan nama bila tidak disembunyikan).</> },
  },
  {
    id: 'affiliates', module: 'crowdfunding', route: '/affiliates', icon: Heart, title: 'Afiliasi',
    governs: 'Program referral — mitra/individu yang mempromosikan kampanye lewat kode/link unik dan mendapat komisi.',
    adminImg: 'admin-affiliates.jpg',
    fields: [
      { name: 'affiliate_code', req: 'wajib', note: 'Kode referral, unik' },
      { name: 'name / email / phone', req: 'wajib', note: 'Data afiliasi' },
      { name: 'balance', req: 'otomatis', note: 'Saldo komisi berjalan' },
    ],
    actions: ['Tambah', 'Edit', 'Hapus', 'Lihat detail'],
    note: { type: 'info', text: <>Tidak tampil sebagai halaman khusus di publik, tapi menentukan siapa dapat komisi dari donasi yang masuk lewat link afiliasi. Detail afiliasi punya tab Komisi Kampanye, Data Transaksi, dan Riwayat Withdrawal.</> },
  },
  {
    id: 'withdrawals', module: 'crowdfunding', route: '/withdrawals', icon: Wallet, title: 'Penarikan',
    governs: 'Persetujuan pencairan saldo komisi afiliasi.',
    adminImg: 'admin-withdrawals.jpg',
    fields: [
      { name: 'affiliate / amount', req: 'wajib', note: 'Afiliasi & nominal penarikan' },
      { name: 'status', req: 'opsional', note: 'Pending / Berhasil / Batal' },
    ],
    actions: ['Proses (setuju)', 'Tolak / Batalkan', 'Lihat detail', 'Hapus'],
    note: { type: 'warning', text: <>Hanya request <b>Pending</b> yang bisa diproses/ditolak. Menyetujui otomatis mengurangi saldo afiliasi — ini satu-satunya gerbang persetujuan sebelum komisi cair. Tidak terlihat di web publik.</> },
  },
  {
    id: 'notifications', module: 'crowdfunding', route: '/notifications', icon: BellRing, title: 'Notifikasi',
    governs: 'Template pesan otomatis (WhatsApp/Email/SMS) yang dikirim ke donatur.',
    adminImg: 'admin-notifications.jpg',
    fields: [
      { name: 'event_trigger', req: 'wajib', note: 'mis. INVOICE_CREATED, PAYMENT_SUCCESS' },
      { name: 'channel', req: 'wajib', note: 'WhatsApp / Email / SMS' },
      { name: 'message_content', req: 'wajib', note: 'Mendukung {nama}, {nominal}, {invoice_code}, {metode}, {va_number}' },
    ],
    actions: ['Tambah', 'Edit', 'Hapus'],
    note: { type: 'info', text: <>Efeknya terlihat di pesan yang diterima donatur, bukan di halaman web. Tidak ada fitur “kirim tes” — perubahan baru terlihat saat ada transaksi nyata yang memicu event tsb.</> },
  },
  {
    id: 'admins', module: 'crowdfunding', route: '/admins', icon: ShieldCheck, title: 'Admin',
    governs: 'Akun pengguna admin panel ini sendiri — bukan konten publik.',
    adminImg: 'admin-admins.jpg',
    fields: [
      { name: 'name / email', req: 'wajib', note: 'Email dipakai untuk login (Google OAuth)' },
      { name: 'role', req: 'wajib', note: 'ADMIN / FINANCE / SUPERADMIN' },
    ],
    actions: ['Tambah', 'Edit', 'Hapus', 'Lihat detail'],
    note: { type: 'info', text: <>Password tidak diisi manual — login lewat Google, akun harus terdaftar ACTIVE di sini dulu. Menu yang sama juga ada di <Link href="#settings" className="underline underline-offset-2 hover:text-teal-700">Pengaturan → Manajemen User</Link>.</> },
  },
  {
    id: 'payment-channels', module: 'crowdfunding', route: '/payment-channels', icon: CreditCard, title: 'Payment Channels',
    governs: 'Mengatur daftar metode pembayaran saat donatur checkout — langkah “Pilih Metode Pembayaran”.',
    publicUrl: `${PUBLIC_BASE}/donasi/tolongindedesembuh/checkout/payment`, publicImg: 'public-cf-payment-methods.jpg',
    adminImg: 'admin-payment-channels.jpg',
    fields: [
      { name: 'name / logo', req: 'wajib', note: 'Identitas channel' },
      { name: 'provider', req: 'wajib', note: 'moota, faspay, midtrans, xendit, manual' },
      { name: 'type', req: 'wajib', note: 'bank_transfer, e_wallet, va, qris, manual_transfer, retail_outlet' },
    ],
    actions: ['Tambah', 'Edit', 'Duplikat', 'Hapus', 'Urutan drag-and-drop'],
    note: { type: 'warning', text: <>Satu-satunya menu (bersama Kampanye) yang urutan tampilnya <b>drag-and-drop</b>, bukan input angka. Sub-halaman “Instructions” mengatur langkah pembayaran per channel.</> },
  },
  {
    id: 'logs', module: 'crowdfunding', route: '/logs', icon: History, title: 'Log Sistem',
    governs: 'Panel observabilitas untuk debugging.',
    adminImg: 'admin-logs.jpg',
    readOnly: 'Tidak berefek ke web publik — 3 tab: Payment Logs (callback gateway), Notification Logs (pengiriman WA/Email), Ads Conversion Logs (push konversi Meta/TikTok/Google Ads). Read-only, bisa lihat payload JSON mentah per baris.',
  },
  {
    id: 'settings', module: 'crowdfunding', route: '/settings', icon: Settings, title: 'Pengaturan',
    governs: 'Identitas & branding situs — nama NGO, logo, warna tema, kontak, pixel tracking. Sumber data header/footer di semua halaman publik.',
    adminImg: 'admin-settings.jpg', siteWide: true,
    fields: [
      { name: 'Konfigurasi Umum', req: 'wajib', note: 'Nama NGO, logo, favicon, video profil, warna utama, WhatsApp, alamat, info legal, sosial media, ID/token Meta/Google/TikTok Pixel' },
      { name: 'Manajemen User', req: 'opsional', note: 'Sama persis dengan menu Admin' },
      { name: 'Pixel Events', req: 'opsional', note: 'Memetakan aksi aplikasi ke nama event Meta/TikTok/Google Ads' },
    ],
    note: { type: 'warning', text: <>Berlaku di <b>semua halaman publik sekaligus</b> — bukan satu section tunggal. Setelah simpan, halaman otomatis reload supaya branding baru langsung terlihat.</> },
  },
];

const moduleMeta = {
  website: { label: 'Website CMS', accent: 'indigo', badge: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
  crowdfunding: { label: 'Crowdfunding', accent: 'teal', badge: 'bg-teal-50 text-teal-700 border-teal-100' },
} as const;

function FieldsTable({ fields }: { fields: Field[] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-100 shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 text-slate-400 text-[10px] uppercase tracking-widest">
            <th className="text-left font-medium py-3 px-4">Field</th>
            <th className="text-left font-medium py-3 px-4 w-28">Status</th>
            <th className="text-left font-medium py-3 px-4">Keterangan</th>
          </tr>
        </thead>
        <tbody>
          {fields.map((f) => (
            <tr key={f.name} className="border-t border-slate-100">
              <td className="py-3 px-4 font-mono text-[12.5px] text-slate-700 whitespace-nowrap">{f.name}</td>
              <td className="py-3 px-4">
                <span className={cn('px-2.5 py-1 rounded-full text-[10px] font-medium border', reqStyle[f.req])}>
                  {reqLabel[f.req]}
                </span>
              </td>
              <td className="py-3 px-4 text-slate-500">{f.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Note({ type, children }: { type: 'warning' | 'info'; children: React.ReactNode }) {
  const isWarn = type === 'warning';
  return (
    <div className={cn(
      'flex items-start gap-3 rounded-2xl border p-4 text-[13.5px] leading-relaxed',
      isWarn ? 'bg-amber-50 border-amber-100 text-amber-800' : 'bg-slate-50 border-slate-100 text-slate-600'
    )}>
      {isWarn ? <AlertTriangle size={17} className="shrink-0 mt-0.5 text-amber-500" /> : <Info size={17} className="shrink-0 mt-0.5 text-slate-400" />}
      <div>{children}</div>
    </div>
  );
}

function ShotCard({ label, sub, img, alt }: { label: string; sub?: React.ReactNode; img: string; alt: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden flex flex-col">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-3">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</span>
        {sub}
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/tutorial/${img}`} alt={alt} className="w-full h-auto block" />
    </div>
  );
}

function EmptyPublicCard({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 flex flex-col items-center justify-center text-center p-10 gap-3 min-h-[220px]">
      <div className="w-11 h-11 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
        <ExternalLink size={20} />
      </div>
      <p className="text-[13px] text-slate-500 max-w-[32ch]">{text}</p>
    </div>
  );
}

function EntrySection({ entry }: { entry: Entry }) {
  const meta = moduleMeta[entry.module];
  const Icon = entry.icon;

  return (
    <section id={entry.id} className="scroll-mt-24 pt-10 mt-2 border-t border-slate-100 first:border-t-0 first:pt-0 first:mt-0">
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border', meta.badge)}>
          <Icon size={12} /> {meta.label}
        </span>
        <span className="font-mono text-[12px] text-slate-400 bg-slate-50 border border-slate-100 rounded-full px-2.5 py-1">{entry.route}</span>
      </div>

      <h2 className="text-2xl font-normal text-slate-800 tracking-tight mb-2">{entry.title}</h2>
      <p className="text-slate-500 text-[14.5px] mb-6 max-w-[70ch]">
        <span className="font-semibold text-slate-700">Mengatur:</span> {entry.governs}
      </p>

      {entry.readOnly ? (
        <Note type="info">{entry.readOnly}</Note>
      ) : (
        <>
          {!entry.siteWide && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6 items-start">
              <ShotCard label="Panel Admin" img={entry.adminImg} alt={`Tampilan menu ${entry.title} di admin panel`} />
              {entry.publicImg ? (
                <ShotCard
                  label="Halaman Publik"
                  img={entry.publicImg}
                  alt={`Hasil di halaman publik untuk ${entry.title}`}
                  sub={entry.publicUrl && (
                    <a href={entry.publicUrl} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-teal-600 transition-colors truncate max-w-[220px]">
                      {entry.publicUrl.replace('https://', '')} <ArrowUpRight size={12} className="shrink-0" />
                    </a>
                  )}
                />
              ) : (
                <div className="flex flex-col">
                  <div className="px-4 py-3 mb-0 text-[10px] font-bold uppercase tracking-widest text-slate-400">Halaman Publik</div>
                  <EmptyPublicCard text="Tidak tampil sebagai halaman/section tersendiri di situs publik — data ini bekerja di balik layar." />
                </div>
              )}
            </div>
          )}
          {entry.siteWide && (
            <div className="mb-6">
              <ShotCard label="Panel Admin" img={entry.adminImg} alt={`Tampilan menu ${entry.title} di admin panel`} />
            </div>
          )}
          {entry.publicCaption && <p className="text-[12.5px] text-slate-400 -mt-4 mb-6">{entry.publicCaption}</p>}

          {entry.fields && (
            <div className="mb-5">
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Field form</div>
              <FieldsTable fields={entry.fields} />
            </div>
          )}

          {entry.actions && (
            <div className="flex flex-wrap gap-2 mb-5">
              {entry.actions.map((a) => (
                <span key={a} className="px-3 py-1.5 rounded-full text-[12.5px] font-medium bg-slate-50 text-slate-600 border border-slate-200">{a}</span>
              ))}
            </div>
          )}

          {entry.note && <Note type={entry.note.type}>{entry.note.text}</Note>}
        </>
      )}
    </section>
  );
}

export default function TutorialPage() {
  const websiteEntries = entries.filter((e) => e.module === 'website');
  const cfEntries = entries.filter((e) => e.module === 'crowdfunding');

  return (
    <div className="space-y-10 pb-10">
      {/* Intro */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border bg-violet-50 text-violet-700 border-violet-100 mb-4">
          Tutorial
        </span>
        <h1 className="text-2xl font-normal text-slate-800 tracking-tight mb-2">Menu admin mana yang mengatur bagian mana di web publik?</h1>
        <p className="text-slate-500 text-[14.5px] max-w-[72ch] mb-6">
          Setiap menu di bawah dipasangkan dengan screenshot nyata: sisi kiri adalah tampilan menu tersebut di panel admin ini,
          sisi kanan adalah bagian di <a href={PUBLIC_BASE} target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline">web-cf-darulhikam.vercel.app</a> yang
          berubah ketika data itu diedit. Pakai menu <span className="font-semibold text-slate-700">Tutorial</span> di sidebar kiri untuk lompat langsung ke topik yang dicari.
        </p>
        <div className="flex flex-wrap gap-3">
          <span className="inline-flex items-center gap-2 text-[13px] font-medium text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500" /> Website CMS — konten situs publik
          </span>
          <span className="inline-flex items-center gap-2 text-[13px] font-medium text-teal-700 bg-teal-50 border border-teal-100 rounded-xl px-3 py-2">
            <span className="w-2 h-2 rounded-full bg-teal-500" /> Crowdfunding — kampanye, uang masuk, donatur, afiliasi
          </span>
        </div>
      </div>

      {/* Part 1 */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <span className="text-[11px] font-bold uppercase tracking-widest text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-full px-3 py-1">Bagian 1</span>
          <h2 className="text-xl font-normal text-slate-800 tracking-tight">Modul Website (CMS)</h2>
        </div>
        <p className="text-slate-400 text-[13.5px] mb-4">Murni mengatur konten situs publik — teks, gambar, urutan tampil. Tidak menyentuh uang/transaksi.</p>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8">
          {websiteEntries.map((e) => <EntrySection key={e.id} entry={e} />)}
        </div>
      </div>

      {/* Part 2 */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <span className="text-[11px] font-bold uppercase tracking-widest text-teal-600 bg-teal-50 border border-teal-100 rounded-full px-3 py-1">Bagian 2</span>
          <h2 className="text-xl font-normal text-slate-800 tracking-tight">Modul Crowdfunding</h2>
        </div>
        <p className="text-slate-400 text-[13.5px] mb-4 max-w-[80ch]">
          Kampanye donasi, uang masuk, donatur, afiliasi. Tabel <code className="font-mono">transactions</code>/<code className="font-mono">invoices</code> di-partition
          per <code className="font-mono">created_at</code>, jadi setiap update/hapus selalu menyertakan kombinasi <code className="font-mono">id</code> + <code className="font-mono">created_at</code>.
        </p>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8">
          {cfEntries.map((e) => <EntrySection key={e.id} entry={e} />)}
        </div>
      </div>

      {/* Summary */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8">
        <h3 className="text-lg font-normal text-slate-800 mb-4">Pola umum di semua menu</h3>
        <ul className="space-y-3 text-[13.5px] text-slate-500 list-disc pl-5">
          <li><span className="font-semibold text-slate-700">Urutan Tampil</span> di menu konten website (Testimoni, Mitra, Metrics, Tim, Legalitas, Rekening, FAQ) diisi manual pakai angka. Hanya <span className="font-semibold text-slate-700">Kampanye</span> dan <span className="font-semibold text-slate-700">Payment Channels</span> yang drag-and-drop.</li>
          <li><span className="font-semibold text-slate-700">Hapus data:</span> hanya menu Artikel yang soft-delete (diarsipkan). Menu lain menghapus permanen setelah konfirmasi.</li>
          <li><span className="font-semibold text-slate-700">Status Aktif/Nonaktif</span> pada menu konten = tombol tampil/sembunyi di web publik, bukan alur approval — data tetap ada & bisa diedit kapan saja.</li>
        </ul>
      </div>
    </div>
  );
}

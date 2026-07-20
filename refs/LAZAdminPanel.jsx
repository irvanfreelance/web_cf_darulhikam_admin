import { useState, useEffect, useRef } from "react";
import {
  LayoutDashboard, FileText, Layers, MessageSquare, Users2, BarChart2,
  PieChart, Building, Shield, HelpCircle, Settings, LogOut, Menu, X,
  Plus, Search, Edit2, Trash2, Eye, ChevronRight, Check,
  AlertTriangle, Upload, Download, RefreshCw, Star,
  Save, Globe, Clock, Tag, TrendingUp, BookOpen, Heart,
  Droplets, Briefcase, GraduationCap, Package, Users, DollarSign,
  FileCheck, MoreVertical, ExternalLink, CheckCircle2, XCircle,
  Link2, Calendar, MapPin, Phone, Mail, Hash, Activity, Bell
} from "lucide-react";

const T = {
  biru:"#3268C3", biruDk:"#1f4a9c", biruLt:"#e8f0fb", biruMd:"#5585d4",
  hijau:"#1a6b3c", hijauLt:"#e8f5ee",
  emas:"#c9892a", emasLt:"#fdf3e3",
  bg:"#f4f6fb", sidebar:"#0f1b35",
  card:"#ffffff", border:"#e2e8f0",
  teks:"#0f1b35", teksMd:"#475569", teksMt:"#94a3b8",
  red:"#dc2626", redLt:"#fef2f2",
  green:"#16a34a", greenLt:"#f0fdf4",
  amber:"#d97706", amberLt:"#fffbeb",
};

const S = `
  @import url('https://fonts.googleapis.com/css2?family=Cabin:wght@400;500;600;700&family=Albert+Sans:wght@400;500;600&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Albert Sans',sans-serif;background:${T.bg};color:${T.teks};font-size:14px}
  h1,h2,h3,h4{font-family:'Cabin',sans-serif}
  button,input,textarea,select{font-family:'Albert Sans',sans-serif;cursor:pointer}
  ::-webkit-scrollbar{width:5px;height:5px}
  ::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:3px}
  .si:hover{background:rgba(255,255,255,.08)}
  .si.act{background:rgba(50,104,195,.22);border-left:3px solid ${T.biru}!important}
  .rh:hover{background:#f8fafc}
  .gh:hover{background:${T.biruLt}}
  .fi{animation:fi .2s ease}
  @keyframes fi{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
  .badge{display:inline-flex;align-items:center;gap:3px;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:600;white-space:nowrap}
  .card{background:#fff;border:1px solid ${T.border};border-radius:10px;padding:1.25rem}
  .fg{display:flex;flex-direction:column;gap:4px;margin-bottom:.85rem}
  .fl{font-size:11.5px;font-weight:700;color:${T.teksMd};text-transform:uppercase;letter-spacing:.5px}
  .fi2{width:100%;border:1.5px solid ${T.border};border-radius:8px;padding:9px 12px;font-size:13.5px;color:${T.teks};background:#fff;outline:none;transition:border .15s}
  .fi2:focus{border-color:${T.biru};box-shadow:0 0 0 3px ${T.biruLt}}
  .fsel{appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 10px center;padding-right:30px}
  .tbl th{background:#f8fafc;font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:${T.teksMt};padding:9px 13px;border-bottom:1px solid ${T.border};white-space:nowrap;text-align:left}
  .tbl td{padding:10px 13px;border-bottom:1px solid #f1f5f9;vertical-align:middle;font-size:13px}
  .mo{position:fixed;inset:0;background:rgba(15,27,53,.4);z-index:1000;display:flex;align-items:center;justify-content:center;padding:1rem}
  .mc{background:#fff;border-radius:14px;width:100%;max-width:600px;max-height:90vh;overflow-y:auto;box-shadow:0 25px 60px rgba(0,0,0,.18)}
  .toast2{position:fixed;bottom:24px;right:24px;z-index:2000;background:#0f1b35;color:#fff;padding:11px 16px;border-radius:10px;font-size:13px;font-weight:500;display:flex;align-items:center;gap:7px;box-shadow:0 8px 24px rgba(0,0,0,.2);animation:fi .2s ease}
  @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
`;

const SEED = {
  users:[
    {id:1,name:"Ahmad Habib",email:"ahmad@lazdarulhikam.org",role:"super_admin",is_active:true,last_login:"2025-07-18 09:12"},
    {id:2,name:"Sari Ramadhani",email:"sari@lazdarulhikam.org",role:"finance_staff",is_active:true,last_login:"2025-07-18 08:45"},
    {id:3,name:"M. Fauzi",email:"fauzi@lazdarulhikam.org",role:"program_manager",is_active:true,last_login:"2025-07-17 14:22"},
    {id:4,name:"Rini Nurhayati",email:"rini@lazdarulhikam.org",role:"content_editor",is_active:true,last_login:"2025-07-18 10:05"},
    {id:5,name:"Dian Pratiwi",email:"dian@lazdarulhikam.org",role:"cs_staff",is_active:true,last_login:"2025-07-16 11:30"},
  ],
  programs:[
    {id:1,slug:"beasiswa-generasi-rabbani",title:"Beasiswa Generasi Rabbani",category:"education",status:"active",target:500000000,collected:347000000,is_featured:true,display_order:1},
    {id:2,slug:"layanan-kesehatan-gratis",title:"Layanan Kesehatan Gratis",category:"health",status:"active",target:300000000,collected:189000000,is_featured:true,display_order:2},
    {id:3,slug:"tanggap-bencana-nasional",title:"Tanggap Bencana Nasional",category:"disaster",status:"active",target:600000000,collected:521000000,is_featured:true,display_order:3},
    {id:4,slug:"modal-usaha-dhuafa",title:"Modal Usaha Dhuafa",category:"economy",status:"active",target:250000000,collected:92000000,is_featured:false,display_order:4},
    {id:5,slug:"dakwah-pembinaan-umat",title:"Dakwah & Pembinaan Umat",category:"dakwah",status:"active",target:400000000,collected:214000000,is_featured:false,display_order:5},
  ],
  articles:[
    {id:1,slug:"distribusi-air-bersih-ntt-2025",title:"Distribusi Air Bersih untuk 1.200 Warga di NTT",category:"field_report",status:"published",author:"Rini Nurhayati",published_at:"2025-07-12",is_featured:true,view_count:1842},
    {id:2,slug:"masjid-at-taqwa-kalteng-progress",title:"Masjid At-Taqwa Kalimantan Tengah Capai 70%",category:"program_update",status:"published",author:"Rini Nurhayati",published_at:"2025-07-05",is_featured:false,view_count:934},
    {id:3,slug:"beasiswa-2025-2026-penerima",title:"48 Siswa Dhuafa Terima Beasiswa Penuh 2025/2026",category:"program_update",status:"published",author:"Rini Nurhayati",published_at:"2025-06-29",is_featured:true,view_count:2371},
    {id:4,slug:"modal-bergulir-surabaya",title:"87 Pedagang Kecil Surabaya Terima Modal Bergulir",category:"field_report",status:"published",author:"Rini Nurhayati",published_at:"2025-06-20",is_featured:false,view_count:765},
    {id:5,slug:"klinik-keliling-papua-2025",title:"Klinik Keliling LAZ Layani 2.300 Warga di Papua",category:"field_report",status:"draft",author:"Rini Nurhayati",published_at:null,is_featured:false,view_count:0},
    {id:6,slug:"rumah-tahfidz-hafidz-baru",title:"Rumah Tahfidz LAZ Cetak 12 Hafidz Quran Baru",category:"beneficiary_story",status:"published",author:"Rini Nurhayati",published_at:"2025-06-02",is_featured:false,view_count:1203},
  ],
  testimonials:[
    {id:1,person_name:"Ahmad Rizaldi",person_role:"Pengusaha, Jakarta",person_type:"muzakki",initials:"AR",quote:"Sudah 3 tahun berzakat di LAZ Darul Hikam. Laporannya detail dan transparan.",is_active:true,display_order:1},
    {id:2,person_name:"Suwardi",person_role:"Petani, Banyumas",person_type:"mustahiq",initials:"SW",quote:"Berkat beasiswa dari LAZ, anak saya bisa melanjutkan sekolah hingga perguruan tinggi.",is_active:true,display_order:2},
    {id:3,person_name:"Fatimah Hasan",person_role:"HR Manager, Bandung",person_type:"muzakki",initials:"FH",quote:"Kolaborasi CSR yang sangat profesional. Laporan lengkap dan terverifikasi.",is_active:true,display_order:3},
    {id:4,person_name:"Nur Khasanah",person_role:"Pedagang, Semarang",person_type:"mustahiq",initials:"NK",quote:"Modal bergulir LAZ mengubah hidup saya. Warung kecil saya kini berkembang.",is_active:false,display_order:4},
  ],
  partners:[
    {id:1,name:"Bank Syariah Indonesia",partner_type:"corporate",is_active:true,display_order:1},
    {id:2,name:"BAZNAS Pusat",partner_type:"government",is_active:true,display_order:2},
    {id:3,name:"Kemensos RI",partner_type:"government",is_active:true,display_order:3},
    {id:4,name:"Forum Zakat (FOZ)",partner_type:"ngo",is_active:true,display_order:4},
    {id:5,name:"MUI Pusat",partner_type:"government",is_active:true,display_order:5},
    {id:6,name:"Univ. Al-Azhar Indonesia",partner_type:"academic",is_active:true,display_order:6},
  ],
  reports:[
    {id:1,title:"Laporan Keuangan Tahunan 2024",report_type:"annual",period_label:"Tahunan 2024",period_year:2024,audit_status:"kap_audited",file_size_kb:2840,download_count:142,is_published:true,uploaded_by:"Sari Ramadhani"},
    {id:2,title:"Laporan Triwulan Q2 2025",report_type:"quarterly",period_label:"Q2 2025",period_year:2025,audit_status:"internally_reviewed",file_size_kb:1120,download_count:58,is_published:true,uploaded_by:"Sari Ramadhani"},
    {id:3,title:"Laporan Triwulan Q1 2025",report_type:"quarterly",period_label:"Q1 2025",period_year:2025,audit_status:"kap_audited",file_size_kb:1080,download_count:94,is_published:true,uploaded_by:"Sari Ramadhani"},
    {id:4,title:"Laporan Keuangan Tahunan 2023",report_type:"annual",period_label:"Tahunan 2023",period_year:2023,audit_status:"kap_audited",file_size_kb:2650,download_count:287,is_published:true,uploaded_by:"Sari Ramadhani"},
  ],
  metrics:[
    {id:1,metric_key:"total_funds_m",label:"Dana Tersalurkan (Rp)",value:47,suffix:"M+",display_order:1,is_active:true},
    {id:2,metric_key:"beneficiaries_k",label:"Penerima Manfaat",value:127,suffix:"rb+",display_order:2,is_active:true},
    {id:3,metric_key:"provinces",label:"Provinsi Terjangkau",value:28,suffix:"",display_order:3,is_active:true},
    {id:4,metric_key:"volunteers",label:"Relawan Aktif",value:1200,suffix:"+",display_order:4,is_active:true},
  ],
  team:[
    {id:1,name:"Ust. Ahmad Habib, Lc.",title:"Direktur Utama",department:"Eksekutif",initials:"AH",accent_color:"#3268C3",is_active:true,display_order:1},
    {id:2,name:"Sari Ramadhani, S.E.",title:"Direktur Keuangan",department:"Keuangan",initials:"SR",accent_color:"#1a6b3c",is_active:true,display_order:2},
    {id:3,name:"M. Fauzi, S.Kom.",title:"Direktur Program",department:"Program",initials:"MF",accent_color:"#c9892a",is_active:true,display_order:3},
    {id:4,name:"Rini Nurhayati, S.H.",title:"Direktur Legal & Compliance",department:"Legal",initials:"RN",accent_color:"#5585d4",is_active:true,display_order:4},
  ],
  bankAccounts:[
    {id:1,bank_name:"Bank Syariah Indonesia (BSI)",account_number:"711-9XXX-XXXX",account_name:"LAZ Darul Hikam",is_active:true,display_order:1},
    {id:2,bank_name:"BCA Syariah",account_number:"090-XXXX-XXX",account_name:"LAZ Darul Hikam",is_active:true,display_order:2},
    {id:3,bank_name:"Mandiri Syariah",account_number:"700-XXXX-XXX",account_name:"LAZ Darul Hikam",is_active:true,display_order:3},
  ],
  faqs:[
    {id:1,question:"Apakah LAZ Darul Hikam sudah berizin resmi?",answer:"Ya, mendapat izin dari Kemenag RI melalui SK No. 792 Tahun 2020 dan terdaftar di BAZNAS.",category:"general",is_active:true,display_order:1},
    {id:2,question:"Bagaimana cara memastikan donasi saya sudah diterima?",answer:"Anda akan menerima konfirmasi via email dan SMS setelah donasi dikonfirmasi.",category:"donation",is_active:true,display_order:2},
    {id:3,question:"Apakah ada biaya administrasi dari donasi?",answer:"Tidak ada potongan biaya administrasi. 100% dana tersalurkan.",category:"donation",is_active:true,display_order:3},
    {id:4,question:"Berapa minimal donasi yang bisa saya berikan?",answer:"Tidak ada batas minimal donasi.",category:"general",is_active:true,display_order:4},
    {id:5,question:"Bisakah saya berdonasi secara anonim?",answer:"Tentu bisa, hubungi tim kami via WhatsApp untuk opsi donasi anonim.",category:"donation",is_active:false,display_order:5},
  ],
  auditLog:[
    {id:1,user:"Rini Nurhayati",action:"publish",entity_type:"web_articles",entity_name:"Distribusi Air Bersih NTT",created_at:"2025-07-12 08:03",ip:"202.80.X.1"},
    {id:2,user:"Sari Ramadhani",action:"update",entity_type:"web_impact_metrics",entity_name:"Dana Tersalurkan",created_at:"2025-07-11 14:22",ip:"202.80.X.2"},
    {id:3,user:"M. Fauzi",action:"update",entity_type:"web_programs",entity_name:"Tanggap Bencana Nasional",created_at:"2025-07-10 09:45",ip:"202.80.X.3"},
    {id:4,user:"Sari Ramadhani",action:"create",entity_type:"web_financial_reports",entity_name:"Laporan Q2 2025",created_at:"2025-07-10 09:12",ip:"202.80.X.2"},
    {id:5,user:"Rini Nurhayati",action:"create",entity_type:"web_articles",entity_name:"Masjid At-Taqwa Progress",created_at:"2025-07-05 09:00",ip:"202.80.X.1"},
    {id:6,user:"Ahmad Habib",action:"update",entity_type:"web_users",entity_name:"Dian Pratiwi",created_at:"2025-07-04 11:30",ip:"202.80.X.4"},
    {id:7,user:"Rini Nurhayati",action:"publish",entity_type:"web_articles",entity_name:"48 Siswa Beasiswa 2025",created_at:"2025-06-29 10:05",ip:"202.80.X.1"},
    {id:8,user:"M. Fauzi",action:"create",entity_type:"web_programs",entity_name:"Modal Usaha Dhuafa",created_at:"2025-06-28 14:00",ip:"202.80.X.3"},
  ],
  legality:[
    {id:1,label:"SK Kemenag RI",value:"No. 792 Tahun 2020",issuing:"Kementerian Agama RI",issue_date:"2020-06-15",expiry_date:null,is_active:true,display_order:1},
    {id:2,label:"NPWP Lembaga",value:"31.284.XXX.X-441.000",issuing:"Dirjen Pajak",issue_date:"2012-04-01",expiry_date:null,is_active:true,display_order:2},
    {id:3,label:"Akta Notaris",value:"AHU-0012XXX.AH.01.04.2012",issuing:"Kemenkumham",issue_date:"2012-03-14",expiry_date:null,is_active:true,display_order:3},
    {id:4,label:"Registrasi BAZNAS",value:"Reg. LAZ-BAZNAS-2020-044",issuing:"BAZNAS Pusat",issue_date:"2020-07-01",expiry_date:"2025-08-01",is_active:true,display_order:4},
  ],
  fundAlloc:[
    {id:1,program:"Beasiswa Generasi Rabbani",period_year:2025,period_month:7,allocated_amount:30000000,disbursed_amount:22000000,beneficiary_count:38},
    {id:2,program:"Tanggap Bencana Nasional",period_year:2025,period_month:7,allocated_amount:40000000,disbursed_amount:40000000,beneficiary_count:890},
    {id:3,program:"Beasiswa Generasi Rabbani",period_year:2025,period_month:6,allocated_amount:28500000,disbursed_amount:28500000,beneficiary_count:48},
    {id:4,program:"Layanan Kesehatan Gratis",period_year:2025,period_month:6,allocated_amount:15000000,disbursed_amount:14800000,beneficiary_count:230},
    {id:5,program:"Tanggap Bencana Nasional",period_year:2025,period_month:6,allocated_amount:52000000,disbursed_amount:52000000,beneficiary_count:1200},
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = n => "Rp " + Math.round(n).toLocaleString("id-ID");
const pct = (c,t) => t>0?Math.round((c/t)*100):0;
const nid = arr => Math.max(0,...arr.map(x=>x.id))+1;
const MONTHS=["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Ags","Sep","Okt","Nov","Des"];
const CAT_L={education:"Pendidikan",health:"Kesehatan",disaster:"Darurat",economy:"Ekonomi",dakwah:"Dakwah"};
const ART_L={field_report:"Laporan",program_update:"Update Program",beneficiary_story:"Kisah",announcement:"Pengumuman",education:"Edukasi"};
const ROLE_L={super_admin:"Super Admin",content_editor:"Content Editor",finance_staff:"Finance Staff",program_manager:"Program Manager",cs_staff:"CS Staff"};
const ACT_L={create:"Dibuat",update:"Diperbarui",publish:"Dipublikasikan",delete:"Dihapus",unpublish:"Di-unpublish",restore:"Dipulihkan"};
const ST_L={active:"Aktif",completed:"Selesai",paused:"Dijeda",archived:"Diarsipkan",published:"Published",draft:"Draft",kap_audited:"KAP Audit",internally_reviewed:"Review Internal",unaudited:"Belum Diaudit"};
const TYPE_L={corporate:"Korporat",government:"Pemerintah",ngo:"NGO",academic:"Akademi",media:"Media",other:"Lainnya"};

// ─── Shared UI ────────────────────────────────────────────────────────────────
const Badge = ({label,color,bg}) => (
  <span className="badge" style={{background:bg||T.biruLt,color:color||T.biru}}>{label}</span>
);

const stBadge = s => {
  const m={published:{bg:T.greenLt,c:T.green},active:{bg:T.greenLt,c:T.green},draft:{bg:T.amberLt,c:T.amber},paused:{bg:T.amberLt,c:T.amber},completed:{bg:T.biruLt,c:T.biru},archived:{bg:"#f1f5f9",c:T.teksMt},kap_audited:{bg:T.greenLt,c:T.green},internally_reviewed:{bg:T.amberLt,c:T.amber},unaudited:{bg:"#f1f5f9",c:T.teksMt}};
  const x=m[s]||{bg:"#f1f5f9",c:T.teksMt};
  return <Badge label={ST_L[s]||s} color={x.c} bg={x.bg}/>;
};

const Tog = ({value,onChange}) => (
  <div onClick={()=>onChange&&onChange(!value)} style={{width:38,height:21,background:value?T.green:"#cbd5e1",borderRadius:11,position:"relative",cursor:"pointer",flexShrink:0,transition:"background .2s"}}>
    <span style={{position:"absolute",top:2.5,left:value?18:2.5,width:16,height:16,background:"#fff",borderRadius:"50%",transition:"left .2s",boxShadow:"0 1px 3px rgba(0,0,0,.2)"}}/>
  </div>
);

const TA = ({onEdit,onDel,onView}) => (
  <div style={{display:"flex",gap:3}}>
    {onView&&<button onClick={onView} className="gh" style={{padding:5,border:"none",borderRadius:6,display:"flex",color:T.teksMt}}><Eye size={13}/></button>}
    {onEdit&&<button onClick={onEdit} className="gh" style={{padding:5,border:"none",borderRadius:6,display:"flex",color:T.biru}}><Edit2 size={13}/></button>}
    {onDel&&<button onClick={onDel} style={{padding:5,border:"none",borderRadius:6,display:"flex",background:T.redLt,color:T.red}}><Trash2 size={13}/></button>}
  </div>
);

const SearchBar = ({value,onChange,ph}) => (
  <div style={{position:"relative",maxWidth:260}}>
    <Search size={13} style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",color:T.teksMt}}/>
    <input value={value} onChange={e=>onChange(e.target.value)} placeholder={ph||"Cari..."} className="fi2" style={{paddingLeft:28,height:34,fontSize:13}}/>
  </div>
);

function Toast({msg,type,onClose}) {
  useEffect(()=>{const t=setTimeout(onClose,3000);return()=>clearTimeout(t)},[]);
  return <div className="toast2"><CheckCircle2 size={15} color="#4ade80"/> {msg}</div>;
}

function Modal({title,onClose,children,wide}) {
  return (
    <div className="mo" onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
      <div className="mc fi" style={{maxWidth:wide?820:580}}>
        <div style={{padding:"1.1rem 1.4rem",borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
          <h3 style={{fontSize:15,fontWeight:700}}>{title}</h3>
          <button onClick={onClose} style={{background:"none",border:"none",color:T.teksMt,display:"flex"}}><X size={18}/></button>
        </div>
        <div style={{padding:"1.4rem",overflowY:"auto"}}>{children}</div>
      </div>
    </div>
  );
}

function Confirm({msg,onOk,onNo}) {
  return (
    <div className="mo">
      <div className="mc fi" style={{maxWidth:380}}>
        <div style={{padding:"1.5rem",textAlign:"center"}}>
          <div style={{width:48,height:48,background:T.redLt,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 1rem"}}><AlertTriangle size={22} color={T.red}/></div>
          <h3 style={{fontSize:15,fontWeight:700,marginBottom:".5rem"}}>Konfirmasi Hapus</h3>
          <p style={{color:T.teksMd,fontSize:13.5,lineHeight:1.6,marginBottom:"1.4rem"}}>{msg}</p>
          <div style={{display:"flex",gap:".6rem",justifyContent:"center"}}>
            <button onClick={onNo} style={{padding:"8px 18px",border:`1.5px solid ${T.border}`,borderRadius:8,background:"#fff",fontWeight:600,color:T.teksMd,fontSize:13}}>Batal</button>
            <button onClick={onOk} style={{padding:"8px 18px",border:"none",borderRadius:8,background:T.red,color:"#fff",fontWeight:700,fontSize:13}}>Hapus</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
const NAV=[
  {g:null,items:[{k:"dashboard",ic:<LayoutDashboard size={15}/>,l:"Dashboard"}]},
  {g:"KONTEN",items:[
    {k:"articles",ic:<FileText size={15}/>,l:"Artikel"},
    {k:"programs",ic:<Layers size={15}/>,l:"Program"},
    {k:"testimonials",ic:<MessageSquare size={15}/>,l:"Testimoni"},
    {k:"partners",ic:<Users2 size={15}/>,l:"Mitra"},
  ]},
  {g:"TRANSPARANSI",items:[
    {k:"reports",ic:<FileCheck size={15}/>,l:"Laporan Keuangan"},
    {k:"metrics",ic:<BarChart2 size={15}/>,l:"Impact Metrics"},
    {k:"fundalloc",ic:<PieChart size={15}/>,l:"Alokasi Dana"},
  ]},
  {g:"ORGANISASI",items:[
    {k:"team",ic:<Users size={15}/>,l:"Tim & Pengurus"},
    {k:"legality",ic:<Shield size={15}/>,l:"Legalitas"},
    {k:"bank",ic:<Building size={15}/>,l:"Rekening Resmi"},
  ]},
  {g:"LAYANAN",items:[
    {k:"faq",ic:<HelpCircle size={15}/>,l:"FAQ"},
  ]},
  {g:"SISTEM",items:[
    {k:"settings",ic:<Settings size={15}/>,l:"Pengaturan"},
    {k:"users",ic:<Users size={15}/>,l:"Admin Users"},
    {k:"audit",ic:<Activity size={15}/>,l:"Audit Log"},
  ]},
];

function Sidebar({active,onNav,col}) {
  return (
    <div style={{width:col?0:210,background:T.sidebar,height:"100vh",display:"flex",flexDirection:"column",flexShrink:0,overflow:"hidden",transition:"width .22s"}}>
      <div style={{padding:"1rem .9rem .8rem",borderBottom:"1px solid rgba(255,255,255,.07)"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{width:30,height:30,background:T.biru,borderRadius:7,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <Star size={13} color="#fff" fill="#fff"/>
          </div>
          <div>
            <div style={{fontFamily:"'Cabin',sans-serif",fontWeight:700,fontSize:12.5,color:"#fff",whiteSpace:"nowrap"}}>LAZ Darul Hikam</div>
            <div style={{fontSize:9.5,color:"rgba(255,255,255,.4)"}}>Admin CMS</div>
          </div>
        </div>
      </div>
      <div style={{flex:1,overflow:"auto",paddingBottom:".5rem"}}>
        {NAV.map((g,i)=>(
          <div key={i}>
            {g.g&&<div style={{fontSize:9.5,fontWeight:700,color:"rgba(255,255,255,.28)",letterSpacing:"1px",padding:".9rem .9rem .3rem",whiteSpace:"nowrap"}}>{g.g}</div>}
            {g.items.map(item=>(
              <button key={item.k} onClick={()=>onNav(item.k)}
                className={`si${active===item.k?" act":""}`}
                style={{width:"100%",display:"flex",alignItems:"center",gap:8,padding:".48rem .9rem",border:"none",borderLeft:"3px solid transparent",background:"transparent",color:active===item.k?"#fff":"rgba(255,255,255,.55)",fontSize:12.5,fontWeight:active===item.k?600:400,textAlign:"left",whiteSpace:"nowrap",transition:"all .15s"}}>
                {item.ic}{item.l}
              </button>
            ))}
          </div>
        ))}
      </div>
      <div style={{padding:".6rem .7rem",borderTop:"1px solid rgba(255,255,255,.07)"}}>
        <div style={{display:"flex",alignItems:"center",gap:7,padding:".45rem",borderRadius:7}}>
          <div style={{width:27,height:27,background:T.biru,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Cabin',sans-serif",fontWeight:700,fontSize:10.5,color:"#fff",flexShrink:0}}>AH</div>
          <div style={{flex:1,overflow:"hidden"}}>
            <div style={{fontSize:11.5,fontWeight:600,color:"#fff",whiteSpace:"nowrap"}}>Ahmad Habib</div>
            <div style={{fontSize:9.5,color:"rgba(255,255,255,.38)"}}>Super Admin</div>
          </div>
          <LogOut size={12} color="rgba(255,255,255,.35)"/>
        </div>
      </div>
    </div>
  );
}

function Topbar({title,onToggle,onReval,reving}) {
  return (
    <div style={{height:52,background:"#fff",borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",padding:"0 1.1rem",gap:8,flexShrink:0}}>
      <button onClick={onToggle} style={{background:"none",border:"none",color:T.teksMd,display:"flex",padding:5,borderRadius:6,marginRight:4}}><Menu size={17}/></button>
      <div style={{flex:1,fontFamily:"'Cabin',sans-serif",fontWeight:700,fontSize:14.5,color:T.teks}}>{title}</div>
      <button onClick={onReval} style={{display:"flex",alignItems:"center",gap:5,padding:"5px 11px",borderRadius:7,border:`1.5px solid ${T.border}`,background:"#fff",color:T.teksMd,fontSize:12,fontWeight:600}}>
        <RefreshCw size={12} style={reving?{animation:"spin 1s linear infinite"}:{}}/> Revalidate ISR
      </button>
      <div style={{display:"flex",alignItems:"center",gap:5,marginLeft:4}}>
        <div style={{width:7,height:7,borderRadius:"50%",background:T.green}}/>
        <span style={{fontSize:11.5,color:T.teksMt}}>lazdarulhikam.org</span>
      </div>
    </div>
  );
}

// ─── Form helpers ─────────────────────────────────────────────────────────────
const Lbl = ({children}) => <label className="fl" style={{marginBottom:4}}>{children}</label>;
const Inp = ({value,onChange,...p}) => <input value={value} onChange={onChange} className="fi2" {...p}/>;
const Sel = ({value,onChange,children,...p}) => <select value={value} onChange={onChange} className="fi2 fsel" {...p}>{children}</select>;
const Txt = ({value,onChange,...p}) => <textarea value={value} onChange={onChange} className="fi2" {...p}/>;
const FG = ({label,children,style={}}) => <div className="fg" style={style}><Lbl>{label}</Lbl>{children}</div>;
const G2 = ({children,style={}}) => <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".7rem",...style}}>{children}</div>;

const SaveBar = ({onClose,onSave,label}) => (
  <div style={{display:"flex",gap:".6rem",justifyContent:"flex-end",marginTop:"1rem",paddingTop:"1rem",borderTop:`1px solid ${T.border}`}}>
    <button onClick={onClose} style={{padding:"8px 18px",border:`1.5px solid ${T.border}`,borderRadius:8,background:"#fff",fontWeight:600,color:T.teksMd,fontSize:13}}>Batal</button>
    <button onClick={onSave} style={{padding:"8px 18px",border:"none",borderRadius:8,background:T.biru,color:"#fff",fontWeight:700,fontSize:13,display:"flex",alignItems:"center",gap:5}}><Save size={13}/> {label||"Simpan"}</button>
  </div>
);

// ─── Dashboard ────────────────────────────────────────────────────────────────
function Dashboard({d}) {
  const kpis=[
    {l:"Program Aktif",v:d.programs.filter(p=>p.status==="active").length,ic:<Layers size={17} color={T.biru}/>,bg:T.biruLt},
    {l:"Artikel Published",v:d.articles.filter(a=>a.status==="published").length,ic:<FileText size={17} color={T.green}/>,bg:T.greenLt},
    {l:"Mitra Aktif",v:d.partners.filter(p=>p.is_active).length,ic:<Users2 size={17} color={T.emas}/>,bg:T.emasLt},
    {l:"FAQ Nonaktif",v:d.faqs.filter(f=>!f.is_active).length,ic:<HelpCircle size={17} color={T.red}/>,bg:T.redLt},
  ];
  return (
    <div className="fi">
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:"1rem",marginBottom:"1.25rem"}}>
        {kpis.map(k=>(
          <div key={k.l} className="card" style={{display:"flex",alignItems:"center",gap:"1rem"}}>
            <div style={{width:38,height:38,background:k.bg,borderRadius:9,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{k.ic}</div>
            <div>
              <div style={{fontFamily:"'Cabin',sans-serif",fontSize:24,fontWeight:700,lineHeight:1}}>{k.v}</div>
              <div style={{fontSize:12,color:T.teksMd,marginTop:2}}>{k.l}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1.5fr 1fr",gap:"1rem",marginBottom:"1rem"}}>
        <div className="card">
          <div style={{fontFamily:"'Cabin',sans-serif",fontWeight:700,fontSize:13.5,marginBottom:"1rem",display:"flex",alignItems:"center",gap:6}}><TrendingUp size={14} color={T.biru}/> Progress Penghimpunan</div>
          {d.programs.filter(p=>p.status==="active").map(p=>(
            <div key={p.id} style={{marginBottom:".8rem"}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:3}}>
                <span style={{fontWeight:600,color:T.teks,overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis",maxWidth:200}}>{p.title}</span>
                <span style={{color:T.biru,fontWeight:700,flexShrink:0,marginLeft:8}}>{pct(p.collected,p.target)}%</span>
              </div>
              <div style={{height:5,background:"#e2e8f0",borderRadius:3,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${pct(p.collected,p.target)}%`,background:T.biru,borderRadius:3}}/>
              </div>
              <div style={{fontSize:10.5,color:T.teksMt,marginTop:1}}>{fmt(p.collected)} / {fmt(p.target)}</div>
            </div>
          ))}
        </div>
        <div className="card">
          <div style={{fontFamily:"'Cabin',sans-serif",fontWeight:700,fontSize:13.5,marginBottom:".9rem",display:"flex",alignItems:"center",gap:6}}><Activity size={14} color={T.biru}/> Aktivitas Terbaru</div>
          {d.auditLog.slice(0,7).map(l=>{
            const ac={create:T.green,update:T.biru,publish:"#7c3aed",delete:T.red}[l.action]||T.teksMt;
            return (
              <div key={l.id} style={{display:"flex",gap:8,marginBottom:".6rem",alignItems:"start"}}>
                <div style={{width:6,height:6,borderRadius:"50%",background:ac,marginTop:5,flexShrink:0}}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12,fontWeight:600,color:T.teks,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{ACT_L[l.action]}: {l.entity_name}</div>
                  <div style={{fontSize:11,color:T.teksMt}}>{l.user} · {l.created_at.slice(0,10)}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="card">
        <div style={{fontFamily:"'Cabin',sans-serif",fontWeight:700,fontSize:13.5,marginBottom:".8rem"}}>Quick Actions</div>
        <div style={{display:"flex",gap:".6rem",flexWrap:"wrap"}}>
          {[{l:"+ Artikel Baru",c:T.biru},{l:"+ Program Baru",c:T.hijau},{l:"↑ Update Metrics",c:T.emas},{l:"↑ Upload Laporan",c:T.teksMd}].map(a=>(
            <button key={a.l} style={{padding:"7px 14px",border:`1.5px solid ${a.c}`,borderRadius:7,background:"#fff",color:a.c,fontWeight:600,fontSize:12.5}}>{a.l}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Articles ─────────────────────────────────────────────────────────────────
function Articles({d,setD,toast}) {
  const [search,setSearch]=useState("");
  const [fst,setFst]=useState("all");
  const [modal,setModal]=useState(null);
  const [sel,setSel]=useState(null);
  const [confirm,setConfirm]=useState(null);
  const [form,setForm]=useState({});

  const rows=d.articles.filter(a=>(fst==="all"||a.status===fst)&&a.title.toLowerCase().includes(search.toLowerCase()));
  const openN=()=>{setForm({title:"",category:"field_report",status:"draft",excerpt:"",author:"Rini Nurhayati",is_featured:false,robots_directive:"index,follow"});setModal("new")};
  const openE=a=>{setSel(a);setForm({...a});setModal("edit")};
  const openV=a=>{setSel(a);setModal("view")};
  const save=()=>{
    if(!form.title.trim()){toast("Judul tidak boleh kosong");return;}
    if(modal==="new"){setD({...d,articles:[...d.articles,{...form,id:nid(d.articles),slug:form.title.toLowerCase().replace(/\s+/g,"-").replace(/[^a-z0-9-]/g,""),view_count:0,published_at:form.status==="published"?new Date().toISOString().slice(0,10):null}]});}
    else setD({...d,articles:d.articles.map(a=>a.id===sel.id?{...a,...form,published_at:form.status==="published"?(a.published_at||new Date().toISOString().slice(0,10)):null}:a)});
    toast(modal==="new"?"Artikel dibuat":"Artikel diperbarui — ISR /kabar-kebaikan diinvalidasi");setModal(null);
  };
  const del=id=>{setD({...d,articles:d.articles.filter(a=>a.id!==id)});toast("Artikel dihapus");setConfirm(null)};

  return (
    <div className="fi">
      {confirm&&<Confirm msg={`Hapus artikel "${confirm.title}"?`} onOk={()=>del(confirm.id)} onNo={()=>setConfirm(null)}/>}
      {modal&&(
        <Modal title={modal==="view"?"Detail Artikel":modal==="new"?"Artikel Baru":"Edit Artikel"} onClose={()=>setModal(null)} wide={modal!=="view"}>
          {modal==="view"?(
            <div>
              <h2 style={{fontSize:16,fontWeight:700,marginBottom:".5rem"}}>{sel.title}</h2>
              <div style={{display:"flex",gap:".4rem",flexWrap:"wrap",marginBottom:"1rem"}}>{stBadge(sel.status)}<Badge label={ART_L[sel.category]||sel.category} color={T.biru} bg={T.biruLt}/>{sel.is_featured&&<Badge label="Featured" color="#7c3aed" bg="#ede9fe"/>}</div>
              <G2><div style={{background:T.bg,borderRadius:8,padding:".7rem"}}><div style={{fontSize:10.5,color:T.teksMt,textTransform:"uppercase",letterSpacing:".5px",fontWeight:700,marginBottom:2}}>Penulis</div><div style={{fontWeight:600}}>{sel.author}</div></div><div style={{background:T.bg,borderRadius:8,padding:".7rem"}}><div style={{fontSize:10.5,color:T.teksMt,textTransform:"uppercase",letterSpacing:".5px",fontWeight:700,marginBottom:2}}>Dilihat</div><div style={{fontWeight:600}}>{sel.view_count.toLocaleString()}×</div></div><div style={{background:T.bg,borderRadius:8,padding:".7rem"}}><div style={{fontSize:10.5,color:T.teksMt,textTransform:"uppercase",letterSpacing:".5px",fontWeight:700,marginBottom:2}}>Dipublikasikan</div><div style={{fontWeight:600}}>{sel.published_at||"—"}</div></div><div style={{background:T.bg,borderRadius:8,padding:".7rem"}}><div style={{fontSize:10.5,color:T.teksMt,textTransform:"uppercase",letterSpacing:".5px",fontWeight:700,marginBottom:2}}>Slug</div><div style={{fontSize:12,color:T.teksMd}}>{sel.slug}</div></div></G2>
            </div>
          ):(
            <div>
              <G2 style={{marginBottom:0}}>
                <FG label="Judul (≤70 karakter) *" style={{gridColumn:"1/-1"}}><Inp value={form.title||""} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Judul artikel..."/><span style={{fontSize:11,color:(form.title||"").length>70?T.red:T.teksMt}}>{(form.title||"").length}/70</span></FG>
                <FG label="Kategori"><Sel value={form.category||"field_report"} onChange={e=>setForm({...form,category:e.target.value})}>{Object.entries(ART_L).map(([v,l])=><option key={v} value={v}>{l}</option>)}</Sel></FG>
                <FG label="Status"><Sel value={form.status||"draft"} onChange={e=>setForm({...form,status:e.target.value})}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></Sel></FG>
                <FG label="Excerpt (≤160 karakter) *" style={{gridColumn:"1/-1"}}><Txt value={form.excerpt||""} onChange={e=>setForm({...form,excerpt:e.target.value})} rows={2} placeholder="Ringkasan singkat..."/><span style={{fontSize:11,color:(form.excerpt||"").length>160?T.red:T.teksMt}}>{(form.excerpt||"").length}/160</span></FG>
                <FG label="SEO Title (opsional)"><Inp value={form.seo_title||""} onChange={e=>setForm({...form,seo_title:e.target.value})} placeholder="Override judul untuk SEO..."/></FG>
                <FG label="Robots Directive"><Sel value={form.robots_directive||"index,follow"} onChange={e=>setForm({...form,robots_directive:e.target.value})}><option value="index,follow">index, follow</option><option value="noindex,follow">noindex, follow</option><option value="noindex,nofollow">noindex, nofollow</option></Sel></FG>
                <FG label="Canonical URL (opsional)"><Inp value={form.canonical_url||""} onChange={e=>setForm({...form,canonical_url:e.target.value})} placeholder="https://..."/></FG>
                <div className="fg" style={{display:"flex",alignItems:"center",flexDirection:"row",gap:10,paddingTop:"1.2rem"}}>
                  <Lbl>Is Featured</Lbl>
                  <Tog value={!!form.is_featured} onChange={v=>setForm({...form,is_featured:v})}/>
                </div>
              </G2>
              <div style={{background:T.amberLt,border:`1px solid #fbbf24`,borderRadius:8,padding:".65rem 1rem",marginTop:".5rem",fontSize:12.5,color:"#92400e",display:"flex",gap:6}}>
                <AlertTriangle size={13} style={{flexShrink:0,marginTop:1}}/> Publish akan mentrigger ISR revalidation pada /kabar-kebaikan dan /
              </div>
              <SaveBar onClose={()=>setModal(null)} onSave={save} label={form.status==="published"?"Publish":"Simpan"}/>
            </div>
          )}
        </Modal>
      )}
      <div style={{display:"flex",gap:".6rem",marginBottom:"1rem",flexWrap:"wrap",alignItems:"center"}}>
        <SearchBar value={search} onChange={setSearch} ph="Cari artikel..."/>
        <Sel value={fst} onChange={e=>setFst(e.target.value)} style={{width:"auto",height:34,fontSize:12.5,padding:"4px 28px 4px 10px"}}><option value="all">Semua</option><option value="published">Published</option><option value="draft">Draft</option><option value="archived">Archived</option></Sel>
        <button onClick={openN} style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:5,padding:"7px 14px",background:T.biru,color:"#fff",border:"none",borderRadius:8,fontWeight:700,fontSize:13}}><Plus size={14}/> Artikel Baru</button>
      </div>
      <div className="card" style={{padding:0,overflow:"hidden"}}>
        <table className="tbl" style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr><th style={{minWidth:260}}>JUDUL</th><th>KATEGORI</th><th>STATUS</th><th>PENULIS</th><th>DILIHAT</th><th>FEATURED</th><th>AKSI</th></tr></thead>
          <tbody>
            {rows.length===0&&<tr><td colSpan={7} style={{textAlign:"center",padding:"2rem",color:T.teksMt}}>Tidak ada data</td></tr>}
            {rows.map(a=>(
              <tr key={a.id} className="rh">
                <td style={{maxWidth:280}}><div style={{fontWeight:600,fontSize:13,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.title}</div><div style={{fontSize:11,color:T.teksMt}}>{a.published_at||"Belum dipublikasi"}</div></td>
                <td><Badge label={ART_L[a.category]||a.category} color={T.biru} bg={T.biruLt}/></td>
                <td>{stBadge(a.status)}</td>
                <td style={{fontSize:12.5,color:T.teksMd}}>{a.author}</td>
                <td style={{textAlign:"center",fontSize:12.5,color:T.teksMd}}>{a.view_count.toLocaleString()}</td>
                <td style={{textAlign:"center"}}>{a.is_featured?<CheckCircle2 size={14} color={T.green}/>:<span style={{color:T.teksMt}}>—</span>}</td>
                <td><TA onView={()=>openV(a)} onEdit={()=>openE(a)} onDel={()=>setConfirm(a)}/></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{marginTop:".5rem",fontSize:12,color:T.teksMt}}>{rows.length} artikel ditampilkan</div>
    </div>
  );
}

// ─── Programs ─────────────────────────────────────────────────────────────────
function Programs({d,setD,toast}) {
  const [modal,setModal]=useState(null);
  const [sel,setSel]=useState(null);
  const [confirm,setConfirm]=useState(null);
  const [form,setForm]=useState({});

  const openN=()=>{setForm({title:"",category:"education",status:"active",target:0,collected:0,is_featured:false,display_order:d.programs.length+1});setModal("new")};
  const openE=p=>{setSel(p);setForm({...p});setModal("edit")};
  const save=()=>{
    if(!form.title.trim()){toast("Judul tidak boleh kosong");return;}
    if(modal==="new")setD({...d,programs:[...d.programs,{...form,id:nid(d.programs),slug:form.title.toLowerCase().replace(/\s+/g,"-")}]});
    else setD({...d,programs:d.programs.map(p=>p.id===sel.id?{...p,...form}:p)});
    toast(modal==="new"?"Program dibuat":"Program diperbarui — ISR /program & / diinvalidasi");setModal(null);
  };
  const del=id=>{setD({...d,programs:d.programs.filter(p=>p.id!==id)});toast("Program dihapus");setConfirm(null)};

  return (
    <div className="fi">
      {confirm&&<Confirm msg={`Hapus program "${confirm.title}"?`} onOk={()=>del(confirm.id)} onNo={()=>setConfirm(null)}/>}
      {modal&&(
        <Modal title={modal==="new"?"Program Baru":"Edit Program"} onClose={()=>setModal(null)}>
          <FG label="Judul Program *"><Inp value={form.title||""} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Nama program..."/></FG>
          <G2>
            <FG label="Kategori"><Sel value={form.category||"education"} onChange={e=>setForm({...form,category:e.target.value})}>{Object.entries(CAT_L).map(([v,l])=><option key={v} value={v}>{l}</option>)}</Sel></FG>
            <FG label="Status"><Sel value={form.status||"active"} onChange={e=>setForm({...form,status:e.target.value})}>{["active","completed","paused","archived"].map(s=><option key={s} value={s}>{ST_L[s]}</option>)}</Sel></FG>
            <FG label="Target (Rp)"><Inp type="number" value={form.target||0} onChange={e=>setForm({...form,target:parseInt(e.target.value)||0})}/></FG>
            <FG label="Terkumpul (Rp)"><Inp type="number" value={form.collected||0} onChange={e=>setForm({...form,collected:Math.min(parseInt(e.target.value)||0,form.target||0)})}/></FG>
            <FG label="Urutan Tampil"><Inp type="number" value={form.display_order||1} onChange={e=>setForm({...form,display_order:parseInt(e.target.value)||1})}/></FG>
            <div className="fg" style={{display:"flex",alignItems:"center",flexDirection:"row",gap:10,paddingTop:"1.2rem"}}>
              <Lbl>Featured Homepage</Lbl><Tog value={!!form.is_featured} onChange={v=>setForm({...form,is_featured:v})}/>
            </div>
          </G2>
          <SaveBar onClose={()=>setModal(null)} onSave={save}/>
        </Modal>
      )}
      <div style={{display:"flex",justifyContent:"flex-end",marginBottom:"1rem"}}>
        <button onClick={openN} style={{display:"flex",alignItems:"center",gap:5,padding:"7px 14px",background:T.hijau,color:"#fff",border:"none",borderRadius:8,fontWeight:700,fontSize:13}}><Plus size={14}/> Program Baru</button>
      </div>
      <div className="card" style={{padding:0,overflow:"hidden"}}>
        <table className="tbl" style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr><th style={{minWidth:200}}>PROGRAM</th><th>KATEGORI</th><th style={{minWidth:180}}>PROGRESS</th><th>STATUS</th><th>FEATURED</th><th>URUTAN</th><th>AKSI</th></tr></thead>
          <tbody>
            {d.programs.map(p=>(
              <tr key={p.id} className="rh">
                <td style={{fontWeight:600,fontSize:13}}>{p.title}</td>
                <td><Badge label={CAT_L[p.category]||p.category} color={T.biru} bg={T.biruLt}/></td>
                <td>
                  <div style={{display:"flex",alignItems:"center",gap:7}}>
                    <div style={{flex:1,height:5,background:"#e2e8f0",borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:`${pct(p.collected,p.target)}%`,background:T.biru,borderRadius:3}}/></div>
                    <span style={{fontSize:11.5,fontWeight:700,color:T.biru,minWidth:30}}>{pct(p.collected,p.target)}%</span>
                  </div>
                  <div style={{fontSize:10.5,color:T.teksMt,marginTop:1}}>{fmt(p.collected)} / {fmt(p.target)}</div>
                </td>
                <td>{stBadge(p.status)}</td>
                <td style={{textAlign:"center"}}>{p.is_featured?<CheckCircle2 size={14} color={T.green}/>:<span style={{color:T.teksMt}}>—</span>}</td>
                <td style={{textAlign:"center",fontSize:12.5,color:T.teksMd}}>{p.display_order}</td>
                <td><TA onEdit={()=>openE(p)} onDel={()=>setConfirm(p)}/></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Testimonials ─────────────────────────────────────────────────────────────
function Testimonials({d,setD,toast}) {
  const [modal,setModal]=useState(null);
  const [sel,setSel]=useState(null);
  const [confirm,setConfirm]=useState(null);
  const [form,setForm]=useState({});

  const openN=()=>{setForm({person_name:"",person_role:"",person_type:"muzakki",initials:"",quote:"",is_active:true,display_order:d.testimonials.length+1});setModal("new")};
  const openE=t=>{setSel(t);setForm({...t});setModal("edit")};
  const save=()=>{
    if(!form.person_name||!form.quote){toast("Nama dan kutipan wajib diisi");return;}
    const ini=form.initials||(form.person_name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase());
    if(modal==="new")setD({...d,testimonials:[...d.testimonials,{...form,id:nid(d.testimonials),initials:ini}]});
    else setD({...d,testimonials:d.testimonials.map(t=>t.id===sel.id?{...t,...form,initials:ini}:t)});
    toast(modal==="new"?"Testimoni ditambahkan":"Testimoni diperbarui");setModal(null);
  };
  const del=id=>{setD({...d,testimonials:d.testimonials.filter(t=>t.id!==id)});toast("Testimoni dihapus");setConfirm(null)};

  return (
    <div className="fi">
      {confirm&&<Confirm msg={`Hapus testimoni dari "${confirm.person_name}"?`} onOk={()=>del(confirm.id)} onNo={()=>setConfirm(null)}/>}
      {modal&&(
        <Modal title={modal==="new"?"Tambah Testimoni":"Edit Testimoni"} onClose={()=>setModal(null)}>
          <FG label="Nama *"><Inp value={form.person_name||""} onChange={e=>setForm({...form,person_name:e.target.value})}/></FG>
          <G2>
            <FG label="Role / Lokasi"><Inp value={form.person_role||""} onChange={e=>setForm({...form,person_role:e.target.value})} placeholder="Pengusaha, Jakarta"/></FG>
            <FG label="Tipe"><Sel value={form.person_type||"muzakki"} onChange={e=>setForm({...form,person_type:e.target.value})}><option value="muzakki">Muzakki (Donatur)</option><option value="mustahiq">Mustahiq (Penerima)</option></Sel></FG>
          </G2>
          <FG label="Kutipan *"><Txt value={form.quote||""} onChange={e=>setForm({...form,quote:e.target.value})} rows={3} placeholder="Tulis kutipan..."/></FG>
          <div className="fg" style={{display:"flex",alignItems:"center",flexDirection:"row",gap:10}}><Lbl>Aktif</Lbl><Tog value={!!form.is_active} onChange={v=>setForm({...form,is_active:v})}/></div>
          <SaveBar onClose={()=>setModal(null)} onSave={save}/>
        </Modal>
      )}
      <div style={{display:"flex",justifyContent:"flex-end",marginBottom:"1rem"}}>
        <button onClick={openN} style={{display:"flex",alignItems:"center",gap:5,padding:"7px 14px",background:T.biru,color:"#fff",border:"none",borderRadius:8,fontWeight:700,fontSize:13}}><Plus size={14}/> Tambah</button>
      </div>
      <div className="card" style={{padding:0,overflow:"hidden"}}>
        <table className="tbl" style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr><th>AV.</th><th style={{minWidth:180}}>NAMA</th><th>TIPE</th><th style={{minWidth:200}}>KUTIPAN</th><th>AKTIF</th><th>URUTAN</th><th>AKSI</th></tr></thead>
          <tbody>
            {d.testimonials.map(t=>(
              <tr key={t.id} className="rh">
                <td style={{textAlign:"center"}}><div style={{width:28,height:28,borderRadius:"50%",background:t.person_type==="muzakki"?T.biru:T.emas,display:"inline-flex",alignItems:"center",justifyContent:"center",fontFamily:"'Cabin',sans-serif",fontWeight:700,fontSize:11,color:"#fff"}}>{t.initials}</div></td>
                <td><div style={{fontWeight:600,fontSize:13}}>{t.person_name}</div><div style={{fontSize:11.5,color:T.teksMt}}>{t.person_role}</div></td>
                <td><Badge label={t.person_type==="muzakki"?"Muzakki":"Mustahiq"} color={t.person_type==="muzakki"?T.biru:T.emas} bg={t.person_type==="muzakki"?T.biruLt:T.emasLt}/></td>
                <td style={{fontSize:12.5,color:T.teksMd,maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.quote}</td>
                <td style={{textAlign:"center"}}><Tog value={t.is_active} onChange={v=>{setD({...d,testimonials:d.testimonials.map(x=>x.id===t.id?{...x,is_active:v}:x)});toast("Status diperbarui")}}/></td>
                <td style={{textAlign:"center",fontSize:12.5,color:T.teksMd}}>{t.display_order}</td>
                <td><TA onEdit={()=>openE(t)} onDel={()=>setConfirm(t)}/></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Partners ─────────────────────────────────────────────────────────────────
function Partners({d,setD,toast}) {
  const [modal,setModal]=useState(null);
  const [sel,setSel]=useState(null);
  const [confirm,setConfirm]=useState(null);
  const [form,setForm]=useState({});

  const openN=()=>{setForm({name:"",partner_type:"corporate",is_active:true,display_order:d.partners.length+1,website_url:""});setModal("new")};
  const openE=p=>{setSel(p);setForm({...p});setModal("edit")};
  const save=()=>{
    if(!form.name.trim()){toast("Nama mitra tidak boleh kosong");return;}
    if(modal==="new")setD({...d,partners:[...d.partners,{...form,id:nid(d.partners)}]});
    else setD({...d,partners:d.partners.map(p=>p.id===sel.id?{...p,...form}:p)});
    toast(modal==="new"?"Mitra ditambahkan":"Mitra diperbarui");setModal(null);
  };
  const del=id=>{setD({...d,partners:d.partners.filter(p=>p.id!==id)});toast("Mitra dihapus");setConfirm(null)};

  return (
    <div className="fi">
      {confirm&&<Confirm msg={`Hapus mitra "${confirm.name}"?`} onOk={()=>del(confirm.id)} onNo={()=>setConfirm(null)}/>}
      {modal&&(
        <Modal title={modal==="new"?"Tambah Mitra":"Edit Mitra"} onClose={()=>setModal(null)}>
          <FG label="Nama Institusi *"><Inp value={form.name||""} onChange={e=>setForm({...form,name:e.target.value})}/></FG>
          <G2>
            <FG label="Tipe Mitra"><Sel value={form.partner_type||"corporate"} onChange={e=>setForm({...form,partner_type:e.target.value})}>{Object.entries(TYPE_L).map(([v,l])=><option key={v} value={v}>{l}</option>)}</Sel></FG>
            <FG label="Urutan"><Inp type="number" value={form.display_order||1} onChange={e=>setForm({...form,display_order:parseInt(e.target.value)||1})}/></FG>
          </G2>
          <FG label="Website URL (opsional)"><Inp value={form.website_url||""} onChange={e=>setForm({...form,website_url:e.target.value})} placeholder="https://..."/></FG>
          <div className="fg" style={{display:"flex",alignItems:"center",flexDirection:"row",gap:10}}><Lbl>Aktif (Tampil di Marquee)</Lbl><Tog value={!!form.is_active} onChange={v=>setForm({...form,is_active:v})}/></div>
          <SaveBar onClose={()=>setModal(null)} onSave={save}/>
        </Modal>
      )}
      <div style={{display:"flex",justifyContent:"flex-end",marginBottom:"1rem"}}>
        <button onClick={openN} style={{display:"flex",alignItems:"center",gap:5,padding:"7px 14px",background:T.biru,color:"#fff",border:"none",borderRadius:8,fontWeight:700,fontSize:13}}><Plus size={14}/> Tambah Mitra</button>
      </div>
      <div className="card" style={{padding:0,overflow:"hidden"}}>
        <table className="tbl" style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr><th style={{minWidth:200}}>INSTITUSI</th><th>TIPE</th><th>AKTIF</th><th>URUTAN</th><th>AKSI</th></tr></thead>
          <tbody>
            {d.partners.map(p=>(
              <tr key={p.id} className="rh">
                <td style={{fontWeight:600,fontSize:13}}>{p.name}</td>
                <td><Badge label={TYPE_L[p.partner_type]||p.partner_type} color={T.teksMd} bg="#f1f5f9"/></td>
                <td style={{textAlign:"center"}}><Tog value={p.is_active} onChange={v=>{setD({...d,partners:d.partners.map(x=>x.id===p.id?{...x,is_active:v}:x)});toast("Status mitra diperbarui")}}/></td>
                <td style={{textAlign:"center",fontSize:12.5,color:T.teksMd}}>{p.display_order}</td>
                <td><TA onEdit={()=>openE(p)} onDel={()=>setConfirm(p)}/></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Reports ──────────────────────────────────────────────────────────────────
function Reports({d,setD,toast}) {
  const [modal,setModal]=useState(false);
  const [confirm,setConfirm]=useState(null);
  const [form,setForm]=useState({title:"",report_type:"quarterly",period_label:"",period_year:2025,audit_status:"unaudited",is_published:false,file_size_kb:0,download_count:0,uploaded_by:"Sari Ramadhani"});

  const save=()=>{
    if(!form.title||!form.period_label){toast("Judul dan periode wajib diisi");return;}
    setD({...d,reports:[...d.reports,{...form,id:nid(d.reports)}]});
    toast("Laporan diupload — ISR /transparansi diinvalidasi");setModal(false);
    setForm({title:"",report_type:"quarterly",period_label:"",period_year:2025,audit_status:"unaudited",is_published:false,file_size_kb:0,download_count:0,uploaded_by:"Sari Ramadhani"});
  };
  const del=id=>{setD({...d,reports:d.reports.filter(r=>r.id!==id)});toast("Laporan dihapus");setConfirm(null)};

  return (
    <div className="fi">
      {confirm&&<Confirm msg={`Hapus laporan "${confirm.title}"?`} onOk={()=>del(confirm.id)} onNo={()=>setConfirm(null)}/>}
      {modal&&(
        <Modal title="Upload Laporan Keuangan" onClose={()=>setModal(false)}>
          <FG label="Judul Laporan *"><Inp value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="e.g. Laporan Keuangan Tahunan 2024"/></FG>
          <G2>
            <FG label="Tipe"><Sel value={form.report_type} onChange={e=>setForm({...form,report_type:e.target.value})}><option value="annual">Tahunan</option><option value="quarterly">Triwulan</option><option value="monthly">Bulanan</option><option value="special_audit">Audit Khusus</option></Sel></FG>
            <FG label="Label Periode *"><Inp value={form.period_label} onChange={e=>setForm({...form,period_label:e.target.value})} placeholder="e.g. Q2 2025"/></FG>
            <FG label="Tahun"><Inp type="number" value={form.period_year} onChange={e=>setForm({...form,period_year:parseInt(e.target.value)||2025})}/></FG>
            <FG label="Status Audit"><Sel value={form.audit_status} onChange={e=>setForm({...form,audit_status:e.target.value})}><option value="unaudited">Belum Diaudit</option><option value="internally_reviewed">Review Internal</option><option value="kap_audited">Diaudit KAP</option></Sel></FG>
          </G2>
          <FG label="File PDF (simulasi upload)">
            <div style={{border:`2px dashed ${T.border}`,borderRadius:9,padding:"1.25rem",textAlign:"center",background:T.bg,cursor:"pointer"}} onClick={()=>{setForm({...form,file_size_kb:Math.floor(Math.random()*2000+500)});toast("File dipilih (simulasi)")}}>
              <Upload size={18} color={T.teksMt} style={{margin:"0 auto .4rem"}}/>
              <div style={{fontSize:12.5,color:T.teksMd}}>Klik untuk pilih PDF (max 10MB)</div>
              {form.file_size_kb>0&&<div style={{fontSize:12,color:T.green,marginTop:3}}>✓ File dipilih ({form.file_size_kb}KB)</div>}
            </div>
          </FG>
          <div className="fg" style={{display:"flex",alignItems:"center",flexDirection:"row",gap:10}}><Lbl>Publikasikan Sekarang</Lbl><Tog value={!!form.is_published} onChange={v=>setForm({...form,is_published:v})}/></div>
          <SaveBar onClose={()=>setModal(false)} onSave={save} label="Upload"/>
        </Modal>
      )}
      <div style={{display:"flex",justifyContent:"flex-end",marginBottom:"1rem"}}>
        <button onClick={()=>setModal(true)} style={{display:"flex",alignItems:"center",gap:5,padding:"7px 14px",background:T.biru,color:"#fff",border:"none",borderRadius:8,fontWeight:700,fontSize:13}}><Upload size={14}/> Upload Laporan</button>
      </div>
      <div className="card" style={{padding:0,overflow:"hidden"}}>
        <table className="tbl" style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr><th style={{minWidth:220}}>LAPORAN</th><th>TIPE</th><th>STATUS AUDIT</th><th>UKURAN</th><th>UNDUHAN</th><th>PUBLIK</th><th>AKSI</th></tr></thead>
          <tbody>
            {d.reports.map(r=>(
              <tr key={r.id} className="rh">
                <td><div style={{fontWeight:600,fontSize:13}}>{r.title}</div><div style={{fontSize:11,color:T.teksMt}}>Upload: {r.uploaded_by}</div></td>
                <td><Badge label={r.report_type==="annual"?"Tahunan":"Triwulan"} color={T.biru} bg={T.biruLt}/></td>
                <td>{stBadge(r.audit_status)}</td>
                <td style={{fontSize:12.5,color:T.teksMd}}>{(r.file_size_kb/1000).toFixed(1)}MB</td>
                <td style={{textAlign:"center",fontSize:12.5,color:T.teksMd}}>{r.download_count}</td>
                <td style={{textAlign:"center"}}><Tog value={r.is_published} onChange={v=>{setD({...d,reports:d.reports.map(x=>x.id===r.id?{...x,is_published:v}:x)});toast(v?"Laporan dipublikasikan":"Laporan disembunyikan")}}/></td>
                <td><div style={{display:"flex",gap:3}}><button className="gh" style={{padding:4,border:"none",borderRadius:6,display:"flex",color:T.biru}}><Download size={13}/></button><button onClick={()=>setConfirm(r)} style={{padding:4,border:"none",borderRadius:6,display:"flex",background:T.redLt,color:T.red}}><Trash2 size={13}/></button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Metrics ──────────────────────────────────────────────────────────────────
function Metrics({d,setD,toast}) {
  const [edits,setEdits]=useState({});
  const save=id=>{
    const e=edits[id];if(!e)return;
    setD({...d,metrics:d.metrics.map(m=>m.id===id?{...m,...e}:m)});
    setEdits({...edits,[id]:null});
    toast(`Metrik diperbarui — ISR / & /transparansi diinvalidasi`);
  };
  return (
    <div className="fi">
      <div style={{background:T.amberLt,border:`1px solid #fbbf24`,borderRadius:9,padding:".75rem 1rem",marginBottom:"1.1rem",fontSize:12.5,color:"#92400e",display:"flex",gap:7}}>
        <AlertTriangle size={14} style={{flexShrink:0,marginTop:1}}/> Perubahan ini akan merevalidasi ISR pada <strong>/</strong> dan <strong>/transparansi</strong>. Perbarui berdasarkan laporan keuangan terbaru setiap bulan.
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:"1rem",marginBottom:"1.25rem"}}>
        {d.metrics.map(m=>(
          <div key={m.id} className="card" style={{textAlign:"center",borderTop:`3px solid ${T.biru}`}}>
            <div style={{fontFamily:"'Cabin',sans-serif",fontSize:26,fontWeight:700,color:T.biru,lineHeight:1}}>
              {edits[m.id]?.value??m.value}<span style={{fontSize:"55%",opacity:.7}}>{edits[m.id]?.suffix??m.suffix}</span>
            </div>
            <div style={{fontSize:12,color:T.teksMd,margin:".4rem 0 .7rem"}}>{m.label}</div>
            <div style={{display:"flex",justifyContent:"center"}}><Tog value={m.is_active} onChange={v=>{setD({...d,metrics:d.metrics.map(x=>x.id===m.id?{...x,is_active:v}:x)});toast("Status metrik diperbarui")}}/></div>
            <div style={{fontSize:10.5,color:T.teksMt,marginTop:4}}>Aktif</div>
          </div>
        ))}
      </div>
      <div className="card">
        <div style={{fontFamily:"'Cabin',sans-serif",fontWeight:700,fontSize:13.5,marginBottom:".9rem"}}>Edit Nilai</div>
        <table className="tbl" style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr><th style={{minWidth:200}}>LABEL</th><th>NILAI</th><th>SUFIKS</th><th>STATUS</th><th>AKSI</th></tr></thead>
          <tbody>
            {d.metrics.map(m=>{const e=edits[m.id]||{};return(
              <tr key={m.id} className="rh">
                <td style={{fontWeight:600,fontSize:13}}>{m.label}</td>
                <td><Inp type="number" value={e.value??m.value} onChange={ev=>setEdits({...edits,[m.id]:{...e,value:parseFloat(ev.target.value)||0}})} style={{width:90,height:30,fontSize:13,padding:"4px 8px"}}/></td>
                <td><Inp value={e.suffix??m.suffix} onChange={ev=>setEdits({...edits,[m.id]:{...e,suffix:ev.target.value}})} style={{width:55,height:30,fontSize:13,padding:"4px 8px"}}/></td>
                <td style={{textAlign:"center"}}>{m.is_active?<CheckCircle2 size={14} color={T.green}/>:<XCircle size={14} color={T.teksMt}/>}</td>
                <td><button onClick={()=>save(m.id)} style={{padding:"4px 11px",border:"none",borderRadius:6,background:T.biru,color:"#fff",fontSize:12,fontWeight:600,display:"flex",alignItems:"center",gap:4}}><Save size={11}/> Simpan</button></td>
              </tr>
            );})}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── FAQ ──────────────────────────────────────────────────────────────────────
function FAQ({d,setD,toast}) {
  const [modal,setModal]=useState(null);
  const [sel,setSel]=useState(null);
  const [confirm,setConfirm]=useState(null);
  const [form,setForm]=useState({});
  const CAT={general:"Umum",donation:"Donasi",zakat:"Zakat",program:"Program",partnership:"Kerjasama",technical:"Teknis"};

  const openN=()=>{setForm({question:"",answer:"",category:"general",is_active:true,display_order:d.faqs.length+1});setModal("new")};
  const openE=f=>{setSel(f);setForm({...f});setModal("edit")};
  const save=()=>{
    if(!form.question||!form.answer){toast("Pertanyaan dan jawaban wajib diisi");return;}
    if(modal==="new")setD({...d,faqs:[...d.faqs,{...form,id:nid(d.faqs)}]});
    else setD({...d,faqs:d.faqs.map(f=>f.id===sel.id?{...f,...form}:f)});
    toast(modal==="new"?"FAQ ditambahkan":"FAQ diperbarui — ISR /kontak diinvalidasi");setModal(null);
  };
  const del=id=>{setD({...d,faqs:d.faqs.filter(f=>f.id!==id)});toast("FAQ dihapus");setConfirm(null)};

  return (
    <div className="fi">
      {confirm&&<Confirm msg="Hapus FAQ ini?" onOk={()=>del(confirm.id)} onNo={()=>setConfirm(null)}/>}
      {modal&&(
        <Modal title={modal==="new"?"Tambah FAQ":"Edit FAQ"} onClose={()=>setModal(null)}>
          <FG label="Pertanyaan *"><Txt value={form.question||""} onChange={e=>setForm({...form,question:e.target.value})} rows={2}/></FG>
          <FG label="Jawaban *"><Txt value={form.answer||""} onChange={e=>setForm({...form,answer:e.target.value})} rows={4}/></FG>
          <G2>
            <FG label="Kategori"><Sel value={form.category||"general"} onChange={e=>setForm({...form,category:e.target.value})}>{Object.entries(CAT).map(([v,l])=><option key={v} value={v}>{l}</option>)}</Sel></FG>
            <FG label="Urutan"><Inp type="number" value={form.display_order||1} onChange={e=>setForm({...form,display_order:parseInt(e.target.value)||1})}/></FG>
          </G2>
          <div className="fg" style={{display:"flex",alignItems:"center",flexDirection:"row",gap:10}}><Lbl>Tampilkan</Lbl><Tog value={!!form.is_active} onChange={v=>setForm({...form,is_active:v})}/></div>
          <SaveBar onClose={()=>setModal(null)} onSave={save}/>
        </Modal>
      )}
      <div style={{display:"flex",justifyContent:"flex-end",marginBottom:"1rem"}}>
        <button onClick={openN} style={{display:"flex",alignItems:"center",gap:5,padding:"7px 14px",background:T.biru,color:"#fff",border:"none",borderRadius:8,fontWeight:700,fontSize:13}}><Plus size={14}/> Tambah FAQ</button>
      </div>
      <div style={{display:"grid",gap:".65rem"}}>
        {d.faqs.map(f=>(
          <div key={f.id} className="card" style={{display:"flex",gap:"1rem",alignItems:"start"}}>
            <div style={{flex:1}}>
              <div style={{fontWeight:700,fontSize:13.5,marginBottom:".25rem"}}>{f.question}</div>
              <div style={{fontSize:13,color:T.teksMd,lineHeight:1.6}}>{f.answer}</div>
              <div style={{display:"flex",gap:".4rem",marginTop:".5rem"}}><Badge label={CAT[f.category]||f.category} color={T.teksMd} bg="#f1f5f9"/><Badge label={`Urutan: ${f.display_order}`} color={T.teksMt} bg="#f8fafc"/></div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:".65rem",alignItems:"center",flexShrink:0}}>
              <Tog value={f.is_active} onChange={v=>{setD({...d,faqs:d.faqs.map(x=>x.id===f.id?{...x,is_active:v}:x)});toast("FAQ diperbarui")}}/>
              <TA onEdit={()=>openE(f)} onDel={()=>setConfirm(f)}/>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Team ─────────────────────────────────────────────────────────────────────
function Team({d,setD,toast}) {
  const [modal,setModal]=useState(null);
  const [sel,setSel]=useState(null);
  const [confirm,setConfirm]=useState(null);
  const [form,setForm]=useState({});

  const openN=()=>{setForm({name:"",title:"",department:"",initials:"",accent_color:"#3268C3",is_active:true,display_order:d.team.length+1});setModal("new")};
  const openE=t=>{setSel(t);setForm({...t});setModal("edit")};
  const save=()=>{
    if(!form.name||!form.title){toast("Nama dan jabatan wajib diisi");return;}
    const ini=form.initials||(form.name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase());
    if(modal==="new")setD({...d,team:[...d.team,{...form,id:nid(d.team),initials:ini}]});
    else setD({...d,team:d.team.map(t=>t.id===sel.id?{...t,...form,initials:ini}:t)});
    toast(modal==="new"?"Anggota tim ditambahkan":"Tim diperbarui — ISR /tentang-kami diinvalidasi");setModal(null);
  };
  const del=id=>{setD({...d,team:d.team.filter(t=>t.id!==id)});toast("Anggota dihapus");setConfirm(null)};

  return (
    <div className="fi">
      {confirm&&<Confirm msg={`Hapus "${confirm.name}" dari tim?`} onOk={()=>del(confirm.id)} onNo={()=>setConfirm(null)}/>}
      {modal&&(
        <Modal title={modal==="new"?"Tambah Anggota":"Edit Anggota"} onClose={()=>setModal(null)}>
          <G2>
            <FG label="Nama Lengkap *" style={{gridColumn:"1/-1"}}><Inp value={form.name||""} onChange={e=>setForm({...form,name:e.target.value})} placeholder="e.g. Ust. Ahmad Habib, Lc."/></FG>
            <FG label="Jabatan *"><Inp value={form.title||""} onChange={e=>setForm({...form,title:e.target.value})} placeholder="e.g. Direktur Utama"/></FG>
            <FG label="Departemen"><Inp value={form.department||""} onChange={e=>setForm({...form,department:e.target.value})}/></FG>
            <FG label="Inisial (2-3 huruf)"><Inp value={form.initials||""} onChange={e=>setForm({...form,initials:e.target.value.toUpperCase().slice(0,3)})}/></FG>
            <FG label="Warna Avatar"><Inp type="color" value={form.accent_color||"#3268C3"} onChange={e=>setForm({...form,accent_color:e.target.value})} style={{height:38,padding:4,cursor:"pointer"}}/></FG>
          </G2>
          <div className="fg" style={{display:"flex",alignItems:"center",flexDirection:"row",gap:10}}><Lbl>Tampilkan di Halaman Tentang</Lbl><Tog value={!!form.is_active} onChange={v=>setForm({...form,is_active:v})}/></div>
          <SaveBar onClose={()=>setModal(null)} onSave={save}/>
        </Modal>
      )}
      <div style={{display:"flex",justifyContent:"flex-end",marginBottom:"1rem"}}>
        <button onClick={openN} style={{display:"flex",alignItems:"center",gap:5,padding:"7px 14px",background:T.biru,color:"#fff",border:"none",borderRadius:8,fontWeight:700,fontSize:13}}><Plus size={14}/> Tambah Anggota</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:"1rem"}}>
        {d.team.map(t=>(
          <div key={t.id} className="card" style={{textAlign:"center",position:"relative"}}>
            <div style={{position:"absolute",top:8,right:8,display:"flex",gap:3}}>
              <button onClick={()=>openE(t)} className="gh" style={{padding:4,border:"none",borderRadius:5,display:"flex",color:T.biru}}><Edit2 size={12}/></button>
              <button onClick={()=>setConfirm(t)} style={{padding:4,border:"none",borderRadius:5,display:"flex",background:T.redLt,color:T.red}}><Trash2 size={12}/></button>
            </div>
            <div style={{width:50,height:50,borderRadius:"50%",background:t.accent_color,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto .7rem",fontFamily:"'Cabin',sans-serif",fontWeight:700,fontSize:16,color:"#fff"}}>{t.initials}</div>
            <div style={{fontFamily:"'Cabin',sans-serif",fontWeight:700,fontSize:13.5,marginBottom:2}}>{t.name}</div>
            <div style={{fontSize:12,color:T.teksMd,marginBottom:4}}>{t.title}</div>
            <Badge label={t.department} color={T.teksMd} bg="#f1f5f9"/>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Legality ─────────────────────────────────────────────────────────────────
function Legality({d,setD,toast}) {
  const [modal,setModal]=useState(false);
  const [sel,setSel]=useState(null);
  const [form,setForm]=useState({});

  const openE=l=>{setSel(l);setForm({...l});setModal(true)};
  const save=()=>{setD({...d,legality:d.legality.map(l=>l.id===sel.id?{...l,...form}:l)});toast("Legalitas diperbarui — ISR /tentang-kami diinvalidasi");setModal(false)};

  return (
    <div className="fi">
      {modal&&(
        <Modal title="Edit Dokumen Legalitas" onClose={()=>setModal(false)}>
          <FG label="Label"><Inp value={form.label||""} onChange={e=>setForm({...form,label:e.target.value})}/></FG>
          <FG label="Nilai / Nomor"><Inp value={form.value||""} onChange={e=>setForm({...form,value:e.target.value})}/></FG>
          <G2>
            <FG label="Diterbitkan Oleh"><Inp value={form.issuing||""} onChange={e=>setForm({...form,issuing:e.target.value})}/></FG>
            <FG label="Tanggal Terbit"><Inp type="date" value={form.issue_date||""} onChange={e=>setForm({...form,issue_date:e.target.value})}/></FG>
            <FG label="Tanggal Kedaluwarsa (opsional)"><Inp type="date" value={form.expiry_date||""} onChange={e=>setForm({...form,expiry_date:e.target.value||null})}/></FG>
          </G2>
          <SaveBar onClose={()=>setModal(false)} onSave={save}/>
        </Modal>
      )}
      <div style={{display:"grid",gap:".65rem"}}>
        {d.legality.map(l=>{
          const exp=l.expiry_date&&new Date(l.expiry_date)<new Date(Date.now()+60*24*3600*1000);
          return (
            <div key={l.id} className="card" style={{display:"flex",alignItems:"center",gap:"1rem",borderLeft:`3px solid ${exp?T.amber:T.green}`}}>
              <div style={{flex:1}}>
                <div style={{display:"flex",alignItems:"center",gap:".4rem",marginBottom:2}}>
                  <div style={{fontWeight:700,fontSize:14}}>{l.label}</div>
                  {exp&&<Badge label="⚠ Segera Kedaluwarsa" color={T.amber} bg={T.amberLt}/>}
                </div>
                <div style={{fontFamily:"'Cabin',sans-serif",fontWeight:700,fontSize:15,color:T.biru}}>{l.value}</div>
                <div style={{fontSize:11.5,color:T.teksMt,marginTop:2}}>{l.issuing} · {l.issue_date}{l.expiry_date?` · Berlaku s/d ${l.expiry_date}`:""}</div>
              </div>
              <button onClick={()=>openE(l)} className="gh" style={{padding:"5px 11px",border:`1.5px solid ${T.border}`,borderRadius:7,display:"flex",alignItems:"center",gap:4,color:T.biru,background:"#fff",fontSize:12,fontWeight:600}}><Edit2 size={12}/> Edit</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Bank Accounts ────────────────────────────────────────────────────────────
function BankAccounts({d,setD,toast}) {
  const [modal,setModal]=useState(null);
  const [sel,setSel]=useState(null);
  const [confirm,setConfirm]=useState(null);
  const [form,setForm]=useState({});

  const openN=()=>{setForm({bank_name:"",account_number:"",account_name:"LAZ Darul Hikam",is_active:true,display_order:d.bankAccounts.length+1});setModal("new")};
  const openE=b=>{setSel(b);setForm({...b});setModal("edit")};
  const save=()=>{
    if(!form.bank_name||!form.account_number){toast("Nama bank dan nomor rekening wajib diisi");return;}
    if(modal==="new")setD({...d,bankAccounts:[...d.bankAccounts,{...form,id:nid(d.bankAccounts)}]});
    else setD({...d,bankAccounts:d.bankAccounts.map(b=>b.id===sel.id?{...b,...form}:b)});
    toast(modal==="new"?"Rekening ditambahkan":"Rekening diperbarui — ISR /layanan-ziswaf diinvalidasi");setModal(null);
  };
  const del=id=>{setD({...d,bankAccounts:d.bankAccounts.filter(b=>b.id!==id)});toast("Rekening dihapus");setConfirm(null)};

  return (
    <div className="fi">
      {confirm&&<Confirm msg={`Hapus rekening "${confirm.bank_name}"? Ini akan mempengaruhi halaman publik.`} onOk={()=>del(confirm.id)} onNo={()=>setConfirm(null)}/>}
      {modal&&(
        <Modal title={modal==="new"?"Tambah Rekening":"Edit Rekening"} onClose={()=>setModal(null)}>
          <div style={{background:T.redLt,border:`1px solid #fca5a5`,borderRadius:8,padding:".6rem 1rem",marginBottom:".9rem",fontSize:12.5,color:"#7f1d1d",display:"flex",gap:6}}><AlertTriangle size={13} style={{flexShrink:0,marginTop:1}}/> Perubahan rekening bersifat kritis. Pastikan data akurat.</div>
          <FG label="Nama Bank *"><Inp value={form.bank_name||""} onChange={e=>setForm({...form,bank_name:e.target.value})} placeholder="e.g. Bank Syariah Indonesia (BSI)"/></FG>
          <FG label="Nomor Rekening *"><Inp value={form.account_number||""} onChange={e=>setForm({...form,account_number:e.target.value})} placeholder="e.g. 711-9XXX-XXXX"/></FG>
          <FG label="Atas Nama"><Inp value={form.account_name||""} onChange={e=>setForm({...form,account_name:e.target.value})}/></FG>
          <div className="fg" style={{display:"flex",alignItems:"center",flexDirection:"row",gap:10}}><Lbl>Aktif</Lbl><Tog value={!!form.is_active} onChange={v=>setForm({...form,is_active:v})}/></div>
          <SaveBar onClose={()=>setModal(null)} onSave={save}/>
        </Modal>
      )}
      <div style={{display:"flex",justifyContent:"flex-end",marginBottom:"1rem"}}>
        <button onClick={openN} style={{display:"flex",alignItems:"center",gap:5,padding:"7px 14px",background:T.biru,color:"#fff",border:"none",borderRadius:8,fontWeight:700,fontSize:13}}><Plus size={14}/> Tambah Rekening</button>
      </div>
      <div style={{display:"grid",gap:".65rem"}}>
        {d.bankAccounts.map(b=>(
          <div key={b.id} className="card" style={{display:"flex",alignItems:"center",gap:"1rem"}}>
            <div style={{width:40,height:40,background:T.biruLt,borderRadius:9,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Building size={18} color={T.biru}/></div>
            <div style={{flex:1}}>
              <div style={{fontWeight:700,fontSize:13.5}}>{b.bank_name}</div>
              <div style={{fontFamily:"'Cabin',sans-serif",fontSize:15,fontWeight:700,color:T.biru,letterSpacing:1}}>{b.account_number}</div>
              <div style={{fontSize:11.5,color:T.teksMt}}>a.n. {b.account_name}</div>
            </div>
            <Tog value={b.is_active} onChange={v=>{setD({...d,bankAccounts:d.bankAccounts.map(x=>x.id===b.id?{...x,is_active:v}:x)});toast("Status rekening diperbarui")}}/>
            <TA onEdit={()=>openE(b)} onDel={()=>setConfirm(b)}/>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Fund Alloc ───────────────────────────────────────────────────────────────
function FundAlloc({d,setD,toast}) {
  const [modal,setModal]=useState(false);
  const [form,setForm]=useState({program_id:1,period_year:2025,period_month:7,allocated_amount:0,disbursed_amount:0,beneficiary_count:0,notes:""});

  const save=()=>{toast("Alokasi dana disimpan — ISR /transparansi diinvalidasi");setModal(false)};

  return (
    <div className="fi">
      {modal&&(
        <Modal title="Tambah Alokasi Dana" onClose={()=>setModal(false)}>
          <FG label="Program"><Sel value={form.program_id} onChange={e=>setForm({...form,program_id:parseInt(e.target.value)})}>{d.programs.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</Sel></FG>
          <G2>
            <FG label="Tahun"><Inp type="number" value={form.period_year} onChange={e=>setForm({...form,period_year:parseInt(e.target.value)||2025})}/></FG>
            <FG label="Bulan"><Sel value={form.period_month} onChange={e=>setForm({...form,period_month:parseInt(e.target.value)})}>{MONTHS.map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}</Sel></FG>
            <FG label="Dialokasikan (Rp)"><Inp type="number" value={form.allocated_amount} onChange={e=>setForm({...form,allocated_amount:parseInt(e.target.value)||0})}/></FG>
            <FG label="Disalurkan (Rp)"><Inp type="number" value={form.disbursed_amount} onChange={e=>setForm({...form,disbursed_amount:parseInt(e.target.value)||0})}/></FG>
            <FG label="Jumlah Penerima" style={{gridColumn:"1/-1"}}><Inp type="number" value={form.beneficiary_count} onChange={e=>setForm({...form,beneficiary_count:parseInt(e.target.value)||0})}/></FG>
          </G2>
          <FG label="Catatan (opsional)"><Txt value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} rows={2}/></FG>
          <SaveBar onClose={()=>setModal(false)} onSave={save}/>
        </Modal>
      )}
      <div style={{display:"flex",justifyContent:"flex-end",marginBottom:"1rem"}}>
        <button onClick={()=>setModal(true)} style={{display:"flex",alignItems:"center",gap:5,padding:"7px 14px",background:T.biru,color:"#fff",border:"none",borderRadius:8,fontWeight:700,fontSize:13}}><Plus size={14}/> Tambah Alokasi</button>
      </div>
      <div className="card" style={{padding:0,overflow:"hidden"}}>
        <table className="tbl" style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr><th style={{minWidth:200}}>PROGRAM</th><th>PERIODE</th><th>DIALOKASIKAN</th><th>DISALURKAN</th><th>PENERIMA</th><th>EFISIENSI</th></tr></thead>
          <tbody>
            {d.fundAlloc.map(a=>(
              <tr key={a.id} className="rh">
                <td style={{fontWeight:600,fontSize:13}}>{a.program}</td>
                <td style={{fontSize:12.5,color:T.teksMd,whiteSpace:"nowrap"}}>{MONTHS[a.period_month-1]} {a.period_year}</td>
                <td style={{fontSize:12.5}}>{fmt(a.allocated_amount)}</td>
                <td style={{fontSize:12.5,color:T.green,fontWeight:600}}>{fmt(a.disbursed_amount)}</td>
                <td style={{textAlign:"center",fontSize:12.5,color:T.teksMd}}>{a.beneficiary_count.toLocaleString()}</td>
                <td style={{textAlign:"center"}}><span style={{fontWeight:700,fontSize:12.5,color:a.disbursed_amount/a.allocated_amount>=0.95?T.green:T.amber}}>{Math.round((a.disbursed_amount/a.allocated_amount)*100)}%</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Users ────────────────────────────────────────────────────────────────────
function Users({d,setD,toast}) {
  const [modal,setModal]=useState(null);
  const [sel,setSel]=useState(null);
  const [confirm,setConfirm]=useState(null);
  const [form,setForm]=useState({});

  const RC={super_admin:{bg:"#ede9fe",c:"#7c3aed"},content_editor:{bg:T.biruLt,c:T.biru},finance_staff:{bg:T.greenLt,c:T.green},program_manager:{bg:T.emasLt,c:T.emas},cs_staff:{bg:"#f1f5f9",c:T.teksMd}};
  const openN=()=>{setForm({name:"",email:"",role:"content_editor",is_active:true,password:""});setModal("new")};
  const openE=u=>{setSel(u);setForm({...u,password:""});setModal("edit")};
  const save=()=>{
    if(!form.name||!form.email){toast("Nama dan email wajib diisi");return;}
    if(modal==="new")setD({...d,users:[...d.users,{...form,id:nid(d.users),last_login:"—"}]});
    else setD({...d,users:d.users.map(u=>u.id===sel.id?{...u,...form}:u)});
    toast(modal==="new"?"Pengguna dibuat":"Pengguna diperbarui");setModal(null);
  };
  const del=id=>{setD({...d,users:d.users.filter(u=>u.id!==id)});toast("Pengguna dihapus");setConfirm(null)};

  return (
    <div className="fi">
      {confirm&&<Confirm msg={`Hapus pengguna "${confirm.name}"?`} onOk={()=>del(confirm.id)} onNo={()=>setConfirm(null)}/>}
      {modal&&(
        <Modal title={modal==="new"?"Pengguna Baru":"Edit Pengguna"} onClose={()=>setModal(null)}>
          <FG label="Nama Lengkap *"><Inp value={form.name||""} onChange={e=>setForm({...form,name:e.target.value})}/></FG>
          <FG label="Email *"><Inp type="email" value={form.email||""} onChange={e=>setForm({...form,email:e.target.value})}/></FG>
          <G2>
            <FG label="Role"><Sel value={form.role||"content_editor"} onChange={e=>setForm({...form,role:e.target.value})}>{Object.entries(ROLE_L).map(([v,l])=><option key={v} value={v}>{l}</option>)}</Sel></FG>
            <FG label={modal==="new"?"Password *":"Password Baru (opsional)"}><Inp type="password" value={form.password||""} onChange={e=>setForm({...form,password:e.target.value})} placeholder={modal==="edit"?"Kosongkan jika tidak diganti":"Min. 10 karakter"}/></FG>
          </G2>
          <div className="fg" style={{display:"flex",alignItems:"center",flexDirection:"row",gap:10}}><Lbl>Akun Aktif</Lbl><Tog value={!!form.is_active} onChange={v=>setForm({...form,is_active:v})}/></div>
          <SaveBar onClose={()=>setModal(null)} onSave={save}/>
        </Modal>
      )}
      <div style={{display:"flex",justifyContent:"flex-end",marginBottom:"1rem"}}>
        <button onClick={openN} style={{display:"flex",alignItems:"center",gap:5,padding:"7px 14px",background:T.biru,color:"#fff",border:"none",borderRadius:8,fontWeight:700,fontSize:13}}><Plus size={14}/> Pengguna Baru</button>
      </div>
      <div className="card" style={{padding:0,overflow:"hidden"}}>
        <table className="tbl" style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr><th style={{minWidth:200}}>PENGGUNA</th><th>ROLE</th><th>LOGIN TERAKHIR</th><th>AKTIF</th><th>AKSI</th></tr></thead>
          <tbody>
            {d.users.map(u=>{const rc=RC[u.role]||{bg:"#f1f5f9",c:T.teksMd};return(
              <tr key={u.id} className="rh">
                <td>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <div style={{width:30,height:30,borderRadius:"50%",background:rc.bg,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Cabin',sans-serif",fontWeight:700,fontSize:11,color:rc.c,flexShrink:0}}>{u.name.split(" ").map(w=>w[0]).join("").slice(0,2)}</div>
                    <div><div style={{fontWeight:600,fontSize:13}}>{u.name}</div><div style={{fontSize:11.5,color:T.teksMt}}>{u.email}</div></div>
                  </div>
                </td>
                <td><Badge label={ROLE_L[u.role]||u.role} color={rc.c} bg={rc.bg}/></td>
                <td style={{fontSize:12.5,color:T.teksMd}}>{u.last_login}</td>
                <td style={{textAlign:"center"}}><Tog value={u.is_active} onChange={v=>{setD({...d,users:d.users.map(x=>x.id===u.id?{...x,is_active:v}:x)});toast("Status pengguna diperbarui")}}/></td>
                <td><TA onEdit={()=>openE(u)} onDel={u.role!=="super_admin"?()=>setConfirm(u):undefined}/></td>
              </tr>
            );})}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Audit Log ────────────────────────────────────────────────────────────────
function AuditLog({d}) {
  const [search,setSearch]=useState("");
  const rows=d.auditLog.filter(l=>l.user.toLowerCase().includes(search.toLowerCase())||l.entity_name.toLowerCase().includes(search.toLowerCase()));
  const AC={create:{bg:T.greenLt,c:T.green},update:{bg:T.biruLt,c:T.biru},publish:{bg:"#ede9fe",c:"#7c3aed"},delete:{bg:T.redLt,c:T.red},unpublish:{bg:T.amberLt,c:T.amber}};

  return (
    <div className="fi">
      <div style={{marginBottom:"1rem"}}><SearchBar value={search} onChange={setSearch} ph="Cari pengguna atau entitas..."/></div>
      <div className="card" style={{padding:0,overflow:"hidden"}}>
        <table className="tbl" style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr><th>WAKTU (WIB)</th><th style={{minWidth:140}}>PENGGUNA</th><th>AKSI</th><th style={{minWidth:180}}>ENTITAS</th><th>TABEL</th><th>IP</th></tr></thead>
          <tbody>
            {rows.map(l=>{const ac=AC[l.action]||{bg:"#f1f5f9",c:T.teksMd};return(
              <tr key={l.id} className="rh">
                <td style={{fontSize:12,color:T.teksMd,whiteSpace:"nowrap"}}>{l.created_at}</td>
                <td style={{fontWeight:600,fontSize:13}}>{l.user}</td>
                <td><Badge label={ACT_L[l.action]||l.action} color={ac.c} bg={ac.bg}/></td>
                <td style={{fontSize:13}}>{l.entity_name}</td>
                <td><code style={{fontSize:11,background:"#f1f5f9",padding:"2px 6px",borderRadius:4,color:T.teksMd}}>{l.entity_type}</code></td>
                <td style={{fontSize:11.5,color:T.teksMt}}>{l.ip}</td>
              </tr>
            );})}
          </tbody>
        </table>
      </div>
      <div style={{marginTop:".5rem",fontSize:12,color:T.teksMt}}>{rows.length} entri · Read-only</div>
    </div>
  );
}

// ─── Settings ─────────────────────────────────────────────────────────────────
function SiteSettings({toast}) {
  const [form,setForm]=useState({site_name:"LAZ Darul Hikam",tagline:"Amanah · Transparan · Profesional",contact_email:"cs@lazdarulhikam.org",contact_phone:"0800-1-ZAKAT",whatsapp:"6281234567890",office_address:"Jl. Darul Hikam No.1, Bandung, Jawa Barat 40133",instagram:"https://instagram.com/lazdarulhikam",facebook:"https://facebook.com/lazdarulhikam",youtube:"https://youtube.com/@lazdarulhikam",ga_id:"G-XXXXXXXXXX",gsc_verification:"",meta_title_template:"%s — LAZ Darul Hikam",meta_description:"LAZ Darul Hikam menyalurkan zakat, infaq, sedekah, dan wakaf untuk kesejahteraan umat Indonesia.",maintenance_mode:false});

  const grps=[
    {t:"Identitas Situs",fs:[{k:"site_name",l:"Nama Situs"},{k:"tagline",l:"Tagline"}]},
    {t:"Kontak",fs:[{k:"contact_email",l:"Email Kontak",type:"email"},{k:"contact_phone",l:"Nomor Telepon"},{k:"whatsapp",l:"WhatsApp (internasional, tanpa +)"},{k:"office_address",l:"Alamat Kantor",ta:true}]},
    {t:"Media Sosial",fs:[{k:"instagram",l:"Instagram URL"},{k:"facebook",l:"Facebook URL"},{k:"youtube",l:"YouTube URL"}]},
    {t:"SEO Default",fs:[{k:"meta_title_template",l:"Template <title>"},{k:"meta_description",l:"Default Meta Description",ta:true},{k:"ga_id",l:"Google Analytics ID"},{k:"gsc_verification",l:"Google Search Console Verification Token"}]},
  ];

  return (
    <div className="fi" style={{maxWidth:680}}>
      {grps.map(g=>(
        <div key={g.t} className="card" style={{marginBottom:"1rem"}}>
          <div style={{fontFamily:"'Cabin',sans-serif",fontWeight:700,fontSize:13.5,marginBottom:".9rem",color:T.teks}}>{g.t}</div>
          {g.fs.map(f=>(
            <FG key={f.k} label={f.l}>
              {f.ta?<Txt value={form[f.k]||""} onChange={e=>setForm({...form,[f.k]:e.target.value})} rows={2}/>:<Inp type={f.type||"text"} value={form[f.k]||""} onChange={e=>setForm({...form,[f.k]:e.target.value})}/>}
            </FG>
          ))}
        </div>
      ))}
      <div className="card" style={{marginBottom:"1rem"}}>
        <div style={{fontFamily:"'Cabin',sans-serif",fontWeight:700,fontSize:13.5,marginBottom:".9rem"}}>Kontrol Situs</div>
        <div style={{display:"flex",alignItems:"center",gap:12,padding:".7rem",background:form.maintenance_mode?T.amberLt:"#f8fafc",borderRadius:9,border:`1px solid ${form.maintenance_mode?"#fbbf24":T.border}`}}>
          <Tog value={form.maintenance_mode} onChange={v=>setForm({...form,maintenance_mode:v})}/>
          <div><div style={{fontWeight:600,fontSize:13}}>Maintenance Mode</div><div style={{fontSize:12,color:T.teksMt}}>Mengaktifkan ini menampilkan halaman maintenance ke semua pengunjung publik</div></div>
        </div>
      </div>
      <button onClick={()=>toast("Pengaturan disimpan — ISR semua halaman publik diinvalidasi")} style={{padding:"10px 22px",border:"none",borderRadius:9,background:T.biru,color:"#fff",fontWeight:700,fontSize:13.5,display:"flex",alignItems:"center",gap:6}}><Save size={14}/> Simpan Semua Pengaturan</button>
    </div>
  );
}

// ─── Page titles ──────────────────────────────────────────────────────────────
const PT={dashboard:"Dashboard",articles:"Manajemen Artikel",programs:"Manajemen Program",testimonials:"Testimoni",partners:"Mitra & Kemitraan",reports:"Laporan Keuangan",metrics:"Impact Metrics",fundalloc:"Alokasi Dana",team:"Tim & Pengurus",legality:"Dokumen Legalitas",bank:"Rekening Resmi",faq:"FAQ",settings:"Pengaturan Situs",users:"Admin Users",audit:"Audit Log"};

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [page,setPage]=useState("dashboard");
  const [d,setD]=useState({...SEED});
  const [toast,setToast]=useState(null);
  const [col,setCol]=useState(false);
  const [reving,setReving]=useState(false);

  const showToast=msg=>setToast({msg,id:Date.now()});
  const reval=()=>{setReving(true);setTimeout(()=>{setReving(false);showToast("ISR revalidated: /, /kabar-kebaikan, /program, /transparansi")},1200)};

  const props={d,setD,toast:showToast};
  const pages={
    dashboard:<Dashboard {...props}/>,
    articles:<Articles {...props}/>,
    programs:<Programs {...props}/>,
    testimonials:<Testimonials {...props}/>,
    partners:<Partners {...props}/>,
    reports:<Reports {...props}/>,
    metrics:<Metrics {...props}/>,
    fundalloc:<FundAlloc {...props}/>,
    team:<Team {...props}/>,
    legality:<Legality {...props}/>,
    bank:<BankAccounts {...props}/>,
    faq:<FAQ {...props}/>,
    settings:<SiteSettings {...props}/>,
    users:<Users {...props}/>,
    audit:<AuditLog {...props}/>,
  };

  return (
    <div style={{display:"flex",height:"100vh",overflow:"hidden"}}>
      <style>{S}</style>
      <Sidebar active={page} onNav={p=>{setPage(p);window.scrollTo&&window.scrollTo(0,0)}} col={col}/>
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",minWidth:0}}>
        <Topbar title={PT[page]||page} onToggle={()=>setCol(!col)} onReval={reval} reving={reving}/>
        <div style={{flex:1,overflow:"auto",padding:"1.25rem"}}>
          {pages[page]||pages.dashboard}
        </div>
      </div>
      {toast&&<Toast key={toast.id} msg={toast.msg} onClose={()=>setToast(null)}/>}
    </div>
  );
}

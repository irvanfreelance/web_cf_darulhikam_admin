import { query } from '@/lib/db';
import { PrintButton } from '@/components/shared/print-button';
import { formatIDR } from '@/lib/format';

export default async function CetakSertifikatPage({ params }: { params: Promise<{ donorId: string; tahun: string }> }) {
  const { donorId, tahun } = await params;
  const [certRes, orgRes] = await Promise.all([
    query(
      `SELECT * FROM donation_certificates WHERE donor_id = $1 AND tahun_donasi = $2`,
      [donorId, tahun]
    ),
    query(`SELECT ngo_name, address FROM ngo_configs LIMIT 1`),
  ]);
  const cert = certRes.rows[0];
  const org = orgRes.rows[0];
  if (!cert) return <p>Sertifikat belum diterbitkan. Terbitkan dari menu Bukti Setor.</p>;

  return (
    <article className="mx-auto max-w-xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Sertifikat donasi {cert.tahun_donasi}</p>
          <h1 className="text-2xl font-semibold">{org?.ngo_name || 'LAZ Darul Hikam'}</h1>
          <p className="text-sm text-slate-500">{cert.nomor_sertifikat}</p>
        </div>
        <PrintButton />
      </div>
      <p>Diberikan kepada <strong>{cert.nama_donatur}</strong> atas donasi tahun {cert.tahun_donasi} sebesar <strong>{formatIDR(Number(cert.total_donasi))}</strong>.</p>
      <ul className="text-sm text-slate-600">
        <li>Zakat: {formatIDR(Number(cert.total_zakat || 0))}</li>
        <li>Qurban: {formatIDR(Number(cert.total_qurban || 0))}</li>
        <li>Lainnya: {formatIDR(Number(cert.total_lainnya || 0))}</li>
        <li>Jumlah transaksi: {cert.jumlah_transaksi}</li>
      </ul>
    </article>
  );
}

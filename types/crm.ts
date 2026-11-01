export const DONOR_JENIS = ['perorangan', 'perusahaan', 'komunitas'] as const;
export type DonorJenis = (typeof DONOR_JENIS)[number];

export const DONOR_GENDER = ['L', 'P'] as const;
export type DonorGender = (typeof DONOR_GENDER)[number];

export interface CrmTeam {
  id: number;
  nama: string;
  aktif: boolean | null;
}

export interface CrmKantor {
  id: number;
  nama: string;
}

export interface CrmDonor {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  created_at: string | null;
  jenis: DonorJenis;
  jenis_kelamin: DonorGender | null;
  alamat: string | null;
  nik: string | null;
  status_aktif: boolean;
  kantor_id: number | null;
  tim_crm_id: number | null;
  tim_crm_nama: string | null;
  minat_program: string | null;
  verified_at: string | null;
  merged_into_id: number | null;
  total_donated?: string | number;
  donation_count?: string | number;
}

export interface CrmDonorStats {
  total: number;
  aktif: number;
  prospek: number;
}

export interface CrmDonorInvoice {
  id: number;
  invoice_code: string;
  total_amount: string | number;
  status: string;
  created_at: string;
  paid_at: string | null;
  payment_method_name: string | null;
  campaign_title: string | null;
}

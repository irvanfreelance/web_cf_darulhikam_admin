# Urutan Eksekusi — FINS NGO Complete Schema

## Prasyarat
Semua file dari sesi sebelumnya sudah berjalan:
`01` → `02` → `04` → `05`

## Urutan File Baru (06–16)

```
06_ngo_coa_additions.sql
        ↓
07_ngo_disbursement.sql
        ↓
08_ngo_program_khusus.sql
        ↓
09_ngo_expense.sql         ← vendors, PO, expense, kasbon
        ↓
10_ngo_accounting_period.sql  ← ALTER fins_trans/jurnal, seed periode
        ↓
11_ngo_bank_recon.sql
        ↓
12_ngo_hutang_piutang.sql  ← payables, receivables, internal_transfer, petty_cash
        ↓
13_ngo_grants.sql          ← grants, grant_disbursements, donation_certificates
        ↓
14_ngo_payroll.sql         ← employees, payroll, bukpot PPh 21
        ↓
15_ngo_asset_depreciation.sql  ← generate jadwal susut aset seed
        ↓
16_ngo_psak45.sql          ← fund_restrictions, net_asset_changes, CALK, view
```

## Dependency Map

```
fins_bank          ←── vendors.id_bank_gaji
fins_bank_rek      ←── internal_transfers.dari/ke_rekening_id
                   ←── petty_cash_books.fins_bank_rek_id
                   ←── bank_statements.fins_bank_rek_id
fins_coa           ←── semua kolom COA di seluruh tabel
fins_trans         ←── disbursement_requests.fins_trans_id
                   ←── expense_requests.fins_trans_id
                   ←── qurban_animals.fins_trans_id_*
                   ←── zakat_amil_fee.fins_trans_id_*
                   ←── payables.fins_trans_id_*
                   ←── internal_transfers.fins_trans_id_*
                   ←── petty_cash_transactions.fins_trans_id
                   ←── asset_depreciation_schedules.fins_trans_id
                   ←── payroll_periods.fins_trans_id_*
                   ←── fins_fund_restrictions.fins_trans_id
fins_jurnal        ←── bank_reconciliation_items.fins_jurnal_id
                   ←── period_adjusting_entries.fins_jurnal_*_id
campaigns          ←── beneficiaries.campaign_id
                   ←── disbursement_requests.campaign_id
                   ←── expense_requests.campaign_id
                   ←── fins_fund_restrictions.campaign_id
invoices           ←── qurban_shahibul.(invoice_id, invoice_created_at)
accounting_periods ←── fins_trans.period_id (ALTER di file 10)
                   ←── fins_jurnal.period_id (ALTER di file 10)
                   ←── bank_statements.period_id
                   ←── payables.period_id
                   ←── payroll_periods.period_id
                   ←── fins_net_asset_changes.period_id
beneficiaries      ←── disbursement_recipients.beneficiary_id
                   ←── zakat_distributions.beneficiary_id
disbursement_requests ←── disbursement_items.disbursement_request_id
                      ←── disbursement_proofs.disbursement_request_id
                      ←── disbursement_recipients.disbursement_request_id
                      ←── qurban_distributions.disbursement_request_id
                      ←── zakat_distributions.disbursement_request_id
vendors            ←── purchase_orders.vendor_id
                   ←── expense_requests.vendor_id
                   ←── payables.vendor_id
purchase_orders    ←── po_items.purchase_order_id
                   ←── payables.purchase_order_id
expense_requests   ←── expense_items.expense_request_id
                   ←── cash_advances.expense_request_id
cash_advances      ←── expense_requests.cash_advance_id
grants             ←── grant_disbursements.grant_id
                   ←── grant_reports.grant_id
                   ←── receivables.grant_id
                   ←── fins_fund_restrictions.grant_id
payroll_periods    ←── payroll_items.payroll_period_id
employees          ←── payroll_items.employee_id
                   ←── tax_withholding.employee_id
fins_aset          ←── asset_depreciation_schedules.fins_aset_id
```

## Ringkasan Semua Tabel

### FINS Core (file 01)
| Tabel | Baris Seed |
|---|---|
| fins_bank | 14 |
| fins_bank_rek | 12 |
| fins_coa | 81 (+ 22 dari file 06) |
| fins_saldo_dana | 5 (+ 3 dari file 06) |
| fins_aset | 5 |
| fins_budget | 11 |
| fins_trans | 24 (19 main + 5 fee) |
| fins_jurnal | 48 (2× fins_trans) |
| fins_opname | dynamic |
| fins_report | ~60+ rows |
| fins_upstash_events | dynamic |

### Integration (file 02)
| Tabel | Keterangan |
|---|---|
| fins_campaign_coa | 12 |
| fins_invoice_admin_fee | 5 |
| fins_campaign_budget_summary | 12 |

### NGO Penyaluran (file 07)
| Tabel |
|---|
| beneficiaries |
| disbursement_requests |
| disbursement_items |
| disbursement_proofs |
| disbursement_recipients |

### NGO Program Khusus (file 08)
| Tabel |
|---|
| qurban_animals |
| qurban_shahibul |
| qurban_distributions |
| zakat_distributions |
| zakat_amil_fee |

### NGO Pengeluaran (file 09)
| Tabel |
|---|
| vendors |
| purchase_orders |
| po_items |
| expense_requests |
| expense_items |
| cash_advances |

### NGO Periode & Rekonsiliasi (file 10–11)
| Tabel |
|---|
| accounting_periods |
| period_adjusting_entries |
| bank_statements |
| bank_reconciliation_items |
| bank_reconciliation_reports |

### NGO Hutang & Piutang (file 12)
| Tabel |
|---|
| payables |
| receivables |
| internal_transfers |
| petty_cash_books |
| petty_cash_transactions |

### NGO Grant & Sertifikat (file 13)
| Tabel |
|---|
| grants |
| grant_disbursements |
| grant_reports |
| donation_certificates |

### NGO Payroll (file 14)
| Tabel |
|---|
| employees |
| payroll_periods |
| payroll_items |
| tax_withholding |

### NGO Penyusutan (file 15)
| Tabel |
|---|
| asset_depreciation_schedules |
| FUNCTION generate_depreciation_schedule() |

### NGO PSAK 45 (file 16)
| Tabel / Object |
|---|
| fins_fund_restrictions |
| fins_net_asset_changes |
| fins_calk_notes |
| VIEW v_psak45_summary |
| fins_report rows tambahan (LA) |

## Total Keseluruhan
- **11 file SQL** baru (06–16) + 1 file MD ini
- **41 tabel** baru
- **1 PostgreSQL function** (generate_depreciation_schedule)
- **1 view** (v_psak45_summary)
- **5 file sebelumnya** (01–05): 11 tabel FINS core + 3 junction

**Grand total: 55 tabel, 1 function, 1 view**

## Checklist Eksekusi
- [ ] 01–05 sudah berjalan (FINS core)
- [ ] 06 COA tambahan (103 total COA)
- [ ] 07 Penyaluran
- [ ] 08 Qurban + Zakat
- [ ] 09 Pengeluaran operasional
- [ ] 10 Periode akuntansi + seed 15 periode
- [ ] 11 Rekonsiliasi bank
- [ ] 12 Hutang piutang + petty cash
- [ ] 13 Grants + sertifikat
- [ ] 14 Payroll
- [ ] 15 Penyusutan aset (auto-generate jadwal)
- [ ] 16 PSAK 45 + view
- [ ] Verifikasi: `SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'` → expect 55+

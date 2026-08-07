import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import * as XLSX from 'xlsx';

export async function GET() {
  try {
    // 1. Fetch reference data from database
    const campaignsRes = await query(
      `SELECT c.id, c.title, cat.name as category_name, c.minimum_amount, c.is_qurban, c.is_zakat 
       FROM campaigns c 
       LEFT JOIN categories cat ON c.category_id = cat.id 
       WHERE c.status = 'ACTIVE' 
       ORDER BY c.id ASC`
    );

    const paymentMethodsRes = await query(
      `SELECT id, code, name, type, provider 
       FROM payment_methods 
       WHERE is_active = true 
       ORDER BY sort_order ASC, id ASC`
    );

    const variantsRes = await query(
      `SELECT cv.id, cv.campaign_id, c.title as campaign_title, cv.name as variant_name, cv.price 
       FROM campaign_variants cv 
       JOIN campaigns c ON cv.campaign_id = c.id 
       WHERE cv.is_active = true 
       ORDER BY cv.campaign_id ASC, cv.id ASC`
    );

    const affiliatesRes = await query(
      `SELECT id, affiliate_code, name, email 
       FROM affiliates 
       WHERE status = 'ACTIVE' 
       ORDER BY id ASC`
    );

    const campaigns = campaignsRes.rows;
    const paymentMethods = paymentMethodsRes.rows;
    const variants = variantsRes.rows;
    const affiliates = affiliatesRes.rows;

    const sampleCampaignId = campaigns[0]?.id || 1;
    const samplePaymentMethodId = paymentMethods[0]?.id || 1;
    const nowStr = new Date().toISOString().slice(0, 16).replace('T', ' ');

    // 2. Sheet 1: Import_Transaksi (Template + Sample Row 1)
    const importHeaders = [
      'Campaign ID',
      'Payment Method ID',
      'Donor Name',
      'Donor Email',
      'Donor Phone',
      'Amount',
      'Qty',
      'Variant ID',
      'Status',
      'Transaction Date',
      'Is Anonymous',
      'Doa',
      'Mudhohi Names',
      'Affiliate ID',
    ];

    const sampleRow = [
      sampleCampaignId,
      samplePaymentMethodId,
      'Ahmad Habib',
      'ahmad@example.com',
      '081234567890',
      100000,
      1,
      '',
      'PAID',
      nowStr,
      'FALSE',
      'Semoga berkah dan bermanfaat',
      '',
      '',
    ];

    const sheet1Data = [importHeaders, sampleRow];
    const ws1 = XLSX.utils.aoa_to_sheet(sheet1Data);

    // Set column widths for Sheet 1
    ws1['!cols'] = [
      { wch: 15 }, // Campaign ID
      { wch: 20 }, // Payment Method ID
      { wch: 22 }, // Donor Name
      { wch: 25 }, // Donor Email
      { wch: 18 }, // Donor Phone
      { wch: 15 }, // Amount
      { wch: 8 },  // Qty
      { wch: 12 }, // Variant ID
      { wch: 12 }, // Status
      { wch: 20 }, // Transaction Date
      { wch: 14 }, // Is Anonymous
      { wch: 35 }, // Doa
      { wch: 30 }, // Mudhohi Names
      { wch: 14 }, // Affiliate ID
    ];

    // 3. Sheet 2: Referensi_Kampanye
    const ws2Data = [
      ['Campaign ID', 'Judul Kampanye', 'Kategori', 'Minimum Amount', 'Qurban?', 'Zakat?'],
      ...campaigns.map(c => [
        c.id,
        c.title,
        c.category_name || '-',
        c.minimum_amount || 10000,
        c.is_qurban ? 'YA' : 'TIDAK',
        c.is_zakat ? 'YA' : 'TIDAK',
      ]),
    ];
    const ws2 = XLSX.utils.aoa_to_sheet(ws2Data);
    ws2['!cols'] = [{ wch: 14 }, { wch: 45 }, { wch: 18 }, { wch: 18 }, { wch: 10 }, { wch: 10 }];

    // 4. Sheet 3: Referensi_Metode_Pembayaran
    const ws3Data = [
      ['Payment Method ID', 'Kode', 'Nama Metode', 'Tipe', 'Provider'],
      ...paymentMethods.map(pm => [pm.id, pm.code, pm.name, pm.type, pm.provider]),
    ];
    const ws3 = XLSX.utils.aoa_to_sheet(ws3Data);
    ws3['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 30 }, { wch: 15 }, { wch: 15 }];

    // 5. Sheet 4: Referensi_Varian
    const ws4Data = [
      ['Variant ID', 'Campaign ID', 'Judul Kampanye', 'Nama Varian', 'Harga'],
      ...variants.map(v => [v.id, v.campaign_id, v.campaign_title, v.variant_name, v.price]),
    ];
    const ws4 = XLSX.utils.aoa_to_sheet(ws4Data);
    ws4['!cols'] = [{ wch: 12 }, { wch: 14 }, { wch: 40 }, { wch: 25 }, { wch: 15 }];

    // 6. Sheet 5: Referensi_Affiliate
    const ws5Data = [
      ['Affiliate ID', 'Kode Affiliate', 'Nama Affiliate', 'Email'],
      ...affiliates.map(a => [a.id, a.affiliate_code, a.name, a.email]),
    ];
    const ws5 = XLSX.utils.aoa_to_sheet(ws5Data);
    ws5['!cols'] = [{ wch: 14 }, { wch: 18 }, { wch: 25 }, { wch: 25 }];

    // 7. Create Workbook & append sheets
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, ws1, 'Import_Transaksi');
    XLSX.utils.book_append_sheet(workbook, ws2, 'Referensi_Kampanye');
    XLSX.utils.book_append_sheet(workbook, ws3, 'Referensi_Metode_Pembayaran');
    XLSX.utils.book_append_sheet(workbook, ws4, 'Referensi_Varian');
    XLSX.utils.book_append_sheet(workbook, ws5, 'Referensi_Affiliate');

    // 8. Generate Buffer
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });

    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="Template_Import_Transaksi.xlsx"',
      },
    });
  } catch (error: any) {
    console.error('API Export Template Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

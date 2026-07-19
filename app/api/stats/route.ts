import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    // 0. Find Anchor Date (Latest transaction date to ensure trends work in demo/seed data)
    const anchorRes = await query("SELECT MAX(created_at) as latest FROM invoices WHERE status = 'PAID'");
    const anchorDate = anchorRes.rows[0]?.latest ? new Date(anchorRes.rows[0].latest) : new Date();

    // 1. Fetch KPI Summary
    const summaryQuery = `
      SELECT 
        -- Authority source for total collected
        (SELECT COALESCE(SUM(total_amount), 0) FROM invoices WHERE status = 'PAID') as total_revenue,
        -- Primary count of donors
        (SELECT COUNT(*) FROM donors) as total_donors,
        (SELECT COUNT(*) FROM campaigns WHERE status = 'ACTIVE') as active_campaigns,
        (SELECT COUNT(*) FROM invoices WHERE status = 'PAID') as success_transactions,
        (SELECT COALESCE(SUM(target_amount), 0) FROM campaigns WHERE status = 'ACTIVE') as target_revenue,
        
        -- Revenue Trends (Anchored to latest month)
        (SELECT COALESCE(SUM(total_amount), 0) FROM invoices WHERE status = 'PAID' AND created_at >= DATE_TRUNC('month', $1::timestamptz)) as revenue_this_month,
        (SELECT COALESCE(SUM(total_amount), 0) FROM invoices WHERE status = 'PAID' AND created_at >= DATE_TRUNC('month', $1::timestamptz - INTERVAL '1 month') AND created_at < DATE_TRUNC('month', $1::timestamptz)) as revenue_last_month,
        
        -- Donor Trends (New donors in the period)
        (SELECT COUNT(*) FROM donors WHERE created_at >= DATE_TRUNC('month', $1::timestamptz)) as donors_this_month,
        (SELECT COUNT(*) FROM donors WHERE created_at >= DATE_TRUNC('month', $1::timestamptz - INTERVAL '1 month') AND created_at < DATE_TRUNC('month', $1::timestamptz)) as donors_last_month
    `;
    
    const summaryRes = await query(summaryQuery, [anchorDate.toISOString()]);
    const s = summaryRes.rows[0];

    // Calculate trends
    const calculateTrend = (current: number, last: number) => {
      if (last === 0) return current > 0 ? 100 : 0;
      return parseFloat(((current - last) / last * 100).toFixed(1));
    };

    const revenueTrendPercent = calculateTrend(Number(s.revenue_this_month), Number(s.revenue_last_month));
    const donorsTrendPercent = calculateTrend(Number(s.donors_this_month), Number(s.donors_last_month));

    // 2. Fetch Weekly Revenue Trend (Last 7 days from anchor)
    const sevenDaysAgo = new Date(anchorDate);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const trendQuery = `
      SELECT 
        TO_CHAR(created_at, 'Dy') as day,
        SUM(total_amount) as value
      FROM invoices
      WHERE status = 'PAID' AND created_at >= $1
      GROUP BY day, DATE_TRUNC('day', created_at)
      ORDER BY DATE_TRUNC('day', created_at) ASC
    `;
    
    const trendRes = await query(trendQuery, [sevenDaysAgo.toISOString()]);
    
    // 3. NGO Name
    const configRes = await query('SELECT ngo_name FROM ngo_configs LIMIT 1');
    
    return NextResponse.json({
      summary: {
        totalRevenue: Number(s.total_revenue),
        totalDonors: Number(s.total_donors),
        activeCampaigns: Number(s.active_campaigns),
        successTransactions: Number(s.success_transactions),
        targetRevenue: Number(s.target_revenue) || 1500000000, // Fallback to 1.5B if zero
        revenueTrendPercent,
        donorsTrendPercent,
      },
      revenueTrend: trendRes.rows.map(row => ({
        day: row.day,
        value: Number(row.value)
      })),
      ngoName: configRes.rows[0]?.ngo_name || 'Lentera Donasi'
    });
  } catch (error: any) {
    console.error('API Stats Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

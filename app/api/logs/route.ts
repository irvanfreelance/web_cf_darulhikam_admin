import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'payment'; // payment, notification, ads
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search') || '';

    let sql = '';
    const params: any[] = [limit, offset];

    if (type === 'payment') {
      if (search) {
        sql = `SELECT *, COUNT(*) OVER() as total_count FROM payment_logs 
               WHERE invoice_code ILIKE $3 OR endpoint ILIKE $3 
               ORDER BY created_at DESC LIMIT $1 OFFSET $2`;
        params.push(`%${search}%`);
      } else {
        sql = `SELECT *, COUNT(*) OVER() as total_count FROM payment_logs ORDER BY created_at DESC LIMIT $1 OFFSET $2`;
      }
    } else if (type === 'notification') {
      if (search) {
        sql = `SELECT *, COUNT(*) OVER() as total_count FROM notification_logs 
               WHERE recipient ILIKE $3 OR event_name ILIKE $3 
               ORDER BY created_at DESC LIMIT $1 OFFSET $2`;
        params.push(`%${search}%`);
      } else {
        sql = `SELECT *, COUNT(*) OVER() as total_count FROM notification_logs ORDER BY created_at DESC LIMIT $1 OFFSET $2`;
      }
    } else if (type === 'ads') {
      if (search) {
        sql = `SELECT *, COUNT(*) OVER() as total_count FROM ads_conversion_logs 
               WHERE platform ILIKE $3 OR device ILIKE $3 OR utm_source ILIKE $3
               ORDER BY created_at DESC LIMIT $1 OFFSET $2`;
        params.push(`%${search}%`);
      } else {
        sql = `SELECT *, COUNT(*) OVER() as total_count FROM ads_conversion_logs ORDER BY created_at DESC LIMIT $1 OFFSET $2`;
      }
    } else {
      return NextResponse.json({ error: 'Invalid log type' }, { status: 400 });
    }

    const res = await query(sql, params);
    return NextResponse.json(res.rows);
  } catch (error: any) {
    console.error('API Logs Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

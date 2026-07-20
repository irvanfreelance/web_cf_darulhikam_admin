import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const data = await query(`SELECT * FROM web_legality ORDER BY id DESC LIMIT 50`);
    return NextResponse.json(data.rows);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

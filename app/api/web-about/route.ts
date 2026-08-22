import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { invalidateCache } from '@/lib/redis';
import { z } from 'zod';

const schema = z.object({
  hero_title: z.string().min(2),
  hero_subtitle: z.string().optional().nullable(),
  sejarah_heading: z.string().optional().nullable(),
  sejarah_paragraph_1: z.string().optional().nullable(),
  sejarah_paragraph_2: z.string().optional().nullable(),
  visi_text: z.string().optional().nullable(),
});

export async function GET() {
  try {
    const res = await query('SELECT * FROM web_about_content LIMIT 1');
    return NextResponse.json(res.rows[0] || {});
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const data = schema.parse(body);

    const check = await query('SELECT id FROM web_about_content LIMIT 1');

    let res;
    if (check.rows.length > 0) {
      res = await query(
        `UPDATE web_about_content SET
           hero_title = $1, hero_subtitle = $2, sejarah_heading = $3,
           sejarah_paragraph_1 = $4, sejarah_paragraph_2 = $5, visi_text = $6,
           updated_at = NOW()
         WHERE id = $7 RETURNING *`,
        [data.hero_title, data.hero_subtitle, data.sejarah_heading, data.sejarah_paragraph_1, data.sejarah_paragraph_2, data.visi_text, check.rows[0].id]
      );
    } else {
      res = await query(
        `INSERT INTO web_about_content (hero_title, hero_subtitle, sejarah_heading, sejarah_paragraph_1, sejarah_paragraph_2, visi_text)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [data.hero_title, data.hero_subtitle, data.sejarah_heading, data.sejarah_paragraph_1, data.sejarah_paragraph_2, data.visi_text]
      );
    }

    await invalidateCache(['web:about_content']);
    return NextResponse.json(res.rows[0]);
  } catch (error: any) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues }, { status: 400 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

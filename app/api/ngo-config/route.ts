import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { invalidateCache } from '@/lib/redis';
import { z } from 'zod';

const configSchema = z.object({
  ngo_name: z.string().min(3),
  logo_url: z.string().optional().nullable(),
  favicon_url: z.string().optional().nullable(),
  short_description: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  legal_info: z.string().optional().nullable(),
  primary_color: z.string().regex(/^#[0-9A-F]{6}$/i).default('#1086b1'),
  whatsapp_number: z.string().optional().nullable(),
  instagram_url: z.string().optional().nullable(),
  facebook_url: z.string().optional().nullable(),
  meta_pixel_id: z.string().optional().nullable(),
  meta_capi_token: z.string().optional().nullable(),
  google_ads_id: z.string().optional().nullable(),
  google_developer_token: z.string().optional().nullable(),
  google_analytic_id: z.string().optional().nullable(),
  tiktok_pixel_id: z.string().optional().nullable(),
  tiktok_events_api_token: z.string().optional().nullable(),
});

export async function GET() {
  try {
    const res = await query('SELECT * FROM ngo_configs LIMIT 1');
    return NextResponse.json(res.rows[0] || {});
  } catch (error: any) {
    console.error('API NGO Config Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const validated = configSchema.parse(body);
    
    // Check if config exists
    const check = await query('SELECT id FROM ngo_configs LIMIT 1');
    
    let res;
    if (check.rows.length > 0) {
      const sql = `
        UPDATE ngo_configs 
        SET 
          ngo_name = $1, 
          logo_url = $2, 
          favicon_url = $3,
          short_description = $4, 
          address = $5, 
          legal_info = $6,
          primary_color = $7, 
          whatsapp_number = $8,
          instagram_url = $9,
          facebook_url = $10,
          meta_pixel_id = $11,
          meta_capi_token = $12,
          google_ads_id = $13,
          google_developer_token = $14,
          google_analytic_id = $15,
          tiktok_pixel_id = $16,
          tiktok_events_api_token = $17,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $18
        RETURNING *
      `;
      res = await query(sql, [
        validated.ngo_name, 
        validated.logo_url, 
        validated.favicon_url,
        validated.short_description, 
        validated.address, 
        validated.legal_info,
        validated.primary_color,
        validated.whatsapp_number,
        validated.instagram_url,
        validated.facebook_url,
        validated.meta_pixel_id,
        validated.meta_capi_token,
        validated.google_ads_id,
        validated.google_developer_token,
        validated.google_analytic_id,
        validated.tiktok_pixel_id,
        validated.tiktok_events_api_token,
        check.rows[0].id
      ]);
    } else {
      const sql = `
        INSERT INTO ngo_configs (
          ngo_name, logo_url, favicon_url, short_description, address, legal_info, 
          primary_color, whatsapp_number, instagram_url, facebook_url, 
          meta_pixel_id, meta_capi_token, google_ads_id, google_developer_token, google_analytic_id, 
          tiktok_pixel_id, tiktok_events_api_token
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING *
      `;
      res = await query(sql, [
        validated.ngo_name, 
        validated.logo_url, 
        validated.favicon_url,
        validated.short_description, 
        validated.address, 
        validated.legal_info,
        validated.primary_color,
        validated.whatsapp_number,
        validated.instagram_url,
        validated.facebook_url,
        validated.meta_pixel_id,
        validated.meta_capi_token,
        validated.google_ads_id,
        validated.google_developer_token,
        validated.google_analytic_id,
        validated.tiktok_pixel_id,
        validated.tiktok_events_api_token
      ]);
    }
    
    try {
      await invalidateCache(['ngo_config', 'ngo_settings']);
    } catch (redisError) {
      console.warn('Redis flush failed, but database was updated:', redisError);
    }
    
    return NextResponse.json(res.rows[0]);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ errors: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

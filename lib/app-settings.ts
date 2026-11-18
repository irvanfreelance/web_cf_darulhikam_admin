import { query } from '@/lib/db';

export async function getAllAppSettings(): Promise<Record<string, string>> {
  try {
    const res = await query(`SELECT key, value FROM app_settings ORDER BY key ASC`);
    const map: Record<string, string> = {};
    for (const r of res.rows) map[r.key] = r.value;
    return map;
  } catch {
    return {};
  }
}

export async function getAppSetting(key: string, fallback: string): Promise<string> {
  try {
    const res = await query(`SELECT value FROM app_settings WHERE key = $1 LIMIT 1`, [key]);
    return res.rows[0]?.value ?? fallback;
  } catch {
    return fallback;
  }
}


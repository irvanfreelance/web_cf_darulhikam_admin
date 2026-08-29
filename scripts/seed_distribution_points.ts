import { Pool } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config();
dotenv.config({ path: '.env.local' });

// Initial data migrated from the hardcoded LOCATIONS array that used to live
// in components/admin/distribution-map.tsx before it moved to the DB.
const POINTS: { name: string; type: 'province' | 'country'; lat: number; lng: number; order: number }[] = [
  { name: 'Jawa Barat', type: 'province', lat: -6.88917, lng: 107.61056, order: 1 },
  { name: 'DKI Jakarta', type: 'province', lat: -6.21462, lng: 106.84513, order: 2 },
  { name: 'Banten', type: 'province', lat: -6.40581, lng: 106.06401, order: 3 },
  { name: 'Jawa Tengah', type: 'province', lat: -7.15097, lng: 110.14025, order: 4 },
  { name: 'Jawa Timur', type: 'province', lat: -7.53606, lng: 112.23840, order: 5 },
  { name: 'Kalimantan', type: 'province', lat: -1.48518, lng: 113.28292, order: 6 },
  { name: 'Sumatera', type: 'province', lat: -0.58972, lng: 101.34310, order: 7 },
  { name: 'Bengkulu', type: 'province', lat: -3.79284, lng: 102.26076, order: 8 },
  { name: 'Kepulauan Riau', type: 'province', lat: 3.94565, lng: 108.14286, order: 9 },
  { name: 'Sulawesi Barat', type: 'province', lat: -2.84413, lng: 119.23207, order: 10 },
  { name: 'Sulawesi Selatan', type: 'province', lat: -4.14491, lng: 120.16055, order: 11 },
  { name: 'Bali', type: 'province', lat: -8.40951, lng: 115.18891, order: 12 },
  { name: 'Nusa Tenggara Timur', type: 'province', lat: -8.65738, lng: 121.07937, order: 13 },
  { name: 'Maluku', type: 'province', lat: -3.23846, lng: 130.14527, order: 14 },
  { name: 'Palestina', type: 'country', lat: 31.95216, lng: 35.23315, order: 15 },
  { name: 'Myanmar', type: 'country', lat: 21.91622, lng: 95.95597, order: 16 },
  { name: 'Jepang', type: 'country', lat: 36.20482, lng: 138.25292, order: 17 },
  { name: 'Uganda', type: 'country', lat: 1.37333, lng: 32.29027, order: 18 },
  { name: 'Yordania', type: 'country', lat: 31.24000, lng: 36.51100, order: 19 },
  { name: 'Mesir', type: 'country', lat: 26.82055, lng: 30.80249, order: 20 },
];

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const existing = await pool.query('SELECT name FROM web_distribution_points');
    const existingNames = new Set(existing.rows.map((r: any) => r.name));

    for (const p of POINTS) {
      if (existingNames.has(p.name)) {
        console.log(`↷ ${p.name} already exists, skipped.`);
        continue;
      }
      await pool.query(
        `INSERT INTO web_distribution_points (name, type, latitude, longitude, display_order) VALUES ($1, $2, $3, $4, $5)`,
        [p.name, p.type, p.lat, p.lng, p.order]
      );
      console.log(`✅ Seeded ${p.name}`);
    }
    console.log('🎉 Done.');
  } catch (err) {
    console.error('❌ Failed:', err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
main();

import { Pool } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config();
dotenv.config({ path: '.env.local' });

// Kota/Kabupaten level distribution points, per the "Sebaran" region list image.
const POINTS: { name: string; type: 'city'; lat: number; lng: number; order: number; description: string }[] = [
  { name: 'Kota Bandung', type: 'city', lat: -6.9175, lng: 107.6191, order: 101, description: 'Jawa Barat' },
  { name: 'Kabupaten Bandung', type: 'city', lat: -7.0272, lng: 107.5239, order: 102, description: 'Jawa Barat' },
  { name: 'Kabupaten Bandung Barat', type: 'city', lat: -6.8342, lng: 107.4877, order: 103, description: 'Jawa Barat' },
  { name: 'Kabupaten Sumedang', type: 'city', lat: -6.8383, lng: 107.9161, order: 104, description: 'Jawa Barat' },
  { name: 'Kabupaten Garut', type: 'city', lat: -7.2148, lng: 107.9082, order: 105, description: 'Jawa Barat' },
  { name: 'Kabupaten Tasikmalaya', type: 'city', lat: -7.3506, lng: 108.2171, order: 106, description: 'Jawa Barat' },
  { name: 'Kabupaten Cianjur', type: 'city', lat: -6.8168, lng: 107.1424, order: 107, description: 'Jawa Barat' },
  { name: 'Kabupaten Sukabumi', type: 'city', lat: -6.9847, lng: 106.5459, order: 108, description: 'Jawa Barat' },

  { name: 'Kota Jakarta', type: 'city', lat: -6.2088, lng: 106.8456, order: 109, description: 'DKI Jakarta' },

  { name: 'Kabupaten Aceh Tamiang', type: 'city', lat: 4.2865, lng: 97.9902, order: 110, description: 'Sumatera' },
  { name: 'Sumatera Utara', type: 'city', lat: 3.5952, lng: 98.6722, order: 111, description: 'Sumatera' },
  { name: 'Sumatera Barat', type: 'city', lat: -0.9471, lng: 100.4172, order: 112, description: 'Sumatera' },

  { name: 'Kabupaten Bengkulu Utara', type: 'city', lat: -3.2667, lng: 102.2833, order: 113, description: 'Bengkulu' },
  { name: 'Pulau Enggano', type: 'city', lat: -5.3667, lng: 102.1500, order: 114, description: 'Bengkulu' },

  { name: 'Kabupaten Natuna', type: 'city', lat: 3.5875, lng: 108.2382, order: 115, description: 'Kepulauan Riau' },

  { name: 'Kabupaten Mamuju', type: 'city', lat: -2.6785, lng: 118.8887, order: 116, description: 'Sulawesi Barat' },

  { name: 'Kota Makassar', type: 'city', lat: -5.1477, lng: 119.4327, order: 117, description: 'Sulawesi Selatan' },

  { name: 'Kabupaten Alor', type: 'city', lat: -8.2274, lng: 124.7550, order: 118, description: 'Nusa Tenggara Timur' },

  { name: 'Kota Ambon', type: 'city', lat: -3.6954, lng: 128.1814, order: 119, description: 'Maluku' },
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
        `INSERT INTO web_distribution_points (name, type, latitude, longitude, display_order, description) VALUES ($1, $2, $3, $4, $5, $6)`,
        [p.name, p.type, p.lat, p.lng, p.order, p.description]
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

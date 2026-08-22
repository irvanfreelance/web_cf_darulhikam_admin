import { Pool } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config();
dotenv.config({ path: '.env.local' });

async function migrate() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    console.log('⏳ Creating web_about_content, web_history_timeline, web_mission_points...');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS web_about_content (
        id bigserial PRIMARY KEY,
        hero_title varchar(255),
        hero_subtitle text,
        sejarah_heading varchar(255),
        sejarah_paragraph_1 text,
        sejarah_paragraph_2 text,
        visi_text text,
        updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS web_history_timeline (
        id bigserial PRIMARY KEY,
        year varchar(10) NOT NULL,
        description text NOT NULL,
        display_order int DEFAULT 0,
        is_active boolean DEFAULT true,
        created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS web_mission_points (
        id bigserial PRIMARY KEY,
        content text NOT NULL,
        display_order int DEFAULT 0,
        is_active boolean DEFAULT true,
        created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('✅ Tables ready.');

    // Seed with the copy currently hardcoded on the public site, only if empty.
    const aboutCheck = await pool.query('SELECT id FROM web_about_content LIMIT 1');
    if (aboutCheck.rows.length === 0) {
      await pool.query(
        `INSERT INTO web_about_content (hero_title, hero_subtitle, sejarah_heading, sejarah_paragraph_1, sejarah_paragraph_2, visi_text)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          'Lembaga Zakat Terpercaya Sejak 2012',
          'Menyalurkan kebaikan Anda dengan amanah, transparan, dan terukur.',
          'Dari Pesantren, Untuk Umat',
          'LAZ Darul Hikam lahir pada 2012 dari kepedulian alumni Pesantren Darul Hikam Bandung terhadap kondisi sosial-ekonomi umat. Berawal dari program beasiswa kecil, kini kami menjangkau 28 provinsi dengan lima pilar program utama.',
          'Setiap rupiah yang diamanahkan kepada kami dikelola dengan standar akuntansi PSAK Syariah, diaudit KAP independen, dan dilaporkan secara berkala kepada publik.',
          'Menjadi lembaga amil zakat nasional terdepan dalam mewujudkan kemandirian umat melalui pengelolaan ZISWAF yang profesional dan berdampak nyata.',
        ]
      );
      console.log('✅ Seeded web_about_content.');
    } else {
      console.log('↷ web_about_content already has data, skipped seeding.');
    }

    const timelineCheck = await pool.query('SELECT id FROM web_history_timeline LIMIT 1');
    if (timelineCheck.rows.length === 0) {
      const timeline = [
        ['2012', 'Pendirian LAZ oleh alumni Pesantren Darul Hikam'],
        ['2014', 'Program Beasiswa Generasi Rabbani pertama kali diluncurkan'],
        ['2017', 'Ekspansi program ke 15 provinsi seluruh Indonesia'],
        ['2020', 'Mendapat izin resmi Kemenag RI - SK No. 792/2020'],
        ['2022', '100.000 penerima manfaat kumulatif tercapai'],
        ['2025', 'Beroperasi di 28 provinsi dengan 1.200+ relawan aktif'],
      ];
      for (let i = 0; i < timeline.length; i++) {
        await pool.query(
          `INSERT INTO web_history_timeline (year, description, display_order) VALUES ($1, $2, $3)`,
          [timeline[i][0], timeline[i][1], i + 1]
        );
      }
      console.log('✅ Seeded web_history_timeline.');
    } else {
      console.log('↷ web_history_timeline already has data, skipped seeding.');
    }

    const missionCheck = await pool.query('SELECT id FROM web_mission_points LIMIT 1');
    if (missionCheck.rows.length === 0) {
      const mission = [
        'Menghimpun ZISWAF secara transparan dan akuntabel',
        'Menyalurkan dana tepat sasaran kepada 8 asnaf',
        'Memberdayakan mustahiq menuju kemandirian',
        'Memperkuat ekosistem filantropi Islam Indonesia',
      ];
      for (let i = 0; i < mission.length; i++) {
        await pool.query(
          `INSERT INTO web_mission_points (content, display_order) VALUES ($1, $2)`,
          [mission[i], i + 1]
        );
      }
      console.log('✅ Seeded web_mission_points.');
    } else {
      console.log('↷ web_mission_points already has data, skipped seeding.');
    }

    const legalityCheck = await pool.query('SELECT id FROM web_legality LIMIT 1');
    if (legalityCheck.rows.length === 0) {
      const docs = [
        ['SK Kemenag RI', 'No. 792 Tahun 2020', 'Kementerian Agama RI'],
        ['NPWP Lembaga', '31.284.XXX.X-441.000', null],
        ['Akta Notaris', 'AHU-0012XXX.AH.01.04.2012', null],
        ['Reg. BAZNAS', 'LAZ-BAZNAS-2020-044', 'BAZNAS'],
      ];
      for (let i = 0; i < docs.length; i++) {
        await pool.query(
          `INSERT INTO web_legality (title, document_number, issued_by, is_active, display_order) VALUES ($1, $2, $3, true, $4)`,
          [docs[i][0], docs[i][1], docs[i][2], i + 1]
        );
      }
      console.log('✅ Seeded web_legality (was empty — placeholder numbers, verify/update via /web-legality).');
    } else {
      console.log('↷ web_legality already has data, skipped seeding.');
    }

    console.log('🎉 Done.');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
migrate();

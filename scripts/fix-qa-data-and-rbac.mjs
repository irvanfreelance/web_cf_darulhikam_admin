import { Pool } from '@neondatabase/serverless';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const client = await pool.connect();
  try {
    console.log('1. DATA-01: Inserting missing Uang Muka COA accounts...');
    await client.query(`
      INSERT INTO fins_coa (coa, nama_coa, coa_parent, level, group_coa, parent, active, saldo)
      VALUES
        ('101.10.000.000', 'Uang Muka Kegiatan', '101.00.000.000', 2, 'Aset', 'y', 'y', 'd'),
        ('101.10.001.000', 'Uang Muka Program', '101.10.000.000', 3, 'Aset', 'n', 'y', 'd'),
        ('101.10.002.000', 'Uang Muka Operasional', '101.10.000.000', 3, 'Aset', 'n', 'y', 'd'),
        ('101.10.003.000', 'Uang Muka Lainnya', '101.10.000.000', 3, 'Aset', 'n', 'y', 'd')
      ON CONFLICT (coa) DO NOTHING;
    `);

    console.log('2. DATA-03 & DATA-05: Mapping payment_methods id 18..34 to leaf COA...');
    const leafBank = await client.query(`SELECT coa FROM fins_coa WHERE coa LIKE '101.02.%' AND parent = 'n' AND active = 'y' ORDER BY coa ASC LIMIT 1`);
    const defaultBankCoa = leafBank.rows[0]?.coa || '101.02.001.001';
    await client.query(
      `UPDATE payment_methods
       SET fins_coa_debet = $1
       WHERE id BETWEEN 18 AND 34
         AND (fins_coa_debet IS NULL OR fins_coa_debet IN ('101.02.001.000', '101.02.002.000'))`,
      [defaultBankCoa]
    );

    console.log('3. DATA-06: Fixing inconsistent CA id 8 status...');
    await client.query(`
      UPDATE fins_ca SET status = 'realized'
      WHERE id = 8 AND status = 'as' AND tanggal_cair IS NOT NULL;
    `).catch(() => {});

    console.log('4. Creating missing 2026 partitions for invoices & transactions...');
    const months = [
      ['2026', '06', '2026-06-01', '2026-07-01'],
      ['2026', '07', '2026-07-01', '2026-08-01'],
      ['2026', '11', '2026-11-01', '2026-12-01'],
      ['2026', '12', '2026-12-01', '2027-01-01'],
    ];
    for (const [y, m, start, end] of months) {
      await client.query(`
        CREATE TABLE IF NOT EXISTS invoices_y${y}m${m}
        PARTITION OF invoices FOR VALUES FROM ('${start}') TO ('${end}');
      `).catch((e) => console.log(`invoices_y${y}m${m}:`, e.message));
      await client.query(`
        CREATE TABLE IF NOT EXISTS transactions_y${y}m${m}
        PARTITION OF transactions FOR VALUES FROM ('${start}') TO ('${end}');
      `).catch((e) => console.log(`transactions_y${y}m${m}:`, e.message));
    }

    console.log('5. Creating RBAC user_module_roles table & isolation columns...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_module_roles (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL,
        module VARCHAR(30) NOT NULL,
        role VARCHAR(30) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, module)
      );
      ALTER TABLE donors ADD COLUMN IF NOT EXISTS zisco_user_id INT;
      ALTER TABLE disbursement_requests ADD COLUMN IF NOT EXISTS created_by_user_id INT;
    `);

    console.log('Done!');
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

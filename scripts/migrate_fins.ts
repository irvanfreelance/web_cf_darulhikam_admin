import { Pool } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();
dotenv.config({ path: '.env.local' });

const SQL_DIR = path.join(process.cwd(), 'markdown_darul_hikam');

const FILES = [
  '01_fins_schema_postgres.sql',
  '02_fins_crowdfunding_integration.sql',
  '04_fins_seed_aligned.sql',
  '05_fins_deferred_fk.sql',
  '06_ngo_coa_additions.sql',
  '07_ngo_disbursement.sql',
  '08_ngo_program_khusus.sql',
  '09_ngo_expense.sql',
  '10_ngo_accounting_period.sql',
  '11_ngo_bank_recon.sql',
  '12_ngo_hutang_piutang.sql',
  '13_ngo_grants.sql',
  '14_ngo_payroll.sql',
  '15_ngo_asset_depreciation.sql',
  '16_ngo_psak45.sql',
  '18_fins_ca_pengajuan.sql',
];

// Errors that just mean "this migration already ran" — safe to skip and continue.
const IGNORABLE_CODES = new Set([
  '42P07', // duplicate_table
  '42710', // duplicate_object (constraint/type)
  '42701', // duplicate_column
  '23505', // unique_violation (re-running seed inserts)
]);

// Splits a SQL file into individual statements on top-level ';', respecting
// single-quoted strings, dollar-quoted bodies ($$...$$ / $tag$...$tag$), and
// line comments so PL/pgSQL functions (e.g. 15_ngo_asset_depreciation.sql)
// aren't chopped mid-body.
function splitStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = '';
  let i = 0;
  let inSingleQuote = false;
  let dollarTag: string | null = null;

  while (i < sql.length) {
    const ch = sql[i];

    if (dollarTag) {
      if (sql.startsWith(dollarTag, i)) {
        current += dollarTag;
        i += dollarTag.length;
        dollarTag = null;
        continue;
      }
      current += ch;
      i++;
      continue;
    }

    if (inSingleQuote) {
      current += ch;
      if (ch === "'" && sql[i + 1] === "'") {
        current += sql[i + 1];
        i += 2;
        continue;
      }
      if (ch === "'") inSingleQuote = false;
      i++;
      continue;
    }

    if (ch === '-' && sql[i + 1] === '-') {
      const nl = sql.indexOf('\n', i);
      const end = nl === -1 ? sql.length : nl + 1;
      current += sql.slice(i, end);
      i = end;
      continue;
    }

    if (ch === "'") {
      inSingleQuote = true;
      current += ch;
      i++;
      continue;
    }

    const dollarMatch = /^\$[A-Za-z0-9_]*\$/.exec(sql.slice(i));
    if (dollarMatch) {
      dollarTag = dollarMatch[0];
      current += dollarTag;
      i += dollarTag.length;
      continue;
    }

    if (ch === ';') {
      statements.push(current);
      current = '';
      i++;
      continue;
    }

    current += ch;
    i++;
  }
  if (current.trim()) statements.push(current);
  return statements.map((s) => s.trim()).filter((s) => s.length > 0);
}

async function runFile(pool: Pool, file: string) {
  const filePath = path.join(SQL_DIR, file);
  if (!fs.existsSync(filePath)) {
    console.log(`  ↷ ${file} not found, skipping`);
    return;
  }
  const sql = fs.readFileSync(filePath, 'utf8');
  console.log(`⏳ Running ${file}...`);
  const statements = splitStatements(sql);
  let okCount = 0;
  let skipCount = 0;
  for (const stmt of statements) {
    try {
      await pool.query(stmt);
      okCount++;
    } catch (err: any) {
      if (err?.code && IGNORABLE_CODES.has(err.code)) {
        skipCount++;
        continue;
      }
      // Data-dependent seed rows (e.g. referencing campaign IDs that don't
      // exist in this environment) shouldn't abort the whole migration —
      // log and move on so the rest of the schema still gets created.
      if (err?.code === '23503' || err?.code === '22001') {
        console.log(`  ⚠ skipped 1 statement in ${file} (${err.message})`);
        skipCount++;
        continue;
      }
      console.error(`❌ ${file} failed on statement:\n${stmt.slice(0, 200)}...\n`, err?.message || err);
      throw err;
    }
  }
  console.log(`✅ ${file} done (${okCount} ok, ${skipCount} skipped)`);
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    for (const file of FILES) {
      await runFile(pool, file);
    }
    console.log('🎉 FINS migration complete.');
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

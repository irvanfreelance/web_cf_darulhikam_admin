const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { list } = require('@vercel/blob');
const dotenv = require('dotenv');

// Load environment variables from .env.local
const envConfig = dotenv.parse(fs.readFileSync(path.resolve(process.cwd(), '.env.local')));
for (const k in envConfig) {
  process.env[k] = envConfig[k];
}

const token = process.env.BLOB_READ_WRITE_TOKEN;
if (!token) {
  console.error('Error: BLOB_READ_WRITE_TOKEN tidak ditemukan di .env.local');
  process.exit(1);
}

const DOWNLOAD_DIR = path.resolve(process.cwd(), 'blob_downloads');
const ZIP_OUTPUT = path.resolve(process.cwd(), 'blob_storage_backup.zip');

async function downloadFile(url, destPath) {
  const dir = path.dirname(destPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download ${url}: ${res.statusText}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  fs.writeFileSync(destPath, Buffer.from(arrayBuffer));
}

async function main() {
  console.log('--- Memulai listing semua file dari Vercel Blob Storage ---');
  let cursor;
  let allBlobs = [];

  do {
    const response = await list({
      token,
      cursor,
      limit: 1000,
    });
    allBlobs = allBlobs.concat(response.blobs);
    cursor = response.cursor;
    console.log(`Ditemukan ${allBlobs.length} file sejauh ini...`);
  } while (cursor);

  console.log(`Total file ditemukan di bucket: ${allBlobs.length}`);

  if (allBlobs.length === 0) {
    console.log('Bucket kosong, tidak ada file yang didownload.');
    return;
  }

  // Buat folder sementara untuk download
  if (!fs.existsSync(DOWNLOAD_DIR)) {
    fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
  }

  console.log(`\n--- Mengunduh ${allBlobs.length} file ke ${DOWNLOAD_DIR} ---`);

  // Download dengan konparalel (concurrency pool)
  const CONCURRENCY = 8;
  let completed = 0;
  let errors = [];

  async function worker(items) {
    for (const blob of items) {
      try {
        // blob.pathname bisa berupa nama file atau folder/file.ext
        // Bersihkan path agar aman di filesystem lokal
        const safePathname = blob.pathname.replace(/^\/+/, '');
        const targetPath = path.resolve(DOWNLOAD_DIR, safePathname);

        await downloadFile(blob.downloadUrl || blob.url, targetPath);
        completed++;
        process.stdout.write(`\rProgress: [${completed}/${allBlobs.length}] ${Math.round((completed / allBlobs.length) * 100)}% - Selesai: ${path.basename(blob.pathname)}                    `);
      } catch (err) {
        errors.push({ pathname: blob.pathname, error: err.message });
      }
    }
  }

  // Bagi tasks ke beberapa worker
  const chunks = Array.from({ length: CONCURRENCY }, () => []);
  allBlobs.forEach((blob, idx) => {
    chunks[idx % CONCURRENCY].push(blob);
  });

  await Promise.all(chunks.map(chunk => worker(chunk)));
  console.log('\n\nSelesai mengunduh semua file!');

  if (errors.length > 0) {
    console.warn(`Peringatan: Ada ${errors.length} file yang gagal didownload:`);
    errors.forEach(e => console.warn(` - ${e.pathname}: ${e.error}`));
  }

  console.log('\n--- Mengompres folder ke ZIP menggunakan command `zip` ---');
  if (fs.existsSync(ZIP_OUTPUT)) {
    fs.unlinkSync(ZIP_OUTPUT);
  }

  try {
    execSync(`cd "${DOWNLOAD_DIR}" && zip -r -q "${ZIP_OUTPUT}" .`, { stdio: 'inherit' });
    console.log(`\nBERHASIL!`);
    console.log(`File ZIP tersimpan di: ${ZIP_OUTPUT}`);
    const stats = fs.statSync(ZIP_OUTPUT);
    console.log(`Ukuran file ZIP: ${(stats.size / (1024 * 1024)).toFixed(2)} MB`);
  } catch (err) {
    console.error('Gagal membuat file ZIP:', err.message);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});


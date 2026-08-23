import { Pool } from '@neondatabase/serverless';
import { put } from '@vercel/blob';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
dotenv.config();
dotenv.config({ path: '.env.local' });

const ICONS_DIR = path.join(process.cwd(), 'node_modules/lucide-react/dist/esm/icons');

// Deprecated icon names (e.g. Home) are just `export { default } from './house.js'`
// re-exports with no __iconNode of their own — follow the chain to the real file.
function resolveKebabName(kebabName: string): string {
  let current = kebabName;
  for (let i = 0; i < 5; i++) {
    const src = fs.readFileSync(path.join(ICONS_DIR, `${current}.js`), 'utf-8');
    const match = src.match(/export\s*\{\s*default\s*\}\s*from\s*'\.\/([\w-]+)\.js'/);
    if (!match) return current;
    current = match[1];
  }
  return current;
}

// Curated default icon set for "Program Peduli" categories — rendered from
// lucide-react's icon-node data into standalone white-stroke SVGs (white so
// they read well on the brand-green background used both in the admin
// picker tiles and on the public site), then stored in the reusable
// web_icon_library so admins aren't starting from an empty picker.
const ICONS: [string, string][] = [
  ['GraduationCap', 'graduation-cap'],
  ['HandCoins', 'hand-coins'],
  ['Leaf', 'leaf'],
  ['HeartPulse', 'heart-pulse'],
  ['Users', 'users'],
  ['MoonStar', 'moon-star'],
  ['Heart', 'heart'],
  ['Home', 'home'],
  ['Droplet', 'droplet'],
  ['Utensils', 'utensils'],
  ['BookOpen', 'book-open'],
  ['Shield', 'shield'],
  ['Baby', 'baby'],
  ['Stethoscope', 'stethoscope'],
  ['Wheat', 'wheat'],
  ['Building2', 'building-2'],
  ['HandHelping', 'hand-helping'],
  ['Sun', 'sun'],
  ['TreePine', 'tree-pine'],
  ['Ambulance', 'ambulance'],
  ['School', 'school'],
  ['Landmark', 'landmark'],
  ['PawPrint', 'paw-print'],
];

function nodeToSvgTag([tag, attrs]: [string, Record<string, any>]): string {
  const attrStr = Object.entries(attrs)
    .filter(([k]) => k !== 'key')
    .map(([k, v]) => `${k}="${v}"`)
    .join(' ');
  return `<${tag} ${attrStr}/>`;
}

async function buildSvg(kebabName: string): Promise<string> {
  const resolved = resolveKebabName(kebabName);
  const mod = await import(`lucide-react/dist/esm/icons/${resolved}.js`);
  const iconNode = mod.__iconNode as [string, Record<string, any>][];
  const inner = iconNode.map(nodeToSvgTag).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const existing = await pool.query('SELECT label FROM web_icon_library');
    const existingLabels = new Set(existing.rows.map((r: any) => r.label));

    for (const [pascalName, kebabName] of ICONS) {
      if (existingLabels.has(pascalName)) {
        console.log(`↷ ${pascalName} already in library, skipped.`);
        continue;
      }
      const svg = await buildSvg(kebabName);
      const blob = await put(`icons/${kebabName}.svg`, svg, {
        access: 'public',
        contentType: 'image/svg+xml',
        addRandomSuffix: true,
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });
      await pool.query('INSERT INTO web_icon_library (url, label) VALUES ($1, $2)', [blob.url, pascalName]);
      console.log(`✅ Seeded ${pascalName} -> ${blob.url}`);
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

/**
 * Copies public/assets/i18n/en.json to each scheduled-locale file (except en).
 * Run after editing English strings: npm run i18n:sync
 * Replace synced files with professional translations over time.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const i18nDir = join(root, 'public', 'assets', 'i18n');
const enPath = join(i18nDir, 'en.json');

const codes = [
  'as',
  'bn',
  'brx',
  'doi',
  'gu',
  'hi',
  'kn',
  'ks',
  'kok',
  'mai',
  'ml',
  'mni',
  'mr',
  'ne',
  'or',
  'pa',
  'sa',
  'sat',
  'sd',
  'ta',
  'te',
  'ur'
];

if (!existsSync(enPath)) {
  console.error('Missing', enPath);
  process.exit(1);
}

mkdirSync(i18nDir, { recursive: true });
const enJson = readFileSync(enPath, 'utf8');

for (const code of codes) {
  const dest = join(i18nDir, `${code}.json`);
  copyFileSync(enPath, dest);
}

console.log(`Synced en.json → ${codes.length} locale files in ${i18nDir}`);

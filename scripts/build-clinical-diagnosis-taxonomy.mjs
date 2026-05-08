/**
 * Writes canonical apps/web/data/clinical-diagnosis-taxonomy.json (with flat `entries` for quick search)
 * and copies it to apps/doctor-web/public/data/.
 *
 * Data source: scripts/clinical-diagnosis-taxonomy-data.mjs (or edit JSON directly after first run).
 * Run: npm run build:clinical-diagnosis-taxonomy
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { clinicalDiagnosisCategories } from './clinical-diagnosis-taxonomy-data.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const canonicalPath = path.join(root, 'apps', 'web', 'data', 'clinical-diagnosis-taxonomy.json');
const doctorPath = path.join(root, 'apps', 'doctor-web', 'public', 'data', 'clinical-diagnosis-taxonomy.json');

function buildEntries(categories) {
  const entries = [];
  let n = 0;
  for (const c of categories) {
    for (const s of c.subSections) {
      for (const leafName of s.diseaseNames) {
        n += 1;
        entries.push({
          id: `dx-${n}`,
          categoryId: c.id,
          categoryLabel: c.label,
          subSectionId: s.id,
          subSectionLabel: s.label,
          leafName,
          label: `${c.label} — ${s.label} — ${leafName}`
        });
      }
    }
  }
  return entries;
}

const categories = clinicalDiagnosisCategories;
const entries = buildEntries(categories);

const payload = {
  schemaVersion: 1,
  title: 'Clinical diagnosis taxonomy',
  description:
    'Category → subtype (section) → condition labels for doctor prescribing. Synced to patient-site disease browse list.',
  sourceFile: 'apps/web/data/clinical-diagnosis-taxonomy.json',
  lastUpdated: new Date().toISOString().slice(0, 10),
  categoryCount: categories.length,
  entryCount: entries.length,
  categories,
  entries
};

const text = JSON.stringify(payload, null, 2);
fs.mkdirSync(path.dirname(canonicalPath), { recursive: true });
fs.writeFileSync(canonicalPath, text, 'utf8');
fs.mkdirSync(path.dirname(doctorPath), { recursive: true });
fs.writeFileSync(doctorPath, text, 'utf8');

console.log(
  `Wrote clinical diagnosis taxonomy (${categories.length} categories, ${entries.length} entries) → ${path.relative(root, canonicalPath)} & ${path.relative(root, doctorPath)}`
);

import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const browserDirectory = join(process.cwd(), 'dist', 'user-web', 'browser');
const sourcePath = join(browserDirectory, 'index.csr.html');
const targetPath = join(browserDirectory, 'private-shell.html');

const source = await readFile(sourcePath, 'utf8');
const privateShell = source
  .replace(
    /<meta name="robots" content="[^"]*"\s*\/?>/i,
    '<meta name="robots" content="noindex, nofollow" />\n    <meta name="googlebot" content="noindex, nofollow" />',
  )
  .replace(/\s*<link rel="canonical" href="[^"]*"\s*\/?>/i, '');

await writeFile(targetPath, privateShell, 'utf8');
console.log('Generated noindex browser shell for private User Web routes.');

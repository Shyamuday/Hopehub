import 'dotenv/config';
import { createWriteStream, existsSync, mkdirSync } from 'node:fs';
import { get } from 'node:https';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const OOREP_SQL_URL =
  'https://raw.githubusercontent.com/nondeterministic/oorep/master/oorep.sql.gz';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const defaultOut = resolve(scriptDir, '../../data/oorep/oorep.sql.gz');

function parseArg(flag: string) {
  const index = process.argv.indexOf(flag);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

async function download(url: string, destination: string) {
  await new Promise<void>((resolvePromise, reject) => {
    get(url, (response) => {
      if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        download(response.headers.location, destination).then(resolvePromise).catch(reject);
        return;
      }
      if (response.statusCode !== 200) {
        reject(new Error(`Download failed with status ${response.statusCode}`));
        return;
      }
      mkdirSync(dirname(destination), { recursive: true });
      const file = createWriteStream(destination);
      response.pipe(file);
      file.on('finish', () => file.close(() => resolvePromise()));
      file.on('error', reject);
    }).on('error', reject);
  });
}

async function main() {
  const outPath = resolve(parseArg('--out') || defaultOut);
  if (existsSync(outPath)) {
    console.log(`[oorep-download] already exists: ${outPath}`);
    return;
  }

  console.log(`[oorep-download] fetching ${OOREP_SQL_URL}`);
  await download(OOREP_SQL_URL, outPath);
  console.log(`[oorep-download] saved ${outPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

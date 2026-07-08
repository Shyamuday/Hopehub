import { importStaticDiseasePages } from '../src/services/disease-public-page.js';
import { loadStaticDiseasePageImports } from '../src/services/disease-static-import.js';

async function main() {
  const entries = await loadStaticDiseasePageImports();
  const result = await importStaticDiseasePages(entries);
  console.log(
    `Imported static disease pages: ${result.updated} updated, ${result.unmatched.length} unmatched of ${result.total}.`
  );
  if (result.unmatched.length) {
    console.log('Unmatched (no DB disease row by name/slug):', result.unmatched.join(', '));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

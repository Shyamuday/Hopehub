/** Shown when `homeopathy-method-intake.json` fails to load in doctor-web `public/data`. */
export const METHOD_INTAKE_CONFIG_ERROR =
  'Method intake config missing — run `npm run build:cghs-formulary` from repo root so JSON in apps/web/data is copied to the doctor app.';

/** Shown when CGHS formulary JSON is missing or invalid. */
export const FORMULARY_LOAD_ERROR =
  'CGHS formulary file missing or invalid — run `npm run build:cghs-formulary` from the repo root. You can still enter medicines manually.';

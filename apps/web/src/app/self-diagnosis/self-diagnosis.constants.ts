export type SelfDiagnosisToolDef = {
  /** Server allowlist key (`PUT /patient/self-diagnosis/:toolKey`). */
  key: string;
  label: string;
  description: string;
  /** Public asset URL after build. */
  dataUrl: string;
};

/**
 * Patient self-assessment worksheets. Add entries here and extend `ALLOWED_TOOL_KEYS` on the API.
 */
export const SELF_DIAGNOSIS_TOOLS: SelfDiagnosisToolDef[] = [
  {
    key: 'kingdom',
    label: 'Kingdom (plant / mineral / animal)',
    description: 'Map the case along plant, mineral, and animal patterns for your own notes.',
    dataUrl: '/data/homeopathy-kingdom-intake.json'
  },
  {
    key: 'miasm',
    label: 'Miasm (pace and depth)',
    description: 'Record pace, depth, and miasm hypotheses in the same structure doctors use for method intake.',
    dataUrl: '/data/homeopathy-miasm-intake.json'
  }
];

export function selfDiagnosisToolByKey(key: string): SelfDiagnosisToolDef | null {
  const k = key.trim().toLowerCase();
  return SELF_DIAGNOSIS_TOOLS.find((t) => t.key === k) ?? null;
}

export const SUPPORT_NOTE_CATEGORIES = [
  { value: 'GENERAL', label: 'General' },
  { value: 'BILLING', label: 'Billing' },
  { value: 'ADHERENCE', label: 'Adherence' },
  { value: 'TECHNICAL', label: 'Technical' },
  { value: 'ESCALATION', label: 'Escalation' }
] as const;

export type SupportNoteCategory = (typeof SUPPORT_NOTE_CATEGORIES)[number]['value'];

export const SUPPORT_NOTE_CATEGORY_STYLES: Record<SupportNoteCategory, { bg: string; color: string }> = {
  GENERAL: { bg: '#e2e8f0', color: '#334155' },
  BILLING: { bg: '#dbeafe', color: '#1e40af' },
  ADHERENCE: { bg: '#fef3c7', color: '#92400e' },
  TECHNICAL: { bg: '#ede9fe', color: '#5b21b6' },
  ESCALATION: { bg: '#fee2e2', color: '#991b1b' }
};

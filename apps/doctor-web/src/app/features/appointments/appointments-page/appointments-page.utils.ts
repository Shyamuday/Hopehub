import type { CghsFormularyEntry } from './cghs-formulary';
import { matchFormularyKey } from './cghs-formulary';
import type { LoadedPrescriptionItem, MedicineRow, TemplateItem } from './appointments-page.types';

export function createEmptyMedicineRow(): MedicineRow {
  return {
    formularyKey: '',
    medicineName: '',
    strength: '',
    dose: '',
    frequency: '',
    duration: '',
    durationDays: 7,
    instructions: '',
    intakeTimesText: '09:00,21:00'
  };
}

export function mapPrescriptionItemsToMedicineRows(
  formulary: CghsFormularyEntry[],
  items: LoadedPrescriptionItem[] | null | undefined
): MedicineRow[] {
  if (!items?.length) {
    return [createEmptyMedicineRow()];
  }
  return items.map((item) => ({
    formularyKey: matchFormularyKey(
      formulary,
      item.medicineName || '',
      item.strength || '',
      item.dose || ''
    ),
    medicineName: item.medicineName || '',
    strength: item.strength || '',
    dose: item.dose || '',
    frequency: item.frequency || '',
    duration: item.duration || '',
    durationDays: item.durationDays || 7,
    instructions: item.instructions || '',
    intakeTimesText: (item.intakeTimes || ['09:00']).join(',')
  }));
}

export function mapTemplateItemsToMedicineRows(
  formulary: CghsFormularyEntry[],
  items: TemplateItem[]
): MedicineRow[] {
  if (!items.length) {
    return [createEmptyMedicineRow()];
  }
  return items.map((item) => ({
    formularyKey: matchFormularyKey(formulary, item.medicineName, item.strength || '', item.dose || ''),
    medicineName: item.medicineName,
    strength: item.strength || '',
    dose: item.dose || '',
    frequency: item.frequency || '',
    duration: item.duration || '',
    durationDays: 0,
    instructions: item.instructions || '',
    intakeTimesText: ''
  }));
}

export function attachmentKindLabel(kind: string): string {
  if (kind === 'PATIENT_REPORT') {
    return 'Patient report';
  }
  if (kind === 'DOCTOR_CLINICAL') {
    return 'Clinical / clinic photo';
  }
  return 'File';
}

export function normalizeMedicineName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function prescriptionSafetyReport(rows: MedicineRow[]): {
  duplicateMedicines: string[];
  conflictingMedicines: string[];
} {
  const groups = new Map<string, MedicineRow[]>();
  for (const row of rows) {
    const key = normalizeMedicineName(row.medicineName);
    if (!key) {
      continue;
    }
    const list = groups.get(key);
    if (list) {
      list.push(row);
    } else {
      groups.set(key, [row]);
    }
  }

  const duplicateMedicines: string[] = [];
  const conflictingMedicines: string[] = [];
  for (const groupRows of groups.values()) {
    if (groupRows.length < 2) {
      continue;
    }
    const displayName = groupRows[0].medicineName.trim() || groupRows[0].medicineName;
    duplicateMedicines.push(displayName);
    const signatures = new Set(groupRows.map((r) => `${(r.dose || '').trim()}|${(r.frequency || '').trim()}`));
    if (signatures.size > 1) {
      conflictingMedicines.push(displayName);
    }
  }

  return { duplicateMedicines, conflictingMedicines };
}

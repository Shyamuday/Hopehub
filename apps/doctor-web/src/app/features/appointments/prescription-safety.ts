export type PrescriptionSafetyLine = {
  medicineName: string;
  strength?: string | null;
  dose?: string | null;
  frequency?: string | null;
};

export type MultiplePotencyNotice = {
  medicineName: string;
  strengths: string[];
};

export type DuplicatePotencyLine = {
  medicineName: string;
  strength: string;
  count: number;
};

export type ConflictingDoseLine = {
  medicineName: string;
  strength: string;
  details: string[];
};

export type PrescriptionSafetyReport = {
  multiplePotencies: MultiplePotencyNotice[];
  duplicatePotencyLines: DuplicatePotencyLine[];
  conflictingDose: ConflictingDoseLine[];
  requiresConfirmation: boolean;
};

function normalizeMedicineName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

function normalizePotency(strength?: string | null) {
  return (strength || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function displayMedicineName(name: string) {
  return name.trim() || name;
}

function displayPotency(strength?: string | null) {
  const value = (strength || '').trim();
  return value || '(no potency noted)';
}

function doseSignature(line: PrescriptionSafetyLine) {
  return `${(line.dose || '').trim().toLowerCase()}|${(line.frequency || '').trim().toLowerCase()}`;
}

export function analyzePrescriptionSafety(lines: PrescriptionSafetyLine[]): PrescriptionSafetyReport {
  const filled = lines.filter((line) => normalizeMedicineName(line.medicineName));

  const byMedicine = new Map<string, PrescriptionSafetyLine[]>();
  const byMedicinePotency = new Map<string, PrescriptionSafetyLine[]>();

  for (const line of filled) {
    const medicineKey = normalizeMedicineName(line.medicineName);
    const potencyKey = `${medicineKey}|${normalizePotency(line.strength)}`;

    const medicineGroup = byMedicine.get(medicineKey);
    if (medicineGroup) {
      medicineGroup.push(line);
    } else {
      byMedicine.set(medicineKey, [line]);
    }

    const potencyGroup = byMedicinePotency.get(potencyKey);
    if (potencyGroup) {
      potencyGroup.push(line);
    } else {
      byMedicinePotency.set(potencyKey, [line]);
    }
  }

  const multiplePotencies: MultiplePotencyNotice[] = [];
  for (const rows of byMedicine.values()) {
    if (rows.length < 2) {
      continue;
    }
    const strengths = Array.from(new Set(rows.map((row) => displayPotency(row.strength))));
    if (strengths.length > 1) {
      multiplePotencies.push({
        medicineName: displayMedicineName(rows[0].medicineName),
        strengths
      });
    }
  }

  const duplicatePotencyLines: DuplicatePotencyLine[] = [];
  const conflictingDose: ConflictingDoseLine[] = [];

  for (const rows of byMedicinePotency.values()) {
    if (rows.length < 2) {
      continue;
    }

    duplicatePotencyLines.push({
      medicineName: displayMedicineName(rows[0].medicineName),
      strength: displayPotency(rows[0].strength),
      count: rows.length
    });

    const signatures = new Set(rows.map(doseSignature));
    if (signatures.size > 1) {
      conflictingDose.push({
        medicineName: displayMedicineName(rows[0].medicineName),
        strength: displayPotency(rows[0].strength),
        details: rows.map((row) => {
          const dose = (row.dose || '').trim() || '—';
          const frequency = (row.frequency || '').trim() || '—';
          return `${dose} · ${frequency}`;
        })
      });
    }
  }

  return {
    multiplePotencies,
    duplicatePotencyLines,
    conflictingDose,
    requiresConfirmation: duplicatePotencyLines.length > 0 || conflictingDose.length > 0
  };
}

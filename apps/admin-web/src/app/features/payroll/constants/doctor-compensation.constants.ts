export type DoctorCompensationModel = 'SALARIED' | 'CONSULT_ONLY' | 'HYBRID';

export type DoctorCompensationFormModel = {
  compensationModel: DoctorCompensationModel;
  consultationSharePercent: number;
  consultationFee: number;
};

export const EMPTY_DOCTOR_COMPENSATION_FORM: DoctorCompensationFormModel = {
  compensationModel: 'HYBRID',
  consultationSharePercent: 60,
  consultationFee: 0
};

export const COMPENSATION_MODEL_OPTIONS: Array<{ value: DoctorCompensationModel; label: string }> = [
  { value: 'SALARIED', label: 'Salaried only' },
  { value: 'CONSULT_ONLY', label: 'Consultation only' },
  { value: 'HYBRID', label: 'Salary + consultation share' }
];

export function compensationApiToForm(
  compensation: {
    compensationModel: DoctorCompensationModel;
    consultationSharePercent: number;
    consultationFeePaise: number;
  } | null | undefined
): DoctorCompensationFormModel {
  if (!compensation) return { ...EMPTY_DOCTOR_COMPENSATION_FORM };
  return {
    compensationModel: compensation.compensationModel,
    consultationSharePercent: compensation.consultationSharePercent,
    consultationFee: compensation.consultationFeePaise / 100
  };
}

export function compensationFormToPayload(form: DoctorCompensationFormModel): Record<string, unknown> {
  return {
    compensationModel: form.compensationModel,
    consultationSharePercent: form.consultationSharePercent,
    consultationFee: form.consultationFee
  };
}

export function compensationModelLabel(model: DoctorCompensationModel): string {
  return COMPENSATION_MODEL_OPTIONS.find((o) => o.value === model)?.label ?? model;
}

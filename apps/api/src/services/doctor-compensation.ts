import { DoctorCompensationModel, type Doctor } from '@prisma/client';

export const DEFAULT_DOCTOR_SHARE_PERCENT = 60;

export type DoctorCompensationFields = Pick<
  Doctor,
  'compensationModel' | 'consultationSharePercent' | 'consultationFee'
>;

export function resolveDoctorSharePercent(doctor: Pick<Doctor, 'consultationSharePercent'>): number {
  const pct = doctor.consultationSharePercent;
  if (pct == null || pct < 0 || pct > 100) return DEFAULT_DOCTOR_SHARE_PERCENT;
  return pct;
}

export function doctorReceivesSalary(doctor: Pick<Doctor, 'compensationModel'>): boolean {
  return doctor.compensationModel !== DoctorCompensationModel.CONSULT_ONLY;
}

export function doctorReceivesConsultationShare(doctor: Pick<Doctor, 'compensationModel'>): boolean {
  return doctor.compensationModel !== DoctorCompensationModel.SALARIED;
}

export function serializeDoctorCompensation(doctor: DoctorCompensationFields) {
  return {
    compensationModel: doctor.compensationModel,
    consultationSharePercent: resolveDoctorSharePercent(doctor),
    consultationFeePaise: doctor.consultationFee ?? 0
  };
}

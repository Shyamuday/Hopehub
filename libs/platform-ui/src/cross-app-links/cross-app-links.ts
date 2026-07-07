export type CrossAppOrigins = {
  doctor: string;
};

export function doctorAppointmentUrl(origins: CrossAppOrigins, consultationId: string) {
  const base = origins.doctor.replace(/\/$/, '');
  return `${base}/appointments?consultationId=${encodeURIComponent(consultationId)}`;
}

export function doctorCaseAnalysisUrl(origins: CrossAppOrigins, consultationId: string) {
  const base = origins.doctor.replace(/\/$/, '');
  return `${base}/consultations/${encodeURIComponent(consultationId)}/case-analysis`;
}

export type ClinicalRecordsQuery = {
  tab?: 'prescriptions' | 'analyses';
  patientId?: string;
  doctorId?: string;
  consultationId?: string;
};

export function clinicalRecordsQuery(params: ClinicalRecordsQuery): Record<string, string> {
  const query: Record<string, string> = {};
  if (params.tab) query['tab'] = params.tab;
  if (params.patientId) query['patientId'] = params.patientId;
  if (params.doctorId) query['doctorId'] = params.doctorId;
  if (params.consultationId) query['consultationId'] = params.consultationId;
  return query;
}

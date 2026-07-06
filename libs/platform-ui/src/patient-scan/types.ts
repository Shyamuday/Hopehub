export type ScanDestinationKind =
  | 'doctor_scan'
  | 'store_dispense'
  | 'reception_walk_in'
  | 'patient_lookup'
  | 'admin_consumer'
  | 'patient_dashboard'
  | 'unsupported';

export type ScanDestination = {
  kind: ScanDestinationKind;
  path: string;
  query?: Record<string, string>;
  message?: string;
};

export type ScanContextResponse = {
  patient: {
    id: string;
    name: string;
    patientCode?: string | null;
    mobile?: string | null;
  };
  scanUrl: string;
  destination: ScanDestination;
  primaryConsultationId: string | null;
  consultations: Array<{
    id: string;
    status: string;
    createdAt: string;
    disease?: { name: string } | null;
  }>;
};

export type PatientScanAppKey = 'doctor' | 'operations' | 'admin' | 'user';

export type PatientScanNavigateOptions = {
  app: PatientScanAppKey;
  destination: ScanDestination;
  primaryConsultationId?: string | null;
  adminBasePath?: string;
};

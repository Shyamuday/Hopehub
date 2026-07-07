export type { DevFillCredentials, DevPersona, DevAppGuide } from './dev-demo.types';
export { DEV_DEMO_PORT, type DevDemoPort } from './dev-demo.port';
export { DevLoginPanelComponent } from './dev-login-panel/dev-login-panel';
export { RoleTaskGuideComponent } from './role-task-guide/role-task-guide.component';
export { NotificationBellHostComponent } from './notification-bell-host/notification-bell-host';
export { extractPatientCodeFromScan, isPatientCodeFormat } from './patient-scan/extract-patient-code';
export { PatientScanPanelComponent } from './patient-scan/patient-scan-panel.component';
export { PatientScanLauncherComponent } from './patient-scan/patient-scan-launcher.component';
export { buildScanNavigation, storeScanPath } from './patient-scan/navigate';
export type {
  ScanContextResponse,
  ScanDestination,
  ScanDestinationKind,
  PatientScanAppKey
} from './patient-scan/types';
export { DetailRowsComponent } from './detail-rows/detail-rows.component';
export { ProfileAvatarUploadComponent } from './profile-avatar-upload/profile-avatar-upload.component';
export { buildDetailRows } from './detail-rows/detail-rows.util';
export type { DetailRow, DetailFieldDef } from './detail-rows/detail-rows.types';
export {
  PATIENT_CLINICAL_PROFILE_FIELDS,
  patientClinicalProfileHasData,
  type PatientClinicalProfile
} from './detail-rows/patient-clinical-profile.fields';
export { HR_LETTER_META_FIELDS, hrLetterMetaRows, type HrLetterMeta } from './detail-rows/hr-letter-meta.fields';
export {
  clinicalRecordsQuery,
  doctorAppointmentUrl,
  doctorCaseAnalysisUrl,
  type ClinicalRecordsQuery,
  type CrossAppOrigins
} from './cross-app-links/cross-app-links';

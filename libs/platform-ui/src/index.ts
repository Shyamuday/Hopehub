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

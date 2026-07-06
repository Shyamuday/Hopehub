import type { PatientScanNavigateOptions } from './types';

/** Build router navigation from API scan destination. */
export function buildScanNavigation(options: PatientScanNavigateOptions): {
  commands: string[];
  queryParams?: Record<string, string>;
} {
  const { destination, app, adminBasePath = 'admin' } = options;

  if (destination.kind === 'store_dispense') {
    const segments = destination.path.split('/').filter(Boolean);
    return { commands: ['/', ...segments] };
  }

  if (destination.kind === 'admin_consumer') {
    if (app === 'admin') {
      return {
        commands: ['/', 'consumers'],
        queryParams: destination.query
      };
    }
    return {
      commands: ['/', adminBasePath, 'consumers'],
      queryParams: destination.query
    };
  }

  const path = destination.path.startsWith('/') ? destination.path : `/${destination.path}`;

  return {
    commands: [path],
    queryParams: destination.query
  };
}

export function storeScanPath(patientCode: string, isManager: boolean): string[] {
  const base = isManager ? 'store-manager' : 'store';
  return ['/', base, 'scan', 'patient', patientCode];
}

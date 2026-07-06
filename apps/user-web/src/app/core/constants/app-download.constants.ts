import { environment } from '../../environments/environment';

export type PatientAppDownloadLinks = {
  landingUrl: string;
  webAppUrl: string;
  androidUrl: string | null;
  iosUrl: string | null;
  appName: string;
};

const DEFAULT_APP_NAME = 'Vitalis Patient';

/** QR target — stable API URL works for print, posters, and clinic desks. */
export function patientAppLandingUrl(): string {
  return `${environment.apiUrl}/go/app`;
}

export function patientAppWebUrl(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/get-app`;
  }
  return '/get-app';
}

export function buildQrImageUrl(targetUrl: string, size = 200): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(targetUrl)}`;
}

export function fallbackDownloadLinks(): PatientAppDownloadLinks {
  return {
    landingUrl: patientAppLandingUrl(),
    webAppUrl: patientAppWebUrl(),
    androidUrl: null,
    iosUrl: null,
    appName: DEFAULT_APP_NAME
  };
}

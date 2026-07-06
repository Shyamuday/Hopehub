import { SERVER_CONFIG } from '../constants/config.constants.js';

export type PatientAppDownloadInfo = {
  landingUrl: string;
  webAppUrl: string;
  androidUrl: string | null;
  iosUrl: string | null;
  appName: string;
  packageId: string;
};

export function getPatientAppDownloadInfo(): PatientAppDownloadInfo {
  const { WEB, API_PUBLIC_URL } = {
    WEB: SERVER_CONFIG.ORIGINS.WEB,
    API_PUBLIC_URL: SERVER_CONFIG.API_PUBLIC_URL
  };

  return {
    landingUrl: `${API_PUBLIC_URL}/go/app`,
    webAppUrl: `${WEB}/get-app`,
    androidUrl: process.env.PATIENT_APP_ANDROID_URL?.trim() || null,
    iosUrl: process.env.PATIENT_APP_IOS_URL?.trim() || null,
    appName: process.env.PATIENT_APP_NAME?.trim() || 'Vitalis Patient',
    packageId: process.env.PATIENT_APP_PACKAGE_ID?.trim() || 'com.vitalisclinic.patient'
  };
}

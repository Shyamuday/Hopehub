import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.vitalisclinic.patient',
  appName: 'Vitalis Patient',
  webDir: 'dist/user-web/browser',
  server: {
    androidScheme: 'https'
  }
};

export default config;

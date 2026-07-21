import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.hopehubclinic.patient',
  appName: 'HopeHub Patient',
  webDir: 'dist/user-web/browser',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    },
    Camera: {
      // iOS/Android usage strings are patched into native projects via scripts/patch-capacitor-permissions.mjs
    }
  }
};

export default config;

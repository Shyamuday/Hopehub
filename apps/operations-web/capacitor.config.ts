import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.hopehubclinic.operations',
  appName: 'HopeHub Operations',
  webDir: 'dist/operations-web/browser',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    },
    Camera: {}
  }
};

export default config;

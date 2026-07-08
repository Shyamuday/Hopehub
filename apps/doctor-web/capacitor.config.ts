import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.vitalisclinic.doctor',
  appName: 'Vitalis Doctor',
  webDir: 'dist/doctor-web/browser',
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

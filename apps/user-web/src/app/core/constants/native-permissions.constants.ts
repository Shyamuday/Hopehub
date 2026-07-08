/** User-facing permission rationale copy (also mirrored in iOS Info.plist / Android strings). */
export const NATIVE_PERMISSION_MESSAGES = {
  camera:
    'Camera access lets you scan clinic QR codes and upload skin or health photos to your record.',
  microphone: 'Microphone access is required for voice and video consultations with your doctor.',
  photos: 'Photo library access lets you choose existing images for your health record.',
  notifications: 'Notifications remind you about medicines, consultations, and doctor messages.'
} as const;

export type PermissionStatusLabel = 'granted' | 'denied' | 'not-asked' | 'limited' | 'web';

export type AppPermissionHelpItem = {
  id: 'camera' | 'microphone' | 'photos' | 'notifications';
  icon: string;
  title: string;
  summary: string;
  whyWeNeedIt: string;
  whenWeAsk: string;
  youControl: string;
  optional: boolean;
};

export const APP_PERMISSIONS_HELP: AppPermissionHelpItem[] = [
  {
    id: 'camera',
    icon: '📷',
    title: 'Camera',
    summary: NATIVE_PERMISSION_MESSAGES.camera,
    whyWeNeedIt:
      'Your doctor may need clear photos of symptoms (skin, tongue, swelling, wounds). The camera also powers QR scanning for your clinic patient card.',
    whenWeAsk: 'When you tap Take photo, scan a QR code, or start a feature that needs the camera.',
    youControl: 'You can deny camera access and still use chat consults. Upload photos from files on web instead.',
    optional: false
  },
  {
    id: 'photos',
    icon: '🖼️',
    title: 'Photo library',
    summary: NATIVE_PERMISSION_MESSAGES.photos,
    whyWeNeedIt:
      'Lets you pick an existing picture from your gallery to attach to your health record instead of taking a new photo.',
    whenWeAsk: 'When you choose Choose from gallery on the health photos screen.',
    youControl: 'Optional — you can use Take photo or skip uploads entirely.',
    optional: true
  },
  {
    id: 'microphone',
    icon: '🎙️',
    title: 'Microphone',
    summary: NATIVE_PERMISSION_MESSAGES.microphone,
    whyWeNeedIt:
      'Voice calls with your doctor work like a phone call inside the app — audio is peer-to-peer for the consultation, not recorded for marketing.',
    whenWeAsk: 'When you or your doctor start a voice or video call during an active consultation.',
    youControl: 'Text chat always works without microphone access.',
    optional: true
  },
  {
    id: 'notifications',
    icon: '🔔',
    title: 'Notifications',
    summary: NATIVE_PERMISSION_MESSAGES.notifications,
    whyWeNeedIt:
      'Timely alerts for medicine reminders, doctor replies, consultation updates, and delivery status — so you do not miss care that matters.',
    whenWeAsk: 'After you sign in on the mobile app (not on the website).',
    youControl: 'Turn off anytime in phone Settings or in reminder preferences inside the app.',
    optional: true
  }
];

export const PERMISSIONS_TRUST_COPY = {
  headline: 'Your privacy, explained clearly',
  intro:
    'Vitalis only requests phone permissions when a feature truly needs them. We never sell your health data. You stay in control and can change access anytime in your device settings.',
  settingsAndroid: 'Settings → Apps → Vitalis Patient → Permissions',
  settingsIos: 'Settings → Vitalis Patient',
  neverDo: [
    'Sell or share your health photos with advertisers',
    'Turn on camera or microphone in the background without your action',
    'Request contacts, location, or SMS access'
  ]
} as const;

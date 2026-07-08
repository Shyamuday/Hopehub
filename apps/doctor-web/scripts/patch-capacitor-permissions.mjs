/**
 * Ensures AndroidManifest.xml and Info.plist include camera, microphone, and photo permissions
 * after `npx cap sync`. Safe to run repeatedly.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const ANDROID_MANIFEST = path.join(root, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
const IOS_PLIST = path.join(root, 'ios', 'App', 'App', 'Info.plist');

const ANDROID_PERMISSIONS = [
  'android.permission.CAMERA',
  'android.permission.RECORD_AUDIO',
  'android.permission.MODIFY_AUDIO_SETTINGS',
  'android.permission.READ_MEDIA_IMAGES',
  'android.permission.READ_EXTERNAL_STORAGE',
  'android.permission.WRITE_EXTERNAL_STORAGE'
];

const IOS_ENTRIES = {
  NSCameraUsageDescription:
    'Camera access lets you scan patient QR codes at the clinic.',
  NSMicrophoneUsageDescription:
    'Microphone access is required for voice and video consultations with patients.',
  NSPhotoLibraryUsageDescription:
    'Photo library access lets you attach clinical images when needed.',
  NSPhotoLibraryAddUsageDescription: 'Save clinical photos to patient records.',
  UIBackgroundModes: ['audio', 'remote-notification']
};

function patchAndroidManifest() {
  if (!fs.existsSync(ANDROID_MANIFEST)) {
    console.log('[permissions] Skip Android — run: npx cap add android');
    return;
  }

  let xml = fs.readFileSync(ANDROID_MANIFEST, 'utf8');
  for (const perm of ANDROID_PERMISSIONS) {
    const line = `    <uses-permission android:name="${perm}" />`;
    if (!xml.includes(perm)) {
      xml = xml.replace(/(<manifest[^>]*>)/, `$1\n${line}`);
    }
  }

  if (!xml.includes('android.hardware.camera')) {
    xml = xml.replace(
      '</manifest>',
      '    <uses-feature android:name="android.hardware.camera" android:required="false" />\n</manifest>'
    );
  }

  fs.writeFileSync(ANDROID_MANIFEST, xml);
  console.log('[permissions] AndroidManifest.xml updated');
}

function patchIosPlist() {
  if (!fs.existsSync(IOS_PLIST)) {
    console.log('[permissions] Skip iOS — run: npx cap add ios');
    return;
  }

  let plist = fs.readFileSync(IOS_PLIST, 'utf8');

  for (const [key, value] of Object.entries(IOS_ENTRIES)) {
    if (plist.includes(`<key>${key}</key>`)) continue;

    if (Array.isArray(value)) {
      const items = value.map((v) => `        <string>${v}</string>`).join('\n');
      const block = `    <key>${key}</key>\n    <array>\n${items}\n    </array>`;
      plist = plist.replace('</dict>', `${block}\n</dict>`);
    } else {
      const block = `    <key>${key}</key>\n    <string>${value}</string>`;
      plist = plist.replace('</dict>', `${block}\n</dict>`);
    }
  }

  fs.writeFileSync(IOS_PLIST, plist);
  console.log('[permissions] Info.plist updated');
}

patchAndroidManifest();
patchIosPlist();

import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraPermissionType } from '@capacitor/camera';
import { PushNotifications } from '@capacitor/push-notifications';
import {
  NATIVE_PERMISSION_MESSAGES,
  type PermissionStatusLabel
} from '../constants/native-permissions.constants';
export type NativePermissionKind = 'camera' | 'microphone' | 'photos' | 'notifications';

export type NativePermissionResult = {
  granted: boolean;
  message?: string;
};

@Injectable({ providedIn: 'root' })
export class NativePermissionsService {
  readonly isNative = Capacitor.isNativePlatform();

  async ensureCamera(): Promise<NativePermissionResult> {
    if (!this.isNative) {
      return this.ensureWebCamera();
    }

    const current = await Camera.checkPermissions();
    if (current.camera === 'granted') {
      return { granted: true };
    }

    const requested = await Camera.requestPermissions({ permissions: ['camera'] as CameraPermissionType[] });
    if (requested.camera === 'granted') {
      return { granted: true };
    }

    return {
      granted: false,
      message: NATIVE_PERMISSION_MESSAGES.camera
    };
  }

  async ensurePhotos(): Promise<NativePermissionResult> {
    if (!this.isNative) {
      return { granted: true };
    }

    const current = await Camera.checkPermissions();
    if (current.photos === 'granted' || current.photos === 'limited') {
      return { granted: true };
    }

    const requested = await Camera.requestPermissions({ permissions: ['photos'] as CameraPermissionType[] });
    if (requested.photos === 'granted' || requested.photos === 'limited') {
      return { granted: true };
    }

    return {
      granted: false,
      message: NATIVE_PERMISSION_MESSAGES.photos
    };
  }

  async ensureCameraAndPhotos(): Promise<NativePermissionResult> {
    if (!this.isNative) {
      return this.ensureWebCamera();
    }

    const current = await Camera.checkPermissions();
    if (current.camera === 'granted' && (current.photos === 'granted' || current.photos === 'limited')) {
      return { granted: true };
    }

    const requested = await Camera.requestPermissions({
      permissions: ['camera', 'photos'] as CameraPermissionType[]
    });

    const ok =
      requested.camera === 'granted' &&
      (requested.photos === 'granted' || requested.photos === 'limited');

    return ok
      ? { granted: true }
      : { granted: false, message: NATIVE_PERMISSION_MESSAGES.camera };
  }

  /**
   * Microphone for WebRTC voice calls.
   * On native, requires RECORD_AUDIO (Android) / NSMicrophoneUsageDescription (iOS) in native projects.
   */
  async ensureMicrophone(): Promise<NativePermissionResult> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      return { granted: false, message: 'Microphone is not supported on this device.' };
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      stream.getTracks().forEach((track) => track.stop());
      return { granted: true };
    } catch {
      return {
        granted: false,
        message: NATIVE_PERMISSION_MESSAGES.microphone
      };
    }
  }

  /** Prime camera + mic before a video consult. */
  async ensureVideoCallPermissions(): Promise<NativePermissionResult> {
    if (this.isNative) {
      const cam = await this.ensureCamera();
      if (!cam.granted) return cam;
    }
    return this.ensureMicrophone();
  }

  /** Prime camera + mic before a voice consult on native builds. */
  async ensureVoiceCallPermissions(): Promise<NativePermissionResult> {
    const mic = await this.ensureMicrophone();
    if (!mic.granted) return mic;
    return { granted: true };
  }

  /** Prime camera before live QR scan or photo capture. */
  async ensureScanPermissions(): Promise<NativePermissionResult> {
    if (this.isNative) {
      return this.ensureCamera();
    }
    return this.ensureWebCamera();
  }

  /** Read-only status for the permissions trust page (no prompts). */
  async getPermissionStatuses(): Promise<Record<string, PermissionStatusLabel>> {
    if (!this.isNative) {
      return {
        camera: 'web',
        photos: 'web',
        microphone: 'web',
        notifications: 'web'
      };
    }

    const cameraPerms = await Camera.checkPermissions();
    let pushStatus: PermissionStatusLabel = 'not-asked';
    try {
      const push = await PushNotifications.checkPermissions();
      pushStatus =
        push.receive === 'granted' ? 'granted' : push.receive === 'denied' ? 'denied' : 'not-asked';
    } catch {
      pushStatus = 'not-asked';
    }

    return {
      camera: cameraPerms.camera === 'granted' ? 'granted' : cameraPerms.camera === 'denied' ? 'denied' : 'not-asked',
      photos:
        cameraPerms.photos === 'granted'
          ? 'granted'
          : cameraPerms.photos === 'limited'
            ? 'limited'
            : cameraPerms.photos === 'denied'
              ? 'denied'
              : 'not-asked',
      microphone: 'not-asked',
      notifications: pushStatus
    };
  }

  async openAppSettings(): Promise<void> {
    if (!this.isNative || typeof window === 'undefined') return;

    const platform = Capacitor.getPlatform();
    if (platform === 'ios') {
      window.location.href = 'app-settings:';
      return;
    }

    if (platform === 'android') {
      const appId = 'com.vitalisclinic.patient';
      window.location.href = `intent:#Intent;action=android.settings.APPLICATION_DETAILS_SETTINGS;data=package:${appId};end`;
    }
  }

  private async ensureWebCamera(): Promise<NativePermissionResult> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      return { granted: false, message: NATIVE_PERMISSION_MESSAGES.camera };
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false
      });
      stream.getTracks().forEach((track) => track.stop());
      return { granted: true };
    } catch {
      return { granted: false, message: NATIVE_PERMISSION_MESSAGES.camera };
    }
  }
}

import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraPermissionType } from '@capacitor/camera';

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
      message: 'Camera access is required to scan patient QR codes.'
    };
  }

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
        message: 'Microphone access is required for voice and video calls.'
      };
    }
  }

  async ensureVideoCallPermissions(): Promise<NativePermissionResult> {
    if (this.isNative) {
      const cam = await this.ensureCamera();
      if (!cam.granted) return cam;
    }
    return this.ensureMicrophone();
  }

  async ensureScanPermissions(): Promise<NativePermissionResult> {
    if (this.isNative) {
      return this.ensureCamera();
    }
    return this.ensureWebCamera();
  }

  async openAppSettings(): Promise<void> {
    if (!this.isNative || typeof window === 'undefined') return;

    const platform = Capacitor.getPlatform();
    if (platform === 'ios') {
      window.location.href = 'app-settings:';
      return;
    }

    if (platform === 'android') {
      const appId = 'com.hopehubclinic.doctor';
      window.location.href = `intent:#Intent;action=android.settings.APPLICATION_DETAILS_SETTINGS;data=package:${appId};end`;
    }
  }

  private async ensureWebCamera(): Promise<NativePermissionResult> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      return { granted: false, message: 'Camera is not supported on this device.' };
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false
      });
      stream.getTracks().forEach((track) => track.stop());
      return { granted: true };
    } catch {
      return { granted: false, message: 'Camera access is required to scan QR codes.' };
    }
  }
}

import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { CLINICAL_MEDIA_TYPE_LABELS, type ClinicalMediaType } from '@vitalis/homeopathy-approaches';
import { NativePermissionsService } from '../../core/services/native-permissions.service';
import {
  PatientClinicalMediaService,
  type ClinicalMediaMeta,
  type PatientClinicalMediaItem
} from './patient-clinical-media.service';

@Component({
  selector: 'app-patient-clinical-media-panel',
  standalone: true,
  imports: [CommonModule, FormField],
  templateUrl: './patient-clinical-media-panel.html',
  styleUrl: './patient-clinical-media-panel.scss'
})
export class PatientClinicalMediaPanelComponent implements OnInit, OnDestroy {
  private readonly api = inject(PatientClinicalMediaService);
  private readonly nativePermissions = inject(NativePermissionsService);

  readonly isNative = Capacitor.isNativePlatform();

  readonly mediaTypes = Object.entries(CLINICAL_MEDIA_TYPE_LABELS) as Array<[ClinicalMediaType, string]>;
  readonly meta = signal<ClinicalMediaMeta | null>(null);
  readonly media = signal<PatientClinicalMediaItem[]>([]);
  readonly loading = signal(false);
  readonly uploading = signal(false);
  readonly deletingId = signal('');
  readonly error = signal('');
  readonly message = signal('');
  readonly previewUrls = signal<Record<string, string>>({});
  readonly filterType = signal('');

  readonly uploadModel = signal({
    mediaType: 'SKIN' as ClinicalMediaType,
    bodyRegion: '',
    diseaseId: '',
    conditionLabel: '',
    observations: ''
  });
  readonly uploadForm = form(this.uploadModel);

  private selectedFile: File | null = null;
  private previewObjectUrl: string | null = null;

  ngOnInit() {
    void this.reload();
  }

  ngOnDestroy() {
    this.revokePreviewUrls();
    this.revokeSelectedPreview();
  }

  filteredMedia() {
    const type = this.filterType();
    const items = this.media();
    return type ? items.filter((item) => item.mediaType === type) : items;
  }

  bodyRegions() {
    const type = this.uploadModel().mediaType;
    return this.meta()?.bodyRegions?.[type] ?? [];
  }

  diseases() {
    return this.meta()?.diseases ?? [];
  }

  selectedPreviewUrl() {
    return this.previewObjectUrl;
  }

  async reload() {
    this.loading.set(true);
    this.error.set('');
    try {
      const [meta, items] = await Promise.all([this.api.loadMeta(), this.api.list()]);
      this.meta.set(meta);
      this.media.set(items);
      this.revokePreviewUrls();
      const next: Record<string, string> = {};
      for (const item of items) {
        const blob = await this.api.loadFile(item.fileUrl);
        next[item.id] = URL.createObjectURL(blob);
      }
      this.previewUrls.set(next);
    } catch {
      this.error.set('Could not load your health photos.');
      this.media.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    input.value = '';
    this.selectedFile = file;
    this.revokeSelectedPreview();
    if (file) this.previewObjectUrl = URL.createObjectURL(file);
  }

  async captureFromCamera() {
    this.error.set('');
    const access = await this.nativePermissions.ensureCameraAndPhotos();
    if (!access.granted) {
      this.error.set(access.message ?? 'Camera permission is required.');
      return;
    }

    try {
      const photo = await Camera.getPhoto({
        quality: 85,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera
      });
      if (!photo.dataUrl) {
        this.error.set('Could not capture photo.');
        return;
      }
      const blob = await (await fetch(photo.dataUrl)).blob();
      const ext = photo.format === 'png' ? 'png' : 'jpg';
      this.selectedFile = new File([blob], `health-photo-${Date.now()}.${ext}`, {
        type: blob.type || `image/${ext}`
      });
      this.revokeSelectedPreview();
      this.previewObjectUrl = URL.createObjectURL(this.selectedFile);
    } catch {
      this.error.set('Camera capture cancelled or failed.');
    }
  }

  async pickFromGallery() {
    this.error.set('');
    const access = await this.nativePermissions.ensurePhotos();
    if (!access.granted) {
      this.error.set(access.message ?? 'Photo library permission is required.');
      return;
    }

    try {
      const photo = await Camera.getPhoto({
        quality: 85,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Photos
      });
      if (!photo.dataUrl) return;
      const blob = await (await fetch(photo.dataUrl)).blob();
      const ext = photo.format === 'png' ? 'png' : 'jpg';
      this.selectedFile = new File([blob], `health-photo-${Date.now()}.${ext}`, {
        type: blob.type || `image/${ext}`
      });
      this.revokeSelectedPreview();
      this.previewObjectUrl = URL.createObjectURL(this.selectedFile);
    } catch {
      this.error.set('Could not open photo library.');
    }
  }

  async uploadSelectedFile() {
    const file = this.selectedFile;
    if (!file) {
      this.error.set('Choose a photo to upload.');
      return;
    }

    const form = this.uploadModel();
    this.uploading.set(true);
    this.error.set('');
    this.message.set('');
    try {
      const dataBase64 = await this.readFileAsBase64(file);
      await this.api.upload({
        mediaType: form.mediaType,
        bodyRegion: form.bodyRegion.trim() || undefined,
        diseaseId: form.diseaseId || undefined,
        conditionLabel: form.conditionLabel.trim() || undefined,
        observations: form.observations.trim() || undefined,
        mimeType: file.type,
        fileName: file.name,
        dataBase64
      });
      this.selectedFile = null;
      this.revokeSelectedPreview();
      this.message.set('Photo saved to your health record.');
      await this.reload();
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Could not upload photo.');
    } finally {
      this.uploading.set(false);
    }
  }

  async removeMedia(item: PatientClinicalMediaItem) {
    this.deletingId.set(item.id);
    this.error.set('');
    try {
      await this.api.remove(item.id);
      await this.reload();
    } catch {
      this.error.set('Could not remove photo.');
    } finally {
      this.deletingId.set('');
    }
  }

  private readFileAsBase64(file: File) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result || '');
        const comma = result.indexOf(',');
        resolve(comma >= 0 ? result.slice(comma + 1) : result);
      };
      reader.onerror = () => reject(new Error('Could not read image.'));
      reader.readAsDataURL(file);
    });
  }

  private revokePreviewUrls() {
    for (const url of Object.values(this.previewUrls())) URL.revokeObjectURL(url);
    this.previewUrls.set({});
  }

  private revokeSelectedPreview() {
    if (this.previewObjectUrl) {
      URL.revokeObjectURL(this.previewObjectUrl);
      this.previewObjectUrl = null;
    }
  }
}

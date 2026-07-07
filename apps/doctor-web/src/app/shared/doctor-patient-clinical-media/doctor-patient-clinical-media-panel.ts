import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, OnDestroy, inject, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { CLINICAL_MEDIA_TYPE_LABELS, type ClinicalMediaType } from '@vitalis/homeopathy-approaches';
import { CaseAnalysisApiService } from '../../features/case-analysis/case-analysis-api.service';
import type { ClinicalMediaItem } from '../../features/case-analysis/clinical-media.types';

@Component({
  selector: 'app-doctor-patient-clinical-media-panel',
  imports: [CommonModule, FormField],
  templateUrl: './doctor-patient-clinical-media-panel.html',
  styleUrl: './doctor-patient-clinical-media-panel.scss'
})
export class DoctorPatientClinicalMediaPanelComponent implements OnChanges, OnDestroy {
  private readonly api = inject(CaseAnalysisApiService);

  @Input({ required: true }) patientId!: string;

  readonly mediaTypes = Object.entries(CLINICAL_MEDIA_TYPE_LABELS) as Array<[ClinicalMediaType, string]>;
  readonly media = signal<ClinicalMediaItem[]>([]);
  readonly diseases = signal<Array<{ id: string; name: string }>>([]);
  readonly bodyRegionMap = signal<Record<string, string[]>>({});
  readonly loading = signal(false);
  readonly uploading = signal(false);
  readonly deletingId = signal('');
  readonly error = signal('');
  readonly previewUrls = signal<Record<string, string>>({});

  readonly uploadModel = signal({
    mediaType: 'SKIN' as ClinicalMediaType,
    bodyRegion: '',
    diseaseId: '',
    conditionLabel: '',
    observations: '',
    patientConsent: false
  });
  readonly uploadForm = form(this.uploadModel);

  private selectedFile: File | null = null;
  private previewObjectUrl: string | null = null;

  ngOnChanges() {
    if (this.patientId) void this.bootstrap();
  }

  ngOnDestroy() {
    this.revokePreviewUrls();
    if (this.previewObjectUrl) URL.revokeObjectURL(this.previewObjectUrl);
  }

  bodyRegions() {
    return this.bodyRegionMap()[this.uploadModel().mediaType] ?? [];
  }

  selectedPreviewUrl() {
    return this.previewObjectUrl;
  }

  async bootstrap() {
    try {
      const meta = await this.api.loadClinicalMediaMeta();
      this.diseases.set(meta.diseases);
      this.bodyRegionMap.set(meta.bodyRegions);
    } catch {
      this.diseases.set([]);
      this.bodyRegionMap.set({});
    }
    await this.reload();
  }

  async reload() {
    this.loading.set(true);
    this.error.set('');
    try {
      const items = await this.api.listPatientClinicalMedia(this.patientId);
      this.media.set(items);
      this.revokePreviewUrls();
      const next: Record<string, string> = {};
      for (const item of items) {
        const blob = await this.api.loadClinicalMediaFile(item.fileUrl);
        next[item.id] = URL.createObjectURL(blob);
      }
      this.previewUrls.set(next);
    } catch {
      this.error.set('Could not load patient health photos.');
      this.media.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  onFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    this.selectedFile = file;
    if (this.previewObjectUrl) URL.revokeObjectURL(this.previewObjectUrl);
    this.previewObjectUrl = file ? URL.createObjectURL(file) : null;
  }

  async uploadSelectedFile() {
    const file = this.selectedFile;
    const form = this.uploadModel();
    if (!file) return this.error.set('Choose an image.');
    if (!form.patientConsent) return this.error.set('Confirm patient consent.');

    this.uploading.set(true);
    this.error.set('');
    try {
      const dataBase64 = await this.readFileAsBase64(file);
      await this.api.uploadPatientClinicalMedia(this.patientId, {
        mediaType: form.mediaType,
        bodyRegion: form.bodyRegion.trim() || undefined,
        diseaseId: form.diseaseId || undefined,
        conditionLabel: form.conditionLabel.trim() || undefined,
        observations: form.observations.trim() || undefined,
        patientConsent: true,
        mimeType: file.type,
        fileName: file.name,
        dataBase64
      });
      this.selectedFile = null;
      if (this.previewObjectUrl) URL.revokeObjectURL(this.previewObjectUrl);
      this.previewObjectUrl = null;
      await this.reload();
    } catch {
      this.error.set('Upload failed.');
    } finally {
      this.uploading.set(false);
    }
  }

  async removeMedia(item: ClinicalMediaItem) {
    this.deletingId.set(item.id);
    try {
      await this.api.deletePatientClinicalMedia(this.patientId, item.id);
      await this.reload();
    } catch {
      this.error.set('Could not delete image.');
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
      reader.onerror = () => reject(new Error('read failed'));
      reader.readAsDataURL(file);
    });
  }

  private revokePreviewUrls() {
    for (const url of Object.values(this.previewUrls())) URL.revokeObjectURL(url);
    this.previewUrls.set({});
  }
}

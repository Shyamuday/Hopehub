import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, inject, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import {
  CLINICAL_MEDIA_BODY_REGIONS,
  CLINICAL_MEDIA_TYPE_LABELS,
  suggestRubricSearchPhrases,
  type ClinicalMediaType
} from '@vitalis/homeopathy-approaches';
import { CaseAnalysisApiService } from '../../case-analysis-api.service';
import type { ClinicalMediaImageAnalysis, ClinicalMediaItem } from '../../clinical-media.types';
import { DiseasePickerComponent } from '../../../../shared/disease-picker/disease-picker.component';
import { ClinicalMediaAnalysisPanelComponent } from '../clinical-media-analysis-panel/clinical-media-analysis-panel';

@Component({
  selector: 'app-clinical-media-panel',
  imports: [CommonModule, FormField, DiseasePickerComponent, ClinicalMediaAnalysisPanelComponent],
  templateUrl: './clinical-media-panel.html',
  styleUrl: './clinical-media-panel.scss'
})
export class ClinicalMediaPanelComponent implements OnChanges, OnDestroy {
  private readonly api = inject(CaseAnalysisApiService);

  @Input({ required: true }) analysisId!: string;
  @Output() rubricPhraseSelected = new EventEmitter<string>();

  readonly mediaTypes = Object.entries(CLINICAL_MEDIA_TYPE_LABELS) as Array<[ClinicalMediaType, string]>;
  readonly media = signal<ClinicalMediaItem[]>([]);
  readonly loading = signal(false);
  readonly uploading = signal(false);
  readonly savingMediaId = signal('');
  readonly deletingMediaId = signal('');
  readonly error = signal('');
  readonly message = signal('');
  readonly previewUrls = signal<Record<string, string>>({});
  readonly suggestedPhrases = signal<string[]>([]);
  readonly visionAvailable = signal<boolean | null>(null);
  readonly visionModel = signal('');
  readonly analyzingMediaId = signal('');
  readonly imageAnalysisPreview = signal<ClinicalMediaImageAnalysis | null>(null);

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
    if (this.analysisId) {
      void this.bootstrap();
    }
  }

  async bootstrap() {
    await Promise.all([this.reload(), this.loadVisionStatus()]);
  }

  async loadVisionStatus() {
    try {
      const status = await this.api.clinicalMediaVisionStatus();
      this.visionAvailable.set(status.available);
      this.visionModel.set(status.model);
    } catch {
      this.visionAvailable.set(false);
      this.visionModel.set('');
    }
  }

  ngOnDestroy() {
    this.revokePreviewUrls();
    this.revokeSelectedPreview();
  }

  bodyRegions() {
    return CLINICAL_MEDIA_BODY_REGIONS[this.uploadModel().mediaType] ?? [];
  }

  async reload() {
    this.loading.set(true);
    this.error.set('');
    try {
      const items = await this.api.listClinicalMedia(this.analysisId);
      this.media.set(items);
      this.revokePreviewUrls();
      const next: Record<string, string> = {};
      for (const item of items) {
        const blob = await this.api.loadClinicalMediaFile(item.fileUrl);
        next[item.id] = URL.createObjectURL(blob);
      }
      this.previewUrls.set(next);
    } catch {
      this.error.set('Could not load clinical images.');
      this.media.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.selectedFile = file;
    this.revokeSelectedPreview();
    if (file) {
      this.previewObjectUrl = URL.createObjectURL(file);
    }
  }

  async uploadSelectedFile() {
    const file = this.selectedFile;
    const form = this.uploadModel();
    if (!file) {
      this.error.set('Choose an image to upload.');
      return;
    }
    if (!form.patientConsent) {
      this.error.set('Confirm patient consent before uploading clinical images.');
      return;
    }

    this.uploading.set(true);
    this.error.set('');
    this.message.set('');
    try {
      const dataBase64 = await this.readFileAsBase64(file);
      await this.api.uploadClinicalMedia(this.analysisId, {
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
      this.uploadModel.set({
        mediaType: form.mediaType,
        bodyRegion: '',
        diseaseId: '',
        conditionLabel: '',
        observations: '',
        patientConsent: false
      });
      this.selectedFile = null;
      this.revokeSelectedPreview();
      this.message.set('Clinical image attached.');
      await this.reload();
    } catch {
      this.error.set('Upload failed. Use JPEG/PNG/WebP/GIF under 5 MB.');
    } finally {
      this.uploading.set(false);
    }
  }

  async saveObservations(item: ClinicalMediaItem, observations: string) {
    this.savingMediaId.set(item.id);
    this.error.set('');
    try {
      const updated = await this.api.updateClinicalMedia(this.analysisId, item.id, {
        observations: observations.trim()
      });
      this.media.update((rows) => rows.map((row) => (row.id === item.id ? updated : row)));
      await this.refreshSuggestions(updated);
    } catch {
      this.error.set('Could not save observations.');
    } finally {
      this.savingMediaId.set('');
    }
  }

  async removeMedia(item: ClinicalMediaItem) {
    this.deletingMediaId.set(item.id);
    this.error.set('');
    try {
      await this.api.deleteClinicalMedia(this.analysisId, item.id);
      const url = this.previewUrls()[item.id];
      if (url) URL.revokeObjectURL(url);
      this.previewUrls.update((rows) => {
        const next = { ...rows };
        delete next[item.id];
        return next;
      });
      this.media.update((rows) => rows.filter((row) => row.id !== item.id));
    } catch {
      this.error.set('Could not delete image.');
    } finally {
      this.deletingMediaId.set('');
    }
  }

  async refreshSuggestions(item?: ClinicalMediaItem) {
    const source = item ?? null;
    const draft = this.uploadModel();
    const mediaType = (source?.mediaType ?? draft.mediaType) as ClinicalMediaType;
    const observations = source?.observations ?? draft.observations;
    const bodyRegion = source?.bodyRegion ?? draft.bodyRegion;
    const phrases = suggestRubricSearchPhrases({ mediaType, observations, bodyRegion });
    this.suggestedPhrases.set(phrases);
  }

  applyPhrase(phrase: string) {
    this.rubricPhraseSelected.emit(phrase);
  }

  dismissImageAnalysis() {
    this.imageAnalysisPreview.set(null);
  }

  async analyzeImage(item: ClinicalMediaItem, saveObservations = false) {
    this.analyzingMediaId.set(item.id);
    this.error.set('');
    this.message.set('');
    try {
      const response = await this.api.analyzeClinicalMediaImage(this.analysisId, item.id, {
        saveObservations
      });
      this.imageAnalysisPreview.set(response.analysis);
      if (response.media) {
        this.media.update((rows) => rows.map((row) => (row.id === item.id ? response.media! : row)));
      }
      this.message.set(saveObservations ? 'Vision text saved to observations.' : response.analysis.summary);
    } catch {
      this.error.set(
        'Image analysis failed. Ensure Ollama is running locally and the vision model is pulled (ollama pull qwen2.5-vl:7b).'
      );
    } finally {
      this.analyzingMediaId.set('');
    }
  }

  async useVisionObservations(item: ClinicalMediaItem) {
    const preview = this.imageAnalysisPreview();
    if (!preview || preview.mediaId !== item.id) return;

    this.savingMediaId.set(item.id);
    this.error.set('');
    try {
      const merged = [item.observations?.trim(), preview.extractedSymptoms].filter(Boolean).join('\n\n');
      const updated = await this.api.updateClinicalMedia(this.analysisId, item.id, {
        observations: merged
      });
      this.media.update((rows) => rows.map((row) => (row.id === item.id ? updated : row)));
      await this.refreshSuggestions(updated);
      this.message.set('Vision text added to observations.');
    } catch {
      this.error.set('Could not save vision observations.');
    } finally {
      this.savingMediaId.set('');
    }
  }

  private async readFileAsBase64(file: File) {
    const buffer = await file.arrayBuffer();
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.length; i += 1) {
      binary += String.fromCharCode(bytes[i] ?? 0);
    }
    return btoa(binary);
  }

  private revokePreviewUrls() {
    for (const url of Object.values(this.previewUrls())) {
      URL.revokeObjectURL(url);
    }
    this.previewUrls.set({});
  }

  private revokeSelectedPreview() {
    if (this.previewObjectUrl) {
      URL.revokeObjectURL(this.previewObjectUrl);
      this.previewObjectUrl = null;
    }
  }

  selectedPreviewUrl() {
    return this.previewObjectUrl;
  }

  setDiseaseId(diseaseId: string) {
    this.uploadModel.update((model) => ({ ...model, diseaseId }));
  }
}

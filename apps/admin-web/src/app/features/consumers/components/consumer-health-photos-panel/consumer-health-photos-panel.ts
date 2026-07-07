import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, Input, OnChanges, OnDestroy, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { AdminApi } from '../../../../core/services/admin-api';

type HealthPhoto = {
  id: string;
  mediaTypeLabel?: string | null;
  bodyRegion?: string | null;
  conditionLabel?: string | null;
  diseaseName?: string | null;
  fileUrl: string;
  createdAt: string;
};

@Component({
  selector: 'app-consumer-health-photos-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './consumer-health-photos-panel.html',
  styleUrl: './consumer-health-photos-panel.scss'
})
export class ConsumerHealthPhotosPanelComponent implements OnChanges, OnDestroy {
  private readonly api = inject(AdminApi);
  private readonly http = inject(HttpClient);

  @Input({ required: true }) patientId!: string;

  readonly photos = signal<HealthPhoto[]>([]);
  readonly previewUrls = signal<Record<string, string>>({});
  readonly loading = signal(false);
  readonly error = signal('');

  private objectUrls: string[] = [];

  ngOnChanges() {
    if (this.patientId) void this.reload();
  }

  ngOnDestroy() {
    this.revokePreviews();
  }

  async reload() {
    this.loading.set(true);
    this.error.set('');
    this.revokePreviews();
    try {
      const res = await this.api.listPatientClinicalMedia(this.patientId);
      const items = (res.media || []) as HealthPhoto[];
      this.photos.set(items);
      const next: Record<string, string> = {};
      for (const item of items.slice(0, 12)) {
        try {
          const blob = await firstValueFrom(
            this.http.get(`${environment.apiUrl}${item.fileUrl}`, { responseType: 'blob' })
          );
          const url = URL.createObjectURL(blob);
          this.objectUrls.push(url);
          next[item.id] = url;
        } catch {
          // skip broken thumbnail
        }
      }
      this.previewUrls.set(next);
    } catch {
      this.photos.set([]);
      this.error.set('Could not load health photos.');
    } finally {
      this.loading.set(false);
    }
  }

  private revokePreviews() {
    for (const url of this.objectUrls) URL.revokeObjectURL(url);
    this.objectUrls = [];
    this.previewUrls.set({});
  }
}

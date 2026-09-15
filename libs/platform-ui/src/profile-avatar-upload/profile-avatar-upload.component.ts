import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  signal
} from '@angular/core';

@Component({
  selector: 'hopehub-profile-avatar-upload',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './profile-avatar-upload.component.html',
  styleUrl: './profile-avatar-upload.component.scss'
})
export class ProfileAvatarUploadComponent implements OnChanges, OnDestroy {
  @Input({ required: true }) apiBase!: string;
  @Input({ required: true }) tokenKey!: string;
  @Input({ required: true }) displayName!: string;
  @Input() profileImageUrl: string | null = null;
  @Input() editable = true;
  @Input() uploadPath = '/me/profile-image';
  @Input() galleryPath: string | null = null;
  @Input() maxImages = 8;
  @Input() size: 'md' | 'lg' = 'lg';

  @Output() profileImageChange = new EventEmitter<string | null>();

  readonly previewUrl = signal<string | null>(null);
  readonly uploading = signal(false);
  readonly removing = signal(false);
  readonly error = signal('');
  readonly galleryImages = signal<ProfileGalleryImage[]>([]);
  readonly galleryLoading = signal(false);

  private objectUrl: string | null = null;
  private localPreviewUrl: string | null = null;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['profileImageUrl']) {
      void this.loadPreview();
    }
    if (changes['galleryPath'] || changes['apiBase'] || changes['tokenKey']) {
      void this.loadGallery();
    }
  }

  ngOnDestroy() {
    this.revokeObjectUrl();
    this.revokeLocalPreview();
  }

  initial() {
    return (this.displayName || 'U').charAt(0).toUpperCase();
  }

  async onFileSelected(event: Event) {
    if (!this.editable) return;

    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    input.value = '';
    if (!files.length) return;

    if (files.some((file) => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type))) {
      this.error.set('Use a JPEG, PNG, or WebP image.');
      return;
    }
    if (files.some((file) => file.size > 2 * 1024 * 1024)) {
      this.error.set('Each image must be 2 MB or smaller.');
      return;
    }
    if (this.galleryPath && this.galleryImages().length + files.length > this.maxImages) {
      this.error.set(`You can keep up to ${this.maxImages} profile photos.`);
      return;
    }

    this.revokeLocalPreview();
    this.localPreviewUrl = URL.createObjectURL(files[0]);
    this.previewUrl.set(this.localPreviewUrl);

    this.uploading.set(true);
    this.error.set('');
    try {
      let primaryUrl = this.profileImageUrl;
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file, file.name);
        formData.append('fileName', file.name);
        if (this.galleryPath) {
          const response = await this.apiFetch<{ image: ProfileGalleryImage }>(this.galleryPath, {
            method: 'POST',
            body: formData
          });
          if (response.image.isPrimary) primaryUrl = response.image.imageUrl;
        } else {
          const response = await this.apiFetch<{
            profileImageUrl: string | null;
            message?: string;
          }>(this.uploadPath, { method: 'PUT', body: formData });
          primaryUrl = response.profileImageUrl ?? null;
          break;
        }
      }
      this.profileImageChange.emit(primaryUrl ?? null);
      this.revokeLocalPreview();
      await Promise.all([this.loadPreview(primaryUrl ?? null), this.loadGallery()]);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Could not upload photo.');
      this.revokeLocalPreview();
      await Promise.all([this.loadPreview(), this.loadGallery()]);
    } finally {
      this.uploading.set(false);
    }
  }

  async removePhoto() {
    if (!this.editable || !this.profileImageUrl) return;

    if (this.galleryPath) {
      const primary = this.galleryImages().find((image) => image.isPrimary);
      if (primary) {
        await this.removeGalleryPhoto(primary);
        return;
      }
    }

    this.removing.set(true);
    this.error.set('');
    try {
      await this.apiFetch<{ profileImageUrl: null }>(this.uploadPath, { method: 'DELETE' });
      this.profileImageChange.emit(null);
      this.revokeObjectUrl();
      this.previewUrl.set(null);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Could not remove photo.');
    } finally {
      this.removing.set(false);
    }
  }

  async makePrimary(image: ProfileGalleryImage) {
    if (!this.editable || !this.galleryPath || image.isPrimary) return;
    this.error.set('');
    try {
      const response = await this.apiFetch<{ profileImageUrl: string }>(
        `${this.galleryPath}/${encodeURIComponent(image.id)}/primary`,
        { method: 'PATCH' }
      );
      this.profileImageChange.emit(response.profileImageUrl);
      await Promise.all([this.loadPreview(response.profileImageUrl), this.loadGallery()]);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Could not select this photo.');
    }
  }

  async removeGalleryPhoto(image: ProfileGalleryImage) {
    if (!this.editable || !this.galleryPath || this.removing()) return;
    this.removing.set(true);
    this.error.set('');
    try {
      const response = await this.apiFetch<{ profileImageUrl: string | null }>(
        `${this.galleryPath}/${encodeURIComponent(image.id)}`,
        { method: 'DELETE' }
      );
      this.profileImageChange.emit(response.profileImageUrl ?? null);
      await Promise.all([this.loadPreview(response.profileImageUrl ?? null), this.loadGallery()]);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Could not remove photo.');
    } finally {
      this.removing.set(false);
    }
  }

  private async loadGallery() {
    if (!this.galleryPath || !this.apiBase || !this.tokenKey) {
      this.galleryImages.set([]);
      return;
    }
    this.galleryLoading.set(true);
    try {
      const response = await this.apiFetch<{ images: ProfileGalleryImage[]; limit?: number }>(
        this.galleryPath,
        { method: 'GET' }
      );
      this.galleryImages.set(response.images || []);
      if (response.limit) this.maxImages = response.limit;
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Could not load profile photos.');
    } finally {
      this.galleryLoading.set(false);
    }
  }

  private async loadPreview(url = this.profileImageUrl) {
    this.revokeObjectUrl();
    if (!url) {
      this.previewUrl.set(null);
      return;
    }

    if (/^https?:\/\//i.test(url)) {
      this.previewUrl.set(url);
      return;
    }

    try {
      const token = localStorage.getItem(this.tokenKey) || '';
      const res = await fetch(`${this.apiBase}${url}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined
      });
      if (!res.ok) {
        this.previewUrl.set(null);
        return;
      }
      const blob = await res.blob();
      this.objectUrl = URL.createObjectURL(blob);
      this.previewUrl.set(this.objectUrl);
    } catch {
      this.previewUrl.set(null);
    }
  }

  private async apiFetch<T>(path: string, init: RequestInit): Promise<T> {
    const token = localStorage.getItem(this.tokenKey) || '';
    const res = await fetch(`${this.apiBase}${path}`, {
      ...init,
      headers: {
        ...(init.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        Authorization: `Bearer ${token}`,
        ...(init.headers || {})
      }
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error((data as { message?: string }).message || 'Request failed');
    }
    return data as T;
  }

  private revokeObjectUrl() {
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }
  }

  private revokeLocalPreview() {
    if (this.localPreviewUrl) {
      URL.revokeObjectURL(this.localPreviewUrl);
      this.localPreviewUrl = null;
    }
  }
}

type ProfileGalleryImage = {
  id: string;
  imageUrl: string;
  mimeType?: string | null;
  byteSize?: number | null;
  isPrimary: boolean;
  createdAt: string;
};

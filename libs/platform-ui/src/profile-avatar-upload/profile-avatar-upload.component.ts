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
  @Input() size: 'md' | 'lg' = 'lg';

  @Output() profileImageChange = new EventEmitter<string | null>();

  readonly previewUrl = signal<string | null>(null);
  readonly uploading = signal(false);
  readonly removing = signal(false);
  readonly error = signal('');

  private objectUrl: string | null = null;
  private localPreviewUrl: string | null = null;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['profileImageUrl']) {
      void this.loadPreview();
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
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      this.error.set('Use a JPEG, PNG, or WebP image.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      this.error.set('Image must be 2 MB or smaller.');
      return;
    }

    this.revokeLocalPreview();
    this.localPreviewUrl = URL.createObjectURL(file);
    this.previewUrl.set(this.localPreviewUrl);

    this.uploading.set(true);
    this.error.set('');
    try {
      const dataBase64 = await this.readFileAsBase64(file);
      const response = await this.apiFetch<{ profileImageUrl: string | null; message?: string }>(
        this.uploadPath,
        {
          method: 'PUT',
          body: JSON.stringify({
            mimeType: file.type,
            fileName: file.name,
            dataBase64
          })
        }
      );
      this.profileImageChange.emit(response.profileImageUrl ?? null);
      this.revokeLocalPreview();
      await this.loadPreview(response.profileImageUrl ?? null);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Could not upload photo.');
      this.revokeLocalPreview();
      await this.loadPreview();
    } finally {
      this.uploading.set(false);
    }
  }

  async removePhoto() {
    if (!this.editable || !this.profileImageUrl) return;

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

  private async loadPreview(url = this.profileImageUrl) {
    this.revokeObjectUrl();
    if (!url) {
      this.previewUrl.set(null);
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
        'Content-Type': 'application/json',
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

  private readFileAsBase64(file: File) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result || '');
        const comma = result.indexOf(',');
        resolve(comma >= 0 ? result.slice(comma + 1) : result);
      };
      reader.onerror = () => reject(new Error('Could not read image file.'));
      reader.readAsDataURL(file);
    });
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

import { booleanAttribute, Component, EventEmitter, Input, Output, signal } from '@angular/core';

export type AdminMediaUploadResult = {
  fileUrl: string;
  mimeType?: string;
  byteSize?: number;
};

type MediaPreviewKind = 'image' | 'video' | 'audio' | 'link';

/**
 * Reusable admin field for media stored as a URL.
 *
 * The owning page provides the upload function, while this component handles
 * file validation, upload state, preview, manual URL entry, and clearing.
 */
@Component({
  selector: 'app-media-url-field',
  standalone: true,
  template: `
    <div class="media-field" [class.media-field--compact]="compact">
      @if (label || help) {
        <div class="media-field__heading">
          @if (label) {
            <strong>{{ label }}</strong>
          }
          @if (help) {
            <small>{{ help }}</small>
          }
        </div>
      }

      @if (value) {
        <div class="media-field__preview">
          @switch (previewKind()) {
            @case ('video') {
              <video [src]="value" controls preload="metadata"></video>
            }
            @case ('audio') {
              <audio [src]="value" controls preload="metadata"></audio>
            }
            @case ('image') {
              <img [src]="value" [alt]="label ? label + ' preview' : 'Media preview'" />
            }
            @default {
              <a [href]="value" target="_blank" rel="noopener noreferrer">Open uploaded media</a>
            }
          }
        </div>
      }

      <div class="media-field__controls">
        <input
          class="media-field__url"
          type="text"
          inputmode="url"
          autocomplete="off"
          [value]="value"
          [disabled]="disabled || uploading()"
          [placeholder]="placeholder"
          [attr.aria-label]="label || 'Media URL'"
          (input)="onUrlInput($any($event.target).value)"
        />
        <input
          #fileInput
          class="media-field__file"
          type="file"
          [accept]="accept"
          [disabled]="disabled || uploading()"
          (change)="uploadSelectedFile($event)"
        />
        <button
          type="button"
          class="media-field__upload"
          [disabled]="disabled || uploading() || !uploadFile"
          (click)="fileInput.click()"
        >
          {{ uploading() ? 'Uploading…' : value ? 'Replace' : 'Upload' }}
        </button>
        @if (value) {
          <button
            type="button"
            class="media-field__clear"
            [disabled]="disabled || uploading()"
            (click)="clear()"
          >
            Clear
          </button>
        }
      </div>

      @if (status()) {
        <small class="media-field__status" role="status">{{ status() }}</small>
      }
      @if (error()) {
        <small class="media-field__error" role="alert">{{ error() }}</small>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        min-width: 0;
      }

      .media-field {
        display: grid;
        gap: 0.65rem;
        min-width: 0;
      }

      .media-field__heading {
        display: grid;
        gap: 0.2rem;
      }

      .media-field__heading strong {
        color: var(--color-text, #172033);
        font-size: 0.9rem;
      }

      .media-field__heading small,
      .media-field__status {
        color: var(--color-text-secondary, #64748b);
        line-height: 1.45;
      }

      .media-field__preview {
        display: grid;
        max-width: 24rem;
        overflow: hidden;
        border: 1px solid var(--color-border, #dbe3ec);
        border-radius: var(--radius-sm, 0.65rem);
        background: var(--color-surface-muted, #f8fafc);
      }

      .media-field__preview img,
      .media-field__preview video {
        display: block;
        width: 100%;
        max-height: 13rem;
        object-fit: contain;
      }

      .media-field__preview audio {
        width: 100%;
        margin: 0.75rem;
        max-width: calc(100% - 1.5rem);
      }

      .media-field__preview a {
        padding: 0.8rem;
        color: var(--color-brand, #0f766e);
        font-weight: 700;
        overflow-wrap: anywhere;
      }

      .media-field__controls {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto auto;
        gap: 0.5rem;
        align-items: stretch;
      }

      .media-field__url,
      .media-field__upload,
      .media-field__clear {
        min-height: 2.65rem;
        border-radius: var(--radius-sm, 0.65rem);
        font: inherit;
      }

      .media-field__url {
        min-width: 0;
        border: 1px solid var(--color-border, #cbd5e1);
        background: var(--color-surface, #ffffff);
        color: var(--color-text, #172033);
        padding: 0.68rem 0.75rem;
      }

      .media-field__url:focus-visible,
      .media-field__upload:focus-visible,
      .media-field__clear:focus-visible {
        outline: 3px solid color-mix(in srgb, var(--color-brand, #0f766e) 24%, transparent);
        outline-offset: 2px;
      }

      .media-field__file {
        position: absolute;
        width: 1px;
        height: 1px;
        overflow: hidden;
        clip: rect(0 0 0 0);
        clip-path: inset(50%);
        white-space: nowrap;
      }

      .media-field__upload,
      .media-field__clear {
        border: 1px solid var(--color-border, #cbd5e1);
        cursor: pointer;
        font-weight: 800;
        padding: 0.65rem 0.85rem;
      }

      .media-field__upload {
        border-color: var(--color-brand, #0f766e);
        background: var(--color-brand, #0f766e);
        color: #ffffff;
      }

      .media-field__clear {
        background: var(--color-surface, #ffffff);
        color: var(--color-text-secondary, #475569);
      }

      .media-field__upload:disabled,
      .media-field__clear:disabled,
      .media-field__url:disabled {
        cursor: not-allowed;
        opacity: 0.58;
      }

      .media-field__status {
        color: var(--color-success, #15803d);
      }

      .media-field__error {
        color: var(--color-error, #dc2626);
        line-height: 1.45;
      }

      .media-field--compact .media-field__preview {
        max-width: 18rem;
      }

      @media (max-width: 640px) {
        .media-field__controls {
          grid-template-columns: minmax(0, 1fr) auto;
        }

        .media-field__url {
          grid-column: 1 / -1;
        }
      }
    `,
  ],
})
export class AppMediaUrlFieldComponent {
  @Input() value = '';
  @Input() label = 'Media URL';
  @Input() help = 'Paste a public URL or upload a file.';
  @Input() placeholder = 'https://...';
  @Input() accept =
    'image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime';
  @Input() maxBytes = 5 * 1024 * 1024;
  @Input({ transform: booleanAttribute }) disabled = false;
  @Input({ transform: booleanAttribute }) compact = false;
  @Input() uploadFile?: (file: File) => Promise<AdminMediaUploadResult>;

  @Output() readonly valueChange = new EventEmitter<string>();
  @Output() readonly uploaded = new EventEmitter<AdminMediaUploadResult>();

  readonly uploading = signal(false);
  readonly status = signal('');
  readonly error = signal('');
  private readonly uploadedMimeType = signal('');

  onUrlInput(value: string) {
    this.status.set('');
    this.error.set('');
    this.uploadedMimeType.set('');
    this.valueChange.emit(value);
  }

  clear() {
    this.status.set('');
    this.error.set('');
    this.uploadedMimeType.set('');
    this.valueChange.emit('');
  }

  async uploadSelectedFile(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || !this.uploadFile) return;

    this.status.set('');
    this.error.set('');
    if (!this.acceptsMimeType(file.type)) {
      this.error.set('Choose a supported image, GIF, or video file.');
      return;
    }
    if (file.size > this.maxBytes) {
      this.error.set(`File must be ${this.formatBytes(this.maxBytes)} or smaller.`);
      return;
    }

    this.uploading.set(true);
    try {
      const result = await this.uploadFile(file);
      this.uploadedMimeType.set(result.mimeType || file.type);
      this.valueChange.emit(result.fileUrl);
      this.uploaded.emit(result);
      this.status.set('Uploaded. Save the form to apply this URL.');
    } catch (uploadError) {
      this.error.set(this.errorMessage(uploadError));
    } finally {
      this.uploading.set(false);
    }
  }

  previewKind(): MediaPreviewKind {
    const mimeType = this.uploadedMimeType().toLowerCase();
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.startsWith('image/')) return 'image';

    const path = this.value.split(/[?#]/, 1)[0].toLowerCase();
    if (/\.(mp4|webm|mov|m4v)$/.test(path)) return 'video';
    if (/\.(mp3|m4a|aac|wav|oga|ogg)$/.test(path)) return 'audio';
    if (/\.(jpe?g|png|webp|gif|avif|svg)$/.test(path)) return 'image';
    return 'link';
  }

  private acceptsMimeType(mimeType: string) {
    const accepted = this.accept
      .split(',')
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean);
    const normalized = mimeType.toLowerCase();
    return accepted.some((value) =>
      value.endsWith('/*') ? normalized.startsWith(value.slice(0, -1)) : normalized === value,
    );
  }

  private formatBytes(bytes: number) {
    if (bytes >= 1024 * 1024) return `${Math.floor(bytes / (1024 * 1024))} MB`;
    return `${Math.floor(bytes / 1024)} KB`;
  }

  private errorMessage(error: unknown) {
    const response = error as { error?: { message?: string }; message?: string };
    return response?.error?.message || response?.message || 'Could not upload this media file.';
  }
}

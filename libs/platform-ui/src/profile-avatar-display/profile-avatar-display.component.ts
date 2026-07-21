import { CommonModule } from '@angular/common';
import {
  Component,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  signal
} from '@angular/core';

@Component({
  selector: 'hopehub-profile-avatar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './profile-avatar-display.component.html',
  styleUrl: './profile-avatar-display.component.scss'
})
export class ProfileAvatarDisplayComponent implements OnChanges, OnDestroy {
  @Input({ required: true }) apiBase!: string;
  @Input({ required: true }) tokenKey!: string;
  @Input({ required: true }) displayName!: string;
  @Input() profileImageUrl: string | null = null;
  @Input() size: 'sm' | 'md' = 'sm';

  readonly previewUrl = signal<string | null>(null);

  private objectUrl: string | null = null;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['profileImageUrl'] || changes['apiBase'] || changes['tokenKey']) {
      void this.loadPreview();
    }
  }

  ngOnDestroy() {
    this.revokeObjectUrl();
  }

  initial() {
    return (this.displayName || 'U').charAt(0).toUpperCase();
  }

  private async loadPreview() {
    this.revokeObjectUrl();
    if (!this.profileImageUrl) {
      this.previewUrl.set(null);
      return;
    }

    try {
      const token = localStorage.getItem(this.tokenKey) || '';
      const res = await fetch(`${this.apiBase}${this.profileImageUrl}`, {
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

  private revokeObjectUrl() {
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }
  }
}

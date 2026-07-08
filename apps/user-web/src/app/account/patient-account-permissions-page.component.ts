import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import {
  APP_PERMISSIONS_HELP,
  PERMISSIONS_TRUST_COPY,
  type PermissionStatusLabel
} from '../core/constants/native-permissions.constants';
import { NativePermissionsService } from '../core/services/native-permissions.service';

@Component({
  selector: 'app-patient-account-permissions-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './patient-account-permissions-page.component.html',
  styleUrl: './patient-account-permissions-page.component.scss'
})
export class PatientAccountPermissionsPageComponent implements OnInit {
  private readonly permissions = inject(NativePermissionsService);

  readonly copy = PERMISSIONS_TRUST_COPY;
  readonly items = APP_PERMISSIONS_HELP;
  readonly isNative = Capacitor.isNativePlatform();
  readonly platform = Capacitor.getPlatform();
  readonly loading = signal(true);
  readonly statuses = signal<Record<string, PermissionStatusLabel>>({});

  ngOnInit() {
    void this.loadStatuses();
  }

  private async loadStatuses() {
    try {
      this.statuses.set(await this.permissions.getPermissionStatuses());
    } finally {
      this.loading.set(false);
    }
  }

  statusLabel(id: string): string {
    const status = this.statuses()[id];
    const map: Record<PermissionStatusLabel, string> = {
      granted: 'Allowed',
      denied: 'Blocked',
      limited: 'Limited access',
      'not-asked': 'Not asked yet',
      web: 'Browser manages this'
    };
    return map[status] ?? 'Unknown';
  }

  statusClass(id: string): string {
    const status = this.statuses()[id];
    if (status === 'granted' || status === 'limited') return 'status-ok';
    if (status === 'denied') return 'status-blocked';
    return 'status-neutral';
  }

  settingsHint(): string {
    if (!this.isNative) {
      return 'On the website, use your browser’s site settings (lock icon in the address bar) to manage camera, microphone, and notifications.';
    }
    return this.platform === 'ios' ? this.copy.settingsIos : this.copy.settingsAndroid;
  }
}

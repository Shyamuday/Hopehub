import { Component, inject, OnInit, signal } from '@angular/core';
import { ProfileAvatarUploadComponent } from '@hopehub/platform-ui';
import { environment } from '../../../../environments/environment';
import { AUTH_TOKEN_KEY } from '../../../core/constants/auth.constants';
import { AdminAuth } from '../../../core/services/admin-auth';

@Component({
  selector: 'app-account-page',
  standalone: true,
  imports: [ProfileAvatarUploadComponent],
  templateUrl: './account-page.html',
  styleUrl: './account-page.scss'
})
export class AccountPage implements OnInit {
  private readonly auth = inject(AdminAuth);

  readonly apiBase = environment.apiUrl;
  readonly authTokenKey = AUTH_TOKEN_KEY;
  readonly profileImageUploadPath = '/me/profile-image';
  readonly loading = signal(false);
  readonly profileImageUrl = signal<string | null>(null);

  ngOnInit(): void {
    void this.loadProfile();
  }

  async loadProfile() {
    this.loading.set(true);
    try {
      const user = await this.auth.refreshSession();
      this.profileImageUrl.set(user?.profileImageUrl ?? null);
    } catch {
      this.profileImageUrl.set(this.auth.user()?.profileImageUrl ?? null);
    } finally {
      this.loading.set(false);
    }
  }

  onProfileImageChange(profileImageUrl: string | null) {
    this.profileImageUrl.set(profileImageUrl);
    const user = this.auth.user();
    if (user) {
      this.auth.setUser({ ...user, profileImageUrl });
    }
  }

  displayName() {
    return this.auth.user()?.name ?? 'Admin';
  }

  email() {
    return this.auth.user()?.email ?? '';
  }

  roleLabel() {
    return (this.auth.user()?.role ?? 'ADMIN').replace(/_/g, ' ');
  }
}

import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ProfileAvatarUploadComponent } from '@hopehub/platform-ui';
import { environment } from '../../../environments/environment';
import { AUTH_TOKEN_KEY } from '../../core/constants/auth.constants';
import { PlatformAuthService } from '../../services/platform-auth.service';

@Component({
  selector: 'app-account',
  standalone: true,
  imports: [ProfileAvatarUploadComponent],
  templateUrl: './account.component.html',
  styleUrl: './account.component.scss'
})
export class AccountComponent implements OnInit {
  private readonly auth = inject(PlatformAuthService);

  readonly apiBase = environment.apiUrl;
  readonly authTokenKey = AUTH_TOKEN_KEY;
  readonly loading = signal(false);

  readonly displayName = computed(() => this.auth.currentUser()?.name ?? 'Staff');
  readonly email = computed(() => this.auth.currentUser()?.email ?? '');
  readonly roleLabel = computed(() => (this.auth.currentUser()?.role ?? 'Staff').replace(/_/g, ' '));
  readonly storeName = computed(() => this.auth.storeStaff()?.storeName ?? '');
  readonly isStoreSession = computed(() => this.auth.isStoreSession());

  profileImageUrl = signal<string | null>(null);
  uploadPath = '/me/profile-image';

  ngOnInit(): void {
    void this.loadProfile();
  }

  async loadProfile() {
    this.loading.set(true);
    try {
      if (this.auth.isStoreSession()) {
        this.uploadPath = '/store/me/profile-image';
        const staff = this.auth.storeStaff();
        this.profileImageUrl.set(staff?.profileImageUrl ?? null);
        const token = this.auth.getToken();
        if (token) {
          const res = await fetch(`${this.apiBase}/store/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            const profileImageUrl = data?.staff?.profileImageUrl ?? null;
            this.profileImageUrl.set(profileImageUrl);
            if (staff && data?.staff) {
              this.auth.storeStaff.set({ ...staff, profileImageUrl });
            }
          }
        }
      } else {
        this.uploadPath = '/me/profile-image';
        await new Promise<void>((resolve, reject) => {
          this.auth.fetchMe().subscribe({
            next: (session) => {
              this.profileImageUrl.set(session.user.profileImageUrl ?? null);
              resolve();
            },
            error: () => reject()
          });
        });
      }
    } catch {
      this.profileImageUrl.set(this.auth.currentUser()?.profileImageUrl ?? null);
    } finally {
      this.loading.set(false);
    }
  }

  onProfileImageChange(profileImageUrl: string | null) {
    this.profileImageUrl.set(profileImageUrl);
    const user = this.auth.currentUser();
    if (user) {
      this.auth.currentUser.set({ ...user, profileImageUrl });
      localStorage.setItem('operations_user', JSON.stringify({ ...user, profileImageUrl }));
    }
    const staff = this.auth.storeStaff();
    if (staff) {
      const next = { ...staff, profileImageUrl };
      this.auth.storeStaff.set(next);
      localStorage.setItem('operations_store_staff', JSON.stringify(next));
    }
  }
}

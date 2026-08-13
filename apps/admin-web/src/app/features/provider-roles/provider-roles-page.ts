import { HttpClient } from '@angular/common/http';
import { Component, computed, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CLINIC_API_BASE_URL } from '@hopehub/clinic-api';
import { AdminCanDirective } from '../../core/directives/admin-can.directive';
import { ADMIN_PERMISSIONS, staffHasAllPermissions } from '../../core/admin-permissions';
import { AdminAuth } from '../../core/services/admin-auth';
import type { ProviderRoleDefinitionDto, ProviderSessionMode } from '@hopehub/contracts';

type ProviderRoleForm = {
  code: string;
  label: string;
  shortLabel: string;
  category: string;
  tone: string;
  description: string;
  scope: string;
  bestForText: string;
  notForText: string;
  ctaLabel: string;
  supportedModes: ProviderSessionMode[];
  requiresCredentials: boolean;
  requiresListenerScreening: boolean;
  isClinicalCare: boolean;
  isActive: boolean;
  sortOrder: number;
  version?: number;
};

@Component({
  selector: 'app-provider-roles-page',
  standalone: true,
  imports: [FormsModule, AdminCanDirective],
  templateUrl: './provider-roles-page.html',
  styleUrl: './provider-roles-page.scss',
})
export class ProviderRolesPage implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly apiBase = inject(CLINIC_API_BASE_URL);
  private readonly auth = inject(AdminAuth);
  readonly managePermission = ADMIN_PERMISSIONS.DOCTORS_WRITE;
  readonly canManage = computed(() =>
    staffHasAllPermissions(this.auth.user(), this.managePermission),
  );

  readonly roles = signal<ProviderRoleDefinitionDto[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly message = signal('');
  readonly form = signal<ProviderRoleForm>(this.emptyForm());

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.http
      .get<{ roles: ProviderRoleDefinitionDto[] }>(
        `${this.apiBase}/admin/provider-roles?includeInactive=true`,
      )
      .subscribe({
        next: ({ roles }) => {
          this.roles.set(roles);
          if (roles.length && !this.form().code) this.edit(roles[0]);
          this.loading.set(false);
        },
        error: (error) => {
          this.error.set(error?.error?.message || 'Could not load provider roles.');
          this.loading.set(false);
        },
      });
  }

  edit(role: ProviderRoleDefinitionDto): void {
    this.form.set({
      ...role,
      bestForText: (role.bestFor || []).join('\n'),
      notForText: (role.notFor || []).join('\n'),
      supportedModes: [...(role.supportedModes || ['CHAT', 'VOICE', 'VIDEO'])],
    });
    this.error.set('');
    this.message.set('');
  }

  newRole(): void {
    this.form.set(this.emptyForm());
  }

  setField<K extends keyof ProviderRoleForm>(key: K, value: ProviderRoleForm[K]): void {
    this.form.update((form) => ({ ...form, [key]: value }));
  }

  toggleMode(mode: ProviderSessionMode): void {
    const current = this.form().supportedModes;
    this.setField(
      'supportedModes',
      current.includes(mode) ? current.filter((item) => item !== mode) : [...current, mode],
    );
  }

  save(): void {
    if (!this.canManage()) return;
    const form = this.form();
    if (!form.code || !form.label || !form.supportedModes.length) {
      this.error.set('Code, label, and at least one session mode are required.');
      return;
    }
    const exists = this.roles().some((role) => role.code === form.code);
    const { bestForText, notForText, version: _version, code, ...fields } = form;
    const payload = {
      ...fields,
      domain: 'HOPE_HUB',
      ...(!exists ? { code } : {}),
      bestFor: this.lines(bestForText),
      notFor: this.lines(notForText),
    };

    this.saving.set(true);
    this.error.set('');
    const request = exists
      ? this.http.patch(
          `${this.apiBase}/admin/provider-roles/${encodeURIComponent(form.code)}`,
          payload,
        )
      : this.http.post(`${this.apiBase}/admin/provider-roles`, payload);
    request.subscribe({
      next: () => {
        this.message.set(
          exists ? 'Role updated. Existing sessions keep their saved definition.' : 'Role created.',
        );
        this.saving.set(false);
        this.load();
      },
      error: (error) => {
        this.error.set(error?.error?.message || 'Could not save provider role.');
        this.saving.set(false);
      },
    });
  }

  private lines(value: string): string[] {
    return value
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  private emptyForm(): ProviderRoleForm {
    return {
      code: '',
      label: '',
      shortLabel: '',
      category: 'COACH_MENTOR',
      tone: 'coach',
      description: '',
      scope: '',
      bestForText: '',
      notForText: '',
      ctaLabel: 'Book session',
      supportedModes: ['CHAT', 'VOICE', 'VIDEO'],
      requiresCredentials: false,
      requiresListenerScreening: false,
      isClinicalCare: false,
      isActive: true,
      sortOrder: 100,
    };
  }
}

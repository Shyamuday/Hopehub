import { Injectable, computed, effect, inject, signal } from '@angular/core';
import {
  allowedWorkspacesForUser,
  staffCanAccessWorkspace,
  type AdminFocusedWorkspace,
} from '../admin-permissions';
import { ADMIN_WORKSPACES, NAV_ITEMS, type AdminNavItem } from '../constants/app-routes.constants';
import { providerLanguageForWorkspace } from '../constants/provider-language.constants';
import { AdminAuth } from './admin-auth';

const ADMIN_WORKSPACE_STORAGE_KEY = 'hopehub.admin.workspace.v2';
const DEFAULT_ADMIN_WORKSPACE: AdminFocusedWorkspace = 'hope-hub';

@Injectable({ providedIn: 'root' })
export class AdminWorkspaceService {
  private readonly auth = inject(AdminAuth);

  readonly availableWorkspaces = computed(() => allowedWorkspacesForUser(this.auth.user()));
  readonly workspaceOptions = computed(() => {
    const allowed = this.availableWorkspaces();
    return ADMIN_WORKSPACES.filter((workspace) => allowed.includes(workspace.id));
  });
  readonly selectedWorkspace = signal<AdminFocusedWorkspace>(this.readWorkspace());
  readonly selectedWorkspaceOption = computed(
    () =>
      this.workspaceOptions().find((workspace) => workspace.id === this.selectedWorkspace()) ??
      this.workspaceOptions()[0] ??
      ADMIN_WORKSPACES[0],
  );

  readonly workspaceLabel = computed(() => this.selectedWorkspaceOption().label);
  readonly language = computed(() => providerLanguageForWorkspace(this.selectedWorkspace()));
  readonly providerSingularLabel = computed(() => this.language().provider.singularLower);
  readonly providerPluralLabel = computed(() => this.language().provider.pluralLower);
  readonly providerTitleLabel = computed(() => this.language().provider.singular);
  readonly providerPluralTitleLabel = computed(() => this.language().provider.plural);
  readonly providerDirectoryLabel = computed(() => this.language().provider.directory);
  readonly providerPortalLabel = computed(() => this.language().provider.portal);
  readonly consumerSingularLabel = computed(() => this.language().consumer.singularLower);
  readonly consumerPluralLabel = computed(() => this.language().consumer.pluralLower);
  readonly consumerTitleLabel = computed(() => this.language().consumer.singular);
  readonly consumerPluralTitleLabel = computed(() => this.language().consumer.plural);
  readonly sessionSingularLabel = computed(() => this.language().session.singularLower);
  readonly sessionPluralLabel = computed(() => this.language().session.pluralLower);
  readonly sessionTitleLabel = computed(() => this.language().session.singular);
  readonly sessionPluralTitleLabel = computed(() => this.language().session.plural);

  private readonly workspaceAccessSync = effect(() => {
    this.auth.user();
    this.ensureWorkspaceAllowed();
  });

  selectWorkspace(workspace: AdminFocusedWorkspace): void {
    if (!this.canAccessWorkspace(workspace)) {
      const fallback = this.availableWorkspaces()[0];
      if (!fallback) return;
      workspace = fallback;
    }
    this.selectedWorkspace.set(workspace);
    this.writeWorkspace(workspace);
  }

  ensureWorkspaceAllowed(): void {
    const selected = this.selectedWorkspace();
    if (this.canAccessWorkspace(selected)) return;
    const fallback = this.availableWorkspaces()[0];
    if (fallback) {
      this.selectedWorkspace.set(fallback);
      this.writeWorkspace(fallback);
    }
  }

  canAccessWorkspace(workspace: AdminFocusedWorkspace): boolean {
    return staffCanAccessWorkspace(this.auth.user(), workspace);
  }

  syncFromUrl(url: string): void {
    const path = url.split('?')[0];
    const item = NAV_ITEMS.find(
      (entry) => path === entry.path || path.startsWith(`${entry.path}/`),
    );
    const focusedWorkspaces = (item?.workspaces ?? []).filter(
      (workspace): workspace is AdminFocusedWorkspace => workspace !== 'shared',
    );
    if (
      focusedWorkspaces.length === 1 &&
      this.canAccessWorkspace(focusedWorkspaces[0]) &&
      focusedWorkspaces[0] !== this.selectedWorkspace()
    ) {
      this.selectWorkspace(focusedWorkspaces[0]);
      return;
    }
    this.ensureWorkspaceAllowed();
  }

  itemBelongsToWorkspace(item: AdminNavItem, workspace = this.selectedWorkspace()): boolean {
    const workspaces = item.workspaces ?? ['shared'];
    return workspaces.includes('shared') || workspaces.includes(workspace);
  }

  isHopeHub(): boolean {
    return this.selectedWorkspace() === 'hope-hub';
  }

  isHomeopathy(): boolean {
    return this.selectedWorkspace() === 'homeopathy';
  }

  private readWorkspace(): AdminFocusedWorkspace {
    if (typeof localStorage === 'undefined') return DEFAULT_ADMIN_WORKSPACE;
    const stored = localStorage.getItem(ADMIN_WORKSPACE_STORAGE_KEY);
    if (stored === 'homeopathy' || stored === 'hope-hub') return stored;
    return DEFAULT_ADMIN_WORKSPACE;
  }

  private writeWorkspace(workspace: AdminFocusedWorkspace): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(ADMIN_WORKSPACE_STORAGE_KEY, workspace);
  }
}

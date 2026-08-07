import { Injectable, computed, signal } from '@angular/core';
import {
  ADMIN_WORKSPACES,
  NAV_ITEMS,
  type AdminNavItem,
  type AdminWorkspace,
} from '../constants/app-routes.constants';

const ADMIN_WORKSPACE_STORAGE_KEY = 'hopehub.admin.workspace';

export type AdminFocusedWorkspace = Exclude<AdminWorkspace, 'shared'>;

@Injectable({ providedIn: 'root' })
export class AdminWorkspaceService {
  readonly workspaceOptions = ADMIN_WORKSPACES;
  readonly selectedWorkspace = signal<AdminFocusedWorkspace>(this.readWorkspace());
  readonly selectedWorkspaceOption = computed(
    () =>
      this.workspaceOptions.find((workspace) => workspace.id === this.selectedWorkspace()) ??
      this.workspaceOptions[0],
  );

  readonly workspaceLabel = computed(() => this.selectedWorkspaceOption().label);

  selectWorkspace(workspace: AdminFocusedWorkspace): void {
    this.selectedWorkspace.set(workspace);
    this.writeWorkspace(workspace);
  }

  syncFromUrl(url: string): void {
    const path = url.split('?')[0];
    const item = NAV_ITEMS.find(
      (entry) => path === entry.path || path.startsWith(`${entry.path}/`),
    );
    const focusedWorkspaces = (item?.workspaces ?? []).filter(
      (workspace): workspace is AdminFocusedWorkspace => workspace !== 'shared',
    );
    if (focusedWorkspaces.length === 1 && focusedWorkspaces[0] !== this.selectedWorkspace()) {
      this.selectWorkspace(focusedWorkspaces[0]);
    }
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
    if (typeof localStorage === 'undefined') return 'homeopathy';
    const stored = localStorage.getItem(ADMIN_WORKSPACE_STORAGE_KEY);
    return stored === 'hope-hub' ? 'hope-hub' : 'homeopathy';
  }

  private writeWorkspace(workspace: AdminFocusedWorkspace): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(ADMIN_WORKSPACE_STORAGE_KEY, workspace);
  }
}

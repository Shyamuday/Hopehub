import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApi } from '../../../core/services/admin-api';
import { TOAST_DURATION_LONG_MS } from '../../../core/constants/timing.constants';
import { HR_USER_DEFAULTS } from '../constants/hr-user-form.constants';

@Component({
  selector: 'app-hr-users',
  imports: [FormsModule],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h2 class="page-title">👥 HR Managers</h2>
          <p class="page-sub">Create HR users and control which stores they can manage</p>
        </div>
        <button class="btn-primary" (click)="openCreate()">+ Add HR Manager</button>
      </div>

      @if (loading()) {
        <div class="loading"><div class="spinner"></div></div>
      } @else {
        <div class="hr-grid">
          @for (u of hrUsers(); track u.id) {
            <div class="hr-card">
              <div class="hr-top">
                <div class="hr-avatar">{{ u.name.charAt(0).toUpperCase() }}</div>
                <div class="hr-info">
                  <div class="hr-name">{{ u.name }}</div>
                  <div class="hr-email">{{ u.email }}</div>
                  <div class="hr-desg">{{ u.hrProfile?.designation ?? hrUserDefaults.DESIGNATION }}</div>
                </div>
                <div class="hr-status" [class.inactive]="!u.isActive">
                  {{ u.isActive ? '● Active' : '● Inactive' }}
                </div>
              </div>

              <!-- Assigned stores -->
              <div class="stores-section">
                <div class="stores-label">Store Access</div>
                @if ((u.storeAccess ?? []).length === 0) {
                  <div class="no-stores">No stores assigned yet</div>
                } @else {
                  <div class="store-chips">
                    @for (s of u.storeAccess ?? []; track s.id) {
                      <div class="store-chip">
                        {{ s.name }}
                        <button class="chip-remove" (click)="revokeAccess(u, s.id)">✕</button>
                      </div>
                    }
                  </div>
                }
              </div>

              <div class="hr-actions">
                <button class="btn-assign" (click)="openAssign(u)">🏪 Assign Stores</button>
                <button class="btn-toggle" [class.deact]="u.isActive" (click)="toggleStatus(u)">
                  {{ u.isActive ? 'Deactivate' : 'Activate' }}
                </button>
              </div>
            </div>
          }
        </div>

        @if (hrUsers().length === 0) {
          <div class="empty">
            <div>👥</div>
            <h3>No HR Managers yet</h3>
            <p>Create an HR Manager and assign them stores to manage.</p>
            <button class="btn-primary" (click)="openCreate()">Add First HR Manager</button>
          </div>
        }
      }
    </div>

    <!-- Create HR Modal -->
    @if (modal() === 'create') {
      <div class="overlay" (click)="closeModal()">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-hdr">
            <h3>➕ New HR Manager</h3>
            <button class="close-btn" (click)="closeModal()">✕</button>
          </div>
          <div class="modal-body">
            <div class="fg">
              <label>Full Name *</label>
              <input [(ngModel)]="createForm.name" placeholder="HR Manager Name" />
            </div>
            <div class="fg">
              <label>Email *</label>
              <input type="email" [(ngModel)]="createForm.email" placeholder="hr@clinic.com" />
            </div>
            <div class="fg">
              <label>Password *</label>
              <input type="password" [(ngModel)]="createForm.password" placeholder="Min 8 characters" />
            </div>
            <div class="fg">
              <label>Designation</label>
              <input [(ngModel)]="createForm.designation" placeholder="HR Manager" />
            </div>
            <div class="fg">
              <label>Department</label>
              <input [(ngModel)]="createForm.department" placeholder="Human Resources" />
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-ghost" (click)="closeModal()">Cancel</button>
            <button class="btn-primary" [disabled]="saving()" (click)="createHr()">
              {{ saving() ? 'Creating…' : 'Create HR Manager' }}
            </button>
          </div>
          @if (error()) { <div class="err">⚠️ {{ error() }}</div> }
        </div>
      </div>
    }

    <!-- Assign Stores Modal -->
    @if (modal() === 'assign' && selectedHr()) {
      <div class="overlay" (click)="closeModal()">
        <div class="modal wide" (click)="$event.stopPropagation()">
          <div class="modal-hdr">
            <h3>🏪 Store Access — {{ selectedHr()!.name }}</h3>
            <button class="close-btn" (click)="closeModal()">✕</button>
          </div>
          <div class="modal-body">
            <div class="access-legend">
              <span class="leg-assigned">● Assigned</span>
              <span class="leg-none">○ Not assigned</span>
            </div>
            <div class="grant-all-row">
              <button class="btn-grant-all" (click)="grantAll()">⚡ Grant All Stores</button>
            </div>
            <div class="store-list">
              @for (s of allStores(); track s.id) {
                <div class="store-row" [class.assigned]="isAssigned(s.id)">
                  <div class="sr-info">
                    <span class="sr-icon">{{ isAssigned(s.id) ? '✅' : '○' }}</span>
                    <div>
                      <div class="sr-name">{{ s.name }}</div>
                      <div class="sr-code">{{ s.code }}{{ s.address ? ' · ' + s.address : '' }}</div>
                    </div>
                  </div>
                  @if (isAssigned(s.id)) {
                    <button class="btn-revoke" (click)="revokeAccess(selectedHr()!, s.id)">Revoke</button>
                  } @else {
                    <button class="btn-grant" (click)="grantAccess(s.id)">Grant</button>
                  }
                </div>
              }
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-primary" (click)="closeModal()">Done</button>
          </div>
        </div>
      </div>
    }

    @if (toast()) { <div class="toast">{{ toast() }}</div> }
  `,
  styleUrl: './hr-users.scss'
})
export class HrUsersComponent implements OnInit {
  private api = inject(AdminApi);

  readonly hrUserDefaults = HR_USER_DEFAULTS;

  hrUsers = signal<any[]>([]);
  allStores = signal<any[]>([]);
  assignedStoreIds = signal<Set<string>>(new Set());
  loading = signal(true);
  saving = signal(false);
  modal = signal<'create' | 'assign' | null>(null);
  selectedHr = signal<any>(null);
  error = signal('');
  toast = signal('');

  createForm = {
    name: '',
    email: '',
    password: '',
    designation: HR_USER_DEFAULTS.DESIGNATION,
    department: HR_USER_DEFAULTS.DEPARTMENT
  };

  ngOnInit(): void { this.load(); }

  async load() {
    this.loading.set(true);
    try {
      const r = await this.api.getHrUsers();
      // Load store access for each HR user
      const hrWithAccess = await Promise.all(
        (r.hrUsers as any[]).map(async (u: any) => {
          try {
            const a = await this.api.getHrUserStores(u.id);
            return { ...u, storeAccess: a.assigned };
          } catch { return { ...u, storeAccess: [] }; }
        })
      );
      this.hrUsers.set(hrWithAccess);
    } finally { this.loading.set(false); }
  }

  openCreate(): void {
    this.createForm = {
      name: '',
      email: '',
      password: '',
      designation: HR_USER_DEFAULTS.DESIGNATION,
      department: HR_USER_DEFAULTS.DEPARTMENT
    };
    this.error.set('');
    this.modal.set('create');
  }

  async openAssign(u: any) {
    this.selectedHr.set(u);
    const r = await this.api.getHrUserStores(u.id);
    this.allStores.set(r.all);
    this.assignedStoreIds.set(new Set((r.assigned as any[]).map((s: any) => s.id)));
    this.modal.set('assign');
  }

  closeModal(): void { this.modal.set(null); this.error.set(''); }

  async createHr() {
    if (!this.createForm.name || !this.createForm.email || !this.createForm.password) {
      this.error.set('Name, email and password are required'); return;
    }
    this.saving.set(true);
    try {
      await this.api.createHrUser(this.createForm);
      this.modal.set(null);
      this.showToast(`HR Manager "${this.createForm.name}" created`);
      this.load();
    } catch (e: any) {
      this.error.set(e?.error?.error ?? 'Failed to create HR user');
    } finally { this.saving.set(false); }
  }

  async grantAccess(storeId: string) {
    const hr = this.selectedHr();
    if (!hr) return;
    await this.api.grantHrStoreAccess(hr.id, storeId);
    this.assignedStoreIds.update(set => new Set([...set, storeId]));
    // Update local list
    const store = this.allStores().find(s => s.id === storeId);
    this.hrUsers.update(list => list.map(u =>
      u.id === hr.id ? { ...u, storeAccess: [...(u.storeAccess ?? []), store] } : u
    ));
    this.showToast(`Access granted`);
  }

  async revokeAccess(hr: any, storeId: string) {
    await this.api.revokeHrStoreAccess(hr.id, storeId);
    this.assignedStoreIds.update(set => { const s = new Set(set); s.delete(storeId); return s; });
    this.hrUsers.update(list => list.map(u =>
      u.id === hr.id ? { ...u, storeAccess: (u.storeAccess ?? []).filter((s: any) => s.id !== storeId) } : u
    ));
    this.showToast(`Access revoked`);
  }

  async grantAll() {
    const hr = this.selectedHr();
    if (!hr) return;
    await this.api.grantAllStores(hr.id);
    const all = this.allStores();
    this.assignedStoreIds.set(new Set(all.map(s => s.id)));
    this.hrUsers.update(list => list.map(u => u.id === hr.id ? { ...u, storeAccess: all } : u));
    this.showToast(`All stores granted`);
  }

  async toggleStatus(u: any) {
    await this.api.setHrUserStatus(u.id, !u.isActive);
    this.hrUsers.update(list => list.map(x => x.id === u.id ? { ...x, isActive: !x.isActive } : x));
    this.showToast(u.isActive ? 'User deactivated' : 'User activated');
  }

  isAssigned(storeId: string): boolean { return this.assignedStoreIds().has(storeId); }

  private showToast(msg: string) {
    this.toast.set(msg);
    setTimeout(() => this.toast.set(''), TOAST_DURATION_LONG_MS);
  }
}

import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HrApiService } from '../../services/hr-api.service';
import { StoreInfo } from '../../models';
import { TOAST_DURATION_MS } from '../../core/constants/timing.constants';

@Component({
  selector: 'app-stores',
  imports: [FormsModule],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title">🏪 Store Management</h1>
          <p class="page-sub">Create stores, assign managers and staff</p>
        </div>
        <button class="btn-primary" (click)="openCreateStore()">+ New Store</button>
      </div>

      @if (loading()) {
        <div class="loading"><div class="spinner"></div></div>
      } @else {
        <div class="store-grid">
          @for (store of stores(); track store.id) {
            <div class="store-card">
              <div class="store-header">
                <div class="store-icon">🏪</div>
                <div class="store-info">
                  <div class="store-name">{{ store.name }}</div>
                  <div class="store-code">{{ store.code }}</div>
                </div>
                <div class="store-status" [class.inactive]="!store.isActive">
                  {{ store.isActive ? 'Active' : 'Inactive' }}
                </div>
              </div>

              @if (store.address) {
                <div class="store-addr">📍 {{ store.address }}</div>
              }
              @if (store.phone) {
                <div class="store-addr">📞 {{ store.phone }}</div>
              }

              <div class="store-stats">
                <div class="stat">
                  <span class="stat-n">{{ store._count?.staff ?? 0 }}</span>
                  <span class="stat-l">Staff</span>
                </div>
                <div class="stat">
                  <span class="stat-n">{{ managerCount(store) }}</span>
                  <span class="stat-l">Managers</span>
                </div>
              </div>

              <!-- Managers list -->
              @if ((store.staff ?? []).length > 0) {
                <div class="managers-section">
                  <div class="ms-title">Managers</div>
                  @for (m of store.staff ?? []; track m.id) {
                    <div class="manager-row">
                      <div class="m-avatar">{{ m.name.charAt(0).toUpperCase() }}</div>
                      <div class="m-info">
                        <div class="m-name">{{ m.name }}</div>
                        @if (m.email) { <div class="m-email">{{ m.email }}</div> }
                      </div>
                      <span class="m-status" [style.color]="m.isActive ? '#4ade80' : '#f87171'">
                        {{ m.isActive ? '● Active' : '● Inactive' }}
                      </span>
                    </div>
                  }
                </div>
              }

              <div class="store-actions">
                <button class="btn-sec" (click)="openCreateManager(store)">+ Manager</button>
                <button class="btn-sec" (click)="openCreateStaff(store)">+ Staff</button>
              </div>
            </div>
          }
        </div>

        @if (stores().length === 0) {
          <div class="empty">
            <div class="ei">🏪</div>
            <h3>No stores yet</h3>
            <p>Create your first store to get started.</p>
            <button class="btn-primary" (click)="openCreateStore()">Create Store</button>
          </div>
        }
      }
    </div>

    <!-- Create Store Modal -->
    @if (modal() === 'store') {
      <div class="modal-overlay" (click)="closeModal()">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>🏪 Create New Store</h2>
            <button class="close-btn" (click)="closeModal()">✕</button>
          </div>
          <div class="modal-body">
            <div class="fg">
              <label>Store Name *</label>
              <input [(ngModel)]="storeForm.name" placeholder="e.g. Main Branch" />
            </div>
            <div class="fg">
              <label>Store Code * (unique, e.g. MAIN01)</label>
              <input [(ngModel)]="storeForm.code" placeholder="MAIN01" style="text-transform:uppercase" />
            </div>
            <div class="fg">
              <label>Address</label>
              <textarea [(ngModel)]="storeForm.address" rows="2" placeholder="Full address..."></textarea>
            </div>
            <div class="fg">
              <label>Phone</label>
              <input [(ngModel)]="storeForm.phone" placeholder="+91 99999 00000" />
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-ghost" (click)="closeModal()">Cancel</button>
            <button class="btn-primary" [disabled]="saving()" (click)="saveStore()">
              {{ saving() ? 'Creating…' : 'Create Store' }}
            </button>
          </div>
          @if (error()) { <div class="error-msg">⚠️ {{ error() }}</div> }
        </div>
      </div>
    }

    <!-- Create Manager Modal -->
    @if (modal() === 'manager') {
      <div class="modal-overlay" (click)="closeModal()">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>👔 Add Manager — {{ selectedStore()?.name }}</h2>
            <button class="close-btn" (click)="closeModal()">✕</button>
          </div>
          <div class="modal-body">
            <div class="info-box">
              Managers log in with <strong>email + password</strong> on the Store App.
            </div>
            <div class="fg">
              <label>Full Name *</label>
              <input [(ngModel)]="managerForm.name" placeholder="Store Manager Name" />
            </div>
            <div class="fg">
              <label>Email *</label>
              <input type="email" [(ngModel)]="managerForm.email" placeholder="manager@store.com" />
            </div>
            <div class="fg">
              <label>Password * (min 6 characters)</label>
              <input type="password" [(ngModel)]="managerForm.password" placeholder="Set a strong password" />
            </div>
            <div class="fg">
              <label>Designation</label>
              <input [(ngModel)]="managerForm.designation" placeholder="Store Manager" />
            </div>
            <div class="fg">
              <label>Joining Date</label>
              <input type="date" [(ngModel)]="managerForm.joiningDate" />
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-ghost" (click)="closeModal()">Cancel</button>
            <button class="btn-primary" [disabled]="saving()" (click)="saveManager()">
              {{ saving() ? 'Creating…' : 'Create Manager' }}
            </button>
          </div>
          @if (error()) { <div class="error-msg">⚠️ {{ error() }}</div> }
        </div>
      </div>
    }

    <!-- Create Staff Modal -->
    @if (modal() === 'staff') {
      <div class="modal-overlay" (click)="closeModal()">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>🧑‍💼 Add Staff — {{ selectedStore()?.name }}</h2>
            <button class="close-btn" (click)="closeModal()">✕</button>
          </div>
          <div class="modal-body">
            <div class="info-box">
              Staff log in with a <strong>PIN</strong> on the Store App — no email needed.
            </div>
            <div class="fg">
              <label>Full Name *</label>
              <input [(ngModel)]="staffForm.name" placeholder="Staff Member Name" />
            </div>
            <div class="fg">
              <label>Staff Code * (unique ID, e.g. S001)</label>
              <input [(ngModel)]="staffForm.staffCode" placeholder="S001" style="text-transform:uppercase" />
            </div>
            <div class="fg">
              <label>PIN * (4–8 digits)</label>
              <input type="password" [(ngModel)]="staffForm.pin" placeholder="e.g. 1234" maxlength="8" />
            </div>
            <div class="fg">
              <label>Designation</label>
              <input [(ngModel)]="staffForm.designation" placeholder="Store Assistant" />
            </div>
            <div class="fg">
              <label>Phone</label>
              <input type="tel" [(ngModel)]="staffForm.phone" placeholder="+91 99999 00000" />
            </div>
            <div class="fg">
              <label>Joining Date</label>
              <input type="date" [(ngModel)]="staffForm.joiningDate" />
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-ghost" (click)="closeModal()">Cancel</button>
            <button class="btn-primary" [disabled]="saving()" (click)="saveStaff()">
              {{ saving() ? 'Creating…' : 'Add Staff' }}
            </button>
          </div>
          @if (error()) { <div class="error-msg">⚠️ {{ error() }}</div> }
        </div>
      </div>
    }

    <!-- Success toast -->
    @if (toast()) {
      <div class="toast">✅ {{ toast() }}</div>
    }
  `,
  styleUrl: './stores.component.scss'
})
export class StoresComponent implements OnInit {
  private api = inject(HrApiService);

  stores = signal<StoreInfo[]>([]);
  loading = signal(true);
  saving = signal(false);
  modal = signal<'store' | 'manager' | 'staff' | null>(null);
  selectedStore = signal<StoreInfo | null>(null);
  error = signal('');
  toast = signal('');

  storeForm = { name: '', code: '', address: '', phone: '' };
  managerForm = { name: '', email: '', password: '', designation: 'Store Manager', joiningDate: '' };
  staffForm = { name: '', staffCode: '', pin: '', designation: 'Store Assistant', phone: '', joiningDate: '' };

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.api.getStores().subscribe({
      next: (r) => { this.stores.set(r.stores); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  managerCount(store: StoreInfo): number {
    return (store.staff ?? []).length;
  }

  openCreateStore(): void {
    this.storeForm = { name: '', code: '', address: '', phone: '' };
    this.error.set('');
    this.modal.set('store');
  }

  openCreateManager(store: StoreInfo): void {
    this.selectedStore.set(store);
    this.managerForm = { name: '', email: '', password: '', designation: 'Store Manager', joiningDate: '' };
    this.error.set('');
    this.modal.set('manager');
  }

  openCreateStaff(store: StoreInfo): void {
    this.selectedStore.set(store);
    this.staffForm = { name: '', staffCode: '', pin: '', designation: 'Store Assistant', phone: '', joiningDate: '' };
    this.error.set('');
    this.modal.set('staff');
  }

  closeModal(): void { this.modal.set(null); this.error.set(''); }

  saveStore(): void {
    if (!this.storeForm.name || !this.storeForm.code) { this.error.set('Name and code are required'); return; }
    this.saving.set(true);
    this.error.set('');
    this.api.createStore(this.storeForm).subscribe({
      next: (r) => {
        this.stores.update(list => [...list, { ...r.store, _count: { staff: 0 }, staff: [] }]);
        this.saving.set(false);
        this.modal.set(null);
        this.showToast(`Store "${r.store.name}" created`);
      },
      error: (e) => { this.error.set(e?.error?.error ?? 'Failed to create store'); this.saving.set(false); }
    });
  }

  saveManager(): void {
    if (!this.managerForm.name || !this.managerForm.email || !this.managerForm.password) {
      this.error.set('Name, email and password are required'); return;
    }
    if (this.managerForm.password.length < 6) { this.error.set('Password must be at least 6 characters'); return; }
    this.saving.set(true);
    this.error.set('');
    this.api.createManager(this.selectedStore()!.id, this.managerForm).subscribe({
      next: (r) => {
        this.load();
        this.saving.set(false);
        this.modal.set(null);
        this.showToast(`Manager "${r.staff.name}" created`);
      },
      error: (e) => { this.error.set(e?.error?.error ?? 'Failed to create manager'); this.saving.set(false); }
    });
  }

  saveStaff(): void {
    if (!this.staffForm.name || !this.staffForm.staffCode || !this.staffForm.pin) {
      this.error.set('Name, staff code and PIN are required'); return;
    }
    if (this.staffForm.pin.length < 4) { this.error.set('PIN must be at least 4 digits'); return; }
    this.saving.set(true);
    this.error.set('');
    this.api.createStoreStaff(this.selectedStore()!.id, this.staffForm).subscribe({
      next: (r) => {
        this.load();
        this.saving.set(false);
        this.modal.set(null);
        this.showToast(`Staff "${r.staff.name}" added to ${this.selectedStore()?.name}`);
      },
      error: (e) => { this.error.set(e?.error?.error ?? 'Failed to create staff'); this.saving.set(false); }
    });
  }

  private showToast(msg: string): void {
    this.toast.set(msg);
    setTimeout(() => this.toast.set(''), TOAST_DURATION_MS);
  }
}

import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminApi } from '../../core/services/admin-api';
import { adminRouteLink, ROUTE_PATHS } from '../../core/constants/app-routes.constants';

@Component({
  selector: 'app-safety-flags-page',
  imports: [DatePipe, RouterLink],
  template: `
    <section class="sf-page">
      <header class="sf-header">
        <div>
          <h1>Safety Flags</h1>
          <p>Review psychologist/session escalations and record admin follow-up.</p>
        </div>
        <button type="button" (click)="load()" [disabled]="loading()">
          {{ loading() ? 'Refreshing...' : 'Refresh' }}
        </button>
      </header>

      @if (error()) {
        <p class="sf-error">{{ error() }}</p>
      }
      @if (message()) {
        <p class="sf-success">{{ message() }}</p>
      }

      @if (loading()) {
        <p class="sf-muted">Loading safety flags...</p>
      } @else if (flags().length) {
        <div class="sf-list">
          @for (flag of flags(); track flag.id) {
            <article class="sf-card">
              <div class="sf-card-head">
                <div>
                  <h2>{{ flag.patient?.name || 'Patient' }}</h2>
                  <p>
                    {{
                      flag.patient?.patientCode ||
                        flag.patient?.email ||
                        flag.patient?.mobile ||
                        'No patient contact'
                    }}
                  </p>
                </div>
                <span>{{ flag.createdAt | date: 'medium' }}</span>
              </div>

              <div class="sf-grid">
                <p>
                  <strong>Consultation</strong
                  >{{ flag.consultation?.disease?.name || 'Consultation' }}
                </p>
                <p><strong>Status</strong>{{ flag.consultation?.status || 'Unknown' }}</p>
                <p>
                  <strong>Expert</strong
                  >{{ flag.consultation?.assignedDoctor?.name || 'Not assigned' }}
                </p>
                <p><strong>Author</strong>{{ flag.author?.name || 'Care team' }}</p>
              </div>

              <blockquote>{{ flag.body }}</blockquote>

              @if (flag.consultation?.id) {
                <div class="sf-actions">
                  <a
                    [routerLink]="consultationsRoute"
                    [queryParams]="{ q: flag.patient?.mobile || flag.patient?.name || '' }"
                  >
                    Open consultation queue
                  </a>
                </div>
                <textarea
                  rows="3"
                  [value]="drafts()[flag.consultation.id] || ''"
                  (input)="setDraft(flag.consultation.id, $any($event.target).value)"
                  placeholder="Add admin follow-up note..."
                ></textarea>
                <button
                  type="button"
                  (click)="saveFollowUp(flag.consultation.id)"
                  [disabled]="
                    savingId() === flag.consultation.id || !drafts()[flag.consultation.id]?.trim()
                  "
                >
                  {{ savingId() === flag.consultation.id ? 'Saving...' : 'Save follow-up' }}
                </button>
              }
            </article>
          }
        </div>

        <div class="sf-pagination">
          <button type="button" [disabled]="page() <= 1" (click)="setPage(page() - 1)">
            Previous
          </button>
          <span>Page {{ page() }} of {{ totalPages() }}</span>
          <button type="button" [disabled]="page() >= totalPages()" (click)="setPage(page() + 1)">
            Next
          </button>
        </div>
      } @else {
        <p class="sf-empty">No safety flags yet.</p>
      }
    </section>
  `,
  styles: [
    `
      .sf-page {
        display: grid;
        gap: 16px;
        padding: 20px;
        color: #111827;
      }
      .sf-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
      }
      h1 {
        margin: 0;
        font-size: 28px;
      }
      .sf-header p,
      .sf-muted,
      .sf-empty {
        color: #6b7280;
      }
      button,
      a {
        border-radius: 6px;
        border: 1px solid #d1d5db;
        background: #fff;
        color: #111827;
        padding: 8px 12px;
        font-weight: 700;
        text-decoration: none;
      }
      button:disabled {
        opacity: 0.55;
      }
      .sf-list {
        display: grid;
        gap: 14px;
      }
      .sf-card {
        display: grid;
        gap: 12px;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        background: #fff;
        padding: 16px;
        box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);
      }
      .sf-card-head {
        display: flex;
        justify-content: space-between;
        gap: 12px;
      }
      .sf-card-head h2 {
        margin: 0;
        font-size: 18px;
      }
      .sf-card-head p {
        margin: 4px 0 0;
        color: #6b7280;
      }
      .sf-card-head span {
        color: #6b7280;
        font-size: 13px;
        white-space: nowrap;
      }
      .sf-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 10px;
      }
      .sf-grid p {
        margin: 0;
        border: 1px solid #f3f4f6;
        border-radius: 6px;
        padding: 10px;
        color: #374151;
      }
      .sf-grid strong {
        display: block;
        color: #111827;
        font-size: 12px;
        text-transform: uppercase;
      }
      blockquote {
        margin: 0;
        border-left: 4px solid #dc2626;
        background: #fef2f2;
        padding: 12px;
        color: #7f1d1d;
      }
      textarea {
        width: 100%;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        padding: 10px;
        resize: vertical;
      }
      .sf-actions,
      .sf-pagination {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .sf-error {
        color: #b91c1c;
      }
      .sf-success {
        color: #047857;
      }
      @media (max-width: 900px) {
        .sf-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }
      @media (max-width: 640px) {
        .sf-header,
        .sf-card-head {
          flex-direction: column;
          align-items: stretch;
        }
        .sf-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class SafetyFlagsPage implements OnInit {
  private readonly api = inject(AdminApi);
  readonly consultationsRoute = adminRouteLink(ROUTE_PATHS.CONSULTATIONS);

  readonly flags = signal<any[]>([]);
  readonly drafts = signal<Record<string, string>>({});
  readonly loading = signal(false);
  readonly error = signal('');
  readonly message = signal('');
  readonly savingId = signal('');
  readonly page = signal(1);
  readonly totalPages = signal(1);
  readonly pageSize = 20;

  ngOnInit() {
    void this.load();
  }

  async load() {
    this.loading.set(true);
    this.error.set('');
    try {
      const res = await this.api.getSafetyFlags(this.page(), this.pageSize);
      this.flags.set(res.flags || []);
      this.totalPages.set(res.pagination?.totalPages || 1);
    } catch {
      this.error.set('Could not load safety flags.');
    } finally {
      this.loading.set(false);
    }
  }

  setPage(page: number) {
    if (page < 1 || page > this.totalPages()) return;
    this.page.set(page);
    void this.load();
  }

  setDraft(consultationId: string, value: string) {
    this.drafts.update((drafts) => ({ ...drafts, [consultationId]: value }));
  }

  async saveFollowUp(consultationId: string) {
    const note = this.drafts()[consultationId]?.trim();
    if (!note) return;

    this.savingId.set(consultationId);
    this.message.set('');
    this.error.set('');
    try {
      await this.api.addSafetyFollowUp(consultationId, note);
      this.setDraft(consultationId, '');
      this.message.set('Safety follow-up saved.');
      await this.load();
    } catch {
      this.error.set('Could not save follow-up.');
    } finally {
      this.savingId.set('');
    }
  }
}

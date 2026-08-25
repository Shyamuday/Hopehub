import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminCatalogApi } from '../../core/services/admin/admin-catalog.api';
import { adminRouteLink, ROUTE_PATHS } from '../../core/constants/app-routes.constants';

type ConsumerFlowIssue = {
  concernKey: string;
  assessmentId?: string;
  serviceSearchTerms?: string[];
  issue: string;
};

type ConsumerFlow = {
  id: string;
  key: string;
  slug: string;
  label: string;
  shortLabel: string;
  description: string;
  assessmentId: string;
  assessmentLabel: string;
  assessmentAvailable: boolean;
  assessmentTitle?: string | null;
  serviceAvailable: boolean;
  serviceMatches: Array<{ id: string; diseaseId: string; slug?: string | null; name: string }>;
  serviceSearchTerms: string[];
  supportPath: string;
  searchTerms: string[];
  isActive: boolean;
  showOnHome: boolean;
  showInResourceHub: boolean;
  showInSupportGuide: boolean;
  sortOrder: number;
  resourceCounts?: { practices: number; lifestyleTips: number; articles: number };
  routes: {
    assessment: string;
    services: string;
    careTeam: string;
    booking: string;
  };
  queryParams: {
    services: Record<string, string>;
    careTeam: Record<string, string>;
    booking: Record<string, string>;
  };
};

@Component({
  selector: 'app-consumer-flows-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './consumer-flows-page.html',
  styleUrl: './consumer-flows-page.scss',
})
export class ConsumerFlowsPage implements OnInit {
  private readonly api = inject(AdminCatalogApi);
  readonly practiceAdminLink = adminRouteLink(ROUTE_PATHS.PRACTICES);
  readonly lifestyleAdminLink = adminRouteLink(ROUTE_PATHS.LIFESTYLE_TIPS);
  readonly blogAdminLink = adminRouteLink(ROUTE_PATHS.BLOG);

  readonly loading = signal(false);
  readonly error = signal('');
  readonly flows = signal<ConsumerFlow[]>([]);
  readonly issues = signal<ConsumerFlowIssue[]>([]);
  readonly meta = signal<{ source: string; total: number; healthy: boolean } | null>(null);
  readonly editingId = signal<string | null>(null);
  readonly saving = signal(false);
  readonly message = signal('');
  readonly draft = signal<Record<string, any>>({});

  readonly healthyCount = computed(
    () => this.flows().filter((flow) => flow.isActive && this.flowHealthy(flow)).length,
  );
  readonly issueCount = computed(() => this.issues().length);

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const [health, admin] = await Promise.all([
        this.api.getHopeHubConsumerFlows(),
        this.api.getConsumerConcernsAdmin(),
      ]);
      const healthById = new Map((health.flows ?? []).map((flow: ConsumerFlow) => [flow.id, flow]));
      this.flows.set(
        (admin.concerns ?? []).map((concern: ConsumerFlow) => ({
          ...concern,
          assessmentAvailable: healthById.get(concern.id)?.assessmentAvailable ?? false,
          assessmentTitle: healthById.get(concern.id)?.assessmentTitle ?? null,
          serviceAvailable: healthById.get(concern.id)?.serviceAvailable ?? false,
          serviceMatches: healthById.get(concern.id)?.serviceMatches ?? [],
          routes: healthById.get(concern.id)?.routes ?? {
            assessment: `/assessments/${concern.assessmentId}`,
            services: '/services',
            careTeam: '/care-team',
            booking: '/contact',
          },
          queryParams: healthById.get(concern.id)?.queryParams ?? {
            services: {},
            careTeam: {},
            booking: {},
          },
        })),
      );
      this.issues.set(health.issues ?? []);
      this.meta.set(health.meta ?? null);
    } catch (error: any) {
      this.error.set(error?.error?.message || error?.message || 'Could not load consumer flows.');
    } finally {
      this.loading.set(false);
    }
  }

  flowHealthy(flow: ConsumerFlow): boolean {
    return Boolean(flow.assessmentAvailable && flow.serviceAvailable);
  }

  issuesFor(flow: ConsumerFlow): ConsumerFlowIssue[] {
    return this.issues().filter((issue) => issue.concernKey === flow.key);
  }

  serviceNames(flow: ConsumerFlow): string {
    return flow.serviceMatches
      .slice(0, 2)
      .map((service) => service.name)
      .join(', ');
  }

  queryPreview(value: Record<string, string> | undefined): string {
    if (!value) return '';
    const query = new URLSearchParams(value).toString();
    return query ? `?${query}` : '';
  }

  startEdit(flow: ConsumerFlow): void {
    this.editingId.set(flow.id);
    this.draft.set({
      slug: flow.slug,
      label: flow.label,
      shortLabel: flow.shortLabel,
      description: flow.description,
      assessmentId: flow.assessmentId,
      assessmentLabel: flow.assessmentLabel,
      supportPath: flow.supportPath,
      searchTermsText: flow.searchTerms.join(', '),
      serviceSearchTermsText: flow.serviceSearchTerms.join(', '),
      showOnHome: flow.showOnHome,
      showInResourceHub: flow.showInResourceHub,
      showInSupportGuide: flow.showInSupportGuide,
      isActive: flow.isActive,
      sortOrder: flow.sortOrder,
    });
  }

  patchDraft(key: string, value: unknown): void {
    this.draft.update((draft) => ({ ...draft, [key]: value }));
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.draft.set({});
  }

  async save(flow: ConsumerFlow): Promise<void> {
    const draft = this.draft();
    this.saving.set(true);
    this.error.set('');
    this.message.set('');
    try {
      await this.api.updateConsumerConcern(flow.id, {
        slug: draft['slug'],
        label: draft['label'],
        shortLabel: draft['shortLabel'],
        description: draft['description'],
        assessmentId: draft['assessmentId'],
        assessmentLabel: draft['assessmentLabel'],
        supportPath: draft['supportPath'],
        searchTerms: this.list(draft['searchTermsText']),
        serviceSearchTerms: this.list(draft['serviceSearchTermsText']),
        showOnHome: Boolean(draft['showOnHome']),
        isActive: Boolean(draft['isActive']),
        showInResourceHub: Boolean(draft['showInResourceHub']),
        showInSupportGuide: Boolean(draft['showInSupportGuide']),
        sortOrder: Number(draft['sortOrder']) || 0,
      });
      this.message.set(`${draft['label']} routing saved.`);
      this.cancelEdit();
      await this.load();
    } catch (error: any) {
      this.error.set(error?.error?.message || error?.message || 'Could not save concern routing.');
    } finally {
      this.saving.set(false);
    }
  }

  private list(value: unknown): string[] {
    return String(value ?? '')
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
}

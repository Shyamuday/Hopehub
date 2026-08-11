import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminCatalogApi } from '../../core/services/admin/admin-catalog.api';

type ConsumerFlowIssue = {
  concernKey: string;
  assessmentId?: string;
  serviceSearchTerms?: string[];
  issue: string;
};

type ConsumerFlow = {
  key: string;
  label: string;
  shortLabel: string;
  assessmentId: string;
  assessmentLabel: string;
  assessmentAvailable: boolean;
  assessmentTitle?: string | null;
  serviceAvailable: boolean;
  serviceMatches: Array<{ id: string; diseaseId: string; slug?: string | null; name: string }>;
  serviceSearchTerms: string[];
  supportPath: string;
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
  imports: [CommonModule],
  templateUrl: './consumer-flows-page.html',
  styleUrl: './consumer-flows-page.scss',
})
export class ConsumerFlowsPage implements OnInit {
  private readonly api = inject(AdminCatalogApi);

  readonly loading = signal(false);
  readonly error = signal('');
  readonly flows = signal<ConsumerFlow[]>([]);
  readonly issues = signal<ConsumerFlowIssue[]>([]);
  readonly meta = signal<{ source: string; total: number; healthy: boolean } | null>(null);

  readonly healthyCount = computed(
    () => this.flows().filter((flow) => this.flowHealthy(flow)).length,
  );
  readonly issueCount = computed(() => this.issues().length);

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const response = await this.api.getHopeHubConsumerFlows();
      this.flows.set(response.flows ?? []);
      this.issues.set(response.issues ?? []);
      this.meta.set(response.meta ?? null);
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
}

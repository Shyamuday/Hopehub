import { Component, computed, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import {
  CONSUMER_CONCERN_FLOWS,
  ConsumerConcernFlow,
} from '../../core/constants/consumer-concerns.constants';
import { consumerModeLabel } from '../../core/constants/consumer-form-options.constants';
import { CONSUMER_ROUTES } from '../../core/constants/consumer-routes.constants';
import {
  ConsumerFlowPreferenceMode,
  ConsumerFlowPreferences,
  ConsumerFlowPreferencesService,
} from '../../core/services/consumer-flow-preferences.service';
import { AppButtonComponent, PageHeaderComponent } from '../../shared/components';

@Component({
  selector: 'app-support-plan',
  standalone: true,
  imports: [RouterModule, AppButtonComponent, PageHeaderComponent],
  templateUrl: './support-plan.component.html',
  styleUrl: './support-plan.component.scss',
})
export class SupportPlanComponent {
  readonly ROUTES = CONSUMER_ROUTES;
  private readonly preferencesService = inject(ConsumerFlowPreferencesService);
  readonly preferences = signal<ConsumerFlowPreferences>(this.preferencesService.read());

  readonly concern = computed(() => this.findFlow(this.preferences().concern));
  readonly concernLabel = computed(
    () => this.concern()?.label || this.preferences().concern || 'your wellbeing',
  );
  readonly mode = computed<ConsumerFlowPreferenceMode>(() => this.preferences().mode || 'chat');
  readonly modeLabel = computed(() => consumerModeLabel(this.mode()));
  readonly assessmentLabel = computed(
    () => this.concern()?.assessmentLabel || 'Take a short self-check',
  );
  readonly assessmentLink = computed(
    () => this.concern()?.assessment.link || this.ROUTES.links.assessments,
  );
  readonly bookingQuery = computed(() => this.concern()?.bookingQueryParams || {});
  readonly careTeamQuery = computed(() => this.concern()?.careTeamQueryParams || {});
  readonly hasPlan = computed(() =>
    Boolean(
      this.preferences().concern || this.preferences().mode || this.preferences().assessmentId,
    ),
  );

  refresh(): void {
    this.preferences.set(this.preferencesService.read());
  }

  private findFlow(value?: string): ConsumerConcernFlow | null {
    if (!value) return null;
    const normalized = value.toLowerCase();
    return (
      Object.values(CONSUMER_CONCERN_FLOWS).find(
        (flow) =>
          flow.key.toLowerCase() === normalized ||
          flow.label.toLowerCase() === normalized ||
          flow.shortLabel.toLowerCase() === normalized ||
          flow.searchTerms.some((term) => normalized.includes(term.toLowerCase())),
      ) || null
    );
  }
}

import { Component, DestroyRef, Input, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterModule } from '@angular/router';
import {
  CONSUMER_CONCERN_FLOWS,
  ConsumerConcernFlow,
} from '../../../core/constants/consumer-concerns.constants';
import {
  CONSUMER_CONNECT_MODE_META,
  consumerModeSummaryLabel,
  consumerSessionModeFor,
} from '../../../core/constants/consumer-form-options.constants';
import { CONSUMER_ROUTES } from '../../../core/constants/consumer-routes.constants';
import {
  ConsumerFlowPreferenceMode,
  ConsumerFlowPreferencesService,
} from '../../../core/services/consumer-flow-preferences.service';
import { AppButtonComponent } from '../app-button/app-button.component';
import { SelectableCardComponent } from '../selectable-card/selectable-card.component';
import { ConsumerFlowsService } from '../../../core/services/consumer-flows.service';

type GuidedAction = 'live' | 'test' | 'book' | 'providers';

@Component({
  selector: 'app-guided-support-entry',
  standalone: true,
  imports: [RouterModule, AppButtonComponent, SelectableCardComponent],
  templateUrl: './guided-support-entry.component.html',
  styleUrl: './guided-support-entry.component.scss',
})
export class GuidedSupportEntryComponent {
  @Input() title = 'Not sure where to start?';
  @Input() subtitle =
    'Choose what you are feeling and how you want support. We will carry this choice across the next step.';
  @Input() contextConcern = '';
  @Input() contextServiceName = '';
  @Input() contextAssessmentId = '';
  @Input() compact = false;

  readonly ROUTES = CONSUMER_ROUTES;
  readonly modes: Array<{ value: ConsumerFlowPreferenceMode; label: string; hint: string }> = [
    { value: 'chat', label: CONSUMER_CONNECT_MODE_META.chat.label, hint: 'Text privately' },
    { value: 'voice', label: CONSUMER_CONNECT_MODE_META.voice.label, hint: 'Talk now' },
    { value: 'video', label: CONSUMER_CONNECT_MODE_META.video.label, hint: 'Face-to-face' },
  ];
  readonly concerns = signal([
    CONSUMER_CONCERN_FLOWS.anxiety,
    CONSUMER_CONCERN_FLOWS.depression,
    CONSUMER_CONCERN_FLOWS.stress,
    CONSUMER_CONCERN_FLOWS.relationship,
    CONSUMER_CONCERN_FLOWS.breakup,
    CONSUMER_CONCERN_FLOWS.sleep,
  ]);

  private readonly router = inject(Router);
  private readonly preferences = inject(ConsumerFlowPreferencesService);
  private readonly consumerFlows = inject(ConsumerFlowsService);
  private readonly destroyRef = inject(DestroyRef);

  selectedMode = signal<ConsumerFlowPreferenceMode>(this.preferences.read().mode || 'voice');
  selectedConcern = signal<ConsumerConcernFlow>(
    this.findFlow(this.preferences.read().concern) || CONSUMER_CONCERN_FLOWS.anxiety,
  );

  constructor() {
    this.consumerFlows.state$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((state) => {
      const concerns = Object.values(state.flows)
        .filter((flow) => flow.isActive && flow.showInSupportGuide)
        .sort((a, b) => a.sortOrder - b.sortOrder);
      if (concerns.length) this.concerns.set(concerns);
    });
  }

  selectedSummary = computed(() => {
    const concern = this.contextConcern || this.selectedConcern().label;
    const mode = this.selectedMode();
    return `${concern} • ${consumerModeSummaryLabel(mode)}`;
  });

  selectConcern(flow: ConsumerConcernFlow): void {
    this.selectedConcern.set(flow);
    this.savePreference();
  }

  selectMode(mode: ConsumerFlowPreferenceMode): void {
    this.selectedMode.set(mode);
    this.savePreference();
  }

  async start(action: GuidedAction): Promise<void> {
    this.savePreference();
    const flow = this.selectedConcern();
    const mode = this.selectedMode();
    const queryParams = this.queryParams();

    if (action === 'live') {
      await this.router.navigate(CONSUMER_ROUTES.links.home, {
        fragment: CONSUMER_ROUTES.fragments.liveConnect,
        queryParams,
      });
      return;
    }

    if (action === 'test') {
      await this.router.navigate(flow.assessment.link, { queryParams });
      return;
    }

    if (action === 'providers') {
      await this.router.navigate(CONSUMER_ROUTES.links.careTeam, {
        queryParams: {
          ...flow.careTeamQueryParams,
          ...queryParams,
        },
      });
      return;
    }

    await this.router.navigate(CONSUMER_ROUTES.links.bookSupport, {
      queryParams: {
        ...flow.bookingQueryParams,
        ...queryParams,
      },
    });
  }

  private queryParams(): Record<string, string> {
    const flow = this.selectedConcern();
    const mode = this.selectedMode();
    const concern = this.contextConcern || flow.label;
    return {
      concern,
      concernCategory: concern,
      mode,
      sessionMode: consumerSessionModeFor(mode),
      serviceName: this.contextServiceName || `${concern} support`,
      assessmentId: this.contextAssessmentId || flow.assessmentId,
      source: 'guided-support-entry',
    };
  }

  private savePreference(): void {
    const flow = this.selectedConcern();
    this.preferences.update({
      concern: this.contextConcern || flow.label,
      mode: this.selectedMode(),
      serviceName: this.contextServiceName || `${this.contextConcern || flow.label} support`,
      assessmentId: this.contextAssessmentId || flow.assessmentId,
    });
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
          flow.searchTerms.some((term) => term.toLowerCase() === normalized),
      ) || null
    );
  }
}

import { Component, Input, computed, inject, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import {
  CONSUMER_CONCERN_FLOWS,
  ConsumerConcernFlow,
} from '../../../core/constants/consumer-concerns.constants';
import { CONSUMER_ROUTES } from '../../../core/constants/consumer-routes.constants';
import { CONSUMER_STORAGE_KEYS } from '../../../core/constants/storage-keys.constants';
import {
  ConsumerFlowPreferenceMode,
  ConsumerFlowPreferences,
  ConsumerFlowPreferencesService,
} from '../../../core/services/consumer-flow-preferences.service';

@Component({
  selector: 'app-continue-support-banner',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './continue-support-banner.component.html',
  styleUrl: './continue-support-banner.component.scss',
})
export class ContinueSupportBannerComponent {
  @Input() compact = false;

  readonly ROUTES = CONSUMER_ROUTES;
  private readonly router = inject(Router);
  private readonly preferences = inject(ConsumerFlowPreferencesService);

  preference = signal<ConsumerFlowPreferences>(this.preferences.read());
  hidden = signal(this.readHidden());

  hasPreference = computed(() => Boolean(this.preference().concern || this.preference().mode));
  concernLabel = computed(() => this.preference().concern || 'support');
  mode = computed<ConsumerFlowPreferenceMode>(() => this.preference().mode || 'voice');
  modeLabel = computed(() => {
    const mode = this.mode();
    if (mode === 'chat') return 'chat';
    if (mode === 'video') return 'video call';
    return 'voice call';
  });
  flow = computed(() => this.findFlow(this.concernLabel()));
  title = computed(() => `Continue ${this.concernLabel()} by ${this.modeLabel()}`);

  async talkNow(): Promise<void> {
    this.saveFreshPreference();
    await this.router.navigate(CONSUMER_ROUTES.links.home, {
      fragment: CONSUMER_ROUTES.fragments.liveConnect,
      queryParams: this.queryParams(),
    });
  }

  async bookSlot(): Promise<void> {
    this.saveFreshPreference();
    await this.router.navigate(CONSUMER_ROUTES.links.bookSupport, {
      queryParams: this.queryParams(),
    });
  }

  async seeProviders(): Promise<void> {
    this.saveFreshPreference();
    const flow = this.flow();
    await this.router.navigate(CONSUMER_ROUTES.links.careTeam, {
      queryParams: {
        ...(flow?.careTeamQueryParams || {}),
        ...this.queryParams(),
      },
    });
  }

  async takeTest(): Promise<void> {
    this.saveFreshPreference();
    const flow = this.flow();
    await this.router.navigate(flow?.assessment.link || CONSUMER_ROUTES.links.assessments, {
      queryParams: this.queryParams(),
    });
  }

  dismiss(): void {
    this.hidden.set(true);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(CONSUMER_STORAGE_KEYS.continueSupportHidden, 'true');
    }
  }

  private queryParams(): Record<string, string> {
    const mode = this.mode();
    const concern = this.concernLabel();
    return {
      concern,
      concernCategory: concern,
      mode,
      sessionMode:
        mode === 'video' ? 'online_video' : mode === 'chat' ? 'live_chat' : 'online_audio',
      serviceName: this.preference().serviceName || `${concern} support`,
      assessmentId: this.preference().assessmentId || this.flow()?.assessmentId || '',
      source: 'continue-last-choice',
    };
  }

  private saveFreshPreference(): void {
    this.preferences.update({
      concern: this.concernLabel(),
      mode: this.mode(),
      serviceName: this.preference().serviceName || `${this.concernLabel()} support`,
      assessmentId: this.preference().assessmentId || this.flow()?.assessmentId || '',
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
          flow.searchTerms.some((term) => normalized.includes(term.toLowerCase())),
      ) || null
    );
  }

  private readHidden(): boolean {
    if (typeof localStorage === 'undefined') return false;
    return localStorage.getItem(CONSUMER_STORAGE_KEYS.continueSupportHidden) === 'true';
  }
}

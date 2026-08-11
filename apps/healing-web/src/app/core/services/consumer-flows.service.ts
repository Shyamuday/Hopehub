import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, shareReplay } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CONSUMER_CONCERN_FLOWS,
  ConsumerConcernFlow,
  ConsumerConcernKey,
  consumerConcernForText,
} from '../constants/consumer-concerns.constants';
import { consumerAssessmentLink } from '../constants/consumer-routes.constants';

type ConsumerFlowApiItem = {
  key: ConsumerConcernKey;
  label: string;
  shortLabel: string;
  searchTerms: string[];
  serviceSearchTerms: string[];
  assessmentId: ConsumerConcernFlow['assessmentId'];
  assessmentLabel: string;
  supportPath: ConsumerConcernFlow['supportPath'];
  assessmentAvailable: boolean;
  assessmentTitle?: string | null;
  serviceAvailable: boolean;
  serviceMatches?: ConsumerConcernFlow['serviceMatches'];
  queryParams?: {
    services?: Record<string, string>;
    careTeam?: Record<string, string>;
    booking?: Record<string, string>;
  };
};

type ConsumerFlowsApiResponse = {
  flows: ConsumerFlowApiItem[];
  issues: Array<{ concernKey: string; assessmentId: string; issue: string }>;
  meta: {
    source: string;
    total: number;
    healthy: boolean;
  };
};

export type ConsumerFlowsState = {
  flows: Record<ConsumerConcernKey, ConsumerConcernFlow>;
  issues: ConsumerFlowsApiResponse['issues'];
  healthy: boolean;
  source: 'backend' | 'fallback';
};

@Injectable({ providedIn: 'root' })
export class ConsumerFlowsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  readonly state$: Observable<ConsumerFlowsState> = this.http
    .get<ConsumerFlowsApiResponse>(`${this.apiUrl}/hope-hub/consumer-flows`)
    .pipe(
      map((response) => this.toState(response)),
      catchError(() => of(this.fallbackState())),
      shareReplay({ bufferSize: 1, refCount: true }),
    );

  fallbackForText(value: string): ConsumerConcernFlow {
    return consumerConcernForText(value);
  }

  matchFlowForText(
    value: string,
    flows: Record<ConsumerConcernKey, ConsumerConcernFlow> = CONSUMER_CONCERN_FLOWS,
  ): ConsumerConcernFlow {
    const text = value.toLowerCase();
    const keys = Object.keys(flows) as ConsumerConcernKey[];
    const key = keys.find(
      (flowKey) =>
        flowKey !== 'general' &&
        flows[flowKey].searchTerms.some((term) => text.includes(term.toLowerCase())),
    );
    return flows[key || 'general'];
  }

  private toState(response: ConsumerFlowsApiResponse): ConsumerFlowsState {
    const flows = { ...CONSUMER_CONCERN_FLOWS };
    for (const flow of response.flows ?? []) {
      flows[flow.key] = {
        key: flow.key,
        label: flow.label,
        shortLabel: flow.shortLabel,
        searchTerms: flow.searchTerms,
        serviceSearchTerms: flow.serviceSearchTerms,
        assessmentId: flow.assessmentId,
        assessmentLabel: flow.assessmentLabel,
        supportPath: flow.supportPath,
        assessment: {
          id: flow.assessmentId,
          label: flow.assessmentLabel,
          link: consumerAssessmentLink(flow.assessmentId),
        },
        careTeamQueryParams: flow.queryParams?.careTeam ?? {
          concern: flow.label,
          roleGroup: flow.supportPath,
        },
        bookingQueryParams: flow.queryParams?.booking ?? {
          concern: flow.label,
          supportPath: flow.supportPath,
          source: 'concern-flow',
        },
        serviceQueryParams: flow.queryParams?.services ?? {
          concern: flow.label,
          q: flow.serviceSearchTerms?.[0] || flow.label,
        },
        serviceMatches: flow.serviceMatches ?? [],
        servicesLink: CONSUMER_CONCERN_FLOWS.general.servicesLink,
        careTeamLink: CONSUMER_CONCERN_FLOWS.general.careTeamLink,
        bookingLink: CONSUMER_CONCERN_FLOWS.general.bookingLink,
      };
    }

    return {
      flows,
      issues: response.issues ?? [],
      healthy: Boolean(response.meta?.healthy),
      source: 'backend',
    };
  }

  private fallbackState(): ConsumerFlowsState {
    return {
      flows: CONSUMER_CONCERN_FLOWS,
      issues: [],
      healthy: true,
      source: 'fallback',
    };
  }
}

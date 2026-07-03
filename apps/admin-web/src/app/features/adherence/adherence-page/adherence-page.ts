import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminApi } from '../../../core/services/admin-api';
import { ROUTE_PATHS } from '../../../core/constants/app-routes.constants';
import {
  ADHERENCE_MIN_DOSE_OPTIONS,
  ADHERENCE_WINDOW_OPTIONS,
  ALERT_SEVERITY_STYLES,
  RISK_TIER_LABELS
} from '../constants/adherence.constants';

type CohortPatient = {
  patientId: string;
  name: string;
  patientCode: string | null;
  mobile: string | null;
  adherencePercent: number;
  priorAdherencePercent: number | null;
  trendDelta: number | null;
  stats: { total: number; taken: number; missed: number; skipped: number; pending: number };
  riskTier: 'HIGH_RISK' | 'MEDIUM_RISK' | 'ON_TRACK';
};

type AdherenceReport = {
  windowDays: number;
  minDoses: number;
  summary: {
    patientsTracked: number;
    highRiskCount: number;
    mediumRiskCount: number;
    onTrackCount: number;
    alertCount: number;
    platformAdherencePercent: number;
  };
  platformTrend: Array<{
    date: string;
    total: number;
    taken: number;
    missed: number;
    skipped: number;
    adherencePercent: number;
  }>;
  cohorts: {
    HIGH_RISK: CohortPatient[];
    MEDIUM_RISK: CohortPatient[];
    ON_TRACK: CohortPatient[];
  };
  alerts: Array<{
    severity: 'HIGH' | 'MEDIUM';
    type: string;
    patientId: string;
    patientName: string;
    patientCode: string | null;
    message: string;
    adherencePercent: number;
    trendDelta: number | null;
  }>;
};

@Component({
  selector: 'app-adherence-page',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './adherence-page.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './adherence-page.scss'
})
export class AdherencePage {
  readonly windowOptions = ADHERENCE_WINDOW_OPTIONS;
  readonly minDoseOptions = ADHERENCE_MIN_DOSE_OPTIONS;
  readonly tierLabels = RISK_TIER_LABELS;
  readonly alertStyles = ALERT_SEVERITY_STYLES;
  readonly consumersPath = `/${ROUTE_PATHS.CONSUMERS}`;

  windowDays = 7;
  minDoses = 5;
  activeTier: 'HIGH_RISK' | 'MEDIUM_RISK' | 'ON_TRACK' = 'HIGH_RISK';
  report: AdherenceReport | null = null;
  loading = false;
  error = '';

  constructor(private readonly api: AdminApi) {
    void this.load();
  }

  async load() {
    this.loading = true;
    this.error = '';
    try {
      this.report = (await this.api.getAdherenceRisk({
        days: this.windowDays,
        minDoses: this.minDoses
      })) as AdherenceReport;
      if (this.report.cohorts.HIGH_RISK.length) {
        this.activeTier = 'HIGH_RISK';
      } else if (this.report.cohorts.MEDIUM_RISK.length) {
        this.activeTier = 'MEDIUM_RISK';
      } else {
        this.activeTier = 'ON_TRACK';
      }
    } catch {
      this.error = 'Could not load adherence risk report.';
      this.report = null;
    } finally {
      this.loading = false;
    }
  }

  applyFilters() {
    void this.load();
  }

  setTier(tier: 'HIGH_RISK' | 'MEDIUM_RISK' | 'ON_TRACK') {
    this.activeTier = tier;
  }

  activeCohort(): CohortPatient[] {
    return this.report?.cohorts[this.activeTier] ?? [];
  }

  consumerLink(patientId: string) {
    return ['/', ROUTE_PATHS.CONSUMERS];
  }

  consumerQuery(patientId: string) {
    return { consumerId: patientId };
  }

  trendLabel(delta: number | null) {
    if (delta === null) return '—';
    if (delta > 0) return `+${delta}%`;
    return `${delta}%`;
  }
}

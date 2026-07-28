import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { ROUTE_PATHS } from '../constants/app-routes.constants';

export type PrescriptionTab = 'context' | 'setup' | 'remedies' | 'review';

export type ConsultationHandoffParams = {
  consultationId: string;
  caseAnalysisId?: string | null;
  remedy?: string | null;
  companionRemedy?: string | null;
  advice?: string | null;
  diagnosis?: string | null;
  methodOptionId?: string | null;
  tab?: PrescriptionTab | null;
  rubricId?: string | null;
  rubricQuery?: string | null;
  patientName?: string | null;
};

export type LastConsultationWorkspace = {
  consultationId: string;
  view: 'case-analysis' | 'prescription' | 'online-session';
  patientName?: string;
};

const LAST_WORKSPACE_KEY = 'doctor:last-consultation-workspace';

export type WorklistSection = 'ASSIGNED' | 'IN_PROGRESS' | 'FOLLOW_UP_DUE';

@Injectable({ providedIn: 'root' })
export class ConsultationNavigationService {
  private readonly router = inject(Router);

  caseAnalysisCommands(consultationId: string, extras?: Partial<ConsultationHandoffParams>) {
    return ['/', ROUTE_PATHS.CASE_ANALYSIS, consultationId, 'case-analysis'] as const;
  }

  caseAnalysisQueryParams(extras?: Partial<ConsultationHandoffParams>) {
    const params: Record<string, string> = {};
    if (extras?.caseAnalysisId) params['caseAnalysisId'] = extras.caseAnalysisId;
    if (extras?.rubricId) params['rubricId'] = extras.rubricId;
    if (extras?.rubricQuery) params['rubricQuery'] = extras.rubricQuery;
    return Object.keys(params).length ? params : null;
  }

  prescriptionCommands(consultationId: string) {
    return ['/', ROUTE_PATHS.CASE_ANALYSIS, consultationId, 'prescription'] as const;
  }

  prescriptionQueryParams(extras?: Partial<ConsultationHandoffParams>) {
    const params: Record<string, string> = {};
    if (extras?.caseAnalysisId) params['caseAnalysisId'] = extras.caseAnalysisId;
    if (extras?.remedy) params['remedy'] = extras.remedy;
    if (extras?.companionRemedy) params['companionRemedy'] = extras.companionRemedy;
    if (extras?.advice) params['advice'] = extras.advice;
    if (extras?.diagnosis) params['diagnosis'] = extras.diagnosis;
    if (extras?.methodOptionId) params['methodOptionId'] = extras.methodOptionId;
    if (extras?.tab) params['tab'] = extras.tab;
    return Object.keys(params).length ? params : null;
  }

  async openCaseAnalysis(consultationId: string, extras?: Partial<ConsultationHandoffParams>) {
    this.rememberWorkspace(consultationId, 'case-analysis', extras?.patientName ?? undefined);
    await this.router.navigate(this.caseAnalysisCommands(consultationId), {
      queryParams: this.caseAnalysisQueryParams(extras) ?? undefined,
    });
  }

  async openPrescription(consultationId: string, extras?: Partial<ConsultationHandoffParams>) {
    this.rememberWorkspace(consultationId, 'prescription', extras?.patientName ?? undefined);
    await this.router.navigate(this.prescriptionCommands(consultationId), {
      queryParams: this.prescriptionQueryParams(extras) ?? undefined,
    });
  }

  async openPrescriptionContext(consultationId: string, caseAnalysisId?: string | null) {
    await this.openPrescription(consultationId, { caseAnalysisId, tab: 'context' });
  }

  async openOnlineSession(consultationId: string) {
    this.rememberWorkspace(consultationId, 'online-session');
    await this.router.navigate(['/', ROUTE_PATHS.SESSIONS, consultationId]);
  }

  async openRepertoryBrowser(consultationId?: string | null, caseAnalysisId?: string | null) {
    await this.router.navigate(['/', ROUTE_PATHS.REPERTORY_BROWSER], {
      queryParams: {
        ...(consultationId ? { consultationId } : {}),
        ...(caseAnalysisId ? { caseAnalysisId } : {}),
      },
    });
  }

  primaryActionForSection(section: WorklistSection): 'case' | 'prescribe' {
    if (section === 'ASSIGNED') return 'case';
    return 'prescribe';
  }

  isConsultationWorkspaceUrl(url: string) {
    const path = url.split('?')[0];
    return (
      (path.includes(`/${ROUTE_PATHS.CASE_ANALYSIS}/`) && path.endsWith('/case-analysis')) ||
      (path.includes(`/${ROUTE_PATHS.CASE_ANALYSIS}/`) && path.endsWith('/prescription')) ||
      path.includes(`/${ROUTE_PATHS.SESSIONS}/`) ||
      (path.endsWith(`/${ROUTE_PATHS.ONLINE_DOCTOR}`) && /[?&]consultationId=/.test(url)) ||
      (path.endsWith(`/${ROUTE_PATHS.APPOINTMENTS}`) && /[?&]consultationId=/.test(url))
    );
  }

  rememberWorkspace(
    consultationId: string,
    view: LastConsultationWorkspace['view'],
    patientName?: string,
  ) {
    if (!consultationId.trim()) return;
    const payload: LastConsultationWorkspace = {
      consultationId: consultationId.trim(),
      view,
      ...(patientName?.trim() ? { patientName: patientName.trim() } : {}),
    };
    try {
      sessionStorage.setItem(LAST_WORKSPACE_KEY, JSON.stringify(payload));
    } catch {
      // ignore storage failures
    }
  }

  rememberWorkspaceFromUrl(url: string, patientName?: string) {
    const path = url.split('?')[0];
    const match = path.match(
      new RegExp(`/${ROUTE_PATHS.CASE_ANALYSIS}/([^/]+)/(case-analysis|prescription)$`),
    );
    if (!match) {
      const sessionMatch = path.match(new RegExp(`/${ROUTE_PATHS.SESSIONS}/([^/]+)$`));
      if (sessionMatch) {
        this.rememberWorkspace(sessionMatch[1], 'online-session', patientName);
        return;
      }
      if (path.endsWith(`/${ROUTE_PATHS.ONLINE_DOCTOR}`)) {
        const consultationId = new URLSearchParams(url.split('?')[1] ?? '').get('consultationId');
        if (consultationId) {
          this.rememberWorkspace(consultationId, 'online-session', patientName);
        }
      }
      return;
    }
    this.rememberWorkspace(match[1], match[2] as LastConsultationWorkspace['view'], patientName);
  }

  getLastWorkspace(): LastConsultationWorkspace | null {
    try {
      const raw = sessionStorage.getItem(LAST_WORKSPACE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as LastConsultationWorkspace;
      if (!parsed?.consultationId) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  async resumeLastWorkspace() {
    const last = this.getLastWorkspace();
    if (!last) return false;
    if (last.view === 'prescription') {
      await this.openPrescription(last.consultationId);
    } else if (last.view === 'online-session') {
      await this.openOnlineSession(last.consultationId);
    } else {
      await this.openCaseAnalysis(last.consultationId);
    }
    return true;
  }

  clearLastWorkspace() {
    try {
      sessionStorage.removeItem(LAST_WORKSPACE_KEY);
    } catch {
      // ignore
    }
  }

  resolveNotificationRoute(
    data: Record<string, string>,
  ): { commands: readonly string[]; queryParams?: Record<string, string> } | null {
    const consultationId = data['consultationId'];
    if (!consultationId) {
      return data['route'] ? { commands: [data['route']] } : null;
    }

    const kind = (data['kind'] || data['type'] || data['consultationMode'] || '').toUpperCase();
    if (kind.includes('INSTANT') || kind.includes('ONLINE')) {
      return {
        commands: ['/', ROUTE_PATHS.SESSIONS, consultationId] as const,
      };
    }
    if (kind.includes('FOLLOW') || kind.includes('PRESCRIBE') || data['action'] === 'prescribe') {
      return {
        commands: this.prescriptionCommands(consultationId),
        queryParams:
          this.prescriptionQueryParams({
            caseAnalysisId: data['caseAnalysisId'],
          }) ?? undefined,
      };
    }

    return {
      commands: this.caseAnalysisCommands(consultationId),
      queryParams:
        this.caseAnalysisQueryParams({
          caseAnalysisId: data['caseAnalysisId'],
        }) ?? undefined,
    };
  }
}

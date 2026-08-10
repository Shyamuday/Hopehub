import { Component, effect, inject, signal, OnInit } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  clinicalRecordsQuery,
  doctorAppointmentUrl,
  doctorCaseAnalysisUrl,
} from '@hopehub/platform-ui';
import { AdminApi } from '../../../core/services/admin-api';
import { adminRouteLink, ROUTE_PATHS } from '../../../core/constants/app-routes.constants';
import { AdminWorkspaceService } from '../../../core/services/admin-workspace.service';
import { environment } from '../../../../environments/environment';
import {
  CONSULTATION_PAYMENT_STYLES,
  CONSULTATION_STATUS_FALLBACK_STYLE,
  CONSULTATION_STATUS_STYLES,
} from '../constants/consultation-status.constants';

type ConsultationQualitySummary = {
  totalClosed: number;
  completed: number;
  userMissed: number;
  providerNoShow: number;
  rescheduleNeeded: number;
  packageRestored: number;
  payoutHeld: number;
  cancelled: number;
  issueCount: number;
  issueRate: number;
};

@Component({
  selector: 'app-consultations-page',
  imports: [FormField, DatePipe, RouterLink],
  templateUrl: './consultations-page.html',
  styleUrl: './consultations-page.scss',
})
export class ConsultationsPage implements OnInit {
  private api = inject(AdminApi);
  private workspace = inject(AdminWorkspaceService);

  readonly clinicalRecordsRoute = adminRouteLink(ROUTE_PATHS.CLINICAL_RECORDS);
  readonly doctorOrigins = { doctor: environment.doctorAppUrl };
  readonly workspaceKey = this.workspace.selectedWorkspace;
  readonly workspaceLabel = this.workspace.workspaceLabel;
  readonly providerSingularLabel = this.workspace.providerSingularLabel;
  readonly providerPluralLabel = this.workspace.providerPluralLabel;
  readonly providerTitleLabel = this.workspace.providerTitleLabel;
  readonly providerPluralTitleLabel = this.workspace.providerPluralTitleLabel;
  readonly consumerSingularLabel = this.workspace.consumerSingularLabel;
  readonly consumerTitleLabel = this.workspace.consumerTitleLabel;
  readonly consumerPluralLabel = this.workspace.consumerPluralLabel;
  readonly sessionSingularLabel = this.workspace.sessionSingularLabel;
  readonly sessionPluralLabel = this.workspace.sessionPluralLabel;

  consultations = signal<any[]>([]);
  loading = signal(true);
  total = signal(0);
  page = signal(1);
  pageSize = 20;
  unassignedCount = signal(0);
  qualitySummary = signal<ConsultationQualitySummary | null>(null);
  qualityDays = signal(30);

  statusFilter = signal('');
  assignedFilter = signal('no');
  outcomeFilter = signal('');
  outcomeFlagFilter = signal('');

  readonly searchModel = signal({ q: '' });
  readonly searchForm = form(this.searchModel);

  modal = signal(false);
  statusModal = signal(false);
  selectedConsult = signal<any>(null);

  readonly statusModel = signal({ value: 'ASSIGNED' });
  readonly statusForm = form(this.statusModel);
  cancelReason = signal('');
  restorePackageSession = signal(true);
  outcomeNote = signal('');
  outcomeNextStep = signal('');
  outcomeRestorePackage = signal(false);
  outcomeHoldPayout = signal(false);

  doctors = signal<any[]>([]);
  filteredDoctors = signal<any[]>([]);
  doctorsLoading = signal(false);
  selectedDoctorId = signal<string>('');

  readonly doctorSearchModel = signal({ q: '' });
  readonly doctorSearchForm = form(this.doctorSearchModel);

  saving = signal(false);
  err = signal('');
  toast = signal('');
  expandedCardId = signal<string | null>(null);

  statusFilters = [
    { label: 'All Statuses', value: '' },
    { label: 'Payment pending', value: 'PAYMENT_PENDING' },
    { label: 'Paid', value: 'PAID' },
    { label: 'Assigned', value: 'ASSIGNED' },
    { label: 'In progress', value: 'IN_PROGRESS' },
    { label: 'Completed', value: 'COMPLETED' },
    { label: 'Cancelled', value: 'CANCELLED' },
  ];
  statusOptions = [
    'PAYMENT_PENDING',
    'PAID',
    'ASSIGNED',
    'IN_PROGRESS',
    'PRESCRIPTION_UPLOADED',
    'COMPLETED',
    'CANCELLED',
  ];
  readonly outcomeLabels: Record<string, string> = {
    COMPLETED: 'Completed',
    USER_MISSED: 'User missed',
    PROVIDER_NO_SHOW: 'Provider no-show',
    RESCHEDULE_NEEDED: 'Reschedule needed',
  };
  outcomeFilters = [
    { label: 'All outcomes', value: '' },
    { label: 'Completed', value: 'COMPLETED' },
    { label: 'User missed', value: 'USER_MISSED' },
    { label: 'Provider no-show', value: 'PROVIDER_NO_SHOW' },
    { label: 'Reschedule needed', value: 'RESCHEDULE_NEEDED' },
  ];
  outcomeFlagFilters = [
    { label: 'All flags', value: '' },
    { label: 'Package restored', value: 'package_restored' },
    { label: 'Payout held', value: 'payout_hold' },
  ];
  assignedFilters = [
    { label: 'All', value: '' },
    { label: 'Unassigned', value: 'no' },
    { label: 'Assigned', value: 'yes' },
  ];

  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  private readonly workspaceReload = effect(() => {
    this.workspace.selectedWorkspace();
    this.page.set(1);
    this.doctors.set([]);
    this.filteredDoctors.set([]);
    this.load();
    this.loadUnassignedCount();
    this.loadQualitySummary();
  });

  ngOnInit(): void {
    // Initial load is handled by the workspace effect so switching workspace reloads this page too.
  }

  load(): void {
    this.loading.set(true);
    this.api
      .getAdminConsultations({
        status: this.statusFilter(),
        assigned: this.assignedFilter(),
        outcome: this.outcomeFilter(),
        outcomeFlag: this.outcomeFlagFilter(),
        q: this.searchModel().q,
        page: this.page(),
        pageSize: this.pageSize,
        workspace: this.workspace.selectedWorkspace(),
      })
      .then((r) => {
        this.consultations.set(r.consultations);
        this.total.set(r.total);
        this.loading.set(false);
      })
      .catch(() => this.loading.set(false));
  }

  loadUnassignedCount(): void {
    this.api
      .getAdminConsultations({
        assigned: 'no',
        status: 'PAID',
        pageSize: 1,
        workspace: this.workspace.selectedWorkspace(),
      })
      .then((r) => this.unassignedCount.set(r.total))
      .catch(() => {});
  }

  loadQualitySummary(): void {
    this.api
      .getConsultationQualitySummary(this.qualityDays(), this.workspace.selectedWorkspace())
      .then((r) => this.qualitySummary.set(r.summary))
      .catch(() => this.qualitySummary.set(null));
  }

  setQualityDays(days: number): void {
    this.qualityDays.set(days);
    this.loadQualitySummary();
  }

  qualityCards() {
    const s = this.qualitySummary();
    if (!s) return [];
    return [
      {
        label: 'Closed sessions',
        value: s.totalClosed,
        hint: `${s.completed} completed · ${s.cancelled} cancelled`,
        tone: 'neutral',
      },
      {
        label: 'Issue rate',
        value: `${s.issueRate}%`,
        hint: `${s.issueCount} missed/no-show/reschedule`,
        tone: s.issueRate >= 20 ? 'danger' : s.issueRate >= 10 ? 'warn' : 'good',
      },
      {
        label: 'Provider no-show',
        value: s.providerNoShow,
        hint: 'Provider-side missed sessions',
        tone: s.providerNoShow ? 'danger' : 'good',
      },
      {
        label: 'User missed',
        value: s.userMissed,
        hint: 'User did not attend',
        tone: s.userMissed ? 'warn' : 'good',
      },
      {
        label: 'Reschedules',
        value: s.rescheduleNeeded,
        hint: 'Needs booking follow-up',
        tone: s.rescheduleNeeded ? 'warn' : 'good',
      },
      {
        label: 'Money/package flags',
        value: s.payoutHeld + s.packageRestored,
        hint: `${s.payoutHeld} payout held · ${s.packageRestored} package restored`,
        tone: s.payoutHeld || s.packageRestored ? 'warn' : 'neutral',
      },
    ];
  }

  onSearch(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.load(), 300);
  }

  setStatus(v: string): void {
    this.statusFilter.set(v);
    this.page.set(1);
    this.load();
  }
  setAssigned(v: string): void {
    this.assignedFilter.set(v);
    this.page.set(1);
    this.load();
  }
  setOutcome(v: string): void {
    this.outcomeFilter.set(v);
    if (v) this.outcomeFlagFilter.set('');
    this.page.set(1);
    this.load();
  }
  setOutcomeFlag(v: string): void {
    this.outcomeFlagFilter.set(v);
    if (v) this.outcomeFilter.set('');
    this.page.set(1);
    this.load();
  }
  prevPage(): void {
    if (this.page() > 1) {
      this.page.update((p) => p - 1);
      this.load();
    }
  }
  nextPage(): void {
    if (this.page() < this.totalPages()) {
      this.page.update((p) => p + 1);
      this.load();
    }
  }
  totalPages(): number {
    return Math.ceil(this.total() / this.pageSize);
  }

  ss(s: string): { bg: string; color: string } {
    return CONSULTATION_STATUS_STYLES[s] ?? CONSULTATION_STATUS_FALLBACK_STYLE;
  }
  ps(s: string): { bg: string; color: string } {
    return CONSULTATION_PAYMENT_STYLES[s] ?? CONSULTATION_STATUS_FALLBACK_STYLE;
  }

  openAssign(c: any): void {
    this.selectedConsult.set(c);
    this.selectedDoctorId.set(c.assignedDoctor?.id ?? '');
    this.doctorSearchModel.set({ q: '' });
    this.err.set('');
    this.modal.set(true);
    if (this.doctors().length === 0) {
      this.doctorsLoading.set(true);
      this.api
        .getActiveDoctors({ workspace: this.workspace.selectedWorkspace() })
        .then((r) => {
          this.doctors.set(r.doctors);
          this.filteredDoctors.set(r.doctors);
          this.doctorsLoading.set(false);
        })
        .catch(() => this.doctorsLoading.set(false));
    } else {
      this.filterDoctors();
    }
  }

  filterDoctors(): void {
    const q = this.doctorSearchModel().q.toLowerCase();
    this.filteredDoctors.set(
      q ? this.doctors().filter((d) => d.name.toLowerCase().includes(q)) : this.doctors(),
    );
  }

  closeModal(): void {
    this.modal.set(false);
    this.statusModal.set(false);
  }

  openStatus(c: any): void {
    this.selectedConsult.set(c);
    this.statusModel.set({ value: c.status });
    this.cancelReason.set('');
    this.restorePackageSession.set(true);
    this.outcomeNote.set('');
    this.outcomeNextStep.set('');
    this.outcomeRestorePackage.set(false);
    this.outcomeHoldPayout.set(false);
    this.err.set('');
    this.statusModal.set(true);
  }

  async confirmStatus(): Promise<void> {
    if (!this.selectedConsult()) return;
    this.saving.set(true);
    this.err.set('');
    try {
      const r =
        this.statusModel().value === 'COMPLETED'
          ? await this.api.updateConsultationOutcome(this.selectedConsult()!.id, {
              outcome: 'COMPLETED',
              privateNote: this.outcomeNote().trim() || undefined,
              recommendedNextStep: this.outcomeNextStep().trim() || undefined,
              restorePackageSession: this.outcomeRestorePackage(),
              holdProviderPayout: this.outcomeHoldPayout(),
            })
          : await this.api.updateConsultationStatus(
              this.selectedConsult()!.id,
              this.statusModel().value,
              this.statusModel().value === 'CANCELLED'
                ? {
                    reason: this.cancelReason().trim() || 'Cancelled by admin',
                    restorePackageSession: this.restorePackageSession(),
                  }
                : undefined,
            );
      this.consultations.update((list) =>
        list.map((c) => (c.id === this.selectedConsult()!.id ? { ...c, ...r.consultation } : c)),
      );
      this.statusModal.set(false);
      this.loadQualitySummary();
      this.showToast(
        this.statusModel().value === 'CANCELLED'
          ? 'Cancelled — payout held/package restored if applicable ✓'
          : this.statusModel().value === 'COMPLETED'
            ? 'Session outcome saved ✓'
            : 'Status updated ✓',
      );
    } catch (e: any) {
      this.err.set(e?.error?.message ?? 'Status update failed');
    } finally {
      this.saving.set(false);
    }
  }

  onCancelReasonInput(event: Event): void {
    this.cancelReason.set((event.target as HTMLTextAreaElement).value);
  }

  onRestorePackageToggle(event: Event): void {
    this.restorePackageSession.set((event.target as HTMLInputElement).checked);
  }

  onOutcomeNoteInput(event: Event): void {
    this.outcomeNote.set((event.target as HTMLTextAreaElement).value);
  }

  onOutcomeNextStepInput(event: Event): void {
    this.outcomeNextStep.set((event.target as HTMLInputElement).value);
  }

  onOutcomeRestorePackageToggle(event: Event): void {
    this.outcomeRestorePackage.set((event.target as HTMLInputElement).checked);
  }

  onOutcomeHoldPayoutToggle(event: Event): void {
    this.outcomeHoldPayout.set((event.target as HTMLInputElement).checked);
  }

  async confirmAssign(): Promise<void> {
    if (!this.selectedDoctorId() || !this.selectedConsult()) return;
    this.saving.set(true);
    this.err.set('');
    try {
      const r = await this.api.assignConsultationDoctor(
        this.selectedConsult()!.id,
        this.selectedDoctorId(),
        this.workspace.selectedWorkspace(),
      );
      this.consultations.update((list) =>
        list.map((c) =>
          c.id === this.selectedConsult()!.id
            ? { ...c, assignedDoctor: r.consultation.assignedDoctor, status: r.consultation.status }
            : c,
        ),
      );
      this.modal.set(false);
      this.loadUnassignedCount();
      this.showToast(`${this.providerSingularTitle()} assigned ✓`);
    } catch (e: any) {
      this.err.set(e?.error?.message ?? 'Assignment failed');
    } finally {
      this.saving.set(false);
    }
  }

  private showToast(msg: string): void {
    this.toast.set(msg);
    setTimeout(() => this.toast.set(''), 2500);
  }

  clinicalQuery(
    consultation: { id: string; patient?: { id?: string } | null },
    tab: 'prescriptions' | 'analyses' = 'prescriptions',
  ) {
    return clinicalRecordsQuery({
      tab,
      patientId: consultation.patient?.id,
      consultationId: consultation.id,
    });
  }

  doctorAppointmentLink(consultationId: string) {
    return doctorAppointmentUrl(this.doctorOrigins, consultationId);
  }

  doctorCaseAnalysisLink(consultationId: string) {
    return doctorCaseAnalysisUrl(this.doctorOrigins, consultationId);
  }

  showDoctorLinks(status: string) {
    return ['ASSIGNED', 'IN_PROGRESS', 'PRESCRIPTION_UPLOADED', 'COMPLETED'].includes(status);
  }

  showHomeopathyClinicalLinks(status: string) {
    return this.workspace.isHomeopathy() && this.showDoctorLinks(status);
  }

  providerSingularTitle() {
    const label = this.providerSingularLabel();
    return label.charAt(0).toUpperCase() + label.slice(1);
  }

  providerSearchPlaceholder() {
    return `🔍 Filter ${this.providerPluralLabel()}…`;
  }

  toggleCardMenu(consultationId: string) {
    this.expandedCardId.update((current) => (current === consultationId ? null : consultationId));
  }

  isCardMenuOpen(consultationId: string) {
    return this.expandedCardId() === consultationId;
  }

  packageUsage(c: any) {
    return c?.pricingSnapshot?.packageUsage || c?.payment?.lineItems?.packageUsage || null;
  }

  sessionOutcome(c: any) {
    return c?.pricingSnapshot?.sessionOutcome || null;
  }

  sessionOutcomeLabel(outcome?: string | null) {
    return outcome
      ? (this.outcomeLabels[outcome] ?? String(outcome).replace(/_/g, ' '))
      : 'Not recorded';
  }

  pricingInsight(c: any) {
    const snapshot = c?.pricingSnapshot || {};
    const lineItems = c?.payment?.lineItems || {};
    const usage = this.packageUsage(c) || {};
    const rule = snapshot.careTeamPricingRule || lineItems.careTeamPricingRule || '';
    const type = String(usage.type || '').toUpperCase();
    const isPackagePurchase = rule === 'PACKAGE_PRICE' || type === 'PURCHASE';
    const isPackageRedemption = rule === 'PACKAGE_REDEMPTION' || type === 'REDEMPTION';
    const label = snapshot.careTeamPricingLabel || lineItems.careTeamPricingLabel || '';
    const serviceTitle = snapshot.careTeamServiceTitle || lineItems.careTeamServiceTitle || '';
    const packageConsultationId =
      snapshot.careTeamPackageConsultationId || usage.packageConsultationId || '';
    const remaining = Number(usage.remainingSessions || 0);
    const total = Number(usage.totalSessions || 0);
    const used = Number(usage.usedSessions || 0);

    if (!label && !serviceTitle && !rule && !type) return null;

    return {
      serviceTitle,
      label,
      rule,
      isPackagePurchase,
      isPackageRedemption,
      packageConsultationId,
      remaining,
      total,
      used,
      headline: isPackageRedemption
        ? 'Package session'
        : isPackagePurchase
          ? 'Package purchase'
          : label || serviceTitle || 'Care pricing',
      subline: isPackageRedemption
        ? `Paid by package · ₹0 today${remaining ? ` · ${remaining} left after this` : ''}`
        : isPackagePurchase
          ? `${used}/${total} sessions used${remaining ? ` · ${remaining} left` : ''}`
          : [serviceTitle, label].filter(Boolean).join(' · '),
    };
  }

  payoutInsight(c: any) {
    const earning = c?.payment?.providerEarning;
    if (!earning) return null;
    return {
      status: earning.payoutStatus || 'PENDING',
      provider: Number(earning.providerEarningInPaise || 0),
      platform: Number(earning.platformFeeInPaise || 0),
      reference: earning.payoutReference || '',
      note: earning.payoutNote || '',
    };
  }

  refundInsight(c: any) {
    const refunded = Number(c?.payment?.refundedAmountInPaise || 0);
    if (!refunded) return null;
    const paid = Number(c?.payment?.amountInPaise || 0);
    return {
      refunded,
      isFull: refunded >= paid,
      text:
        refunded >= paid
          ? 'Full refund · payout should be held'
          : 'Partial refund · payout recalculated on net paid',
    };
  }

  balanceDueInPaise(c: any): number {
    return Number(
      c?.pricingSnapshot?.balanceDueInPaise ?? c?.payment?.lineItems?.balanceDueInPaise ?? 0,
    );
  }

  formatPaise(value: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format((value || 0) / 100);
  }

  async adjustPackageUsage(c: any, delta: number): Promise<void> {
    const usage = this.packageUsage(c);
    if (!usage || this.saving()) return;
    const total = Number(usage.totalSessions || 0);
    const current = Number(usage.usedSessions || 0);
    const next = Math.max(0, Math.min(total, current + delta));
    this.saving.set(true);
    try {
      const result = await this.api.updateHopeHubPackageUsage(c.id, next);
      this.consultations.update((list) =>
        list.map((item) =>
          item.id === c.id
            ? {
                ...item,
                pricingSnapshot: {
                  ...(item.pricingSnapshot || {}),
                  packageUsage: result.packageUsage,
                },
              }
            : item,
        ),
      );
      this.showToast('Package usage updated ✓');
      this.loadQualitySummary();
    } catch (e: any) {
      this.err.set(e?.error?.message ?? 'Package usage update failed');
    } finally {
      this.saving.set(false);
    }
  }
}

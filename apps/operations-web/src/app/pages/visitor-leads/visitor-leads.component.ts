import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnDestroy, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ReceptionApiService } from '../../services/reception-api.service';
import { OperationsMobileLayoutService } from '../../services/operations-mobile-layout.service';
import { ViewportService } from '@hopehub/platform-ui';
import { environment } from '../../../environments/environment';
import { API_PATHS } from '../../core/constants/api-paths.constants';
import { ROUTE_PATHS } from '../../core/constants/app-routes.constants';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

const FOLLOW_UP_OPTIONS = [
  { value: 'NEW', label: 'New' },
  { value: 'NEEDS_CALLBACK', label: 'Needs callback' },
  { value: 'CALLED', label: 'Called' },
  { value: 'NO_ANSWER', label: 'No answer' },
  { value: 'WHATSAPP_SENT', label: 'WhatsApp sent' },
  { value: 'REGISTERED', label: 'Registered' },
  { value: 'BOOKED', label: 'Booked consultation' },
  { value: 'NOT_INTERESTED', label: 'Not interested' },
  { value: 'CLOSED', label: 'Closed' }
] as const;

const QUICK_OUTCOMES = [
  { status: 'CALLED', label: 'Called', markCalled: true },
  { status: 'NO_ANSWER', label: 'No answer', markCalled: false },
  { status: 'WHATSAPP_SENT', label: 'WhatsApp sent', markCalled: false },
  { status: 'NOT_INTERESTED', label: 'Not interested', markCalled: false, needsReason: true }
] as const;

type FollowUpFilter = 'ALL' | 'NEEDS_CALLBACK' | 'NEW' | 'CALLED' | 'REGISTERED' | 'NOT_INTERESTED';

function parseStoredNotInterestedReason(stored: string | null | undefined, presets: string[]) {
  if (!stored?.trim()) return { preset: '', detail: '' };
  for (const preset of presets) {
    if (stored === preset) return { preset, detail: '' };
    if (stored.startsWith(`${preset} — `)) {
      return { preset, detail: stored.slice(preset.length + 3) };
    }
    if (preset === 'Other' && stored.startsWith('Other: ')) {
      return { preset: 'Other', detail: stored.slice(7) };
    }
  }
  return { preset: 'Other', detail: stored };
}

@Component({
  selector: 'app-visitor-leads',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './visitor-leads.component.html',
  styleUrl: './visitor-leads.component.scss'
})
export class VisitorLeadsComponent implements OnDestroy {
  private readonly api = inject(ReceptionApiService);
  private readonly http = inject(HttpClient);
  private readonly viewport = inject(ViewportService);
  private readonly mobileLayout = inject(OperationsMobileLayoutService);

  readonly isMobile = computed(() => this.viewport.isMobile());
  readonly hasSelection = computed(() => !!this.selected());
  readonly showListPane = computed(() => !this.isMobile() || !this.hasSelection());
  readonly showDetailPane = computed(() => !this.isMobile() || this.hasSelection());

  readonly walkInPath = `/${ROUTE_PATHS.WALK_IN}`;

  readonly leads = signal<any[]>([]);
  readonly selected = signal<any | null>(null);
  readonly diseases = signal<Array<{ id: string; name: string; feeInPaise: number }>>([]);
  readonly notInterestedReasons = signal<string[]>([]);
  readonly loading = signal(false);
  readonly detailLoading = signal(false);
  readonly mutating = signal(false);
  readonly error = signal('');
  readonly message = signal('');
  readonly followUpFilter = signal<FollowUpFilter>('NEEDS_CALLBACK');
  readonly stats = signal<any | null>(null);

  readonly followUpOptions = FOLLOW_UP_OPTIONS;
  readonly quickOutcomes = QUICK_OUTCOMES;
  readonly showNotInterestedForm = computed(() => this.selectedStatus === 'NOT_INTERESTED');

  selectedStatus = 'NEEDS_CALLBACK';
  operatorNote = '';
  visitorIssue = '';
  notInterestedPreset = '';
  notInterestedDetail = '';
  bookDiseaseId = '';
  collectCash = false;
  chatReply = '';
  whatsappPhone = '';

  constructor() {
    void this.load();
    void this.loadDiseases();
    void this.loadMeta();
    void this.loadPublicConfig();
  }

  async loadPublicConfig() {
    try {
      const cfg = await this.api.getPublicConfig();
      this.whatsappPhone = cfg.whatsappPhone ?? '';
    } catch {
      this.whatsappPhone = '';
    }
  }

  async loadMeta() {
    try {
      const res = await this.api.getVisitorLeadMeta();
      this.notInterestedReasons.set(res.notInterestedReasons);
    } catch {
      this.notInterestedReasons.set([
        'Already under care elsewhere',
        'Too expensive / fee concern',
        'Not ready — will decide later',
        'Wrong number / not the right person',
        'Location / prefers in-person nearby',
        'Does not want online consultation',
        'No longer has the issue',
        'Other'
      ]);
    }
  }

  async loadDiseases() {
    try {
      const res = await firstValueFrom(
        this.http.get<{ diseases: Array<{ id: string; name: string; feeInPaise: number }> }>(
          `${environment.apiUrl}${API_PATHS.DISEASES}`
        )
      );
      this.diseases.set(res.diseases.filter((d) => d.id));
      if (res.diseases[0]) this.bookDiseaseId = res.diseases[0].id;
    } catch {
      // diseases optional for list view
    }
  }

  async load() {
    this.loading.set(true);
    this.error.set('');
    try {
      const filter = this.followUpFilter();
      const [res, statsRes] = await Promise.all([
        this.api.listVisitorLeads(filter === 'ALL' ? {} : { followUpStatus: filter }),
        this.api.getVisitorLeadStats()
      ]);
      this.leads.set(res.leads);
      this.stats.set(statsRes.stats);
    } catch {
      this.error.set('Could not load visitor leads.');
    } finally {
      this.loading.set(false);
    }
  }

  async setFilter(status: FollowUpFilter) {
    this.followUpFilter.set(status);
    this.selected.set(null);
    this.mobileLayout.clearPageFocus();
    await this.load();
  }

  ngOnDestroy(): void {
    this.mobileLayout.clearPageFocus();
  }

  backToList() {
    this.selected.set(null);
    this.mobileLayout.clearPageFocus();
  }

  private syncMobileFocus() {
    if (this.isMobile() && this.selected()) {
      this.mobileLayout.setPageFocus(true);
    } else if (this.isMobile()) {
      this.mobileLayout.clearPageFocus();
    }
  }

  async selectLead(id: string) {
    this.detailLoading.set(true);
    this.message.set('');
    this.error.set('');
    try {
      const res = await this.api.getVisitorLead(id);
      this.selected.set(res.lead);
      this.selectedStatus = res.lead.followUpStatus;
      this.operatorNote = res.lead.operatorNote ?? '';
      this.visitorIssue = res.lead.visitorIssue ?? res.lead.concern ?? '';
      const parsed = parseStoredNotInterestedReason(
        res.lead.notInterestedReason,
        this.notInterestedReasons()
      );
      this.notInterestedPreset = parsed.preset;
      this.notInterestedDetail = parsed.detail;
      this.syncMobileFocus();
    } catch {
      this.error.set('Could not load lead.');
    } finally {
      this.detailLoading.set(false);
    }
  }

  async markCalled() {
    await this.applyFollowUp('CALLED', true);
  }

  async quickOutcome(outcome: (typeof QUICK_OUTCOMES)[number]) {
    this.selectedStatus = outcome.status;
    if ('needsReason' in outcome && outcome.needsReason) {
      this.message.set('Select a not-interested reason below, then save.');
      return;
    }
    await this.applyFollowUp(outcome.status, outcome.markCalled);
  }

  async saveFollowUp() {
    await this.applyFollowUp(this.selectedStatus, this.selectedStatus === 'CALLED');
  }

  private buildFollowUpPayload(status: string, markCalled: boolean) {
    return {
      followUpStatus: status,
      operatorNote: this.operatorNote.trim() || undefined,
      visitorIssue: this.visitorIssue.trim() || undefined,
      notInterestedReasonPreset:
        status === 'NOT_INTERESTED' ? this.notInterestedPreset || undefined : undefined,
      notInterestedReasonDetail:
        status === 'NOT_INTERESTED' ? this.notInterestedDetail.trim() || undefined : undefined,
      markCalled
    };
  }

  private async applyFollowUp(status: string, markCalled: boolean) {
    const lead = this.selected();
    if (!lead) return;

    if (status === 'NOT_INTERESTED' && !this.notInterestedPreset) {
      this.error.set('Please select why they are not interested.');
      return;
    }
    if (
      status === 'NOT_INTERESTED' &&
      this.notInterestedPreset === 'Other' &&
      !this.notInterestedDetail.trim()
    ) {
      this.error.set('Please describe the reason under “Other”.');
      return;
    }

    this.mutating.set(true);
    this.error.set('');
    try {
      const res = await this.api.updateVisitorLeadFollowUp(
        lead.id,
        this.buildFollowUpPayload(status, markCalled)
      );
      this.selected.set(res.lead);
      this.selectedStatus = status;
      this.message.set('Follow-up saved.');
      await this.load();
    } catch (err: unknown) {
      const msg = (err as { error?: { message?: string } })?.error?.message;
      this.error.set(msg || 'Could not update follow-up.');
    } finally {
      this.mutating.set(false);
    }
  }

  async bookConsultation() {
    const lead = this.selected();
    if (!lead || !this.bookDiseaseId) return;
    this.mutating.set(true);
    this.error.set('');
    try {
      const res = await this.api.bookVisitorLeadConsultation(lead.id, {
        diseaseId: this.bookDiseaseId,
        collectCash: this.collectCash,
        notes: this.operatorNote || undefined
      });
      this.selected.set(res.lead);
      this.message.set('Consultation booked and lead marked as booked.');
      await this.load();
    } catch (err: unknown) {
      const msg = (err as { error?: { message?: string } })?.error?.message;
      this.error.set(msg || 'Could not book consultation.');
    } finally {
      this.mutating.set(false);
    }
  }

  followUpLabel(status: string): string {
    return this.followUpOptions.find((o) => o.value === status)?.label ?? status;
  }

  sourceLabel(source: string): string {
    switch (source) {
      case 'CHAT_BOT':
        return 'Chat';
      case 'HOME_BOOKING':
        return 'Home booking';
      case 'PROMO_POPUP':
        return 'Promo popup';
      default:
        return source;
    }
  }

  formatTime(iso: string): string {
    return new Date(iso).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatPaise(paise: number): string {
    return (paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  }

  leadPreview(lead: any): string {
    return (
      lead.visitorIssue ??
      lead.concern ??
      lead.visitorName ??
      lead.visitorPhone ??
      'Website inquiry'
    );
  }

  walkInQueryParams(lead: any): Record<string, string> {
    const params: Record<string, string> = {};
    if (lead.visitorName) params['name'] = lead.visitorName;
    if (lead.visitorPhone) params['mobile'] = lead.visitorPhone;
    const notes = lead.visitorIssue ?? lead.concern;
    if (notes) params['notes'] = notes;
    return params;
  }

  whatsappUrl(lead: any): string | null {
    const phone = lead.visitorPhone?.replace(/\D/g, '');
    if (!phone) return null;
    const normalized = phone.startsWith('91') ? phone : `91${phone}`;
    const text = encodeURIComponent(
      `Hi${lead.visitorName ? ` ${lead.visitorName}` : ''}, this is from our clinic regarding your inquiry on our website.`
    );
    return `https://wa.me/${normalized}?text=${text}`;
  }

  async sendChatReply() {
    const lead = this.selected();
    const content = this.chatReply.trim();
    if (!lead?.chatSessionId || !content) return;

    this.mutating.set(true);
    this.error.set('');
    try {
      const res = await this.api.sendVisitorLeadOperatorMessage(lead.id, content);
      this.selected.set(res.lead);
      this.chatReply = '';
      this.message.set('Reply sent to visitor chat.');
    } catch (err: unknown) {
      const msg = (err as { error?: { message?: string } })?.error?.message;
      this.error.set(msg || 'Could not send reply.');
    } finally {
      this.mutating.set(false);
    }
  }
}

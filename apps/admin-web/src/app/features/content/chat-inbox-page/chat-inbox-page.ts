import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnDestroy, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApi } from '../../../core/services/admin-api';
import { AdminMobileLayoutService } from '../../../core/services/admin-mobile-layout.service';
import { ViewportService } from '@vitalis/platform-ui';

type ChatMessage = {
  id: string;
  role: 'bot' | 'user' | 'operator';
  content: string;
  createdAt: string;
};

type WebsiteLead = {
  id: string;
  source: 'CHAT_BOT' | 'HOME_BOOKING' | 'PROMO_POPUP';
  followUpStatus: string;
  visitorName?: string | null;
  visitorPhone?: string | null;
  visitorEmail?: string | null;
  concern?: string | null;
  visitorIssue?: string | null;
  notInterestedReason?: string | null;
  preferredCallbackTime?: string | null;
  entryPage?: string | null;
  operatorNote?: string | null;
  calledAt?: string | null;
  registeredAt?: string | null;
  createdAt: string;
  user?: { id: string; name: string; mobile?: string | null; email?: string | null } | null;
  calledBy?: { id: string; name: string } | null;
  consultation?: { id: string; status: string; disease?: { name: string } | null } | null;
  chatSession?: {
    id: string;
    status: string;
    concern?: string | null;
    operatorNote?: string | null;
    resolvedAt?: string | null;
    messages?: ChatMessage[];
    _count?: { messages: number };
  } | null;
};

type FollowUpFilter =
  | 'ALL'
  | 'NEW'
  | 'NEEDS_CALLBACK'
  | 'CALLED'
  | 'REGISTERED'
  | 'BOOKED'
  | 'NOT_INTERESTED'
  | 'CLOSED';

@Component({
  selector: 'app-chat-inbox-page',
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-inbox-page.html',
  styleUrl: './chat-inbox-page.scss',
})
export class ChatInboxPage implements OnDestroy {
  private readonly api = inject(AdminApi);
  private readonly viewport = inject(ViewportService);
  private readonly mobileLayout = inject(AdminMobileLayoutService);

  readonly isMobile = computed(() => this.viewport.isMobile());
  readonly hasSelection = computed(() => !!this.selected());
  readonly showListPane = computed(() => !this.isMobile() || !this.hasSelection());
  readonly showDetailPane = computed(() => !this.isMobile() || this.hasSelection());

  readonly leads = signal<WebsiteLead[]>([]);
  readonly selected = signal<WebsiteLead | null>(null);
  readonly loading = signal(false);
  readonly detailLoading = signal(false);
  readonly error = signal('');
  readonly followUpFilter = signal<FollowUpFilter>('NEEDS_CALLBACK');
  readonly sourceFilter = signal<'ALL' | 'CHAT_BOT' | 'HOME_BOOKING' | 'PROMO_POPUP'>('ALL');
  readonly dateFrom = signal('');
  readonly dateTo = signal('');
  readonly notInterestedOnly = signal(false);
  readonly csvExporting = signal(false);
  readonly csvError = signal('');
  readonly stats = signal<{
    total: number;
    newLeads: number;
    needsCallback: number;
    called: number;
    registered: number;
    bySource: Record<string, number>;
  } | null>(null);

  /** Admin console is view-only — receptionists update follow-up in Operations portal. */
  readonly canFollowUp = false;

  constructor() {
    void this.load();
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

  private listFilters() {
    const filter = this.followUpFilter();
    return {
      followUpStatus: filter === 'ALL' ? undefined : filter,
      source: this.sourceFilter() === 'ALL' ? undefined : this.sourceFilter(),
      dateFrom: this.dateFrom() || undefined,
      dateTo: this.dateTo() || undefined,
      notInterestedOnly: this.notInterestedOnly() || undefined,
    };
  }

  async load() {
    this.loading.set(true);
    this.error.set('');
    try {
      const [res, statsRes] = await Promise.all([
        this.api.listVisitorLeads(this.listFilters()),
        this.api.getVisitorLeadStats(),
      ]);
      this.leads.set(res.leads);
      this.stats.set(statsRes.stats);
    } catch {
      this.error.set('Could not load visitor leads.');
    } finally {
      this.loading.set(false);
    }
  }

  async applyAdvancedFilters() {
    this.selected.set(null);
    await this.load();
  }

  async exportCsv() {
    this.csvExporting.set(true);
    this.csvError.set('');
    try {
      const csv = await this.api.exportVisitorLeadsCsv(this.listFilters());
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `visitor-leads-${new Date().toISOString().substring(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      this.csvError.set('CSV export failed.');
    } finally {
      this.csvExporting.set(false);
    }
  }

  async setFilter(status: FollowUpFilter) {
    this.followUpFilter.set(status);
    this.selected.set(null);
    await this.load();
  }

  async selectLead(id: string) {
    this.detailLoading.set(true);
    try {
      const res = await this.api.getVisitorLead(id);
      this.selected.set(res.lead);
      this.syncMobileFocus();
    } catch {
      this.error.set('Could not load lead.');
    } finally {
      this.detailLoading.set(false);
    }
  }

  followUpLabel(status: string): string {
    switch (status) {
      case 'NEW':
        return 'New';
      case 'NEEDS_CALLBACK':
        return 'Needs callback';
      case 'CALLED':
        return 'Called';
      case 'NO_ANSWER':
        return 'No answer';
      case 'WHATSAPP_SENT':
        return 'WhatsApp sent';
      case 'REGISTERED':
        return 'Registered';
      case 'BOOKED':
        return 'Booked';
      case 'NOT_INTERESTED':
        return 'Not interested';
      case 'CLOSED':
        return 'Closed';
      default:
        return status;
    }
  }

  followUpClass(status: string): string {
    switch (status) {
      case 'NEEDS_CALLBACK':
      case 'NEW':
        return 'badge-warn';
      case 'CALLED':
      case 'WHATSAPP_SENT':
        return 'badge-info';
      case 'REGISTERED':
      case 'BOOKED':
        return 'badge-ok';
      default:
        return '';
    }
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
      minute: '2-digit',
    });
  }

  leadPreview(lead: WebsiteLead): string {
    return (
      lead.visitorIssue ??
      lead.concern ??
      lead.visitorName ??
      lead.visitorPhone ??
      'Website inquiry'
    );
  }

  visitorLabel(lead: WebsiteLead): string {
    if (lead.user?.name) return `Patient: ${lead.user.name}`;
    if (lead.visitorName) return lead.visitorName;
    if (lead.visitorPhone) return lead.visitorPhone;
    return 'Anonymous visitor';
  }

  readonly pendingCount = computed(() => this.stats()?.needsCallback ?? 0);
}

import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  inject,
  signal,
} from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { AuthService } from './auth/auth.service';
import {
  BILLING_PLAN_CODES,
  CURRENCY_CODE,
  PURCHASE_TYPES,
} from './core/constants/billing.constants';
import { API_PATHS } from './core/constants/api-paths.constants';
import { ClinicApiClient } from './clinic-api/clinic-api.client';
import { ClinicHttpClient } from '@vitalis/clinic-api';
import { BillingPlan, Disease } from './models';

export type BookConsultationPayload = {
  diseaseId: string;
  intakeAnswers: Record<string, string>;
  purchaseType: typeof PURCHASE_TYPES.ONE_TIME | typeof PURCHASE_TYPES.PLAN;
  planCode?: string;
  walletRedeemInPaise?: number;
  promoCode?: string;
  clinicStoreId?: string | null;
};

type ClinicOption = {
  id: string;
  name: string;
  address?: string | null;
};

type BookingForm = {
  purchaseType: typeof PURCHASE_TYPES.ONE_TIME | typeof PURCHASE_TYPES.PLAN;
  selectedPlanCode: string;
  selectedDiseaseId: string;
  selectedClinicStoreId: string;
  intakeAnswers: Record<string, string>;
};

type CheckoutQuote = {
  grossAmountInPaise: number;
  discountInPaise: number;
  walletRedeemedInPaise: number;
  payableInPaise: number;
  walletBalanceInPaise: number;
  maxWalletRedeemInPaise: number;
  appliedRules: Array<{ name: string; amountInPaise: number }>;
};

function emptyBookingForm(): BookingForm {
  return {
    purchaseType: PURCHASE_TYPES.ONE_TIME,
    selectedPlanCode: '',
    selectedDiseaseId: '',
    selectedClinicStoreId: '',
    intakeAnswers: {},
  };
}

@Component({
  selector: 'app-book-consultation-panel',
  standalone: true,
  imports: [CommonModule, FormField],
  templateUrl: './book-consultation-panel.component.html',
  styleUrl: './book-consultation-panel.component.scss',
})
export class BookConsultationPanelComponent implements OnChanges, OnInit {
  readonly PURCHASE_TYPES = PURCHASE_TYPES;
  readonly BILLING_PLAN_CODES = BILLING_PLAN_CODES;
  readonly CURRENCY_CODE = CURRENCY_CODE;

  private readonly auth = inject(AuthService);
  private readonly apiClient = inject(ClinicApiClient);
  private readonly http = inject(ClinicHttpClient);
  private quoteTimer: ReturnType<typeof setTimeout> | null = null;

  readonly clinics = signal<ClinicOption[]>([]);
  readonly clinicsLoading = signal(true);

  @Input() diseases: Disease[] = [];
  @Input() plans: BillingPlan[] = [];
  @Input() disabled = false;
  @Input() initialDiseaseId = '';
  @Input() initialClinicStoreId = '';
  @Output() booked = new EventEmitter<BookConsultationPayload>();
  @Output() clinicStoreChange = new EventEmitter<string>();

  readonly bookingFormModel = signal<BookingForm>(emptyBookingForm());
  readonly bookingForm = form(this.bookingFormModel);
  readonly useWallet = signal(false);
  readonly promoCode = signal('');
  readonly quoteLoading = signal(false);
  readonly checkoutQuote = signal<CheckoutQuote | null>(null);

  ngOnInit() {
    void this.loadClinics();
  }

  private async loadClinics() {
    this.clinicsLoading.set(true);
    try {
      const res = await this.apiClient.get<{ clinics: ClinicOption[] }>(API_PATHS.CLINICS);
      const clinics = res.clinics || [];
      this.clinics.set(clinics);
      const preferred = this.resolvePreferredClinicId(clinics);
      this.bookingFormModel.update((m) => ({ ...m, selectedClinicStoreId: preferred }));
      if (
        preferred &&
        typeof sessionStorage !== 'undefined' &&
        sessionStorage.getItem('pendingClinicStoreId') === preferred
      ) {
        sessionStorage.removeItem('pendingClinicStoreId');
      }
      if (preferred && !this.initialClinicStoreId) {
        this.clinicStoreChange.emit(preferred);
      }
    } catch {
      this.clinics.set([]);
    } finally {
      this.clinicsLoading.set(false);
    }
  }

  selectedClinicStoreId() {
    const value = this.bookingFormModel().selectedClinicStoreId;
    return value || null;
  }

  private resolvePreferredClinicId(clinics: ClinicOption[]) {
    const pending =
      typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('pendingClinicStoreId') : null;
    const candidates = [this.initialClinicStoreId, pending, clinics[0]?.id || ''];
    for (const candidate of candidates) {
      if (candidate && clinics.some((clinic) => clinic.id === candidate)) {
        return candidate;
      }
    }
    return '';
  }

  private applyInitialClinicStoreId() {
    if (!this.initialClinicStoreId || !this.clinics().length) return;
    if (!this.clinics().some((clinic) => clinic.id === this.initialClinicStoreId)) return;
    this.bookingFormModel.update((m) => ({
      ...m,
      selectedClinicStoreId: this.initialClinicStoreId,
    }));
  }

  ngOnChanges() {
    const current = this.bookingFormModel();
    const updates: Partial<BookingForm> = {};
    const preferredDiseaseId =
      this.initialDiseaseId ||
      (typeof sessionStorage !== 'undefined'
        ? sessionStorage.getItem('pendingDiseaseId') || ''
        : '');
    if (preferredDiseaseId && this.diseases.some((d) => d.id === preferredDiseaseId)) {
      updates.selectedDiseaseId = preferredDiseaseId;
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem('pendingDiseaseId');
      }
    } else if (!current.selectedDiseaseId && this.diseases.length) {
      updates.selectedDiseaseId = this.diseases[0].id;
    }
    if (!current.selectedPlanCode) {
      updates.selectedPlanCode =
        this.plans.find((p) => p.code !== BILLING_PLAN_CODES.ONE_TIME)?.code || '';
    }
    if (Object.keys(updates).length) {
      this.bookingFormModel.update((m) => ({ ...m, ...updates }));
    }
    this.applyInitialClinicStoreId();
    this.scheduleQuoteRefresh();
  }

  selectedDisease() {
    const { selectedDiseaseId } = this.bookingFormModel();
    return this.diseases.find((d) => d.id === selectedDiseaseId) || null;
  }

  selectedPlanDescription() {
    const { selectedPlanCode } = this.bookingFormModel();
    return this.plans.find((p) => p.code === selectedPlanCode)?.description || null;
  }

  intakeQuestions() {
    return this.selectedDisease()?.intakeQuestions || [];
  }

  estimatedGrossAmount() {
    const { purchaseType, selectedPlanCode } = this.bookingFormModel();
    if (purchaseType === PURCHASE_TYPES.PLAN) {
      return this.plans.find((p) => p.code === selectedPlanCode)?.priceInPaise || 0;
    }
    return this.selectedDisease()?.feeInPaise || 0;
  }

  payableAmount() {
    const quote = this.checkoutQuote();
    if (quote) return quote.payableInPaise;
    return this.estimatedGrossAmount();
  }

  totalSavings() {
    const quote = this.checkoutQuote();
    if (!quote) return 0;
    return quote.discountInPaise + quote.walletRedeemedInPaise;
  }

  walletBalance() {
    return this.checkoutQuote()?.walletBalanceInPaise ?? 0;
  }

  canUseWallet() {
    const quote = this.checkoutQuote();
    return Boolean(quote && quote.walletBalanceInPaise > 0 && quote.maxWalletRedeemInPaise > 0);
  }

  onBookingOptionChange() {
    this.scheduleQuoteRefresh();
  }

  onDiseaseChange() {
    this.bookingFormModel.update((m) => ({ ...m, intakeAnswers: {} }));
    this.onBookingOptionChange();
  }

  onClinicChange() {
    this.clinicStoreChange.emit(this.bookingFormModel().selectedClinicStoreId);
    this.onBookingOptionChange();
  }

  toggleWallet(checked: boolean) {
    this.useWallet.set(checked);
    this.scheduleQuoteRefresh();
  }

  onPromoChange(event: Event) {
    this.promoCode.set((event.target as HTMLInputElement).value.toUpperCase());
    this.scheduleQuoteRefresh();
  }

  applyPromo() {
    this.scheduleQuoteRefresh();
  }

  patchIntakeAnswer(question: string, event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.bookingFormModel.update((m) => ({
      ...m,
      intakeAnswers: { ...m.intakeAnswers, [question]: value },
    }));
  }

  intakeAnswer(question: string): string {
    return this.bookingFormModel().intakeAnswers[question] ?? '';
  }

  submit() {
    const form = this.bookingFormModel();
    if (!form.selectedDiseaseId) return;
    const quote = this.checkoutQuote();
    this.booked.emit({
      diseaseId: form.selectedDiseaseId,
      intakeAnswers: { ...form.intakeAnswers },
      purchaseType: form.purchaseType,
      ...(form.purchaseType === PURCHASE_TYPES.PLAN ? { planCode: form.selectedPlanCode } : {}),
      ...(this.useWallet() && quote?.walletRedeemedInPaise
        ? { walletRedeemInPaise: quote.walletRedeemedInPaise }
        : {}),
      ...(this.promoCode().trim() ? { promoCode: this.promoCode().trim() } : {}),
      clinicStoreId: this.selectedClinicStoreId(),
    });
  }

  private scheduleQuoteRefresh() {
    if (this.quoteTimer) clearTimeout(this.quoteTimer);
    this.quoteTimer = setTimeout(() => void this.refreshQuote(), 250);
  }

  private async refreshQuote() {
    const form = this.bookingFormModel();
    const token = this.auth.token;
    if (!token || !form.selectedDiseaseId) {
      this.checkoutQuote.set(null);
      return;
    }

    this.quoteLoading.set(true);
    try {
      const { quote } = await this.http.post<{ quote: CheckoutQuote | null }>(
        API_PATHS.PATIENT.REWARDS_CHECKOUT_QUOTE,
        {
          diseaseId: form.selectedDiseaseId,
          purchaseType: form.purchaseType,
          ...(form.purchaseType === PURCHASE_TYPES.PLAN ? { planCode: form.selectedPlanCode } : {}),
          walletRedeemInPaise: this.useWallet() ? 99_999_999 : 0,
          ...(this.promoCode().trim() ? { promoCode: this.promoCode().trim() } : {}),
          clinicStoreId: this.selectedClinicStoreId(),
        },
      );
      this.checkoutQuote.set(quote);
      if (!quote?.walletBalanceInPaise || !quote?.maxWalletRedeemInPaise) {
        this.useWallet.set(false);
      }
    } catch {
      this.checkoutQuote.set(null);
    } finally {
      this.quoteLoading.set(false);
    }
  }
}

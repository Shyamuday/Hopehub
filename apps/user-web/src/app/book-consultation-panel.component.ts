import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import {
  BILLING_PLAN_CODES,
  CURRENCY_CODE,
  PURCHASE_TYPES,
} from './core/constants/billing.constants';
import { BillingPlan, Disease } from './models';

export type BookConsultationPayload = {
  diseaseId: string;
  intakeAnswers: Record<string, string>;
  purchaseType: typeof PURCHASE_TYPES.ONE_TIME | typeof PURCHASE_TYPES.PLAN;
  planCode?: string;
};

type BookingForm = {
  purchaseType: typeof PURCHASE_TYPES.ONE_TIME | typeof PURCHASE_TYPES.PLAN;
  selectedPlanCode: string;
  selectedDiseaseId: string;
  intakeAnswers: Record<string, string>;
};

function emptyBookingForm(): BookingForm {
  return {
    purchaseType: PURCHASE_TYPES.ONE_TIME,
    selectedPlanCode: '',
    selectedDiseaseId: '',
    intakeAnswers: {},
  };
}

@Component({
  selector: 'app-book-consultation-panel',
  standalone: true,
  imports: [CommonModule, FormField],
  templateUrl: './book-consultation-panel.component.html',
})
export class BookConsultationPanelComponent implements OnChanges {
  readonly PURCHASE_TYPES = PURCHASE_TYPES;
  readonly BILLING_PLAN_CODES = BILLING_PLAN_CODES;
  readonly CURRENCY_CODE = CURRENCY_CODE;
  @Input() diseases: Disease[] = [];
  @Input() plans: BillingPlan[] = [];
  @Input() disabled = false;
  @Output() booked = new EventEmitter<BookConsultationPayload>();

  readonly bookingFormModel = signal<BookingForm>(emptyBookingForm());
  readonly bookingForm = form(this.bookingFormModel);

  ngOnChanges() {
    const current = this.bookingFormModel();
    const updates: Partial<BookingForm> = {};
    if (!current.selectedDiseaseId && this.diseases.length) {
      updates.selectedDiseaseId = this.diseases[0].id;
    }
    if (!current.selectedPlanCode) {
      updates.selectedPlanCode =
        this.plans.find((p) => p.code !== BILLING_PLAN_CODES.ONE_TIME)?.code || '';
    }
    if (Object.keys(updates).length) {
      this.bookingFormModel.update((m) => ({ ...m, ...updates }));
    }
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

  estimatedAmount() {
    const { purchaseType, selectedPlanCode } = this.bookingFormModel();
    if (purchaseType === PURCHASE_TYPES.PLAN) {
      return this.plans.find((p) => p.code === selectedPlanCode)?.priceInPaise || 0;
    }
    return this.selectedDisease()?.feeInPaise || 0;
  }

  onDiseaseChange() {
    this.bookingFormModel.update((m) => ({ ...m, intakeAnswers: {} }));
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
    this.booked.emit({
      diseaseId: form.selectedDiseaseId,
      intakeAnswers: { ...form.intakeAnswers },
      purchaseType: form.purchaseType,
      ...(form.purchaseType === PURCHASE_TYPES.PLAN ? { planCode: form.selectedPlanCode } : {}),
    });
  }
}

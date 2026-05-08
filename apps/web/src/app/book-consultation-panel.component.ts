import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, type OnChanges, Output, type SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { type BillingPlan, type ClinicLocation, type Disease, type ConsultationChannel } from './interfaces';
import {
  SELF_ASSESSMENT_WORKSHEET_INTAKE_KEY,
  type WorksheetBookingDraft,
  clearWorksheetBookingDraft
} from './patient/patient-worksheet-booking-bridge';

export type BookConsultationPayload = {
  diseaseId: string;
  intakeAnswers: Record<string, string>;
  purchaseType: 'ONE_TIME' | 'PLAN';
  planCode?: string;
  channel: ConsultationChannel;
  locationId: string | null;
};

@Component({
  selector: 'app-book-consultation-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  template: `
    <div class="panel" id="book-consultation">
      <h2>{{ 'patient.book.title' | translate }}</h2>

      @if (worksheetBookingDraft) {
        <div class="worksheet-prefill">
          <p class="muted">{{ 'patient.book.worksheetBlurb' | translate: { label: worksheetBookingDraft.toolLabel } }}</p>
          <label>
            {{ 'patient.book.worksheetNotesLabel' | translate }}
            <textarea
              [(ngModel)]="worksheetNotesText"
              rows="6"
              [placeholder]="'patient.book.worksheetNotesPlaceholder' | translate"
            ></textarea>
          </label>
          <button type="button" class="secondary" (click)="dismissWorksheetDraft()">
            {{ 'patient.book.clearWorksheetNotes' | translate }}
          </button>
        </div>
      }

      <label>
        {{ 'patient.book.purchaseType' | translate }}
        <select [(ngModel)]="purchaseType">
          <option value="ONE_TIME">{{ 'patient.book.oneTime' | translate }}</option>
          <option value="PLAN">{{ 'patient.book.plan' | translate }}</option>
        </select>
      </label>

      <label>
        {{ 'patient.book.consultationType' | translate }}
        <select [(ngModel)]="channel">
          <option value="ONLINE_CHAT">{{ 'patient.book.channel.ONLINE_CHAT' | translate }}</option>
          <option value="VIDEO">{{ 'patient.book.channel.VIDEO' | translate }}</option>
          <option value="PHONE">{{ 'patient.book.channel.PHONE' | translate }}</option>
          <option value="IN_CLINIC">{{ 'patient.book.channel.IN_CLINIC' | translate }}</option>
        </select>
      </label>

      @if (channel === 'IN_CLINIC') {
        <label>
          {{ 'patient.book.clinicLocationReq' | translate }} <span class="req">*</span>
          <select [(ngModel)]="selectedLocationId" [disabled]="!locations.length">
            <option value="">{{ 'patient.book.selectCentre' | translate }}</option>
            @for (loc of locations; track loc.id) {
              <option [value]="loc.id">{{ locationOptionLabel(loc) }}</option>
            }
          </select>
        </label>
        @if (!locations.length) {
          <p class="muted">{{ 'patient.book.noLocations' | translate }}</p>
        }
      } @else {
        <label>
          {{ 'patient.book.preferredCentre' | translate }}
          <select [(ngModel)]="selectedLocationId">
            <option value="">{{ 'patient.book.noPreference' | translate }}</option>
            @for (loc of locations; track loc.id) {
              <option [value]="loc.id">{{ locationOptionLabel(loc) }}</option>
            }
          </select>
        </label>
        <p class="muted">
          {{ 'patient.book.preferredCentreHintBefore' | translate }}
          <strong>{{ ('patient.book.channel.' + channel) | translate }}</strong
          >{{ 'patient.book.preferredCentreHintAfter' | translate }}
        </p>
      }

      @if (purchaseType === 'PLAN') {
        <label>
          {{ 'patient.book.selectPlan' | translate }}
          <select [(ngModel)]="selectedPlanCode">
            @for (plan of plans; track plan.code) {
              @if (plan.code !== 'ONE_TIME') {
                <option [value]="plan.code">
                  {{ plan.name }} — {{ plan.priceInPaise / 100 | currency: 'INR' }}
                </option>
              }
            }
          </select>
        </label>
        @if (selectedPlanDescription()) {
          <p class="muted">{{ selectedPlanDescription() }}</p>
        }
      }

      <label>
        {{ 'patient.book.selectProblem' | translate }}
        <select [(ngModel)]="selectedDiseaseId" (ngModelChange)="resetAnswers()">
          @for (disease of diseases; track disease.id) {
            <option [value]="disease.id">
              {{ disease.name }} — {{ disease.feeInPaise / 100 | currency: 'INR' }}
            </option>
          }
        </select>
      </label>

      @for (question of intakeQuestions(); track question) {
        <label>
          {{ question }}
          <input [(ngModel)]="intakeAnswers[question]" [placeholder]="'patient.book.answerPlaceholder' | translate" />
        </label>
      }

      <button
        class="primary"
        [disabled]="disabled || !selectedDiseaseId || !canSubmitChannelLocation()"
        (click)="submit()">
        {{ 'patient.book.createConsultation' | translate }}
      </button>
      <p class="muted">
        {{ 'patient.book.payableNow' | translate }}
        <strong>{{ estimatedAmount() / 100 | currency: 'INR' }}</strong
        >. {{ 'patient.book.afterPayment' | translate }}
      </p>
    </div>
  `,
  styles: [
    `
      .req {
        color: #b91c1c;
        font-weight: 700;
      }
    `
  ]
})
export class BookConsultationPanelComponent implements OnChanges {
  @Input() diseases: Disease[] = [];
  @Input() plans: BillingPlan[] = [];
  @Input() locations: ClinicLocation[] = [];
  @Input() disabled = false;
  /** When set, patient can edit and submit these notes as part of intake. */
  @Input() worksheetBookingDraft: WorksheetBookingDraft | null = null;
  @Output() booked = new EventEmitter<BookConsultationPayload>();
  @Output() worksheetDraftDismissed = new EventEmitter<void>();

  purchaseType: 'ONE_TIME' | 'PLAN' = 'ONE_TIME';
  channel: ConsultationChannel = 'ONLINE_CHAT';
  selectedLocationId = '';
  selectedPlanCode = '';
  selectedDiseaseId = '';
  intakeAnswers: Record<string, string> = {};
  worksheetNotesText = '';

  ngOnChanges(changes: SimpleChanges) {
    if (changes['worksheetBookingDraft']) {
      if (this.worksheetBookingDraft) {
        this.worksheetNotesText = this.worksheetBookingDraft.summaryText;
      } else {
        this.worksheetNotesText = '';
      }
    }
    if (!this.selectedDiseaseId && this.diseases.length) {
      this.selectedDiseaseId = this.diseases[0].id;
    }
    if (!this.selectedPlanCode) {
      this.selectedPlanCode = this.plans.find((p) => p.code !== 'ONE_TIME')?.code || '';
    }
  }

  locationOptionLabel(loc: ClinicLocation): string {
    const city = loc.city?.trim();
    return city ? `${loc.name} — ${city}` : loc.name;
  }

  canSubmitChannelLocation(): boolean {
    if (this.channel === 'IN_CLINIC') {
      return Boolean(this.selectedLocationId.trim()) && this.locations.length > 0;
    }
    return true;
  }

  selectedDisease() {
    return this.diseases.find((d) => d.id === this.selectedDiseaseId) || null;
  }

  selectedPlanDescription() {
    return this.plans.find((p) => p.code === this.selectedPlanCode)?.description || null;
  }

  intakeQuestions() {
    return this.selectedDisease()?.intakeQuestions || [];
  }

  estimatedAmount() {
    if (this.purchaseType === 'PLAN') {
      return this.plans.find((p) => p.code === this.selectedPlanCode)?.priceInPaise || 0;
    }
    return this.selectedDisease()?.feeInPaise || 0;
  }

  resetAnswers() {
    this.intakeAnswers = {};
  }

  submit() {
    if (!this.selectedDiseaseId) return;
    const intakeAnswers = { ...this.intakeAnswers };
    const extra = this.worksheetNotesText.trim();
    if (extra) {
      intakeAnswers[SELF_ASSESSMENT_WORKSHEET_INTAKE_KEY] = extra;
    }
    this.booked.emit({
      diseaseId: this.selectedDiseaseId,
      intakeAnswers,
      purchaseType: this.purchaseType,
      channel: this.channel,
      locationId: this.selectedLocationId.trim() || null,
      ...(this.purchaseType === 'PLAN' ? { planCode: this.selectedPlanCode } : {})
    });
  }

  dismissWorksheetDraft() {
    this.worksheetNotesText = '';
    clearWorksheetBookingDraft();
    this.worksheetDraftDismissed.emit();
  }
}

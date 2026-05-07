import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Consultation, Role } from './models';

@Component({
  selector: 'app-consultation-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="panel">
      <h2>Consultations</h2>
      <div class="cards">
        @for (consultation of consultations; track consultation.id) {
          <article class="consult-card" [class.active]="activeId === consultation.id">
            <button class="link-card" (click)="selected.emit(consultation)">
              <strong>{{ consultation.disease.name }}</strong>
              <span>{{ consultation.patient.name }}</span>
              <small>{{ consultation.status }}</small>
              <small>Plan: {{ consultation.billingPlanCode || consultation.payment?.billingPlanCode || 'ONE_TIME' }}</small>
              <small>Amount: {{ (consultation.payment?.amountInPaise || 0) / 100 | currency: 'INR' }}</small>
            </button>
            @if (userRole === 'PATIENT' && consultation.status === 'PAYMENT_PENDING') {
              <button
                class="primary"
                [disabled]="disabled || !paymentIdle"
                (click)="pay.emit(consultation)"
              >
                Pay now
              </button>
            }
            @if (consultation.prescription || consultation.prescriptions?.length) {
              <p class="success">Prescription uploaded</p>
            }
          </article>
        } @empty {
          <p class="muted">No consultations yet.</p>
        }
      </div>
    </div>
  `
})
export class ConsultationListComponent {
  @Input() consultations: Consultation[] = [];
  @Input() activeId: string | null = null;
  @Input() userRole: Role | null = null;
  @Input() disabled = false;
  @Input() paymentIdle = true;

  @Output() selected = new EventEmitter<Consultation>();
  @Output() pay = new EventEmitter<Consultation>();
}

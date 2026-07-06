import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { buildDetailRows, DetailRowsComponent } from '@vitalis/platform-ui';
import { CONSULTATION_BILLING_FIELDS } from './consultation/constants/consultation-billing.fields';
import { Consultation, Role } from './models';

@Component({
  selector: 'app-consultation-list',
  standalone: true,
  imports: [CommonModule, DetailRowsComponent],
  templateUrl: './consultation-list.component.html',
})
export class ConsultationListComponent {
  @Input() consultations: Consultation[] = [];
  @Input() activeId: string | null = null;
  @Input() userRole: Role | null = null;
  @Input() disabled = false;
  @Input() paymentIdle = true;

  @Output() selected = new EventEmitter<Consultation>();
  @Output() pay = new EventEmitter<Consultation>();

  billingRows(consultation: Consultation) {
    return buildDetailRows(
      {
        billingPlanCode:
          consultation.billingPlanCode || consultation.payment?.billingPlanCode || 'ONE_TIME',
        amountInPaise: consultation.payment?.amountInPaise || 0
      },
      CONSULTATION_BILLING_FIELDS
    );
  }
}

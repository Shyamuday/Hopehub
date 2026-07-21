import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { buildDetailRows, DetailRowsComponent } from '@hopehub/platform-ui';
import { CONSULTATION_BILLING_FIELDS } from './consultation/constants/consultation-billing.fields';
import { Consultation, Role } from './models';
import { ROUTE_PATHS } from './core/constants/app-routes.constants';

@Component({
  selector: 'app-consultation-list',
  standalone: true,
  imports: [CommonModule, DetailRowsComponent, RouterLink],
  templateUrl: './consultation-list.component.html',
})
export class ConsultationListComponent {
  @Input() consultations: Consultation[] = [];
  @Input() activeId: string | null = null;
  @Input() userRole: Role | null = null;
  @Input() disabled = false;
  @Input() paymentIdle = true;
  @Input() enableDashboardLinks = false;

  readonly dashboardPath = `/${ROUTE_PATHS.PATIENT_DASHBOARD}`;
  readonly accountConsultationPath = `/${ROUTE_PATHS.PATIENT_ACCOUNT_CONSULTATIONS}`;

  @Output() selected = new EventEmitter<Consultation>();
  @Output() pay = new EventEmitter<Consultation>();

  dashboardQuery(consultationId: string) {
    return { consultationId };
  }

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

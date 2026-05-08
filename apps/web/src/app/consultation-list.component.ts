import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { type Consultation, type Role } from './interfaces';

@Component({
  selector: 'app-consultation-list',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe],
  template: `
    <div class="panel">
      <h2>{{ 'patient.consultations.title' | translate }}</h2>
      <div class="cards">
        @for (consultation of consultations; track consultation.id) {
          <article class="consult-card" [class.active]="activeId === consultation.id">
            <button type="button" class="link-card" (click)="selected.emit(consultation)">
              <strong>{{ consultation.disease.name }}</strong>
              <span>{{ consultation.patient.name }}</span>
              <small class="channel-pill">{{ channelLine(consultation) }}</small>
              @if (userRole === 'PATIENT') {
                <small class="journey-hint">{{ ('patient.consultations.journey.' + consultation.status) | translate }}</small>
              } @else {
                <small>{{ consultation.status }}</small>
              }
              <small
                >{{ 'patient.consultations.planPrefix' | translate }}
                {{ consultation.billingPlanCode || consultation.payment?.billingPlanCode || 'ONE_TIME' }}</small
              >
              <small
                >{{ 'patient.consultations.amountPrefix' | translate }}
                {{ (consultation.payment?.amountInPaise || 0) / 100 | currency: 'INR' }}</small
              >
            </button>
            @if (userRole === 'PATIENT' && consultation.status === 'PAYMENT_PENDING') {
              <button
                type="button"
                class="primary"
                [disabled]="disabled || !paymentIdle"
                (click)="pay.emit(consultation); $event.stopPropagation()">
                {{ 'patient.consultations.payNow' | translate }}
              </button>
            }
            @if (userRole === 'PATIENT' && consultation.status === 'COMPLETED') {
              <p class="muted rebook">
                {{ 'patient.consultations.rebookPrompt' | translate }}
                <a routerLink="/patient/dashboard" fragment="book-consultation">{{
                  'patient.consultations.rebookLink' | translate
                }}</a>
              </p>
            }
            @if (consultation.prescription || consultation.prescriptions?.length) {
              <p class="success">{{ 'patient.consultations.rxOnFile' | translate }}</p>
            }
          </article>
        } @empty {
          @if (userRole === 'PATIENT') {
            <div class="empty-consultations patient-empty">
              <p>
                <strong>{{ 'patient.consultations.emptyTitle' | translate }}</strong>
              </p>
              <p class="muted">
                {{ 'patient.consultations.emptyBody' | translate }}
              </p>
              <p class="muted">
                <a routerLink="/patient/dashboard" fragment="book-consultation">{{
                  'patient.consultations.goBooking' | translate
                }}</a>
                ·
                <a routerLink="/patient/self-diagnosis">{{ 'patient.consultations.openWorksheets' | translate }}</a>
              </p>
            </div>
          } @else {
            <p class="muted">{{ 'patient.consultations.emptyTitle' | translate }}</p>
          }
        }
      </div>
    </div>
  `,
  styles: [
    `
      .journey-hint {
        display: block;
        color: #334155;
        font-weight: 600;
      }
      .rebook {
        margin: 0.35rem 0 0;
      }
      .patient-empty {
        padding: 0.25rem 0;
      }
      .channel-pill {
        display: block;
        color: #475569;
        font-weight: 600;
        margin-top: 0.15rem;
      }
    `
  ]
})
export class ConsultationListComponent {
  private readonly translate = inject(TranslateService);

  @Input() consultations: Consultation[] = [];
  @Input() activeId: string | null = null;
  @Input() userRole: Role | null = null;
  @Input() disabled = false;
  @Input() paymentIdle = true;

  @Output() selected = new EventEmitter<Consultation>();
  @Output() pay = new EventEmitter<Consultation>();

  channelLine(c: Consultation): string {
    const ch = this.translate.instant(`patient.book.channel.${c.channel}`);
    if (c.location?.name) {
      return `${ch} · ${c.location.name}`;
    }
    return ch;
  }
}

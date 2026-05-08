import { CommonModule, DatePipe } from '@angular/common';
import { Component, EventEmitter, inject, Input, type OnChanges, Output, type SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { ClinicApiService } from './clinic-api/clinic-api.service';
import { type Consultation, type Prescription, type Role } from './interfaces';

export type SendMessagePayload = { consultation: Consultation; body: string };
export type PrescriptionPayload = { notes: string; fileUrl: string };

@Component({
  selector: 'app-consultation-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, TranslatePipe],
  styles: [
    `
      .attachment-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        align-items: center;
        margin-top: 0.35rem;
      }
      .attachment-actions label.secondary-btn {
        cursor: pointer;
        padding: 0.35rem 0.65rem;
        border-radius: 8px;
        border: 1px solid #cbd5e1;
        background: #f8fafc;
        font-size: 0.85rem;
      }
      .attachment-actions input[type='file'] {
        display: none;
      }
      .attachment-card {
        margin-top: 0.35rem;
        padding: 0.45rem 0;
        border-bottom: 1px solid #e2e8f0;
      }
      .rx-readonly {
        background: #f8fafc;
        padding: 0.75rem 1rem;
        border-radius: 10px;
      }
      .rx-readonly ul {
        margin: 0.35rem 0 0 1rem;
      }
      .chat-hint {
        margin: 0.25rem 0 0.5rem;
        font-size: 0.88rem;
      }
    `
  ],
  template: `
    <div class="panel">
      @if (consultation) {
        <h2>{{ consultation.disease.name }}</h2>
        <p class="muted channel-location-meta">
          <span>{{ consultationChannelLabel(consultation) }}</span>
          @if (consultation.location) {
            <span> · {{ consultation.location.name }}</span>
            @if (consultation.location.city) {
              <span>, {{ consultation.location.city }}</span>
            }
          }
        </p>
        <p class="muted">
          {{ 'consultation.patientLabel' | translate }} {{ consultation.patient.name }} |
          {{ 'consultation.doctorLabel' | translate }}
          {{ consultation.assignedDoctor?.name || ('consultation.notAssigned' | translate) }}
        </p>

        <h3>{{ 'consultation.intakeTitle' | translate }}</h3>
        @for (answer of consultation.intakeAnswers | keyvalue; track answer.key) {
          <p><strong>{{ answer.key }}:</strong> {{ answer.value }}</p>
        }

        @if (visiblePrescription()) {
          @let rx = visiblePrescription()!;
          <div class="rx-readonly">
            <h3>{{ 'consultation.rxTitle' | translate }}</h3>
            <p>
              <strong>{{ 'consultation.diagnosisSummary' | translate }}</strong> {{ rx.diagnosis || ('consultation.dash' | translate) }}
            </p>
            @if (rx.diagnosedDisease) {
              <p><strong>{{ 'consultation.condition' | translate }}</strong> {{ rx.diagnosedDisease }}</p>
            }
            @if (rx.method) {
              <p><strong>{{ 'consultation.method' | translate }}</strong> {{ rx.method }}</p>
            }
            @if (rx.advice) {
              <p><strong>{{ 'consultation.advice' | translate }}</strong> {{ rx.advice }}</p>
            }
            @if (rx.notes) {
              <p><strong>{{ 'consultation.notes' | translate }}</strong> {{ rx.notes }}</p>
            }
            @if (rx.methodIntakeAnswers && methodIntakeEntries(rx.methodIntakeAnswers).length) {
              <p><strong>{{ 'consultation.methodDetails' | translate }}</strong></p>
              @for (entry of methodIntakeEntries(rx.methodIntakeAnswers); track entry.k) {
                <p><strong>{{ entry.k.replaceAll('_', ' ') }}:</strong> {{ entry.v }}</p>
              }
            }
            @if (rx.followUpDate) {
              <p><strong>{{ 'consultation.followUp' | translate }}</strong> {{ rx.followUpDate | date: 'mediumDate' }}</p>
            }
            @if (rx.items?.length) {
              <p><strong>{{ 'consultation.medicines' | translate }}</strong></p>
              <ul>
                @for (item of rx.items; track item.id) {
                  <li>
                    {{ item.medicineName }}
                    @if (item.strength) {
                      <span> · {{ item.strength }}</span>
                    }
                    @if (item.dose || item.frequency) {
                      <span class="muted"> — {{ item.dose }} {{ item.frequency }}</span>
                    }
                    @if (item.duration) {
                      <span class="muted"> ({{ item.duration }})</span>
                    }
                  </li>
                }
              </ul>
            }
            @if (rx.fileUrl) {
              <p>
                <a [href]="rx.fileUrl" target="_blank" rel="noopener">{{ 'consultation.openRxFile' | translate }}</a>
              </p>
            }
            @if (userRole === 'PATIENT') {
              <p class="muted">{{ 'consultation.rxPatientHint' | translate }}</p>
            }
          </div>
        } @else if (userRole === 'PATIENT') {
          <p class="muted">{{ 'consultation.rxPending' | translate }}</p>
        }

        @if (consultation.attachments?.length) {
          <h3>{{ 'consultation.attachmentsTitle' | translate }}</h3>
          @for (att of consultation.attachments; track att.id) {
            <div class="attachment-card">
              <p>
                <strong>{{ attachmentKindLabel(att.kind) }}</strong>
                @if (att.fileName) {
                  <span> · {{ att.fileName }}</span>
                }
                · {{ att.createdAt | date: 'medium' }}
                · {{ att.uploadedBy.name }}
              </p>
              @if (att.caption) {
                <p class="muted">{{ att.caption }}</p>
              }
              @if (att.fileUrl) {
                <a [href]="att.fileUrl" target="_blank" rel="noopener">{{ 'consultation.attachmentOpen' | translate }}</a>
              }
            </div>
          }
        }

        @if (canUploadAttachments()) {
          <h3>{{ 'consultation.uploadTitle' | translate }}</h3>
          <p class="muted">{{ 'consultation.uploadHint' | translate }}</p>
          <label>{{ 'consultation.captionOptional' | translate }} <input [(ngModel)]="attachmentCaption" /></label>
          <div class="attachment-actions">
            <label class="secondary-btn">
              {{ 'consultation.takePhoto' | translate }}
              <input type="file" accept="image/*" capture="environment" [disabled]="attachmentBusy || disabled" (change)="onAttach($event)" />
            </label>
            <label class="secondary-btn">
              {{ 'consultation.chooseFile' | translate }}
              <input type="file" accept="image/*,application/pdf" [disabled]="attachmentBusy || disabled" (change)="onAttach($event)" />
            </label>
          </div>
          @if (attachmentNotice) {
            <p class="muted">{{ attachmentNotice }}</p>
          }
        }

        @if (userRole === 'DOCTOR') {
          <div class="notice">
            <p>
              <strong>{{ 'consultation.doctorWorkspace' | translate }}</strong> {{ 'consultation.doctorWorkspaceBody' | translate }}
              @if (doctorPortalUrl) {
                <a [href]="doctorPortalUrl" target="_blank" rel="noopener">{{ 'consultation.openDoctorApp' | translate }}</a>
              }
            </p>
          </div>
        }

        <h3>{{ 'consultation.chatTitle' | translate }}</h3>
        <div class="chat-box">
          @for (message of consultation.messages; track message.id) {
            <p><strong>{{ message.sender.name }}:</strong> {{ message.body }}</p>
          } @empty {
            <p class="muted">{{ 'consultation.noMessages' | translate }}</p>
          }
        </div>
        <label>
          {{ 'consultation.newMessage' | translate }}
          <textarea
            [(ngModel)]="messageBody"
            rows="4"
            [placeholder]="'consultation.messagePlaceholder' | translate"></textarea>
        </label>
        <p class="muted chat-hint">{{ 'consultation.chatHint' | translate }}</p>
        <button class="secondary" [disabled]="disabled" (click)="emitSendMessage()">{{ 'consultation.sendMessage' | translate }}</button>

        @if (userRole === 'ADMIN') {
          <h3>{{ 'consultation.admin.legacyTitle' | translate }}</h3>
          <label>
            {{ 'consultation.admin.notes' | translate }}
            <textarea [(ngModel)]="prescription.notes"></textarea>
          </label>
          <label>
            {{ 'consultation.admin.fileUrl' | translate }}
            <input [(ngModel)]="prescription.fileUrl" placeholder="https://..." />
          </label>
          <button class="primary" [disabled]="disabled" (click)="uploadPrescription.emit({ notes: prescription.notes, fileUrl: prescription.fileUrl })">
            {{ 'consultation.admin.upload' | translate }}
          </button>
          <button class="secondary" [disabled]="disabled" (click)="complete.emit()">{{ 'consultation.admin.markComplete' | translate }}</button>
        }
      } @else {
        <p class="muted">{{ 'consultation.selectConsultation' | translate }}</p>
      }
    </div>
  `
})
export class ConsultationDetailComponent implements OnChanges {
  private readonly api = inject(ClinicApiService);
  private readonly translate = inject(TranslateService);

  @Input() consultation: Consultation | null = null;
  @Input() userRole: Role | null = null;
  @Input() disabled = false;
  @Input() doctorPortalUrl = '';
  /** Bump to insert `composeMessageBody` into the chat field (e.g. from Today’s Medicines). */
  @Input() composeMessageToken = 0;
  @Input() composeMessageBody = '';

  @Output() messageSent = new EventEmitter<SendMessagePayload>();
  @Output() uploadPrescription = new EventEmitter<PrescriptionPayload>();
  @Output() complete = new EventEmitter<void>();
  @Output() attachmentsChanged = new EventEmitter<void>();

  messageBody = '';
  prescription = { notes: '', fileUrl: '' };
  attachmentCaption = '';
  attachmentBusy = false;
  attachmentNotice = '';
  private lastAppliedComposeToken = 0;

  consultationChannelLabel(c: Consultation): string {
    return this.translate.instant(`patient.book.channel.${c.channel}`);
  }

  methodIntakeEntries(answers: Record<string, string>): { k: string; v: string }[] {
    return Object.entries(answers)
      .filter(([, v]) => (v || '').trim().length > 0)
      .map(([k, v]) => ({ k, v: v.trim() }));
  }

  ngOnChanges(changes: SimpleChanges) {
    this.attachmentNotice = '';
    this.prescription = {
      notes: this.consultation?.prescription?.notes || '',
      fileUrl: this.consultation?.prescription?.fileUrl || ''
    };

    const composeApplied =
      changes['composeMessageToken'] &&
      this.composeMessageToken > 0 &&
      this.composeMessageToken !== this.lastAppliedComposeToken &&
      this.composeMessageBody.trim().length > 0;

    if (composeApplied) {
      this.lastAppliedComposeToken = this.composeMessageToken;
      this.messageBody = this.composeMessageBody;
      return;
    }

    if (changes['consultation']) {
      const prevId = changes['consultation'].previousValue?.id;
      const currId = changes['consultation'].currentValue?.id;
      if (prevId !== currId) {
        this.messageBody = '';
        this.lastAppliedComposeToken = 0;
      }
    }
  }

  visiblePrescription(): Prescription | null {
    const pr = this.consultation?.prescription ?? null;
    if (!pr) return null;
    if (this.userRole === 'PATIENT') {
      return pr.status === 'PUBLISHED' ? pr : null;
    }
    return pr;
  }

  canUploadAttachments(): boolean {
    return this.userRole === 'PATIENT' || this.userRole === 'ADMIN';
  }

  attachmentKindLabel(kind: string): string {
    const k = kind === 'PATIENT_REPORT' || kind === 'DOCTOR_CLINICAL' ? kind : 'OTHER';
    return this.translate.instant(`consultation.attachmentKind.${k}`);
  }

  uploadAttachmentKind(): string {
    return this.userRole === 'PATIENT' ? 'PATIENT_REPORT' : 'OTHER';
  }

  async onAttach(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || !this.consultation || this.attachmentBusy) return;

    this.attachmentBusy = true;
    this.attachmentNotice = '';
    try {
      await firstValueFrom(
        this.api.uploadConsultationAttachment(this.consultation.id, file, this.attachmentCaption, this.uploadAttachmentKind())
      );
      this.attachmentCaption = '';
      this.attachmentNotice = this.translate.instant('consultation.uploadOk');
      this.attachmentsChanged.emit();
    } catch (err) {
      this.attachmentNotice = err instanceof Error ? err.message : this.translate.instant('consultation.uploadFailed');
    } finally {
      this.attachmentBusy = false;
    }
  }

  emitSendMessage() {
    if (!this.consultation || !this.messageBody.trim()) return;
    this.messageSent.emit({ consultation: this.consultation, body: this.messageBody });
    this.messageBody = '';
  }
}

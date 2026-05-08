import { CommonModule, DatePipe } from '@angular/common';
import { Component, EventEmitter, inject, Input, type OnChanges, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ClinicApiService } from './clinic-api/clinic-api.service';
import { type Consultation, type Prescription, type Role } from './interfaces';

export type SendMessagePayload = { consultation: Consultation; body: string };
export type PrescriptionPayload = { notes: string; fileUrl: string };

@Component({
  selector: 'app-consultation-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
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
    `
  ],
  template: `
    <div class="panel">
      @if (consultation) {
        <h2>{{ consultation.disease.name }}</h2>
        <p class="muted">
          Patient: {{ consultation.patient.name }} |
          Doctor: {{ consultation.assignedDoctor?.name || 'Not assigned' }}
        </p>

        <h3>Intake answers</h3>
        @for (answer of consultation.intakeAnswers | keyvalue; track answer.key) {
          <p><strong>{{ answer.key }}:</strong> {{ answer.value }}</p>
        }

        @if (visiblePrescription()) {
          @let rx = visiblePrescription()!;
          <div class="rx-readonly">
            <h3>Diagnosis & prescription</h3>
            <p><strong>Diagnosis summary:</strong> {{ rx.diagnosis || '—' }}</p>
            @if (rx.diagnosedDisease) {
              <p><strong>Condition:</strong> {{ rx.diagnosedDisease }}</p>
            }
            @if (rx.method) {
              <p><strong>Method:</strong> {{ rx.method }}</p>
            }
            @if (rx.advice) {
              <p><strong>Advice:</strong> {{ rx.advice }}</p>
            }
            @if (rx.notes) {
              <p><strong>Notes:</strong> {{ rx.notes }}</p>
            }
            @if (rx.followUpDate) {
              <p><strong>Follow-up:</strong> {{ rx.followUpDate | date: 'mediumDate' }}</p>
            }
            @if (rx.items?.length) {
              <p><strong>Medicines</strong></p>
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
                <a [href]="rx.fileUrl" target="_blank" rel="noopener">Open attached prescription file</a>
              </p>
            }
            @if (userRole === 'PATIENT') {
              <p class="muted">Your doctor manages updates in the Doctor app. You can view published plans here.</p>
            }
          </div>
        } @else if (userRole === 'PATIENT') {
          <p class="muted">When your doctor publishes a prescription, it will appear here.</p>
        }

        @if (consultation.attachments?.length) {
          <h3>Files & reports</h3>
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
                <a [href]="att.fileUrl" target="_blank" rel="noopener">Open</a>
              }
            </div>
          }
        }

        @if (canUploadAttachments()) {
          <h3>Upload reports or photos</h3>
          <p class="muted">Images (camera or gallery) and PDF lab reports. Max 15 MB.</p>
          <label>Optional caption <input [(ngModel)]="attachmentCaption" /></label>
          <div class="attachment-actions">
            <label class="secondary-btn">
              Take photo
              <input type="file" accept="image/*" capture="environment" [disabled]="attachmentBusy || disabled" (change)="onAttach($event)" />
            </label>
            <label class="secondary-btn">
              Choose file
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
              <strong>Doctor workspace:</strong> prescriptions, medicine versions, and clinical photos are managed in the Vitalis
              Doctor app.
              @if (doctorPortalUrl) {
                <a [href]="doctorPortalUrl" target="_blank" rel="noopener">Open Doctor app</a>
              }
            </p>
          </div>
        }

        <h3>Chat</h3>
        <div class="chat-box">
          @for (message of consultation.messages; track message.id) {
            <p><strong>{{ message.sender.name }}:</strong> {{ message.body }}</p>
          } @empty {
            <p class="muted">No messages yet.</p>
          }
        </div>
        <label>
          New message
          <textarea [(ngModel)]="messageBody"></textarea>
        </label>
        <button class="secondary" [disabled]="disabled" (click)="emitSendMessage()">Send message</button>

        @if (userRole === 'ADMIN') {
          <h3>Legacy prescription file (admin)</h3>
          <label>
            Notes
            <textarea [(ngModel)]="prescription.notes"></textarea>
          </label>
          <label>
            File URL
            <input [(ngModel)]="prescription.fileUrl" placeholder="https://..." />
          </label>
          <button class="primary" [disabled]="disabled" (click)="uploadPrescription.emit({ notes: prescription.notes, fileUrl: prescription.fileUrl })">
            Upload prescription
          </button>
          <button class="secondary" [disabled]="disabled" (click)="complete.emit()">Mark complete</button>
        }
      } @else {
        <p class="muted">Select a consultation to view details.</p>
      }
    </div>
  `
})
export class ConsultationDetailComponent implements OnChanges {
  private readonly api = inject(ClinicApiService);

  @Input() consultation: Consultation | null = null;
  @Input() userRole: Role | null = null;
  @Input() disabled = false;
  @Input() doctorPortalUrl = '';

  @Output() messageSent = new EventEmitter<SendMessagePayload>();
  @Output() uploadPrescription = new EventEmitter<PrescriptionPayload>();
  @Output() complete = new EventEmitter<void>();
  @Output() attachmentsChanged = new EventEmitter<void>();

  messageBody = '';
  prescription = { notes: '', fileUrl: '' };
  attachmentCaption = '';
  attachmentBusy = false;
  attachmentNotice = '';

  ngOnChanges() {
    this.messageBody = '';
    this.attachmentNotice = '';
    this.prescription = {
      notes: this.consultation?.prescription?.notes || '',
      fileUrl: this.consultation?.prescription?.fileUrl || ''
    };
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
    if (kind === 'PATIENT_REPORT') return 'Patient report / labs';
    if (kind === 'DOCTOR_CLINICAL') return 'Clinical photo / doctor upload';
    return 'Attachment';
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
      this.attachmentNotice = 'Uploaded.';
      this.attachmentsChanged.emit();
    } catch (err) {
      this.attachmentNotice = err instanceof Error ? err.message : 'Upload failed.';
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

import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Consultation, Role } from './models';

export type SendMessagePayload = { consultation: Consultation; body: string };
export type PrescriptionPayload = { notes: string; fileUrl: string };

@Component({
  selector: 'app-consultation-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
        <button class="secondary" [disabled]="disabled" (click)="emitSendMessage()">
          Send message
        </button>

        @if (userRole !== 'PATIENT') {
          <h3>Prescription</h3>
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
          <button class="secondary" [disabled]="disabled" (click)="complete.emit()">
            Mark complete
          </button>
        }

        @if (consultation.prescription) {
          <div class="prescription">
            <h3>Prescription for patient</h3>
            <p>{{ consultation.prescription.notes }}</p>
            @if (consultation.prescription.fileUrl) {
              <a [href]="consultation.prescription.fileUrl" target="_blank" rel="noopener">
                Open prescription file
              </a>
            }
          </div>
        }
      } @else {
        <p class="muted">Select a consultation to view details.</p>
      }
    </div>
  `
})
export class ConsultationDetailComponent implements OnChanges {
  @Input() consultation: Consultation | null = null;
  @Input() userRole: Role | null = null;
  @Input() disabled = false;

  @Output() messageSent = new EventEmitter<SendMessagePayload>();
  @Output() uploadPrescription = new EventEmitter<PrescriptionPayload>();
  @Output() complete = new EventEmitter<void>();

  messageBody = '';
  prescription = { notes: '', fileUrl: '' };

  ngOnChanges() {
    this.messageBody = '';
    this.prescription = {
      notes: this.consultation?.prescription?.notes || '',
      fileUrl: this.consultation?.prescription?.fileUrl || ''
    };
  }

  emitSendMessage() {
    if (!this.consultation || !this.messageBody.trim()) return;
    this.messageSent.emit({ consultation: this.consultation, body: this.messageBody });
    this.messageBody = '';
  }
}

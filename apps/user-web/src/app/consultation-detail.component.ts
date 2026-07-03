import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { Consultation, Role } from './models';

export type SendMessagePayload = { consultation: Consultation; body: string };
export type PrescriptionPayload = { notes: string; fileUrl: string };

function emptyDetailForm() {
  return {
    messageBody: '',
    prescriptionNotes: '',
    prescriptionFileUrl: '',
  };
}

@Component({
  selector: 'app-consultation-detail',
  standalone: true,
  imports: [CommonModule, FormField],
  templateUrl: './consultation-detail.component.html',
})
export class ConsultationDetailComponent implements OnChanges {
  @Input() consultation: Consultation | null = null;
  @Input() userRole: Role | null = null;
  @Input() disabled = false;

  @Output() messageSent = new EventEmitter<SendMessagePayload>();
  @Output() uploadPrescription = new EventEmitter<PrescriptionPayload>();
  @Output() complete = new EventEmitter<void>();

  readonly detailFormModel = signal(emptyDetailForm());
  readonly detailForm = form(this.detailFormModel);

  ngOnChanges() {
    this.detailFormModel.set({
      messageBody: '',
      prescriptionNotes: this.consultation?.prescription?.notes || '',
      prescriptionFileUrl: this.consultation?.prescription?.fileUrl || '',
    });
  }

  emitSendMessage() {
    const { messageBody } = this.detailFormModel();
    if (!this.consultation || !messageBody.trim()) return;
    this.messageSent.emit({ consultation: this.consultation, body: messageBody });
    this.detailFormModel.update((m) => ({ ...m, messageBody: '' }));
  }

  emitUploadPrescription() {
    const { prescriptionNotes, prescriptionFileUrl } = this.detailFormModel();
    this.uploadPrescription.emit({ notes: prescriptionNotes, fileUrl: prescriptionFileUrl });
  }
}

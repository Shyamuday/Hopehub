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
  templateUrl: './consultation-detail.component.html'
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

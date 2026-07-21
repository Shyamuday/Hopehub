import { Component, EventEmitter, Input, OnChanges, Output, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { ConsultationCallPanelComponent, type CallMode, type CallSignalingSocket, type IceServerConfig, type MediaAccessResult } from '@hopehub/platform-ui';
import type { DetailRow } from '@hopehub/platform-ui';
import { DetailRowsComponent } from '@hopehub/platform-ui';
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
  imports: [FormField, DetailRowsComponent, ConsultationCallPanelComponent],
  templateUrl: './consultation-detail.component.html',
})
export class ConsultationDetailComponent implements OnChanges {
  @Input() consultation: Consultation | null = null;
  @Input() userRole: Role | null = null;
  @Input() disabled = false;
  @Input() realtimeSocket: CallSignalingSocket | null = null;
  @Input() iceServers: IceServerConfig[] = [{ urls: 'stun:stun.l.google.com:19302' }];
  @Input() ensureMediaAccess?: (mode: CallMode) => Promise<MediaAccessResult>;

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

  intakeAnswerRows(answers: Consultation['intakeAnswers'] | undefined): DetailRow[] {
    if (!answers) {
      return [];
    }
    return Object.entries(answers).map(([key, value]) => ({
      label: key,
      value: String(value)
    }));
  }

  messageRows(messages: Consultation['messages'] | undefined): DetailRow[] {
    return (messages ?? []).map((message) => ({
      label: message.sender.name,
      value: message.body
    }));
  }

  callTargetUserId(): string {
    const c = this.consultation;
    if (!c) return '';
    return this.userRole === 'PATIENT' ? c.assignedDoctor?.id ?? '' : c.patient?.id ?? '';
  }

  voiceCallEnabled(): boolean {
    const c = this.consultation;
    if (!c?.assignedDoctor) return false;
    return ['ASSIGNED', 'IN_PROGRESS', 'PRESCRIPTION_UPLOADED'].includes(c.status);
  }
}

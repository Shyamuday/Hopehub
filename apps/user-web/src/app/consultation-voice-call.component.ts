import { Component, inject, Input, OnDestroy, signal } from '@angular/core';
import { ConsultationVoiceCallService } from './core/services/consultation-voice-call.service';
import type { Socket } from 'socket.io-client';

@Component({
  selector: 'app-consultation-voice-call',
  standalone: true,
  template: `
    @if (canCall()) {
      <div class="voice-call-bar">
        <span class="call-status">{{ statusLabel() }}</span>
        @if (call.state() === 'idle' || call.state() === 'ended') {
          <button type="button" class="primary" (click)="start()" [disabled]="busy()">Start voice call</button>
        }
        @if (call.state() === 'ringing') {
          <button type="button" class="primary" (click)="accept()">Accept</button>
          <button type="button" class="secondary" (click)="reject()">Decline</button>
        }
        @if (call.state() === 'connected' || call.state() === 'connecting') {
          <button type="button" class="danger" (click)="hangUp()">End call</button>
        }
        @if (call.error()) { <span class="call-error">{{ call.error() }}</span> }
      </div>
    }
  `,
  styles: `
    .voice-call-bar { display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; margin: 0.75rem 0; padding: 0.65rem; border: 1px solid #dbeafe; border-radius: 0.5rem; background: #eff6ff; }
    .call-status { font-size: 0.85rem; color: #1e40af; }
    .call-error { color: #b91c1c; font-size: 0.8rem; }
    .danger { background: #b91c1c; color: #fff; border: none; border-radius: 0.35rem; padding: 0.35rem 0.75rem; }
  `
})
export class ConsultationVoiceCallComponent implements OnDestroy {
  readonly call = inject(ConsultationVoiceCallService);

  @Input() consultationId = '';
  @Input() targetUserId = '';
  @Input() socket: Socket | null = null;
  @Input() stunServers: Array<{ urls: string }> = [{ urls: 'stun:stun.l.google.com:19302' }];
  @Input() enabled = true;

  readonly busy = signal(false);

  canCall() {
    return this.enabled && this.consultationId && this.targetUserId && this.socket;
  }

  statusLabel() {
    const map: Record<string, string> = {
      idle: 'Voice consultation available',
      ringing: 'Incoming call…',
      connecting: 'Connecting…',
      connected: 'On call',
      ended: 'Call ended',
      error: 'Call error'
    };
    return map[this.call.state()] ?? '';
  }

  async start() {
    if (!this.socket || !this.consultationId || !this.targetUserId) return;
    this.busy.set(true);
    try {
      await this.call.startCall({
        socket: this.socket,
        consultationId: this.consultationId,
        targetUserId: this.targetUserId,
        stunServers: this.stunServers
      });
    } catch {
      this.call.error.set('Microphone permission required.');
      this.call.state.set('error');
    } finally {
      this.busy.set(false);
    }
  }

  accept() {
    this.call.acceptIncoming();
  }

  reject() {
    if (!this.consultationId || !this.targetUserId) return;
    this.call.rejectCall({ consultationId: this.consultationId, targetUserId: this.targetUserId });
  }

  hangUp() {
    if (!this.consultationId || !this.targetUserId) return;
    this.call.endCall({ consultationId: this.consultationId, targetUserId: this.targetUserId });
  }

  ngOnDestroy() {
    this.call.cleanup();
  }
}

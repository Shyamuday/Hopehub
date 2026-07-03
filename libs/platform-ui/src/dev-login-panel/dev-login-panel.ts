import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, OnInit, Output, signal } from '@angular/core';
import { DEV_DEMO_PORT } from '../dev-demo.port';
import type { DevFillCredentials, DevPersona } from '../dev-demo.types';

@Component({
  selector: 'app-dev-login-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dev-login-panel.html',
  styleUrl: './dev-login-panel.scss'
})
export class DevLoginPanelComponent implements OnInit {
  @Input() title = 'Demo accounts';
  @Input() note =
    'Click Fill then Sign In. Any other email also works in dev.';
  @Input() showPatientCreds = false;

  @Output() loggedIn = new EventEmitter<void>();
  @Output() fillAccount = new EventEmitter<DevFillCredentials>();

  private readonly devDemo = inject(DEV_DEMO_PORT);

  readonly enabled = this.devDemo.enabled;
  readonly personas = signal<DevPersona[]>([]);
  readonly password = signal('');
  readonly otp = signal('');
  readonly patientMobile = signal('');
  readonly loading = signal(false);
  readonly error = signal('');

  ngOnInit() {
    if (!this.enabled) return;
    void this.devDemo.loadGuide().then((guide) => {
      if (!guide) return;
      this.personas.set(guide.personas);
      this.password.set(guide.password);
      this.otp.set(guide.otp ?? '');
      this.patientMobile.set(guide.patientMobile ?? '');
      if (guide.personas[0]) this.emitFill(guide.personas[0]);
    });
  }

  emitFill(persona: DevPersona) {
    this.fillAccount.emit(persona.credentials);
  }

  async quickLogin(personaId: string) {
    this.loading.set(true);
    this.error.set('');
    try {
      await this.devDemo.quickLogin(personaId);
      this.loggedIn.emit();
    } catch {
      this.error.set('Quick login failed. Run npm run seed --prefix apps/api');
    } finally {
      this.loading.set(false);
    }
  }
}

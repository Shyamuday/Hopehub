import { CommonModule } from '@angular/common';
import { Component, EventEmitter, OnInit, Output, inject, signal } from '@angular/core';
import { DevDemoService, type DevFillCredentials, type DevPersona } from '../../services/dev-demo.service';

@Component({
  selector: 'app-dev-login-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dev-login-panel.html',
  styleUrl: './dev-login-panel.scss'
})
export class DevLoginPanelComponent implements OnInit {
  @Output() loggedIn = new EventEmitter<void>();
  @Output() fillAccount = new EventEmitter<DevFillCredentials>();

  private readonly devDemo = inject(DevDemoService);

  readonly enabled = this.devDemo.enabled;
  readonly personas = signal<DevPersona[]>([]);
  readonly password = signal('');
  readonly loading = signal(false);
  readonly error = signal('');

  ngOnInit() {
    if (!this.enabled) return;
    void this.devDemo.loadGuide().then((guide) => {
      if (!guide) return;
      this.personas.set(guide.personas);
      this.password.set(guide.password);
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

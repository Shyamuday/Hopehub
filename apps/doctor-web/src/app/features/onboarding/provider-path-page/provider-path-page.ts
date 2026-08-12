import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { API_PATHS } from '../../../core/constants/api-paths.constants';
import { ROUTE_PATHS } from '../../../core/constants/app-routes.constants';
import { DoctorSessionService } from '../../../core/services/doctor-session';
import { AppButtonComponent } from '../../../shared/ui/app-button.component';

type SupportStyle = 'LISTEN' | 'GUIDE' | 'COUNSEL';
type Training = 'YES' | 'IN_PROGRESS' | 'NO';

@Component({
  selector: 'app-provider-path-page',
  imports: [AppButtonComponent],
  templateUrl: './provider-path-page.html',
  styleUrl: './provider-path-page.scss',
})
export class ProviderPathPage {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly session = inject(DoctorSessionService);
  private readonly apiBase = environment.apiUrl;

  readonly step = signal<1 | 2 | 3>(1);
  readonly supportStyle = signal<SupportStyle | null>(null);
  readonly training = signal<Training | null>(null);
  readonly saving = signal(false);
  readonly error = signal('');

  chooseStyle(style: SupportStyle) {
    this.supportStyle.set(style);
    this.error.set('');
    this.step.set(style === 'COUNSEL' ? 2 : 3);
  }

  chooseTraining(training: Training) {
    this.training.set(training);
    this.error.set('');
    this.step.set(3);
  }

  recommendation() {
    if (this.supportStyle() === 'LISTEN') return 'Peer Support Listener';
    if (this.supportStyle() === 'GUIDE') return 'Life Coach / Guide';
    if (this.training() === 'IN_PROGRESS') return 'Psychology Student Listener';
    if (this.training() === 'NO') return 'Peer Support Listener';
    return 'Counselling / Mental-wellness Provider';
  }

  async continue() {
    const supportStyle = this.supportStyle();
    if (!supportStyle) return;
    this.saving.set(true);
    this.error.set('');
    try {
      await firstValueFrom(
        this.http.put(`${this.apiBase}${API_PATHS.DOCTOR.ONBOARDING_PATH}`, {
          supportStyle,
          formalTraining: this.training() || undefined,
        }),
      );
      await this.session.load(true);
      await this.router.navigate(['/', ROUTE_PATHS.DASHBOARD]);
    } catch (error: any) {
      this.error.set(
        error?.error?.message || 'We could not save your support path. Please try again.',
      );
    } finally {
      this.saving.set(false);
    }
  }
}

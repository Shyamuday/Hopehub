import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/services/auth.service';
import { BookingService } from '../../core/services/booking.service';
import { User } from '../../core/models/auth.model';
import { ProgressDashboardComponent } from '../../shared/components/progress-dashboard/progress-dashboard.component';

type HopeHubConsultation = {
  id: string;
  status: string;
  createdAt: string;
  assignedDoctor?: { id: string; name?: string | null } | null;
  disease?: { name?: string | null } | null;
  payment?: {
    status?: string | null;
    amountInPaise?: number | null;
  } | null;
};

type BookingTimelineStep = {
  label: string;
  done: boolean;
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, ProgressDashboardComponent],
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- Header -->
      <div class="bg-white shadow">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between items-center py-6">
            <div>
              <h1 class="text-3xl font-bold text-gray-900">
                Welcome back, {{ user()?.name || 'User' }}!
              </h1>
              <p class="mt-1 text-sm text-gray-600">
                Track your mental health journey and access personalized resources
              </p>
            </div>
            <div class="flex items-center space-x-4">
              <button
                (click)="logout()"
                class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Content -->
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <!-- Quick Actions -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <a
            routerLink="/assessments"
            class="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow duration-200"
          >
            <div class="p-5">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <div class="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center">
                    <svg
                      class="w-5 h-5 text-blue-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                      />
                    </svg>
                  </div>
                </div>
                <div class="ml-5 w-0 flex-1">
                  <dl>
                    <dt class="text-sm font-medium text-gray-500 truncate">Take Assessment</dt>
                    <dd class="text-lg font-medium text-gray-900">Check Your Mood</dd>
                  </dl>
                </div>
              </div>
            </div>
          </a>

          <a
            routerLink="/exercises"
            class="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow duration-200"
          >
            <div class="p-5">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <div class="w-8 h-8 bg-green-100 rounded-md flex items-center justify-center">
                    <svg
                      class="w-5 h-5 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                      />
                    </svg>
                  </div>
                </div>
                <div class="ml-5 w-0 flex-1">
                  <dl>
                    <dt class="text-sm font-medium text-gray-500 truncate">Practice Exercises</dt>
                    <dd class="text-lg font-medium text-gray-900">Mindfulness & More</dd>
                  </dl>
                </div>
              </div>
            </div>
          </a>

          <a
            routerLink="/lifestyle-tips"
            class="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow duration-200"
          >
            <div class="p-5">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <div class="w-8 h-8 bg-purple-100 rounded-md flex items-center justify-center">
                    <svg
                      class="w-5 h-5 text-purple-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                  </div>
                </div>
                <div class="ml-5 w-0 flex-1">
                  <dl>
                    <dt class="text-sm font-medium text-gray-500 truncate">Lifestyle Tips</dt>
                    <dd class="text-lg font-medium text-gray-900">Improve Wellness</dd>
                  </dl>
                </div>
              </div>
            </div>
          </a>

          <a
            routerLink="/articles"
            class="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow duration-200"
          >
            <div class="p-5">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <div class="w-8 h-8 bg-yellow-100 rounded-md flex items-center justify-center">
                    <svg
                      class="w-5 h-5 text-yellow-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                      />
                    </svg>
                  </div>
                </div>
                <div class="ml-5 w-0 flex-1">
                  <dl>
                    <dt class="text-sm font-medium text-gray-500 truncate">Read Articles</dt>
                    <dd class="text-lg font-medium text-gray-900">Learn & Grow</dd>
                  </dl>
                </div>
              </div>
            </div>
          </a>
        </div>

        <!-- Progress Dashboard -->
        <app-progress-dashboard></app-progress-dashboard>

        <div class="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section class="bg-white shadow rounded-lg p-6">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-lg font-semibold text-gray-900">Recent Bookings</h2>
              <a
                routerLink="/contact"
                class="text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                Book consultation
              </a>
            </div>
            @if (consultations().length) {
              <div class="space-y-3">
                @for (consultation of consultations(); track consultation.id) {
                  <div class="border border-gray-200 rounded-md p-4">
                    <div class="flex items-start justify-between gap-3">
                      <div>
                        <p class="font-medium text-gray-900">
                          {{ consultation.disease?.name || 'Consultation' }}
                        </p>
                        <p class="text-sm text-gray-500">
                          {{ consultation.createdAt | date: 'mediumDate' }}
                        </p>
                      </div>
                      <span
                        class="text-xs font-semibold px-2 py-1 rounded-full bg-blue-50 text-blue-700"
                      >
                        {{ consultation.status }}
                      </span>
                    </div>
                    @if (consultation.payment) {
                      <p class="mt-2 text-sm text-gray-600">
                        Payment: {{ consultation.payment.status }}
                        @if (consultation.payment.amountInPaise != null) {
                          · ₹{{ consultation.payment.amountInPaise! / 100 | number: '1.0-0' }}
                        }
                      </p>
                    }
                    <div class="mt-3 rounded-md bg-blue-50 p-3 text-sm text-blue-900">
                      <p class="font-semibold">Next step</p>
                      <p class="mt-1">{{ nextStepFor(consultation) }}</p>
                    </div>
                    <div class="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      @for (step of timelineSteps(consultation); track step.label) {
                        <div
                          class="rounded-md border p-2 text-xs"
                          [class.border-green-200]="step.done"
                          [class.bg-green-50]="step.done"
                          [class.text-green-800]="step.done"
                          [class.hope-progress-done]="step.done"
                          [class.border-gray-200]="!step.done"
                          [class.bg-gray-50]="!step.done"
                          [class.text-gray-500]="!step.done"
                        >
                          <span
                            class="mb-1 block h-2 w-2 rounded-full"
                            [class.bg-green-600]="step.done"
                            [class.bg-gray-300]="!step.done"
                          ></span>
                          {{ step.label }}
                        </div>
                      }
                    </div>
                    @if (consultation.assignedDoctor) {
                      <p class="mt-2 text-sm text-gray-600">
                        Provider: {{ consultation.assignedDoctor.name || 'Assigned provider' }}
                      </p>
                      <!--
                        Live call UI is intentionally hidden for Hope Hub for now.
                        Keep the WebRTC integration available for a later rollout.
                        To restore it, import ConsultationCallPanelComponent,
                        connect HopeHubRealtimeService, load ICE servers, and
                        render app-consultation-call-panel for assigned bookings.
                      -->
                    } @else {
                      <p class="mt-2 text-sm text-gray-600">Provider matching is pending.</p>
                    }
                  </div>
                }
              </div>
            } @else {
              <p class="text-sm text-gray-500">No consultation bookings yet.</p>
            }
          </section>

          <section class="bg-white shadow rounded-lg p-6">
            <h2 class="text-lg font-semibold text-gray-900 mb-4">Recent Requests</h2>
            @if (leads().length) {
              <div class="space-y-3">
                @for (lead of leads(); track lead.id) {
                  <div class="border border-gray-200 rounded-md p-4">
                    <div class="flex items-start justify-between gap-3">
                      <p class="font-medium text-gray-900">
                        {{ lead.visitorName || 'Hope Hub request' }}
                      </p>
                      <span
                        class="text-xs font-semibold px-2 py-1 rounded-full bg-green-50 text-green-700"
                      >
                        {{ lead.followUpStatus }}
                      </span>
                    </div>
                    <p class="mt-2 text-sm text-gray-600 line-clamp-3">{{ lead.concern }}</p>
                    <p class="mt-3 rounded-md bg-green-50 p-3 text-sm text-green-900">
                      We will use the contact preference in your request and update this status
                      after follow-up.
                    </p>
                  </div>
                }
              </div>
            } @else {
              <p class="text-sm text-gray-500">No requests yet.</p>
            }
          </section>
        </div>

        <!-- Patient code badge (if available) -->
        @if (user()?.patientCode) {
          <div class="mt-8 bg-blue-50 border border-blue-200 rounded-md p-4">
            <p class="text-sm text-blue-700">
              Your patient code: <strong>{{ user()!.patientCode }}</strong>
            </p>
          </div>
        }
      </div>
    </div>
  `,
})
export class DashboardComponent implements OnInit {
  private authService = inject(AuthService);
  private bookingService = inject(BookingService);
  user = signal<User | null>(null);
  isLoading = signal(false);
  consultations = signal<HopeHubConsultation[]>([]);
  leads = signal<any[]>([]);

  constructor() {
    this.authService.user$.pipe(takeUntilDestroyed()).subscribe((user: User | null) => {
      this.user.set(user);
    });
  }

  ngOnInit(): void {
    this.loadDashboard();
  }

  private loadDashboard(): void {
    this.isLoading.set(true);
    this.bookingService.dashboard().subscribe({
      next: (dashboard) => {
        this.consultations.set(dashboard.consultations || []);
        this.leads.set(dashboard.leads || []);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }

  nextStepFor(consultation: HopeHubConsultation): string {
    const paymentStatus = consultation.payment?.status?.toUpperCase();
    if (paymentStatus && paymentStatus !== 'CAPTURED' && paymentStatus !== 'PAID') {
      return 'Payment is not confirmed yet. Complete or retry payment so the team can confirm your session.';
    }

    if (!consultation.assignedDoctor) {
      return 'The Hope Hub team is reviewing your concern and matching a provider.';
    }

    return 'Your provider is assigned. The team will share the confirmed session instructions through your selected contact method.';
  }

  timelineSteps(consultation: HopeHubConsultation): BookingTimelineStep[] {
    const paymentStatus = consultation.payment?.status?.toUpperCase();
    const isPaymentDone = paymentStatus === 'CAPTURED' || paymentStatus === 'PAID';

    return [
      { label: 'Request received', done: true },
      { label: 'Payment confirmed', done: isPaymentDone },
      { label: 'Provider matched', done: Boolean(consultation.assignedDoctor) },
      { label: 'Session instructions', done: Boolean(consultation.assignedDoctor) },
    ];
  }

  async logout(): Promise<void> {
    try {
      await this.authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  }
}

import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/services/auth.service';
import { BookingService } from '../../core/services/booking.service';
import { PaymentService } from '../../core/services/payment.service';
import { NotificationService } from '../../core/services/notification.service';
import {
  HOPE_HUB_ANALYTICS_EVENTS,
  ProductAnalyticsService,
} from '../../core/services/product-analytics.service';
import { User } from '../../core/models/auth.model';
import { ProgressDashboardComponent } from '../../shared/components/progress-dashboard/progress-dashboard.component';
import {
  PaymentFlowState,
  PaymentStatusOverlayComponent,
} from '../../shared/components/payment-status-overlay/payment-status-overlay.component';
import { AppButtonComponent } from '../../shared/components/app-button/app-button.component';

type HopeHubConsultation = {
  id: string;
  status: string;
  createdAt: string;
  assignedProviderId?: string | null;
  assignedDoctor?: { id: string; name?: string | null } | null;
  disease?: { name?: string | null } | null;
  intakeAnswers?: {
    appointmentDate?: string;
    appointmentTime?: string;
    sessionMode?: string;
    quickTalkMode?: string;
    quickTalk?: boolean;
    concernCategory?: string;
    preferredLanguage?: string;
  } | null;
  pricingSnapshot?: {
    source?: string | null;
    purchaseType?: string | null;
    balanceDueInPaise?: number;
    paymentMode?: string;
    careTeamPricingLabel?: string | null;
    careTeamPricingMode?: string | null;
    careTeamPricingRule?: string | null;
    careTeamBillableMinutes?: number | null;
    cancellation?: {
      reason?: string | null;
      restorePackageSession?: boolean;
      cancelledAt?: string | null;
    } | null;
    sessionOutcome?: {
      outcome?: string | null;
      packageRestored?: boolean;
      payoutAction?: string | null;
      recommendedNextStep?: string | null;
      userSummary?: string | null;
    } | null;
    packageUsage?: {
      totalSessions?: number;
      usedSessions?: number;
      remainingSessions?: number;
      validUntil?: string | null;
    } | null;
  } | null;
  payment?: {
    status?: string | null;
    amountInPaise?: number | null;
    refundedAmountInPaise?: number | null;
    lineItems?: {
      balanceDueInPaise?: number;
      paymentMode?: string;
      careTeamPricingLabel?: string | null;
      careTeamPricingMode?: string | null;
      careTeamPricingRule?: string | null;
      careTeamBillableMinutes?: number | null;
      packageUsage?: {
        totalSessions?: number;
        usedSessions?: number;
        remainingSessions?: number;
        validUntil?: string | null;
      } | null;
    } | null;
  } | null;
  followUpEntitlement?: {
    id: string;
    durationMinutes: number;
    status: string;
    availableAfter?: string | null;
    expiresAt?: string | null;
    requestedAt?: string | null;
    scheduledAt?: string | null;
    usedAt?: string | null;
  } | null;
};

type BookingTimelineStep = {
  label: string;
  done: boolean;
};

type DashboardSummary = {
  totalBookings: number;
  pendingPaymentCount: number;
  availableFollowUpCount: number;
  activePackageCount: number;
  balanceDueInPaise: number;
  refundedInPaise?: number;
  requestCount: number;
};

type DashboardResource = {
  id: string;
  slug: string;
  title: string;
  subtitle?: string | null;
  type: string;
  routePath: string;
  imageUrl?: string | null;
  mediaLinkCount: number;
  accessReason: string;
};

type DashboardPackage = {
  consultationId: string;
  serviceName: string;
  careTeamServiceId?: string | null;
  providerId?: string | null;
  providerName?: string | null;
  pricingLabel?: string | null;
  totalSessions: number;
  usedSessions: number;
  remainingSessions: number;
  validUntil?: string | null;
  lastRedeemedAt?: string | null;
  lastRedeemedConsultationId?: string | null;
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ProgressDashboardComponent,
    PaymentStatusOverlayComponent,
    AppButtonComponent,
  ],
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
                class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 whitespace-nowrap"
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
        @if (notice()) {
          <div
            class="mb-6 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-900"
          >
            {{ notice() }}
          </div>
        }

        <!-- Quick Actions -->
        <div class="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-6">
          @for (item of summaryCards(); track item.label) {
            <div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <p class="text-xs font-semibold uppercase text-gray-500">{{ item.label }}</p>
              <p class="mt-2 text-2xl font-bold text-gray-950">{{ item.value }}</p>
              <p class="mt-1 text-xs text-gray-500">{{ item.help }}</p>
            </div>
          }
        </div>

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

        @if (resources().length) {
          <section class="mt-8 rounded-lg bg-white p-6 shadow">
            <div class="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 class="text-lg font-semibold text-gray-900">My resources</h2>
                <p class="mt-1 text-sm text-gray-500">
                  Recordings, groups, and session media you can access.
                </p>
              </div>
              <a
                routerLink="/resources"
                class="text-sm font-semibold text-blue-600 hover:text-blue-700"
                >View all</a
              >
            </div>
            <div class="grid gap-4 md:grid-cols-3">
              @for (resource of resources(); track resource.id) {
                <a
                  [routerLink]="resource.routePath || '/resources/' + resource.slug"
                  class="rounded-lg border border-gray-200 bg-white p-4 text-gray-900 shadow-sm transition hover:border-blue-300 hover:shadow-md"
                >
                  <p class="text-xs font-bold uppercase text-blue-600">
                    {{ resource.type.replace('_', ' ') }}
                  </p>
                  <h3 class="mt-2 font-semibold">{{ resource.title }}</h3>
                  @if (resource.subtitle) {
                    <p class="mt-1 text-sm text-gray-500">{{ resource.subtitle }}</p>
                  }
                  <p class="mt-3 text-sm font-semibold text-gray-700">
                    {{ resource.mediaLinkCount }} media
                    {{ resource.mediaLinkCount === 1 ? 'link' : 'links' }}
                  </p>
                </a>
              }
            </div>
          </section>
        }

        @if (packages().length) {
          <section class="mt-8 rounded-lg bg-white p-6 shadow">
            <div class="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 class="text-lg font-semibold text-gray-900">Your packages</h2>
                <p class="mt-1 text-sm text-gray-500">
                  Track remaining sessions and book your next package session.
                </p>
              </div>
            </div>
            <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              @for (item of packages(); track item.consultationId) {
                <article class="rounded-lg border border-blue-100 bg-blue-50/40 p-4 shadow-sm">
                  <div class="flex items-start justify-between gap-3">
                    <div>
                      <h3 class="font-semibold text-gray-950">{{ item.serviceName }}</h3>
                      @if (item.providerName) {
                        <p class="mt-1 text-sm text-gray-600">With {{ item.providerName }}</p>
                      }
                    </div>
                    <span class="rounded-full bg-blue-600 px-2.5 py-1 text-xs font-bold text-white">
                      {{ item.remainingSessions }} left
                    </span>
                  </div>
                  @if (item.pricingLabel) {
                    <p class="mt-3 text-sm font-semibold text-blue-800">{{ item.pricingLabel }}</p>
                  }
                  <div class="mt-4">
                    <div class="flex justify-between text-xs font-semibold text-gray-600">
                      <span>{{ item.usedSessions }} used</span>
                      <span>{{ item.totalSessions }} total</span>
                    </div>
                    <div class="mt-2 h-2 rounded-full bg-white">
                      <div
                        class="h-2 rounded-full bg-blue-600"
                        [style.width.%]="packageProgress(item)"
                      ></div>
                    </div>
                  </div>
                  @if (item.lastRedeemedAt) {
                    <p class="mt-3 text-xs text-gray-500">
                      Last used {{ item.lastRedeemedAt | date: 'mediumDate' }}
                    </p>
                  }
                  @if (item.validUntil) {
                    <p class="mt-1 text-xs text-gray-500">
                      Valid till {{ item.validUntil | date: 'mediumDate' }}
                    </p>
                  }
                  <a
                    routerLink="/contact"
                    [queryParams]="bookNextPackageQueryParams(item)"
                    class="mt-4 inline-flex rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    Book next session
                  </a>
                </article>
              }
            </div>
          </section>
        }

        <div class="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section class="bg-white shadow rounded-lg p-6">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-lg font-semibold text-gray-900">Recent Bookings</h2>
              <a
                routerLink="/contact"
                class="text-sm font-medium text-blue-600 hover:text-blue-700 whitespace-nowrap"
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
                        class="text-xs font-semibold px-2 py-1 rounded-full bg-blue-50 text-blue-700 whitespace-nowrap"
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
                    @if (pricingLabel(consultation) || billableMinutes(consultation)) {
                      <div
                        class="mt-3 rounded-md border border-indigo-100 bg-indigo-50/70 p-3 text-sm text-indigo-950"
                      >
                        @if (pricingLabel(consultation)) {
                          <p class="font-semibold">{{ pricingLabel(consultation) }}</p>
                        }
                        @if (pricingModeLabel(consultation)) {
                          <p class="mt-1">{{ pricingModeLabel(consultation) }}</p>
                        }
                        @if (billableMinutes(consultation)) {
                          <p class="mt-1">{{ billableMinutes(consultation) }} billable minutes</p>
                        }
                      </div>
                    }
                    @if (refundText(consultation)) {
                      <div
                        class="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950"
                      >
                        {{ refundText(consultation) }}
                      </div>
                    }
                    @if (sessionOutcomeText(consultation)) {
                      <div
                        class="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800"
                      >
                        {{ sessionOutcomeText(consultation) }}
                      </div>
                    }
                    @if (balanceDueInPaise(consultation) > 0 || packageUsage(consultation)) {
                      <div
                        class="mt-3 rounded-md border border-blue-100 bg-white p-3 text-sm text-gray-700"
                      >
                        @if (packageUsage(consultation); as usage) {
                          <p class="font-semibold text-gray-900">
                            Package: {{ usage.remainingSessions || 0 }}/{{
                              usage.totalSessions || 0
                            }}
                            sessions left
                          </p>
                          @if (usage.validUntil) {
                            <p class="mt-1">
                              Valid till {{ usage.validUntil | date: 'mediumDate' }}
                            </p>
                          }
                        }
                        @if (balanceDueInPaise(consultation) > 0) {
                          <p class="mt-1 font-semibold text-blue-700">
                            Balance later: {{ formatPaise(balanceDueInPaise(consultation)) }}
                          </p>
                        }
                      </div>
                    }
                    @if (consultation.followUpEntitlement; as followUp) {
                      <div
                        class="mt-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950"
                      >
                        <div
                          class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div>
                            <p class="font-semibold">Included follow-up</p>
                            <p class="mt-1">
                              {{ followUp.durationMinutes || 15 }} min follow-up ·
                              {{ followUpStatusLabel(followUp.status) }}
                            </p>
                            @if (followUp.expiresAt && followUp.status === 'AVAILABLE') {
                              <p class="mt-1 text-emerald-800">
                                Available till {{ followUp.expiresAt | date: 'mediumDate' }}
                              </p>
                            }
                          </div>
                          @if (followUp.status === 'AVAILABLE') {
                            <button
                              type="button"
                              class="inline-flex items-center justify-center rounded-md bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                              [disabled]="requestingFollowUpId() === followUp.id"
                              (click)="requestFollowUp(followUp.id)"
                            >
                              {{
                                requestingFollowUpId() === followUp.id
                                  ? 'Requesting...'
                                  : 'Request follow-up'
                              }}
                            </button>
                          }
                        </div>
                      </div>
                    }
                    @if (consultation.intakeAnswers; as intake) {
                      @if (intake.appointmentDate || intake.appointmentTime) {
                        <p class="mt-2 text-sm text-gray-600">
                          Requested slot:
                          {{ intake.appointmentDate || 'Date pending' }}
                          {{ intake.appointmentTime || '' }}
                        </p>
                      }
                      @if (intake.concernCategory || intake.sessionMode) {
                        <p class="mt-1 text-sm text-gray-600">
                          {{ intake.concernCategory || 'Concern to review' }}
                          @if (intake.sessionMode) {
                            · {{ intake.sessionMode }}
                          }
                          @if (intake.preferredLanguage) {
                            · {{ intake.preferredLanguage }}
                          }
                        </p>
                      }
                    }
                    <div class="mt-3 rounded-md bg-blue-50 p-3 text-sm text-blue-900">
                      <p class="font-semibold">Next step</p>
                      <p class="mt-1">{{ nextStepFor(consultation) }}</p>
                    </div>
                    @if (canRetryPayment(consultation)) {
                      <app-button
                        type="button"
                        class="mt-3"
                        size="sm"
                        [disabled]="isPaying()"
                        (click)="retryPayment(consultation)"
                      >
                        {{ isPaying() ? 'Opening payment...' : 'Retry payment' }}
                      </app-button>
                    }
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
                        Expert: {{ consultation.assignedDoctor.name || 'Assigned expert' }}
                        @if (consultation.assignedProviderId) {
                          ·
                          <a
                            [routerLink]="['/care-team', consultation.assignedProviderId]"
                            class="font-semibold text-blue-600 hover:text-blue-700"
                          >
                            View profile
                          </a>
                        }
                      </p>
                    } @else {
                      <p class="mt-2 text-sm text-gray-600">Expert matching is pending.</p>
                    }
                    @if (canOpenLiveRoom(consultation)) {
                      <a
                        [routerLink]="['/live-session', consultation.id]"
                        class="mt-4 inline-flex items-center justify-center rounded-md bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800"
                      >
                        {{ liveRoomButtonLabel(consultation) }}
                      </a>
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
                        class="text-xs font-semibold px-2 py-1 rounded-full bg-green-50 text-green-700 whitespace-nowrap"
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

      <app-payment-status-overlay
        [state]="paymentFlowState()"
        [title]="paymentFlowTitle()"
        [message]="paymentFlowMessage()"
        [canRetry]="!!paymentFlowConsultation()"
        (retry)="retrySelectedPayment()"
        (close)="closePaymentOverlay()"
      />
    </div>
  `,
})
export class DashboardComponent implements OnInit {
  private authService = inject(AuthService);
  private bookingService = inject(BookingService);
  private paymentService = inject(PaymentService);
  private notificationService = inject(NotificationService);
  private productAnalytics = inject(ProductAnalyticsService);
  user = signal<User | null>(null);
  isLoading = signal(false);
  isPaying = signal(false);
  requestingFollowUpId = signal<string | null>(null);
  notice = signal('');
  paymentFlowState = signal<PaymentFlowState>('IDLE');
  paymentFlowError = signal('');
  paymentFlowConsultation = signal<HopeHubConsultation | null>(null);
  consultations = signal<HopeHubConsultation[]>([]);
  leads = signal<any[]>([]);
  resources = signal<DashboardResource[]>([]);
  packages = signal<DashboardPackage[]>([]);
  summary = signal<DashboardSummary>({
    totalBookings: 0,
    pendingPaymentCount: 0,
    availableFollowUpCount: 0,
    activePackageCount: 0,
    balanceDueInPaise: 0,
    refundedInPaise: 0,
    requestCount: 0,
  });

  constructor() {
    this.authService.user$.pipe(takeUntilDestroyed()).subscribe((user: User | null) => {
      this.user.set(user);
    });
  }

  ngOnInit(): void {
    this.loadDashboard();
  }

  canLiveConnect(consultation: HopeHubConsultation): boolean {
    const status = (consultation.status || '').toUpperCase();
    return Boolean(
      consultation.assignedDoctor?.id &&
      ['ASSIGNED', 'IN_PROGRESS', 'PRESCRIPTION_UPLOADED'].includes(status),
    );
  }

  isLiveConnectConsultation(consultation: HopeHubConsultation): boolean {
    const intake = consultation.intakeAnswers;
    const pricing = consultation.pricingSnapshot;
    return Boolean(
      intake?.quickTalk ||
      intake?.quickTalkMode ||
      pricing?.source === 'hope-hub-quick-talk' ||
      pricing?.purchaseType === 'QUICK_TALK',
    );
  }

  canOpenLiveRoom(consultation: HopeHubConsultation): boolean {
    if (this.canLiveConnect(consultation)) return true;
    const status = (consultation.status || '').toUpperCase();
    const paymentStatus = (consultation.payment?.status || '').toUpperCase();
    const paymentDone = paymentStatus === 'CAPTURED' || paymentStatus === 'PAID';
    return this.isLiveConnectConsultation(consultation) && (paymentDone || status === 'PAID');
  }

  liveRoomButtonLabel(consultation: HopeHubConsultation): string {
    if (this.canLiveConnect(consultation)) return 'Join live session';
    return 'Open waiting room';
  }

  private loadDashboard(): void {
    this.isLoading.set(true);
    this.bookingService.dashboard().subscribe({
      next: (dashboard) => {
        this.consultations.set(dashboard.consultations || []);
        this.leads.set(dashboard.leads || []);
        this.resources.set(dashboard.resources || []);
        this.packages.set(dashboard.packages || []);
        this.summary.set(
          dashboard.summary ||
            this.buildLocalSummary(dashboard.consultations || [], dashboard.leads || []),
        );
        this.isLoading.set(false);
      },
      error: () => {
        this.notificationService.error('Could not load your dashboard right now.');
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
      return 'The Hope Hub team is reviewing your concern and matching the right expert.';
    }

    return 'Your expert is assigned. The team will share the confirmed session instructions through your selected contact method.';
  }

  summaryCards(): Array<{ label: string; value: string; help: string }> {
    const summary = this.summary();
    return [
      { label: 'Bookings', value: String(summary.totalBookings), help: 'Total sessions' },
      { label: 'Pending pay', value: String(summary.pendingPaymentCount), help: 'Need action' },
      { label: 'Follow-ups', value: String(summary.availableFollowUpCount), help: 'Available now' },
      { label: 'Packages', value: String(summary.activePackageCount), help: 'Active plans' },
      { label: 'Balance', value: this.formatPaise(summary.balanceDueInPaise), help: 'Due later' },
      {
        label: 'Refunded',
        value: this.formatPaise(summary.refundedInPaise || 0),
        help: 'Returned amount',
      },
    ];
  }

  canRetryPayment(consultation: HopeHubConsultation): boolean {
    const paymentStatus = consultation.payment?.status?.toUpperCase();
    return Boolean(paymentStatus && paymentStatus !== 'CAPTURED' && paymentStatus !== 'PAID');
  }

  followUpStatusLabel(status: string | null | undefined): string {
    const normalized = (status || '').toUpperCase();
    if (normalized === 'AVAILABLE') return 'ready to schedule';
    if (normalized === 'REQUESTED') return 'request sent';
    if (normalized === 'SCHEDULED') return 'scheduled';
    if (normalized === 'USED') return 'completed';
    if (normalized === 'EXPIRED') return 'expired';
    if (normalized === 'CANCELLED') return 'cancelled';
    return 'available';
  }

  requestFollowUp(entitlementId: string): void {
    if (!entitlementId || this.requestingFollowUpId()) return;
    this.requestingFollowUpId.set(entitlementId);
    this.bookingService.requestFollowUp(entitlementId).subscribe({
      next: () => {
        this.productAnalytics.track(HOPE_HUB_ANALYTICS_EVENTS.FOLLOW_UP_REQUESTED, {
          entitlementId,
        });
        this.notificationService.success('Follow-up request sent. The team will confirm a slot.');
        this.loadDashboard();
        this.requestingFollowUpId.set(null);
      },
      error: () => {
        this.notificationService.error('Could not request follow-up right now.');
        this.requestingFollowUpId.set(null);
      },
    });
  }

  async retryPayment(consultation: HopeHubConsultation): Promise<void> {
    this.paymentFlowConsultation.set(consultation);
    this.paymentFlowError.set('');
    this.paymentFlowState.set('CREATING_ORDER');
    this.isPaying.set(true);
    this.notice.set('');
    this.productAnalytics.track(HOPE_HUB_ANALYTICS_EVENTS.PAYMENT_STARTED, {
      consultationId: consultation.id,
      source: 'dashboard_retry',
    });
    try {
      await this.paymentService.payConsultation(consultation, {
        onOrderCreated: () => this.paymentFlowState.set('OPENING_CHECKOUT'),
        onCheckoutOpened: () => this.paymentFlowState.set('OPENING_CHECKOUT'),
        onVerifying: () => this.paymentFlowState.set('VERIFYING'),
      });
      this.paymentFlowState.set('SUCCESS');
      this.productAnalytics.track(HOPE_HUB_ANALYTICS_EVENTS.PAYMENT_SUCCESS, {
        consultationId: consultation.id,
        source: 'dashboard_retry',
      });
      this.notice.set(
        'Payment verified successfully. Your booking is now ready for expert confirmation.',
      );
      this.notificationService.success(
        'Payment verified successfully. Your booking is ready for expert confirmation.',
      );
      this.loadDashboard();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Payment could not be completed. Please retry or contact support.';
      this.paymentFlowError.set(message);
      this.paymentFlowState.set('ERROR');
      this.productAnalytics.track(HOPE_HUB_ANALYTICS_EVENTS.PAYMENT_FAILED, {
        consultationId: consultation.id,
        source: 'dashboard_retry',
        message,
      });
      this.notice.set(message);
      this.notificationService.error(message);
    } finally {
      this.isPaying.set(false);
    }
  }

  retrySelectedPayment(): void {
    const consultation = this.paymentFlowConsultation();
    if (!consultation || this.isPaying()) return;
    void this.retryPayment(consultation);
  }

  closePaymentOverlay(): void {
    if (this.paymentFlowState() === 'SUCCESS' || this.paymentFlowState() === 'ERROR') {
      this.paymentFlowState.set('IDLE');
      this.paymentFlowError.set('');
      this.paymentFlowConsultation.set(null);
    }
  }

  paymentFlowTitle(): string {
    const state = this.paymentFlowState();
    if (state === 'CREATING_ORDER') return 'Preparing payment';
    if (state === 'OPENING_CHECKOUT') return 'Opening secure checkout';
    if (state === 'VERIFYING') return 'Verifying payment';
    if (state === 'SUCCESS') return 'Payment successful';
    if (state === 'ERROR') return 'Payment failed';
    return '';
  }

  paymentFlowMessage(): string {
    const state = this.paymentFlowState();
    if (state === 'CREATING_ORDER') return 'Preparing a secure payment for your session.';
    if (state === 'OPENING_CHECKOUT') return 'Complete payment in the secure checkout window.';
    if (state === 'VERIFYING') return 'Confirming your payment. This usually takes a few seconds.';
    if (state === 'SUCCESS') {
      return 'Your payment was verified. The Hope Hub team can now confirm your care guide and session instructions.';
    }
    if (state === 'ERROR') {
      return (
        this.paymentFlowError() ||
        'Payment could not be completed. You can retry or contact support if money was debited.'
      );
    }
    return '';
  }

  timelineSteps(consultation: HopeHubConsultation): BookingTimelineStep[] {
    const paymentStatus = consultation.payment?.status?.toUpperCase();
    const isPaymentDone = paymentStatus === 'CAPTURED' || paymentStatus === 'PAID';

    return [
      { label: 'Request received', done: true },
      { label: 'Payment confirmed', done: isPaymentDone },
      { label: 'Expert matched', done: Boolean(consultation.assignedDoctor) },
      { label: 'Session instructions', done: Boolean(consultation.assignedDoctor) },
    ];
  }

  packageUsage(consultation: HopeHubConsultation) {
    return (
      consultation.pricingSnapshot?.packageUsage ||
      consultation.payment?.lineItems?.packageUsage ||
      null
    );
  }

  pricingLabel(consultation: HopeHubConsultation): string {
    return (
      consultation.pricingSnapshot?.careTeamPricingLabel ||
      consultation.payment?.lineItems?.careTeamPricingLabel ||
      ''
    );
  }

  pricingModeLabel(consultation: HopeHubConsultation): string {
    const mode =
      consultation.pricingSnapshot?.careTeamPricingMode ||
      consultation.payment?.lineItems?.careTeamPricingMode ||
      '';
    const labels: Record<string, string> = {
      FIXED: 'Fixed session price',
      FREE_INTRO: 'Free introductory session',
      DISCOUNTED_FIRST: 'First/follow-up pricing',
      PACKAGE: 'Package pricing',
      FREE_VOLUNTEER: 'Emotional support/free support',
      PER_MINUTE: 'Per-minute pricing',
    };
    return mode ? (labels[mode] ?? mode.replace(/_/g, ' ')) : '';
  }

  billableMinutes(consultation: HopeHubConsultation): number {
    return Number(
      consultation.pricingSnapshot?.careTeamBillableMinutes ??
        consultation.payment?.lineItems?.careTeamBillableMinutes ??
        0,
    );
  }

  refundText(consultation: HopeHubConsultation): string {
    const refunded = Number(consultation.payment?.refundedAmountInPaise || 0);
    if (!refunded) return '';
    const amount = Number(consultation.payment?.amountInPaise || 0);
    return refunded >= amount
      ? `Full refund recorded: ${this.formatPaise(refunded)}.`
      : `Partial refund recorded: ${this.formatPaise(refunded)}.`;
  }

  sessionOutcomeText(consultation: HopeHubConsultation): string {
    const outcome = consultation.pricingSnapshot?.sessionOutcome;
    const cancellation = consultation.pricingSnapshot?.cancellation;
    if (outcome?.userSummary) return outcome.userSummary;
    if (outcome?.outcome) {
      const parts = [`Session outcome: ${String(outcome.outcome).replace(/_/g, ' ')}`];
      if (outcome.packageRestored) parts.push('package session restored');
      if (outcome.recommendedNextStep) parts.push(outcome.recommendedNextStep);
      return parts.join(' · ');
    }
    if (cancellation?.reason) {
      return `Cancelled: ${cancellation.reason}${
        cancellation.restorePackageSession ? ' · package session restored' : ''
      }`;
    }
    return '';
  }

  packageProgress(item: DashboardPackage): number {
    if (!item.totalSessions) return 0;
    return Math.min(100, Math.max(0, (item.usedSessions / item.totalSessions) * 100));
  }

  bookNextPackageQueryParams(item: DashboardPackage) {
    return {
      service: item.serviceName,
      serviceName: item.serviceName,
      providerId: item.providerId || '',
      careTeamServiceId: item.careTeamServiceId || '',
      consultant: item.providerName || '',
      source: 'dashboard-package',
    };
  }

  balanceDueInPaise(consultation: HopeHubConsultation): number {
    return Number(
      consultation.pricingSnapshot?.balanceDueInPaise ??
        consultation.payment?.lineItems?.balanceDueInPaise ??
        0,
    );
  }

  private buildLocalSummary(consultations: HopeHubConsultation[], leads: any[]): DashboardSummary {
    return consultations.reduce(
      (acc, consultation) => {
        if (this.canRetryPayment(consultation)) acc.pendingPaymentCount += 1;
        if (consultation.followUpEntitlement?.status === 'AVAILABLE') {
          acc.availableFollowUpCount += 1;
        }
        const packageUsage = this.packageUsage(consultation);
        if ((packageUsage?.remainingSessions ?? 0) > 0) {
          acc.activePackageCount += 1;
        }
        acc.balanceDueInPaise += this.balanceDueInPaise(consultation);
        acc.refundedInPaise =
          (acc.refundedInPaise || 0) + Number(consultation.payment?.refundedAmountInPaise || 0);
        return acc;
      },
      {
        totalBookings: consultations.length,
        pendingPaymentCount: 0,
        availableFollowUpCount: 0,
        activePackageCount: 0,
        balanceDueInPaise: 0,
        refundedInPaise: 0,
        requestCount: leads.length,
      },
    );
  }

  formatPaise(value: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format((value || 0) / 100);
  }

  async logout(): Promise<void> {
    try {
      await this.authService.logout();
    } catch (error) {
      this.notificationService.error('Could not sign you out. Please try again.');
      console.error('Logout error:', error);
    }
  }
}

import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { AssessmentConfig, AssessmentResult } from '../../core/models/assessment.model';
import { getExerciseRecommendations } from '../../core/data/exercise-recommendations';
import { getLifestyleTipRecommendations } from '../../core/data/lifestyle-tip-recommendations';
import { getArticleRecommendations } from '../../core/data/article-recommendations';
import { AuthService } from '../../core/services/auth.service';
import { AuthModalService } from '../../core/services/auth-modal.service';
import { AssessmentAttemptsService } from '../../core/services/assessment-attempts.service';
import { BookingService, HopeHubProvider } from '../../core/services/booking.service';
import {
  AssessmentAccess,
  AssessmentCouponQuote,
  AssessmentDefinitionService,
} from '../../core/services/assessment-definition.service';
import { NotificationService } from '../../core/services/notification.service';
import { PaymentService } from '../../core/services/payment.service';
import { LiveConnectActionService } from '../../core/services/live-connect-action.service';
import { ConsumerFlowPreferencesService } from '../../core/services/consumer-flow-preferences.service';
import { CONSUMER_UX_COPY } from '../../core/constants/consumer-ux-copy.constants';
import { CONSUMER_ROUTES } from '../../core/constants/consumer-routes.constants';
import { consumerSessionModeFor } from '../../core/constants/consumer-form-options.constants';
import { CONSUMER_STORAGE_KEYS } from '../../core/constants/storage-keys.constants';
import {
  ConnectFallbackPanelComponent,
  ConnectOptionMode,
  CouponBoxComponent,
  EmptyStateComponent,
  GuidedSupportEntryComponent,
  AppButtonComponent,
  ProviderCardComponent,
  SelectableCardComponent,
} from '../../shared/components';

@Component({
  selector: 'app-direct-assessment',
  standalone: true,
  imports: [
    RouterModule,
    ConnectFallbackPanelComponent,
    CouponBoxComponent,
    EmptyStateComponent,
    GuidedSupportEntryComponent,
    AppButtonComponent,
    ProviderCardComponent,
    SelectableCardComponent,
  ],
  template: `
    <main class="direct-test bg-[var(--brand-surface)]">
      @if (assessment()) {
        <section class="mx-auto w-full max-w-3xl px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
          <div class="mb-3 flex items-center justify-between gap-3">
            <a
              [routerLink]="ROUTES.links.assessments"
              class="text-sm font-semibold text-primary-700 hover:text-primary-800"
            >
              All tests
            </a>
            <span
              class="rounded-md bg-white px-3 py-1 text-xs font-semibold text-gray-600 ring-1 ring-gray-200"
            >
              {{ assessment()!.duration }}
            </span>
          </div>

          @if (!showResults()) {
            <div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
              <div class="mb-3">
                <p class="text-sm font-semibold text-primary-700">{{ assessment()!.type }}</p>
                <h1 class="mt-1 text-xl font-semibold text-gray-950 sm:text-2xl">
                  {{ publicTitle() }}
                </h1>
                @if (assessmentAccess()?.accessMode === 'PAID') {
                  <p class="mt-2 text-sm font-semibold text-primary-700">
                    {{ assessmentPriceLabel() }}
                    @if (assessmentAccess()?.canAccess) {
                      <span class="ml-2 text-green-700">Unlocked</span>
                    }
                  </p>
                }
              </div>

              @if (hasAssessmentIntro()) {
                <details class="direct-test__intro-toggle">
                  <summary>About this test</summary>
                  <section class="direct-test__summary">
                    <p>{{ assessment()!.description }}</p>
                    <p>{{ assessment()!.instructions }}</p>
                  </section>
                  <section class="direct-test__intro">
                    @if (assessment()!.whoShouldTake?.length) {
                      <article>
                        <h2>Who should take this test?</h2>
                        <ul>
                          @for (item of assessment()!.whoShouldTake; track item) {
                            <li>{{ item }}</li>
                          }
                        </ul>
                      </article>
                    }
                    @if (assessment()!.possibleSymptoms?.length) {
                      <article>
                        <h2>Possible symptoms / signs</h2>
                        <ul>
                          @for (item of assessment()!.possibleSymptoms; track item) {
                            <li>{{ item }}</li>
                          }
                        </ul>
                      </article>
                    }
                    @if (assessment()!.whatThisTestChecks?.length) {
                      <article>
                        <h2>What this test checks</h2>
                        <ul>
                          @for (item of assessment()!.whatThisTestChecks; track item) {
                            <li>{{ item }}</li>
                          }
                        </ul>
                      </article>
                    }
                    @if (assessment()!.beforeYouStart?.length) {
                      <article>
                        <h2>Before you start</h2>
                        <ul>
                          @for (item of assessment()!.beforeYouStart; track item) {
                            <li>{{ item }}</li>
                          }
                        </ul>
                      </article>
                    }
                  </section>
                  @if (assessment()!.disclaimer) {
                    <p class="direct-test__disclaimer">{{ assessment()!.disclaimer }}</p>
                  }
                </details>
              }

              @if (!canStartAssessment()) {
                <div class="direct-test__lock mb-4">
                  <h2 class="text-lg font-semibold text-gray-950">Unlock this test</h2>
                  <p class="mt-2 text-sm leading-6 text-gray-700">
                    {{ assessmentAccess()?.accessNote || lockedAssessmentMessage() }}
                  </p>
                  @if (assessmentAccess()?.accessMode === 'PAID') {
                    <app-coupon-box
                      class="mt-4 block text-left"
                      [value]="couponCode()"
                      [loading]="redeemingCoupon()"
                      [success]="couponSuccessMessage()"
                      [helper]="assessmentAccess()?.couponLabel || ''"
                      (valueChange)="couponCode.set($event)"
                      (apply)="redeemCoupon()"
                    />
                  }
                  <div class="mt-4 flex flex-col gap-3 sm:flex-row">
                    <app-button type="button" variant="outline" size="sm" (click)="openLogin()">
                      Sign in
                    </app-button>
                    @if (assessmentAccess()?.accessMode === 'PAID') {
                      <app-button
                        type="button"
                        size="sm"
                        [disabled]="payingAssessment()"
                        (click)="payAndUnlock()"
                      >
                        {{ payingAssessment() ? 'Opening payment...' : payAssessmentLabel() }}
                      </app-button>
                    }
                  </div>
                </div>
              }

              @if (canStartAssessment()) {
                <div class="mb-4">
                  <div
                    class="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div class="text-sm text-gray-600">
                      @if (viewMode() === 'single') {
                        <span
                          >Question {{ currentQuestion() + 1 }} of
                          {{ assessment()!.questions.length }}</span
                        >
                      } @else {
                        <span
                          >{{ answeredCount() }} of
                          {{ assessment()!.questions.length }} answered</span
                        >
                      }
                      <span class="ml-2 font-semibold text-gray-800">{{ progressPercent() }}%</span>
                    </div>
                    <div class="direct-test__mode" aria-label="Question view mode">
                      <button
                        type="button"
                        [class.active]="viewMode() === 'single'"
                        (click)="setViewMode('single')"
                      >
                        One by one
                      </button>
                      <button
                        type="button"
                        [class.active]="viewMode() === 'all'"
                        (click)="setViewMode('all')"
                      >
                        All questions
                      </button>
                    </div>
                  </div>
                  <div class="h-2 rounded-full bg-gray-100">
                    <div
                      class="h-2 rounded-full bg-primary-600 transition-all"
                      [style.width.%]="progressPercent()"
                    ></div>
                  </div>
                </div>

                @if (viewMode() === 'single') {
                  <h2 class="mb-3 text-base font-semibold leading-snug text-gray-950 sm:text-lg">
                    {{ currentQuestionText() }}
                  </h2>

                  <div class="grid gap-2">
                    @for (option of assessment()!.responseOptions; track option.value) {
                      <app-selectable-card
                        [title]="option.label"
                        [selected]="answers()[currentQuestion()] === option.value"
                        tone="success"
                        [compact]="true"
                        (selectedChange)="selectAnswer(option.value)"
                      />
                    }
                  </div>

                  <div class="flex items-center justify-between gap-3 pt-4">
                    <app-button
                      type="button"
                      variant="outline"
                      size="sm"
                      [disabled]="currentQuestion() === 0"
                      (click)="previousQuestion()"
                    >
                      Previous
                    </app-button>

                    @if (currentQuestion() < assessment()!.questions.length - 1) {
                      <app-button
                        type="button"
                        size="sm"
                        [disabled]="!hasCurrentAnswer()"
                        (click)="nextQuestion()"
                      >
                        Next
                      </app-button>
                    } @else {
                      <app-button
                        type="button"
                        size="sm"
                        [disabled]="!hasAllAnswers() || savingResult()"
                        (click)="completeAssessment()"
                      >
                        {{ savingResult() ? 'Saving...' : 'See result' }}
                      </app-button>
                    }
                  </div>
                } @else {
                  <div class="grid gap-4">
                    @for (question of assessment()!.questions; track question.id; let i = $index) {
                      <section class="direct-test__question-block">
                        <div class="mb-2 flex items-start gap-3">
                          <span class="direct-test__question-number">{{ i + 1 }}</span>
                          <h2 class="text-sm font-semibold leading-6 text-gray-950 sm:text-base">
                            {{ question.text }}
                          </h2>
                        </div>

                        <div class="grid gap-2 sm:grid-cols-2">
                          @for (option of assessment()!.responseOptions; track option.value) {
                            <app-selectable-card
                              [title]="option.label"
                              [selected]="answers()[i] === option.value"
                              tone="success"
                              [compact]="true"
                              (selectedChange)="selectAnswerAt(i, option.value)"
                            />
                          }
                        </div>
                      </section>
                    }
                  </div>

                  <div
                    class="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <p class="text-sm font-semibold text-gray-600">
                      {{ answeredCount() }} of {{ assessment()!.questions.length }} answered
                    </p>
                    <app-button
                      type="button"
                      size="sm"
                      [disabled]="!hasAllAnswers() || savingResult()"
                      (click)="completeAssessment()"
                    >
                      {{ savingResult() ? 'Saving...' : 'See result' }}
                    </app-button>
                  </div>
                }
              }
            </div>
          }

          @if (resultLocked()) {
            <div
              class="mt-4 rounded-lg border border-primary-100 bg-white p-5 text-center shadow-sm"
            >
              <h2 class="text-xl font-semibold text-gray-950">Your answers are ready</h2>
              <p class="mx-auto mt-2 max-w-xl text-sm leading-6 text-gray-700">
                Sign in or create an account to view and save your result privately. We kept your
                answers on this device, so you will not need to retake the test.
              </p>
              <div class="mt-4 flex flex-col justify-center gap-3 sm:flex-row">
                <app-button type="button" variant="outline" size="sm" (click)="openLogin()">
                  Sign in
                </app-button>
                <app-button type="button" size="sm" (click)="openRegister()"> Sign up </app-button>
              </div>
            </div>
          }

          @if (showResults() && result()) {
            <div class="rounded-lg border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
              <div class="text-center">
                <p class="text-sm font-semibold text-primary-700">Your result</p>
                <h1 class="mt-2 text-2xl font-semibold text-gray-950 sm:text-3xl">
                  {{ result()!.level }}
                </h1>
                <p class="mx-auto mt-3 max-w-2xl text-sm leading-6 text-gray-700 sm:text-base">
                  {{ result()!.description }}
                </p>
              </div>

              <div class="mt-5 grid gap-3 sm:grid-cols-3">
                <div class="rounded-lg bg-gray-50 p-4 text-center">
                  <div class="text-2xl font-semibold text-gray-950">{{ result()!.total }}</div>
                  <div class="text-xs font-semibold text-gray-500">Score</div>
                </div>
                <div class="rounded-lg bg-gray-50 p-4 text-center">
                  <div class="text-2xl font-semibold text-gray-950">{{ result()!.maxScore }}</div>
                  <div class="text-xs font-semibold text-gray-500">Max score</div>
                </div>
                <div class="rounded-lg bg-gray-50 p-4 text-center">
                  <div class="text-2xl font-semibold text-gray-950">
                    #{{ savedAttempt()?.retakeNumber || 1 }}
                  </div>
                  <div class="text-xs font-semibold text-gray-500">Attempt</div>
                </div>
              </div>

              <section class="direct-test__human-result" aria-label="Result explanation">
                <article>
                  <p>What this may mean</p>
                  <h2>{{ humanResultTitle() }}</h2>
                  <span>{{ humanResultCopy() }}</span>
                </article>
                <article>
                  <p>Best next step</p>
                  <h2>{{ resultActionTitle() }}</h2>
                  <span>{{ resultActionCopy() }}</span>
                </article>
                <article class="direct-test__human-result--safety">
                  <p>Safety note</p>
                  <h2>{{ resultSafetyTitle() }}</h2>
                  <span>{{ resultSafetyCopy() }}</span>
                </article>
              </section>

              @if (result()!.safetyFlag) {
                <div
                  class="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800"
                >
                  If you feel unsafe or may harm yourself, call local emergency services now. In
                  India, Tele MANAS is available at 14416.
                </div>
              }

              <div class="mt-5">
                <h2 class="text-lg font-semibold text-gray-950">Recommended next steps</h2>
                <div class="mt-3 grid gap-2">
                  @for (suggestion of result()!.suggestions.slice(0, 3); track suggestion) {
                    <div class="rounded-lg bg-gray-50 p-3 text-sm leading-6 text-gray-700">
                      {{ suggestion }}
                    </div>
                  }
                </div>
              </div>

              <div class="mt-6 rounded-xl border border-primary-100 bg-primary-50/70 p-4">
                <h2 class="text-base font-semibold text-gray-950">{{ UX.assessment.nextTitle }}</h2>
                <p class="mt-1 text-sm leading-6 text-gray-700">
                  {{ UX.assessment.nextCopy }}
                </p>
                <app-button type="button" class="mt-4 block" (click)="connectFromResult('chat')">
                  Talk to a caring listener
                </app-button>
                <details class="mt-3 rounded-lg border border-primary-100 bg-white px-3 py-2">
                  <summary class="cursor-pointer text-sm font-semibold text-primary-700">
                    Choose another support option
                  </summary>
                  <app-guided-support-entry
                    class="mt-3 block"
                    [compact]="true"
                    [title]="'Choose your next step'"
                    [subtitle]="'We will carry this result context with you.'"
                    [contextConcern]="assessment()!.category || assessment()!.type"
                    [contextServiceName]="assessment()!.title + ' support'"
                    [contextAssessmentId]="assessment()!.id"
                  />
                </details>
                @if (liveFallback(); as fallback) {
                  <app-connect-fallback-panel
                    class="mt-4 block"
                    [title]="UX.messages.noLiveExpertTitle"
                    [message]="UX.messages.noLiveExpertAssessmentFallback"
                    [bookQueryParams]="fallback.queryParams"
                    [careTeamQueryParams]="assessmentCareTeamQueryParams()"
                    (tryMode)="connectFromResult($event)"
                    (dismissed)="dismissLiveFallback()"
                  />
                }
              </div>

              <details class="direct-test__matched-providers" aria-label="Matched providers">
                <summary class="cursor-pointer text-sm font-semibold text-primary-700">
                  See providers matched to this result
                </summary>
                <div class="direct-test__matched-head">
                  <div>
                    <p>Matched from your result</p>
                    <h2>Care team you can speak with next</h2>
                  </div>
                  <a
                    [routerLink]="ROUTES.links.careTeam"
                    [queryParams]="assessmentCareTeamQueryParams()"
                  >
                    See all
                  </a>
                </div>

                @if (matchingProvidersLoading()) {
                  <app-empty-state
                    icon="🔎"
                    title="Finding the closest matches…"
                    message="We are checking live and bookable care-team members for this result."
                    compact
                  />
                } @else if (matchingProviders().length) {
                  <div class="direct-test__matched-grid">
                    @for (provider of matchingProviders(); track provider.id) {
                      <app-provider-card
                        [provider]="provider"
                        variant="result"
                        [showBook]="false"
                        [showProfileLink]="false"
                        [bestForSeparator]="' • '"
                        [bestForLimit]="3"
                        [connectSubtitle]="'Your assessment context will be carried forward.'"
                        (connectSelected)="connectMatchedProvider(provider, $event)"
                      />
                    }
                  </div>
                } @else {
                  <app-empty-state
                    icon="📅"
                    title="No direct match is live right now"
                    message="You can still book a slot with a matching provider."
                    compact
                  />
                }
              </details>

              <details class="mt-4 rounded-lg border border-gray-200 bg-white px-4 py-3">
                <summary class="cursor-pointer text-sm font-semibold text-gray-700">
                  Self-help resources
                </summary>
                <div class="mt-3 grid gap-3 sm:grid-cols-3">
                  <app-button
                    [routerLink]="ROUTES.links.exercises"
                    [queryParams]="recommendationQuery('exercises')"
                    variant="outline"
                    size="sm"
                    >Exercises</app-button
                  >
                  <app-button
                    [routerLink]="ROUTES.links.lifestyleTips"
                    [queryParams]="recommendationQuery('tips')"
                    variant="outline"
                    size="sm"
                    >Lifestyle tips</app-button
                  >
                  <app-button
                    [routerLink]="ROUTES.links.articles"
                    [queryParams]="recommendationQuery('articles')"
                    variant="outline"
                    size="sm"
                    >Articles</app-button
                  >
                </div>
              </details>

              <div class="mt-4 text-center">
                <button
                  type="button"
                  class="text-sm font-semibold text-primary-700 hover:text-primary-800"
                  (click)="retake()"
                >
                  Retake this test
                </button>
              </div>
            </div>
          }
        </section>
      } @else {
        <section class="container mx-auto px-4 py-16 text-center">
          <app-empty-state
            icon="🧭"
            title="Test not found"
            message="The test you are looking for is not available."
          >
            <app-button [routerLink]="ROUTES.links.assessments" size="sm"
              >View all tests</app-button
            >
          </app-empty-state>
        </section>
      }
    </main>
  `,
  styles: [
    `
      .direct-test__mode {
        display: inline-grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        overflow: hidden;
        border: 1px solid #d1d5db;
        border-radius: 0.5rem;
        background: #f8fafc;
        padding: 0.2rem;
      }

      .direct-test__mode button {
        border: 0;
        border-radius: 0.35rem;
        background: transparent;
        color: #475569;
        padding: 0.45rem 0.65rem;
        font-size: 0.8rem;
        font-weight: 800;
        cursor: pointer;
      }

      .direct-test__mode button.active {
        background: #fff;
        color: var(--brand-primary);
        box-shadow: 0 1px 4px rgba(15, 23, 42, 0.1);
      }

      .direct-test__question-block {
        border: 1px solid #e5e7eb;
        border-radius: 0.75rem;
        background: #f8fafc;
        padding: 0.9rem;
      }

      .direct-test__question-number {
        display: inline-grid;
        width: 1.65rem;
        height: 1.65rem;
        flex: 0 0 auto;
        place-items: center;
        border-radius: 999px;
        background: rgba(74, 111, 165, 0.11);
        color: var(--brand-primary);
        font-size: 0.78rem;
        font-weight: 900;
      }

      .direct-test__lock {
        border: 1px solid rgba(74, 111, 165, 0.22);
        border-radius: 0.75rem;
        background: rgba(74, 111, 165, 0.06);
        padding: 1rem;
      }

      .direct-test__summary {
        display: grid;
        gap: 0.45rem;
        margin: 0.8rem 0 1rem;
        border-radius: 0.75rem;
        background: #f8fafc;
        padding: 0.85rem;
      }

      .direct-test__intro-toggle {
        margin: 0 0 1rem;
        border: 1px solid #e5e7eb;
        border-radius: 0.75rem;
        background: #ffffff;
        padding: 0.8rem;
      }

      .direct-test__intro-toggle summary {
        color: var(--brand-primary);
        cursor: pointer;
        font-size: 0.86rem;
        font-weight: 850;
      }

      .direct-test__summary p {
        margin: 0;
        color: #475569;
        font-size: 0.9rem;
        line-height: 1.6;
      }

      .direct-test__intro {
        display: grid;
        gap: 0.8rem;
        margin: 0 0 1rem;
      }

      .direct-test__intro article {
        border: 1px solid rgba(74, 111, 165, 0.16);
        border-radius: 0.85rem;
        background:
          linear-gradient(135deg, rgba(74, 111, 165, 0.07), rgba(255, 255, 255, 0.92)), #fff;
        padding: 0.95rem;
      }

      .direct-test__intro h2 {
        margin: 0 0 0.55rem;
        color: #0f172a;
        font-size: 0.92rem;
        font-weight: 900;
      }

      .direct-test__intro ul {
        display: grid;
        gap: 0.4rem;
        margin: 0;
        padding-left: 1.05rem;
      }

      .direct-test__intro li {
        color: #475569;
        font-size: 0.86rem;
        line-height: 1.55;
      }

      .direct-test__disclaimer {
        border: 1px solid #fde68a;
        border-radius: 0.75rem;
        background: #fffbeb;
        color: #92400e;
        font-size: 0.82rem;
        font-weight: 650;
        line-height: 1.6;
        margin: 0;
        padding: 0.8rem 0.95rem;
      }

      .direct-test__matched-providers {
        display: grid;
        gap: 0.9rem;
        margin-top: 1.5rem;
        border: 1px solid rgba(74, 111, 165, 0.14);
        border-radius: 1rem;
        background: linear-gradient(135deg, rgba(74, 111, 165, 0.06), rgba(255, 255, 255, 0.96));
        padding: 1rem;
      }

      .direct-test__human-result {
        display: grid;
        gap: 0.85rem;
        margin-top: 1.25rem;
      }

      .direct-test__human-result article {
        border: 1px solid rgba(226, 232, 240, 0.95);
        border-radius: 0.95rem;
        background: linear-gradient(135deg, rgba(248, 250, 252, 0.96), rgba(255, 255, 255, 0.98));
        padding: 0.95rem;
      }

      .direct-test__human-result article p {
        margin: 0;
        color: var(--brand-primary);
        font-size: 0.72rem;
        font-weight: 950;
        letter-spacing: 0.07em;
        text-transform: uppercase;
      }

      .direct-test__human-result article h2 {
        margin: 0.25rem 0 0;
        color: #0f172a;
        font-size: 0.98rem;
        font-weight: 950;
      }

      .direct-test__human-result article span {
        display: block;
        margin-top: 0.4rem;
        color: #475569;
        font-size: 0.9rem;
        line-height: 1.6;
      }

      .direct-test__human-result--safety {
        border-color: #fde68a !important;
        background: #fffbeb !important;
      }

      .direct-test__matched-head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 1rem;
      }

      .direct-test__matched-head p,
      .direct-test__provider-top p,
      .direct-test__provider-focus {
        margin: 0;
      }

      .direct-test__matched-head p {
        color: var(--brand-primary);
        font-size: 0.76rem;
        font-weight: 900;
        letter-spacing: 0.06em;
        text-transform: uppercase;
      }

      .direct-test__matched-head h2 {
        margin: 0.2rem 0 0;
        color: #0f172a;
        font-size: 1rem;
        font-weight: 900;
      }

      .direct-test__matched-head a {
        flex: 0 0 auto;
        color: var(--brand-primary);
        font-size: 0.82rem;
        font-weight: 900;
      }

      .direct-test__matched-grid {
        display: grid;
        gap: 0.75rem;
      }

      .direct-test__provider-card {
        border: 1px solid rgba(226, 232, 240, 0.95);
        border-radius: 0.9rem;
        background: rgba(255, 255, 255, 0.94);
        padding: 0.9rem;
        box-shadow: 0 14px 35px rgba(15, 23, 42, 0.06);
      }

      .direct-test__provider-top {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 0.75rem;
      }

      .direct-test__provider-top h3 {
        margin: 0;
        color: #0f172a;
        font-size: 0.98rem;
        font-weight: 900;
      }

      .direct-test__provider-top p,
      .direct-test__provider-focus {
        color: #64748b;
        font-size: 0.82rem;
        line-height: 1.45;
      }

      .direct-test__provider-focus {
        margin-top: 0.55rem;
      }

      .direct-test__availability {
        flex: 0 0 auto;
        border-radius: 999px;
        padding: 0.28rem 0.55rem;
        font-size: 0.68rem;
        font-weight: 950;
        white-space: nowrap;
      }

      .direct-test__availability--live {
        background: #dcfce7;
        color: #166534;
      }

      .direct-test__availability--soon {
        background: #dbeafe;
        color: #1d4ed8;
      }

      .direct-test__availability--slot {
        background: #fef3c7;
        color: #92400e;
      }

      @media (min-width: 768px) {
        .direct-test__intro {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .direct-test__human-result {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .direct-test__matched-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }
      }
    `,
  ],
})
export class DirectAssessmentComponent implements OnInit {
  readonly UX = CONSUMER_UX_COPY;
  readonly ROUTES = CONSUMER_ROUTES;
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly authModalService = inject(AuthModalService);
  private readonly bookingService = inject(BookingService);
  private readonly assessmentAttemptsService = inject(AssessmentAttemptsService);
  private readonly assessmentDefinitionService = inject(AssessmentDefinitionService);
  private readonly notificationService = inject(NotificationService);
  private readonly paymentService = inject(PaymentService);
  private readonly liveConnectAction = inject(LiveConnectActionService);
  private readonly preferences = inject(ConsumerFlowPreferencesService);
  private readonly pendingStorageKey = CONSUMER_STORAGE_KEYS.pendingDirectAssessmentResult;
  private autoNextTimer: ReturnType<typeof setTimeout> | null = null;

  assessment = signal<AssessmentConfig | null>(null);
  assessmentAccess = signal<AssessmentAccess | null>(null);
  couponQuote = signal<AssessmentCouponQuote | null>(null);
  couponCode = signal('');
  redeemingCoupon = signal(false);
  payingAssessment = signal(false);
  matchingProviders = signal<HopeHubProvider[]>([]);
  matchingProvidersLoading = signal(false);
  liveFallback = signal<{
    mode: Exclude<ConnectOptionMode, 'book'>;
    queryParams: Record<string, unknown>;
  } | null>(null);
  viewMode = signal<'single' | 'all'>('single');
  currentQuestion = signal(0);
  answers = signal<number[]>([]);
  result = signal<AssessmentResult | null>(null);
  showResults = signal(false);
  resultLocked = signal(false);
  savingResult = signal(false);
  savedAttempt = signal<{ id: string; retakeNumber: number } | null>(null);

  progressPercent = computed(() => {
    const assessment = this.assessment();
    if (!assessment) return 0;
    return Math.round((this.answeredCount() / assessment.questions.length) * 100);
  });

  answeredCount = computed(() => this.answers().filter((answer) => answer !== undefined).length);

  publicTitle = computed(() => {
    const assessment = this.assessment();
    if (!assessment) return 'Mental Health Test';
    return assessment.title.replace(' Assessment', ' Test').replace(' Scale', ' Test');
  });

  currentQuestionText = computed(() => {
    const assessment = this.assessment();
    return assessment?.questions[this.currentQuestion()]?.text || '';
  });

  constructor() {
    this.authService.authState$.pipe(takeUntilDestroyed()).subscribe((state) => {
      if (state.isAuthenticated && this.assessment()) {
        void this.refreshAccess();
      }
      if (state.isAuthenticated && this.resultLocked() && this.result()) {
        void this.saveAndShowResult();
      }
    });
  }

  async ngOnInit(): Promise<void> {
    const assessmentId =
      (this.route.snapshot.data['assessmentId'] as string | undefined) ??
      this.route.snapshot.paramMap.get('assessmentId') ??
      undefined;
    const assessment = assessmentId
      ? await firstValueFrom(this.assessmentDefinitionService.get(assessmentId))
      : null;
    if (!assessment) return;

    this.assessment.set(assessment);
    this.assessmentAccess.set(assessment.access ?? null);
    this.answers.set(new Array(assessment.questions.length).fill(undefined));
    await this.refreshAccess();
    this.restorePendingResult(assessment.id);
  }

  canStartAssessment(): boolean {
    const access = this.assessmentAccess() ?? this.assessment()?.access ?? null;
    return !access || access.accessMode === 'FREE' || access.canAccess === true;
  }

  assessmentPriceLabel(): string {
    const priceInPaise =
      this.assessmentAccess()?.priceInPaise ?? this.assessment()?.access?.priceInPaise;
    return priceInPaise ? `₹${Math.round(priceInPaise / 100)}` : 'Paid test';
  }

  assessmentAmountLabel(amountInPaise: number): string {
    return `₹${Math.round(Number(amountInPaise || 0) / 100)}`;
  }

  payAssessmentLabel(): string {
    const amount =
      this.couponQuote()?.payableAmountInPaise ?? this.assessmentAccess()?.priceInPaise;
    return amount ? `Pay ${this.assessmentAmountLabel(amount)} and unlock` : 'Pay and unlock';
  }

  couponSuccessMessage(): string {
    const quote = this.couponQuote();
    if (!quote) return '';
    return `Coupon applied: save ${this.assessmentAmountLabel(
      quote.discountInPaise,
    )}. Pay ${this.assessmentAmountLabel(quote.payableAmountInPaise)}.`;
  }

  lockedAssessmentMessage(): string {
    const access = this.assessmentAccess();
    if (access?.reason === 'SIGN_IN_REQUIRED' || access?.accessMode === 'LOGIN_REQUIRED') {
      return 'Sign in to start this test and keep the result saved to your account.';
    }
    return 'This is a paid test. Use a valid coupon code or complete payment to unlock it.';
  }

  hasAssessmentIntro(): boolean {
    const assessment = this.assessment();
    return Boolean(
      assessment &&
      ((assessment.whoShouldTake?.length ?? 0) ||
        (assessment.possibleSymptoms?.length ?? 0) ||
        (assessment.whatThisTestChecks?.length ?? 0) ||
        (assessment.beforeYouStart?.length ?? 0) ||
        assessment.disclaimer),
    );
  }

  async redeemCoupon(): Promise<void> {
    const assessment = this.assessment();
    const code = this.couponCode().trim();
    if (!assessment || !code) return;
    if (!this.authService.getToken()) {
      this.notificationService.info(CONSUMER_UX_COPY.messages.signInBeforeCoupon);
      this.authModalService.openLogin();
      return;
    }

    this.redeemingCoupon.set(true);
    try {
      const response = await firstValueFrom(
        this.assessmentDefinitionService.redeemCoupon(assessment.id, code),
      );
      this.assessmentAccess.set(response.access);
      this.couponCode.set('');
      this.couponQuote.set(null);
      this.notificationService.success(
        response.alreadyRedeemed
          ? CONSUMER_UX_COPY.messages.testAlreadyUnlocked
          : CONSUMER_UX_COPY.messages.testCouponUnlocked,
      );
    } catch (error: any) {
      if (error?.status === 402 && error?.error?.quote) {
        this.couponQuote.set(error.error.quote);
        this.couponCode.set(error.error.quote.couponCode || code);
        this.notificationService.success(CONSUMER_UX_COPY.messages.couponDiscountApplied);
        return;
      }
      this.notificationService.error(
        error?.error?.message ||
          error?.message ||
          CONSUMER_UX_COPY.messages.couponCouldNotApplyShort,
      );
    } finally {
      this.redeemingCoupon.set(false);
    }
  }

  async payAndUnlock(): Promise<void> {
    const assessment = this.assessment();
    if (!assessment) return;
    if (!this.authService.getToken()) {
      this.notificationService.info(CONSUMER_UX_COPY.messages.signInBeforePayment);
      this.authModalService.openLogin();
      return;
    }

    this.payingAssessment.set(true);
    try {
      const access = await this.paymentService.payAssessment(
        assessment,
        undefined,
        this.couponQuote()?.couponCode,
      );
      if (access) this.assessmentAccess.set(access);
      await this.refreshAccess();
      this.couponQuote.set(null);
      this.notificationService.success(CONSUMER_UX_COPY.messages.testPaymentUnlocked);
    } catch (error: any) {
      this.notificationService.error(
        error?.message || CONSUMER_UX_COPY.messages.paymentCouldNotComplete,
      );
    } finally {
      this.payingAssessment.set(false);
    }
  }

  hasCurrentAnswer(): boolean {
    return this.answers()[this.currentQuestion()] !== undefined;
  }

  hasAllAnswers(): boolean {
    const assessment = this.assessment();
    return Boolean(assessment && this.answeredCount() === assessment.questions.length);
  }

  setViewMode(mode: 'single' | 'all'): void {
    this.clearAutoNextTimer();
    this.viewMode.set(mode);
    if (mode === 'single') {
      const firstUnanswered = this.answers().findIndex((answer) => answer === undefined);
      if (firstUnanswered >= 0) {
        this.currentQuestion.set(firstUnanswered);
      }
    }
  }

  selectAnswer(value: number): void {
    this.selectAnswerAt(this.currentQuestion(), value);

    if (this.viewMode() !== 'single') return;
    this.clearAutoNextTimer();
    const assessment = this.assessment();
    if (!assessment || this.currentQuestion() >= assessment.questions.length - 1) return;

    this.autoNextTimer = setTimeout(() => {
      this.nextQuestion();
    }, 220);
  }

  selectAnswerAt(index: number, value: number): void {
    const next = [...this.answers()];
    next[index] = value;
    this.answers.set(next);
  }

  nextQuestion(): void {
    this.clearAutoNextTimer();
    const assessment = this.assessment();
    if (!assessment || !this.hasCurrentAnswer()) return;
    if (this.currentQuestion() < assessment.questions.length - 1) {
      this.currentQuestion.update((question) => question + 1);
    }
  }

  previousQuestion(): void {
    this.clearAutoNextTimer();
    if (this.currentQuestion() > 0) {
      this.currentQuestion.update((question) => question - 1);
    }
  }

  async completeAssessment(): Promise<void> {
    const assessment = this.assessment();
    if (!assessment || !this.hasAllAnswers()) return;
    if (!this.canStartAssessment()) {
      this.notificationService.warning(this.lockedAssessmentMessage());
      return;
    }

    const answers = this.answers();
    let result: AssessmentResult;
    this.savingResult.set(true);
    try {
      const response = await firstValueFrom(
        this.assessmentAttemptsService.scoreAttempt(assessment.id, answers),
      );
      result = {
        assessmentId: response.result.assessmentId,
        assessmentType: response.result.assessmentType as AssessmentResult['assessmentType'],
        total: response.result.total,
        maxScore: response.result.maxScore,
        level: response.result.level,
        color: response.result.color,
        description: response.result.description,
        suggestions: response.result.suggestions,
        safetyFlag: response.result.safetyFlag,
        completedAt: new Date(),
        answers: [...response.result.answers],
      };
    } catch (error: any) {
      this.notificationService.error(
        error?.error?.message || error?.message || 'Could not calculate your result.',
      );
      return;
    } finally {
      this.savingResult.set(false);
    }

    this.result.set(result);
    this.savePendingResultLocally(assessment, result);

    if (!this.authService.getToken()) {
      this.resultLocked.set(true);
      this.notificationService.info('Sign up or log in to save your test result.');
      this.authModalService.openRegister();
      return;
    }

    void this.saveAndShowResult();
  }

  async saveAndShowResult(): Promise<void> {
    const assessment = this.assessment();
    const result = this.result();
    if (!assessment || !result || this.savingResult()) return;

    this.savingResult.set(true);
    try {
      const response = await firstValueFrom(
        this.assessmentAttemptsService.saveAttempt({
          assessmentId: assessment.id,
          answers: result.answers,
          source: 'direct-test',
          entryPage: typeof window === 'undefined' ? undefined : window.location.href,
          completedAt: result.completedAt.toISOString(),
        }),
      );
      this.savedAttempt.set({
        id: response.attempt.id,
        retakeNumber: response.attempt.retakeNumber,
      });
      this.clearPendingResult();
      this.resultLocked.set(false);
      this.showResults.set(true);
      void this.loadMatchingProviders();
      this.notificationService.success('Your test result is saved.');
    } catch (error: any) {
      this.notificationService.error(
        error?.error?.message || error?.message || 'Could not save your result. Please try again.',
      );
    } finally {
      this.savingResult.set(false);
    }
  }

  recommendationQuery(kind: 'exercises' | 'tips' | 'articles') {
    const assessment = this.assessment();
    const result = this.result();
    if (!assessment || !result) return {};

    const ids =
      kind === 'exercises'
        ? getExerciseRecommendations(assessment.id, result.total)
        : kind === 'tips'
          ? getLifestyleTipRecommendations(assessment.id, result.total)
          : getArticleRecommendations(assessment.id, result.total);

    return ids.length
      ? {
          recommended: ids.join(','),
          assessment: assessment.type,
          score: result.total,
          level: result.level,
        }
      : {};
  }

  humanResultTitle(): string {
    const result = this.result();
    if (!result) return 'A snapshot, not a label';
    const level = result.level.toLowerCase();
    if (this.isHighResultLevel(level)) return 'Your system may be carrying a lot right now';
    if (this.isModerateResultLevel(level)) return 'There may be a pattern worth supporting';
    if (this.isLowResultLevel(level)) return 'You may be doing okay, with some signals to notice';
    return 'A snapshot of how things feel lately';
  }

  humanResultCopy(): string {
    const assessment = this.assessment();
    const result = this.result();
    if (!assessment || !result) return '';
    const level = result.level.toLowerCase();
    const concern = assessment.category || assessment.type || 'emotional wellness';
    if (this.isHighResultLevel(level)) {
      return `Your ${concern} score suggests things may feel intense or hard to manage. This does not define you, and it is not a diagnosis — it simply means support may be useful sooner rather than later.`;
    }
    if (this.isModerateResultLevel(level)) {
      return `Your ${concern} score suggests this concern may be affecting your days enough to deserve attention. A calm conversation can help you understand what is happening and what to try next.`;
    }
    if (this.isLowResultLevel(level)) {
      return `Your ${concern} score looks lower right now. Still, if something feels heavy, confusing, or repetitive, you can use this as an early signal and get gentle support.`;
    }
    return result.description;
  }

  resultActionTitle(): string {
    const result = this.result();
    if (!result) return 'Choose one next step';
    const level = result.level.toLowerCase();
    if (result.safetyFlag) return 'Speak to someone safe now';
    if (this.isHighResultLevel(level)) return 'Book or start support today';
    if (this.isModerateResultLevel(level)) return 'Try voice/chat or book a slot';
    if (this.isLowResultLevel(level)) return 'Use self-care tools or a light check-in';
    return 'Choose one simple next step';
  }

  resultActionCopy(): string {
    const result = this.result();
    if (!result) return '';
    const level = result.level.toLowerCase();
    if (result.safetyFlag) {
      return 'If there is any risk of harm, contact emergency help first. If you are physically safe, use Hope Hub to connect with support and share this result.';
    }
    if (this.isHighResultLevel(level)) {
      return 'A planned session or live support is better than trying to carry this alone. Pick the mode that feels easiest: chat, voice, or video.';
    }
    if (this.isModerateResultLevel(level)) {
      return 'Start small. A short private conversation, matching provider, or guided exercise can help you turn the result into a practical next step.';
    }
    if (this.isLowResultLevel(level)) {
      return 'You can save this result, retake later, and use exercises or lifestyle tips. If your experience feels worse than the score, choose support anyway.';
    }
    return 'Use the suggestions below, or connect with a provider if you want help interpreting this result.';
  }

  resultSafetyTitle(): string {
    return this.result()?.safetyFlag ? 'Use urgent support first' : 'This is not emergency care';
  }

  resultSafetyCopy(): string {
    if (this.result()?.safetyFlag) {
      return 'If you may harm yourself or feel unsafe, call local emergency services now. In India, Tele MANAS is available at 14416.';
    }
    return 'Hope Hub can support reflection, coping, and connection. If there is immediate danger or medical emergency, use local emergency services first.';
  }

  async connectFromResult(mode: ConnectOptionMode): Promise<void> {
    const queryParams = this.assessmentConnectQueryParams(mode);
    this.saveResultPreference(mode);
    this.liveFallback.set(null);
    if (mode === 'book') {
      await this.router.navigate(CONSUMER_ROUTES.links.bookSupport, { queryParams });
      return;
    }

    const assessment = this.assessment();
    const result = this.result();
    try {
      const response = await firstValueFrom(
        this.bookingService.quickTalkProviders({
          q: [assessment?.title, assessment?.type, assessment?.category, result?.level]
            .filter(Boolean)
            .join(' '),
          concern: assessment?.category || assessment?.type || '',
          mode,
        }),
      );
      const provider = response.providers?.[0];
      if (provider) {
        await this.liveConnectAction.connect(provider, mode, { fallbackQueryParams: queryParams });
        return;
      }
    } catch {
      // Soft fallback below keeps the user moving.
    }
    this.notificationService.info(CONSUMER_UX_COPY.messages.noLiveExpertBook);
    this.liveFallback.set({ mode, queryParams });
  }

  async connectMatchedProvider(provider: HopeHubProvider, mode: ConnectOptionMode): Promise<void> {
    const queryParams = this.assessmentConnectQueryParams(mode);
    this.saveResultPreference(mode, provider.id);
    await this.liveConnectAction.connect(provider, mode, { fallbackQueryParams: queryParams });
  }

  dismissLiveFallback(): void {
    this.liveFallback.set(null);
  }

  assessmentCareTeamQueryParams(): Record<string, unknown> {
    const assessment = this.assessment();
    const result = this.result();
    return {
      concern: assessment?.category || assessment?.type || '',
      q: [assessment?.title, result?.level].filter(Boolean).join(' '),
    };
  }

  private async loadMatchingProviders(): Promise<void> {
    const assessment = this.assessment();
    const result = this.result();
    if (!assessment || !result) return;

    this.matchingProvidersLoading.set(true);
    try {
      const response = await firstValueFrom(
        this.bookingService.providers({
          q: [assessment.title, assessment.type, result.level].filter(Boolean).join(' '),
          concern: assessment.category || assessment.type || '',
          pageSize: 3,
          autoMatchOnly: true,
        }),
      );
      this.matchingProviders.set(response.providers.slice(0, 3));
    } catch {
      this.matchingProviders.set([]);
    } finally {
      this.matchingProvidersLoading.set(false);
    }
  }

  private saveResultPreference(mode: ConnectOptionMode, providerId = ''): void {
    const assessment = this.assessment();
    const result = this.result();
    const selectedMode = mode === 'book' ? 'voice' : mode;
    this.preferences.update({
      mode: selectedMode,
      providerId,
      assessmentId: assessment?.id || '',
      concern: assessment?.category || assessment?.type || '',
      serviceName: assessment ? `${assessment.title} support` : '',
    });
  }

  private isHighResultLevel(level: string): boolean {
    return /high|severe|very|poor|critical|risk|intense/.test(level);
  }

  private isModerateResultLevel(level: string): boolean {
    return /moderate|medium|elevated|mild|some/.test(level);
  }

  private isLowResultLevel(level: string): boolean {
    return /low|minimal|normal|healthy|good|mild/.test(level);
  }

  private assessmentConnectQueryParams(mode: ConnectOptionMode) {
    const assessment = this.assessment();
    const result = this.result();
    const selectedMode = mode === 'book' ? 'voice' : mode;
    const sessionMode = consumerSessionModeFor(selectedMode);
    return {
      serviceName: `${assessment?.title || 'Assessment'} support`,
      concernCategory: assessment?.category || assessment?.type || '',
      message: result
        ? `I completed ${assessment?.title || 'a Hope Hub test'} and got ${result.level} (${result.total}/${result.maxScore}). I want support with this.`
        : '',
      mode: selectedMode,
      sessionMode,
      assessmentId: assessment?.id || '',
      assessmentLevel: result?.level || '',
      source: `assessment-result-${selectedMode}`,
    };
  }

  openLogin(): void {
    this.authModalService.openLogin();
  }

  openRegister(): void {
    this.authModalService.openRegister();
  }

  retake(): void {
    const assessment = this.assessment();
    if (!assessment) return;
    this.answers.set(new Array(assessment.questions.length).fill(undefined));
    this.currentQuestion.set(0);
    this.viewMode.set('single');
    this.result.set(null);
    this.showResults.set(false);
    this.resultLocked.set(false);
    this.savedAttempt.set(null);
    this.clearPendingResult();
  }

  private clearAutoNextTimer(): void {
    if (!this.autoNextTimer) return;
    clearTimeout(this.autoNextTimer);
    this.autoNextTimer = null;
  }

  private async refreshAccess(): Promise<void> {
    const assessment = this.assessment();
    if (!assessment) return;
    const access = await firstValueFrom(this.assessmentDefinitionService.access(assessment.id));
    if (access) this.assessmentAccess.set(access);
  }

  private savePendingResultLocally(assessment: AssessmentConfig, result: AssessmentResult): void {
    if (typeof sessionStorage === 'undefined') return;
    sessionStorage.setItem(
      this.pendingStorageKey,
      JSON.stringify({
        assessmentId: assessment.id,
        answers: result.answers,
        result: { ...result, completedAt: result.completedAt.toISOString() },
        savedAt: new Date().toISOString(),
      }),
    );
  }

  private restorePendingResult(assessmentId: string): void {
    if (typeof sessionStorage === 'undefined' || this.authService.getToken()) return;
    const raw = sessionStorage.getItem(this.pendingStorageKey);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as {
        assessmentId: string;
        answers: number[];
        result: AssessmentResult & { completedAt: string };
        savedAt: string;
      };
      const isFresh = Date.now() - new Date(parsed.savedAt).getTime() < 60 * 60 * 1000;
      if (!isFresh || parsed.assessmentId !== assessmentId) return;

      this.answers.set(parsed.answers);
      this.result.set({ ...parsed.result, completedAt: new Date(parsed.result.completedAt) });
      this.resultLocked.set(true);
    } catch {
      this.clearPendingResult();
    }
  }

  private clearPendingResult(): void {
    if (typeof sessionStorage === 'undefined') return;
    sessionStorage.removeItem(this.pendingStorageKey);
  }
}

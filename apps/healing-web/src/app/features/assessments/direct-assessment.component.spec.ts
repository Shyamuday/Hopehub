import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import {
  AssessmentCategory,
  AssessmentConfig,
  AssessmentType,
} from '../../core/models/assessment.model';
import { AssessmentAttemptsService } from '../../core/services/assessment-attempts.service';
import { AssessmentDefinitionService } from '../../core/services/assessment-definition.service';
import { AuthModalService } from '../../core/services/auth-modal.service';
import { AuthService } from '../../core/services/auth.service';
import { BookingService } from '../../core/services/booking.service';
import { ConsumerFlowPreferencesService } from '../../core/services/consumer-flow-preferences.service';
import { LiveConnectActionService } from '../../core/services/live-connect-action.service';
import { NotificationService } from '../../core/services/notification.service';
import { PaymentService } from '../../core/services/payment.service';
import { DirectAssessmentComponent } from './direct-assessment.component';

describe('DirectAssessmentComponent', () => {
  const assessment: AssessmentConfig = {
    id: 'anxiety-test',
    type: AssessmentType.GAD7,
    category: AssessmentCategory.ANXIETY,
    title: 'Anxiety Assessment',
    description: 'A short anxiety check.',
    instructions: 'Choose one answer.',
    questions: [{ id: 1, text: 'How are you feeling?' }],
    responseOptions: [{ value: 2, label: 'Often' }],
    scoring: [],
    disclaimer: 'This is not a diagnosis.',
    emergencyHelplines: [],
    duration: '1 minute',
    access: { accessMode: 'FREE', canAccess: true },
  };

  let component: DirectAssessmentComponent;
  let router: { navigate: ReturnType<typeof vi.fn> };
  let authModal: { openLogin: ReturnType<typeof vi.fn>; openRegister: ReturnType<typeof vi.fn> };
  let preferences: { read: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    sessionStorage.clear();
    router = { navigate: vi.fn().mockResolvedValue(true) };
    authModal = { openLogin: vi.fn(), openRegister: vi.fn() };
    preferences = { read: vi.fn(() => ({})), update: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { data: {}, paramMap: { get: vi.fn(() => null) } },
          },
        },
        { provide: Router, useValue: router },
        {
          provide: AuthService,
          useValue: { authState$: of({ isAuthenticated: false }), getToken: vi.fn(() => null) },
        },
        { provide: AuthModalService, useValue: authModal },
        {
          provide: AssessmentAttemptsService,
          useValue: {
            scoreAttempt: vi.fn(() =>
              of({
                result: {
                  assessmentId: assessment.id,
                  assessmentType: assessment.type,
                  category: assessment.category,
                  title: assessment.title,
                  version: '1',
                  total: 2,
                  maxScore: 3,
                  level: 'Moderate',
                  color: 'amber',
                  description: 'Some anxiety symptoms may be present.',
                  suggestions: ['Talk with someone you trust.'],
                  safetyFlag: false,
                  answers: [2],
                },
              }),
            ),
            saveAttempt: vi.fn(),
          },
        },
        {
          provide: AssessmentDefinitionService,
          useValue: { get: vi.fn(), access: vi.fn(), redeemCoupon: vi.fn() },
        },
        {
          provide: BookingService,
          useValue: { providers: vi.fn(() => of({ providers: [] })), quickTalkProviders: vi.fn() },
        },
        {
          provide: NotificationService,
          useValue: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
        },
        { provide: PaymentService, useValue: { payAssessment: vi.fn() } },
        { provide: LiveConnectActionService, useValue: { connect: vi.fn() } },
        { provide: ConsumerFlowPreferencesService, useValue: preferences },
      ],
    });

    component = TestBed.runInInjectionContext(() => new DirectAssessmentComponent());
    component.assessment.set(assessment);
    component.assessmentAccess.set(assessment.access ?? null);
    component.answers.set([2]);
  });

  it('shows a guest result immediately without opening authentication', async () => {
    await component.completeAssessment();

    expect(component.showResults()).toBe(true);
    expect(component.resultLocked()).toBe(true);
    expect(component.result()?.level).toBe('Moderate');
    expect(authModal.openLogin).not.toHaveBeenCalled();
    expect(authModal.openRegister).not.toHaveBeenCalled();
  });

  it('carries the result into call booking by default', async () => {
    await component.completeAssessment();
    await component.connectFromResult('book');

    expect(preferences.update).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'voice', concern: AssessmentCategory.ANXIETY }),
    );
    expect(router.navigate).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({
        queryParams: expect.objectContaining({
          concernCategory: AssessmentCategory.ANXIETY,
          mode: 'voice',
          assessmentId: assessment.id,
          assessmentLevel: 'Moderate',
          source: 'assessment-result-voice',
        }),
      }),
    );
  });
});

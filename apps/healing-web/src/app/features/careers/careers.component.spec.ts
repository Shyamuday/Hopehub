import { HttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { LeadService } from '../../core/services';
import { CareersComponent } from './careers.component';

describe('CareersComponent', () => {
  let component: CareersComponent;
  let fixture: ComponentFixture<CareersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CareersComponent],
      providers: [
        provideRouter([]),
        {
          provide: HttpClient,
          useValue: {
            get: vi.fn().mockReturnValue(of({ roles: [] })),
          },
        },
        {
          provide: LeadService,
          useValue: {
            getListenerScreeningQuestionSet: vi.fn().mockReturnValue(
              of({
                questionSet: {
                  id: 'listener-screening',
                  title: 'Listener safety test',
                  version: '1',
                  passScore: 1,
                  questions: [],
                },
              }),
            ),
            sendTelegramAdminApplication: vi.fn().mockReturnValue(of(true)),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CareersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('offers a public Telegram community admin pathway', () => {
    expect(fixture.nativeElement.textContent).toContain('Telegram community admin');
    expect(fixture.nativeElement.textContent).toContain(
      'You do not need an existing Hope Hub account to apply.',
    );
  });

  it('groups the care openings into three main pathways before the specific role', () => {
    expect(component.careerPathways.map((pathway) => pathway.value)).toEqual([
      'PROFESSIONAL_CARE',
      'EMOTIONAL_LISTENER',
      'COACH_MENTOR',
    ]);
    expect(component.rolesForSelectedPathway().map((role) => role.value)).toEqual([
      'MENTAL_WELLNESS_PROFESSIONAL',
      'QUALIFIED_COUNSELLOR',
    ]);

    component.selectPathway('COACH_MENTOR');

    expect(component.selectedTrack()).toBe('COACH_MENTOR');
    expect(component.rolesForSelectedPathway().map((role) => role.value)).toEqual([
      'NLP_COACH',
      'LIFE_COACH',
      'MEDITATION_BREATHWORK_GUIDE',
      'CAREER_STUDY_MENTOR',
    ]);
  });

  it('shows the Telegram admin application inside careers when selected', () => {
    component.successMessage.set('Old success');
    component.errorMessage.set('Old error');

    component.selectApplicationKind('TELEGRAM_ADMIN');
    fixture.detectChanges();

    expect(component.applicationKind()).toBe('TELEGRAM_ADMIN');
    expect(component.successMessage()).toBe('');
    expect(component.errorMessage()).toBe('');
    expect(fixture.nativeElement.textContent).toContain('Become a Hope Hub Community Admin');
    expect(fixture.nativeElement.textContent).toContain('Telegram username');
    expect(fixture.nativeElement.textContent).not.toContain('← Telegram Hub');
  });

  it('opens a shared Telegram admin Careers link directly on its form', () => {
    component.applyCareerDeepLink('tgadmin');
    fixture.detectChanges();

    expect(component.applicationKind()).toBe('TELEGRAM_ADMIN');
    expect(fixture.nativeElement.textContent).toContain('Become a Hope Hub Community Admin');
  });

  it('opens shared pathway and specific-role links with the correct form selected', () => {
    component.applyCareerDeepLink('listener');
    expect(component.selectedPathway()).toBe('EMOTIONAL_LISTENER');
    expect(component.applicationForm.controls.careTeamType.value).toBe(
      'PSYCHOLOGY_STUDENT_VOLUNTEER',
    );

    component.applyCareerDeepLink('life-coach');
    expect(component.applicationKind()).toBe('CARE_TEAM');
    expect(component.selectedPathway()).toBe('COACH_MENTOR');
    expect(component.applicationForm.controls.careTeamType.value).toBe('LIFE_COACH');
    expect(component.selectedTrack()).toBe('COACH_MENTOR');
  });

  it('uses clinical credential fields for professional-care applications', () => {
    component.selectTrack('MENTAL_WELLNESS_PROFESSIONAL');
    fixture.detectChanges();

    expect(component.isClinicalCareRole()).toBe(true);
    expect(component.applicationForm.controls.registrationDetails.hasError('required')).toBe(true);
    expect(component.applicationForm.controls.agreesToNonClinicalRole.hasError('required')).toBe(
      false,
    );
    expect(fixture.nativeElement.textContent).toContain('Professional credential / registration');
  });

  it('uses coaching fields and a non-clinical agreement for coach applications', () => {
    component.selectTrack('LIFE_COACH');
    fixture.detectChanges();

    expect(component.isCoachMentorRole()).toBe(true);
    expect(component.selectedTrack()).toBe('COACH_MENTOR');
    expect(component.applicationForm.controls.registrationDetails.hasError('required')).toBe(false);
    expect(component.applicationForm.controls.agreesToNonClinicalRole.hasError('required')).toBe(
      true,
    );
    expect(fixture.nativeElement.textContent).toContain('Coaching training / certification');
    expect(fixture.nativeElement.textContent).toContain('Relevant coaching experience');
    expect(component.specializationOptionsForRole()).toEqual(
      expect.arrayContaining([expect.objectContaining({ value: 'Life direction' })]),
    );
    expect(fixture.nativeElement.textContent).not.toContain(
      'Professional credential / registration',
    );
  });

  it('uses practice-specific choices for meditation and breathwork guides', () => {
    component.selectTrack('MEDITATION_BREATHWORK_GUIDE');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Meditation / breathwork training');
    expect(fixture.nativeElement.textContent).toContain('Experience guiding practices');
    expect(component.specializationOptionsForRole()).toEqual(
      expect.arrayContaining([expect.objectContaining({ value: 'Breathwork' })]),
    );
  });

  it('uses lived-experience and listener safety fields for peer-support applications', () => {
    component.selectTrack('PEER_SUPPORT_VOLUNTEER');
    fixture.detectChanges();

    expect(component.isListenerTrack()).toBe(true);
    expect(component.applicationForm.controls.qualification.hasError('required')).toBe(false);
    expect(component.applicationForm.controls.livedExperienceSummary.hasError('required')).toBe(
      true,
    );
    expect(fixture.nativeElement.textContent).toContain('Relevant support or lived experience');
    expect(fixture.nativeElement.textContent).toContain('Listener safety test');
  });
});

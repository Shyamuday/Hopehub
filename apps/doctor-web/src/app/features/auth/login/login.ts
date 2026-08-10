import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { form, FormField, required } from '@angular/forms/signals';
import { DEFAULT_AUTHED_ROUTE } from '../../../core/constants/app-routes.constants';
import { Auth } from '../../../core/services/auth';
import { AppButtonComponent } from '../../../shared/ui/app-button.component';

type ProviderSignupKind = 'HOMEOPATHY' | 'HOPE_HUB';
type HopeHubProviderGroup = 'PSYCHOLOGIST' | 'LIFE_COACH' | 'PEER_SUPPORT';
type HopeHubCareTeamType =
  | 'MENTAL_WELLNESS_PROFESSIONAL'
  | 'QUALIFIED_COUNSELLOR'
  | 'PSYCHOLOGY_STUDENT_VOLUNTEER'
  | 'PEER_SUPPORT_VOLUNTEER'
  | 'NLP_COACH'
  | 'LIFE_COACH'
  | 'MEDITATION_BREATHWORK_GUIDE'
  | 'CAREER_STUDY_MENTOR';

@Component({
  selector: 'app-login',
  imports: [FormField, AppButtonComponent],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  mode = signal<'signin' | 'signup'>('signin');
  loginMode = signal<'otp' | 'password'>('otp');
  otp = signal('');
  otpSent = signal(false);
  otpSentTo = signal('');
  showPassword = signal(false);
  showEnrollPassword = signal(false);
  showConfirmPassword = signal(false);
  readonly providerTypeOptions: Array<{
    value: ProviderSignupKind;
    label: string;
    helper: string;
  }> = [
    {
      value: 'HOMEOPATHY',
      label: 'Homeopathy provider',
      helper: 'For clinic doctors, specialists, interns, and homeopathy consultants.',
    },
    {
      value: 'HOPE_HUB',
      label: 'Hope Hub provider',
      helper: 'For emotional support, counselling, coaching, and mental-wellness sessions.',
    },
  ];
  readonly hopeHubGroupOptions: Array<{
    value: HopeHubProviderGroup;
    label: string;
    helper: string;
  }> = [
    {
      value: 'PSYCHOLOGIST',
      label: 'Psychologist / counsellor',
      helper: 'For qualified mental-health professionals and counsellors.',
    },
    {
      value: 'LIFE_COACH',
      label: 'Life coach / guide',
      helper: 'For life coaching, NLP, meditation, breathwork, career, and study support.',
    },
    {
      value: 'PEER_SUPPORT',
      label: 'Peer support listener',
      helper: 'For trained listeners who support users through safe active listening.',
    },
  ];
  private readonly careTeamOptionsByGroup: Record<
    HopeHubProviderGroup,
    Array<{ value: HopeHubCareTeamType; label: string; helper: string }>
  > = {
    PSYCHOLOGIST: [
      {
        value: 'MENTAL_WELLNESS_PROFESSIONAL',
        label: 'Psychologist / mental wellness professional',
        helper: 'For psychologists and experienced mental-health practitioners.',
      },
      {
        value: 'QUALIFIED_COUNSELLOR',
        label: 'Qualified counsellor',
        helper: 'For certified counsellors offering structured emotional support.',
      },
    ],
    LIFE_COACH: [
      {
        value: 'LIFE_COACH',
        label: 'Life coach',
        helper: 'For goal, confidence, and life-direction support.',
      },
      {
        value: 'NLP_COACH',
        label: 'NLP coach',
        helper: 'For NLP-based coaching and habit or mindset support.',
      },
      {
        value: 'MEDITATION_BREATHWORK_GUIDE',
        label: 'Meditation / breathwork guide',
        helper: 'For guided calming, grounding, meditation, and breathwork sessions.',
      },
      {
        value: 'CAREER_STUDY_MENTOR',
        label: 'Career / study mentor',
        helper: 'For academic, exam, career, and study-stress support.',
      },
    ],
    PEER_SUPPORT: [
      {
        value: 'PEER_SUPPORT_VOLUNTEER',
        label: 'Peer emotional support listener',
        helper: 'For trained peer listeners who support users through active listening.',
      },
      {
        value: 'PSYCHOLOGY_STUDENT_VOLUNTEER',
        label: 'Psychology student emotional support listener',
        helper: 'For student listeners joining Hope Hub after listener screening.',
      },
    ],
  };

  readonly signInModel = signal({
    email: '',
    password: '',
  });
  readonly signInForm = form(this.signInModel, (schema) => {
    required(schema.email, { message: 'Email is required' });
    required(schema.password, { message: 'Password is required' });
  });

  readonly enrollModel = signal({
    name: '',
    mobile: '',
    providerType: 'HOMEOPATHY' as ProviderSignupKind,
    hopeHubGroup: 'PSYCHOLOGIST' as HopeHubProviderGroup,
    careTeamType: 'MENTAL_WELLNESS_PROFESSIONAL' as HopeHubCareTeamType,
    specialty: '',
    registrationNo: '',
    confirmPassword: '',
  });
  readonly enrollForm = form(this.enrollModel, (schema) => {
    required(schema.name, { message: 'Name is required' });
    required(schema.specialty, { message: 'Specialty is required' });
  });

  error = signal('');
  message = signal('');
  submitting = signal(false);

  isHealingHubSignup(): boolean {
    return this.enrollModel().providerType === 'HOPE_HUB';
  }

  selectedProviderHelper(): string {
    const selected = this.enrollModel().providerType;
    return this.providerTypeOptions.find((option) => option.value === selected)?.helper || '';
  }

  selectedHopeHubGroupHelper(): string {
    const selected = this.enrollModel().hopeHubGroup;
    return this.hopeHubGroupOptions.find((option) => option.value === selected)?.helper || '';
  }

  careTeamTypeOptions(): Array<{ value: HopeHubCareTeamType; label: string; helper: string }> {
    return this.careTeamOptionsByGroup[this.enrollModel().hopeHubGroup];
  }

  selectedCareTeamTypeHelper(): string {
    const selected = this.enrollModel().careTeamType;
    return this.careTeamTypeOptions().find((option) => option.value === selected)?.helper || '';
  }

  specialtyLabel(): string {
    return this.isHealingHubSignup() ? 'Specialization / support focus' : 'Specialty';
  }

  specialtyPlaceholder(): string {
    if (!this.isHealingHubSignup()) return 'e.g. chronic care, pediatrics, skin, kidney care';
    const group = this.enrollModel().hopeHubGroup;
    if (group === 'LIFE_COACH') return 'e.g. confidence coaching, breathwork, career stress';
    if (group === 'PEER_SUPPORT') return 'e.g. loneliness, exam stress, relationship venting';
    return 'e.g. anxiety support, relationship stress, student counselling';
  }

  onProviderTypeChange(value: ProviderSignupKind): void {
    this.enrollModel.update((current) => ({
      ...current,
      providerType: value,
      ...(value === 'HOPE_HUB'
        ? {
            hopeHubGroup: current.hopeHubGroup || 'PSYCHOLOGIST',
            careTeamType: current.careTeamType || 'MENTAL_WELLNESS_PROFESSIONAL',
          }
        : {}),
    }));
  }

  onHopeHubGroupChange(value: HopeHubProviderGroup): void {
    const defaultCareTeamType = this.careTeamOptionsByGroup[value][0].value;
    this.enrollModel.update((current) => ({
      ...current,
      hopeHubGroup: value,
      careTeamType: defaultCareTeamType,
    }));
  }

  setLoginMode(mode: 'otp' | 'password'): void {
    this.loginMode.set(mode);
    this.error.set('');
    this.message.set('');
    if (mode === 'password') {
      this.otp.set('');
      this.otpSent.set(false);
      this.otpSentTo.set('');
    }
  }

  canSignup(): boolean {
    const { password } = this.signInModel();
    const enroll = this.enrollModel();
    return !!(
      !this.signInForm().invalid() &&
      !this.enrollForm().invalid() &&
      password.length >= 8 &&
      password === enroll.confirmPassword
    );
  }

  private navigateAfterLogin(): void {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    void this.router.navigateByUrl(
      returnUrl && returnUrl.startsWith('/') ? returnUrl : `/${DEFAULT_AUTHED_ROUTE}`,
    );
  }

  async submit() {
    if (this.loginMode() === 'otp') {
      await this.submitOtp();
      return;
    }

    if (this.signInForm().invalid()) return;
    const { email, password } = this.signInModel();
    this.error.set('');
    this.message.set('');
    this.submitting.set(true);
    try {
      const result = await this.auth.login(email, password);
      if (!result.ok) {
        this.error.set(result.message);
        return;
      }
      void this.navigateAfterLogin();
    } finally {
      this.submitting.set(false);
    }
  }

  async sendOtp() {
    const { email } = this.signInModel();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      this.error.set('Email is required');
      return;
    }
    this.error.set('');
    this.message.set('');
    this.submitting.set(true);
    try {
      const result = await this.auth.requestOtp(normalizedEmail);
      if (!result.ok) {
        this.error.set(result.message);
        return;
      }
      this.otp.set('');
      this.otpSent.set(true);
      this.otpSentTo.set(normalizedEmail);
      this.message.set('OTP sent to your email.');
    } finally {
      this.submitting.set(false);
    }
  }

  private async submitOtp() {
    const { email } = this.signInModel();
    const normalizedEmail = email.trim().toLowerCase();
    const otp = this.otp().trim();
    if (!normalizedEmail) {
      this.error.set('Email is required');
      return;
    }
    if (!this.otpSent() || this.otpSentTo() !== normalizedEmail) {
      this.error.set('Send OTP to this email first.');
      return;
    }
    if (otp.length < 4) {
      this.error.set('Enter the OTP sent to your email.');
      return;
    }
    this.error.set('');
    this.message.set('');
    this.submitting.set(true);
    try {
      const result = await this.auth.loginWithOtp(normalizedEmail, otp);
      if (!result.ok) {
        this.error.set(result.message);
        return;
      }
      void this.navigateAfterLogin();
    } finally {
      this.submitting.set(false);
    }
  }

  async enroll() {
    if (!this.canSignup()) return;
    const { email, password } = this.signInModel();
    const { name, mobile, providerType, careTeamType, specialty, registrationNo } =
      this.enrollModel();
    this.error.set('');
    this.message.set('');
    this.submitting.set(true);
    try {
      const result = await this.auth.enrollDoctor({
        name,
        email,
        mobile: mobile || undefined,
        password,
        specialty,
        registrationNo: registrationNo || undefined,
        careTeamType: providerType === 'HOPE_HUB' ? careTeamType : undefined,
      });

      if (!result.ok) {
        this.error.set(result.message);
        return;
      }

      this.mode.set('signin');
      this.message.set(result.message);
    } finally {
      this.submitting.set(false);
    }
  }
}

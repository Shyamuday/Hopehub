import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { form, FormField, required } from '@angular/forms/signals';
import { DEFAULT_AUTHED_ROUTE } from '../../../core/constants/app-routes.constants';
import { PH_PROVIDER_LANGUAGE } from '../../../core/constants/provider-language.constants';
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

  mode = signal<'signin' | 'signup'>('signup');
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
    // Homeopathy signup is paused for now. Keep this here so we can re-enable
    // the path quickly when the provider onboarding split is ready again.
    // {
    //   value: 'HOMEOPATHY',
    //   label: 'Homeopathy provider',
    //   helper: 'For homeopathy consultants, specialists, interns, and clinic care providers.',
    // },
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
  private readonly defaultCareTeamTypeByGroup: Record<HopeHubProviderGroup, HopeHubCareTeamType> = {
    PSYCHOLOGIST: 'MENTAL_WELLNESS_PROFESSIONAL',
    LIFE_COACH: 'LIFE_COACH',
    PEER_SUPPORT: 'PEER_SUPPORT_VOLUNTEER',
  };
  private readonly defaultSpecialtyByGroup: Record<HopeHubProviderGroup, string> = {
    PSYCHOLOGIST: 'Psychologist / counsellor',
    LIFE_COACH: 'Life coach / guide',
    PEER_SUPPORT: 'Peer emotional support listener',
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
    providerType: 'HOPE_HUB' as ProviderSignupKind,
    hopeHubGroup: 'PSYCHOLOGIST' as HopeHubProviderGroup,
    careTeamType: 'MENTAL_WELLNESS_PROFESSIONAL' as HopeHubCareTeamType,
    careTeamTypes: ['MENTAL_WELLNESS_PROFESSIONAL'] as HopeHubCareTeamType[],
    specialty: '',
    confirmPassword: '',
  });
  readonly enrollForm = form(this.enrollModel, (schema) => {
    required(schema.name, { message: 'Name is required' });
  });

  error = signal('');
  message = signal('');
  submitting = signal(false);
  readonly phLanguage = PH_PROVIDER_LANGUAGE;

  isHealingHubSignup(): boolean {
    return true;
  }

  selectedProviderHelper(): string {
    const selected = this.enrollModel().providerType;
    return this.providerTypeOptions.find((option) => option.value === selected)?.helper || '';
  }

  selectedHopeHubGroupHelper(): string {
    const selected = this.enrollModel().hopeHubGroup;
    return this.hopeHubGroupOptions.find((option) => option.value === selected)?.helper || '';
  }

  onProviderTypeChange(_value: ProviderSignupKind): void {
    this.enrollModel.update((current) => ({
      ...current,
      providerType: 'HOPE_HUB',
      hopeHubGroup: current.hopeHubGroup || 'PSYCHOLOGIST',
      careTeamType: current.careTeamType || 'MENTAL_WELLNESS_PROFESSIONAL',
      careTeamTypes: current.careTeamTypes?.length
        ? current.careTeamTypes
        : ['MENTAL_WELLNESS_PROFESSIONAL'],
    }));
  }

  onHopeHubGroupChange(value: HopeHubProviderGroup): void {
    const defaultCareTeamType = this.defaultCareTeamTypeForGroup(value);
    this.enrollModel.update((current) => ({
      ...current,
      hopeHubGroup: value,
      careTeamType: defaultCareTeamType,
      careTeamTypes: [defaultCareTeamType],
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

  async loginWithGoogle() {
    this.error.set('');
    this.message.set('');
    this.submitting.set(true);
    try {
      const result = await this.auth.loginWithGoogle();
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
    const { name, mobile, hopeHubGroup } = this.enrollModel();
    const defaultCareTeamType = this.defaultCareTeamTypeForGroup(hopeHubGroup);
    this.error.set('');
    this.message.set('');
    this.submitting.set(true);
    try {
      const result = await this.auth.enrollDoctor({
        name,
        email,
        mobile: mobile || undefined,
        password,
        specialty: this.specialtyForEnrollment(),
        registrationNo: undefined,
        careTeamType: defaultCareTeamType,
        careTeamTypes: [defaultCareTeamType],
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

  private defaultCareTeamTypeForGroup(group: HopeHubProviderGroup): HopeHubCareTeamType {
    return this.defaultCareTeamTypeByGroup[group];
  }

  private specialtyForEnrollment(): string {
    const form = this.enrollModel();
    return this.defaultSpecialtyByGroup[form.hopeHubGroup] || 'Hope Hub Provider';
  }
}

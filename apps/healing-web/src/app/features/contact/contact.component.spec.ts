import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { AuthService, LeadService } from '../../core/services';
import { ContactComponent } from './contact.component';

describe('ContactComponent', () => {
  let component: ContactComponent;
  let fixture: ComponentFixture<ContactComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContactComponent, ReactiveFormsModule, RouterTestingModule],
    }).compileComponents();

    fixture = TestBed.createComponent(ContactComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize direct booking with quick defaults', () => {
    expect(component.contactForm.get('name')?.value).toBe('');
    expect(component.contactForm.get('email')?.value).toBe('');
    expect(component.contactForm.get('phone')?.value).toBe('');
    expect(component.contactForm.get('serviceInterest')?.value).toBe('Mental wellness session');
    expect(component.contactForm.get('urgencyLevel')?.value).toBe('normal');
    expect(component.contactForm.get('preferredTime')?.value).toBe(
      'Earliest available, at least one hour from now',
    );
    expect(component.contactForm.get('concernCategory')?.value).toBe('Depression and anxiety');
    expect(component.contactForm.get('autoMatchProvider')?.value).toBe(false);
    expect(component.contactForm.get('message')?.value).toBe('');
    expect(component.contactForm.get('preferredContact')?.value).toBe('phone');
    expect(component.bookingStep()).toBe(2);
  });

  it('should validate required fields', () => {
    const form = component.contactForm;

    expect(form.get('name')?.hasError('required')).toBeTruthy();
    expect(form.get('email')?.hasError('required')).toBeTruthy();
    expect(form.get('message')?.hasError('required')).toBeFalsy();
    expect(form.get('urgencyLevel')?.hasError('required')).toBeFalsy();
    expect(form.get('preferredContact')?.hasError('required')).toBeFalsy();
  });

  it('should validate email format', () => {
    const emailControl = component.contactForm.get('email');

    emailControl?.setValue('invalid-email');
    expect(emailControl?.hasError('email')).toBeTruthy();

    emailControl?.setValue('valid@email.com');
    expect(emailControl?.hasError('email')).toBeFalsy();
  });

  it('should keep the optional message field valid', () => {
    const messageControl = component.contactForm.get('message');

    messageControl?.setValue('short');
    expect(messageControl?.valid).toBeTruthy();
  });

  it('should keep the user on support until a service is selected', () => {
    component.directBooking.set(false);
    component.bookingStep.set(1);
    component.contactForm.patchValue({ serviceInterest: '' });
    component.goToBookingStep(2);

    expect(component.bookingStep()).toBe(1);
    expect(component.bookingStepError()).toContain('support service');
  });

  it('should require a slot before confirmation', () => {
    component.contactForm.patchValue({ serviceInterest: 'Hope Hub Consultation' });
    component.goToBookingStep(2);
    component.goToBookingStep(3);

    expect(component.bookingStep()).toBe(2);
    expect(component.bookingStepError()).toContain('available time');
  });

  it('should mark all fields as touched when submitting invalid form', () => {
    component.onSubmit();

    expect(component.contactForm.get('name')?.touched).toBeTruthy();
    expect(component.contactForm.get('email')?.touched).toBeTruthy();
    expect(component.contactForm.get('message')?.touched).toBeTruthy();
    expect(component.contactForm.get('preferredContact')?.touched).toBeTruthy();
    expect(component.bookingValidationIssues()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'name', message: 'Name is required.' }),
        expect.objectContaining({ field: 'email', message: 'Email is required.' }),
      ]),
    );
    expect(component.bookingStep()).toBe(3);
  });

  it('maps API validation issues to clear booking field messages', () => {
    const issues = (component as any).readValidationIssues({
      error: {
        message: 'Validation failed',
        issues: [
          {
            code: 'invalid_format',
            path: ['visitorEmail'],
            message: 'Invalid email address',
          },
          {
            code: 'invalid_value',
            path: ['preferredProviderGender'],
            message: 'Invalid option',
          },
        ],
      },
    });

    expect(issues).toEqual([
      { field: 'email', label: 'Email', message: 'Enter a valid email address.' },
      {
        field: 'preferredProviderGender',
        label: 'Provider gender',
        message: 'Choose a listed option or leave provider gender as no preference.',
      },
    ]);
  });

  it('should submit a valid enquiry', async () => {
    const form = component.contactForm;
    const leadService = TestBed.inject(LeadService);
    const sendContactForm = vi.spyOn(leadService, 'sendContactForm').mockReturnValue(of(true));

    form.patchValue({
      name: 'John Doe',
      email: 'john@example.com',
      serviceInterest: '',
      message: 'This is a test message that is long enough',
      preferredContact: 'email',
    });

    expect(form.valid).toBeTruthy();

    await component.onSubmit();

    expect(sendContactForm).toHaveBeenCalledOnce();
    expect(component.showSuccessMessage()).toBeTruthy();
    expect(component.isSubmitting()).toBeFalsy();
  });

  it('saves a guest booking before offering email verification and completes it with OTP', async () => {
    const leadService = TestBed.inject(LeadService);
    const authService = TestBed.inject(AuthService);
    const saveBookingRequest = vi
      .spyOn(leadService, 'saveBookingRequest')
      .mockReturnValue(of({ id: 'lead-1', success: true }));
    const requestOtp = vi.spyOn(authService, 'requestOtp').mockResolvedValue();
    const loginWithOtp = vi.spyOn(authService, 'loginWithOtp').mockResolvedValue({} as any);

    component.contactForm.patchValue({
      name: 'John Doe',
      email: 'john@example.com',
      preferredContact: 'email',
    });
    component.selectedAppointment.set({
      date: new Date(2030, 0, 2),
      time: '10:00 AM',
    });

    await component.onSubmit();

    expect(saveBookingRequest).toHaveBeenCalledOnce();
    expect(requestOtp).not.toHaveBeenCalled();
    expect(component.guestBookingSubmitted()).toBe(true);
    expect(component.guestWebsiteLeadId()).toBe('lead-1');
    expect(component.bookingVerificationState()).toBe('IDLE');

    await component.requestBookingVerification();
    expect(requestOtp).toHaveBeenCalledWith('john@example.com');
    expect(component.bookingVerificationState()).toBe('CODE_SENT');

    const completeSavedBooking = vi
      .spyOn(component as any, 'submitBooking')
      .mockResolvedValue(undefined);
    component.setBookingVerificationCode('123456');
    await component.completeBookingVerification();

    expect(loginWithOtp).toHaveBeenCalledWith('john@example.com', '123456', undefined, 'John Doe');
    expect(completeSavedBooking).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'john@example.com' }),
      expect.objectContaining({ time: '10:00 AM' }),
    );
  });

  it('keeps a direct booking unassigned even if a provider suggestion exists', () => {
    component.matchedProvider.set({ id: 'provider-1', name: 'Suggested provider' } as any);

    expect(component.activeProviderId()).toBe('');
    expect(component.activeProviderName()).toBe('');
    expect(component.selectedSessionProvider()).toBe('');
    expect(component.bookingSummaryItems().some((item) => item.includes('Provider:'))).toBe(false);
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { ContactComponent } from './contact.component';

describe('ContactComponent', () => {
  let component: ContactComponent;
  let fixture: ComponentFixture<ContactComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContactComponent, ReactiveFormsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(ContactComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with empty values', () => {
    expect(component.contactForm.get('name')?.value).toBe('');
    expect(component.contactForm.get('email')?.value).toBe('');
    expect(component.contactForm.get('phone')?.value).toBe('');
    expect(component.contactForm.get('serviceInterest')?.value).toBe('');
    expect(component.contactForm.get('urgencyLevel')?.value).toBe('normal');
    expect(component.contactForm.get('preferredTime')?.value).toBe('');
    expect(component.contactForm.get('message')?.value).toBe('');
    expect(component.contactForm.get('preferredContact')?.value).toBe('whatsapp');
  });

  it('should validate required fields', () => {
    const form = component.contactForm;

    expect(form.get('name')?.hasError('required')).toBeTruthy();
    expect(form.get('email')?.hasError('required')).toBeTruthy();
    expect(form.get('message')?.hasError('required')).toBeTruthy();
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

  it('should validate message minimum length', () => {
    const messageControl = component.contactForm.get('message');

    messageControl?.setValue('short');
    expect(messageControl?.hasError('minlength')).toBeTruthy();

    messageControl?.setValue('This is a longer message that meets the minimum requirement');
    expect(messageControl?.hasError('minlength')).toBeFalsy();
  });

  it('should mark all fields as touched when submitting invalid form', () => {
    component.onSubmit();

    expect(component.contactForm.get('name')?.touched).toBeTruthy();
    expect(component.contactForm.get('email')?.touched).toBeTruthy();
    expect(component.contactForm.get('message')?.touched).toBeTruthy();
    expect(component.contactForm.get('preferredContact')?.touched).toBeTruthy();
  });

  it('should submit form when valid', () => {
    const form = component.contactForm;

    form.patchValue({
      name: 'John Doe',
      email: 'john@example.com',
      message: 'This is a test message that is long enough',
      preferredContact: 'email',
    });

    expect(form.valid).toBeTruthy();

    component.onSubmit();
    expect(component.isSubmitting).toBeTruthy();
  });
});

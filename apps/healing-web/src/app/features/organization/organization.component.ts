import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { BookingService } from '../../core/services/booking.service';

@Component({
  selector: 'app-organization',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './organization.component.html',
  styleUrl: './organization.component.scss',
})
export class OrganizationComponent implements OnInit {
  private readonly bookingService = inject(BookingService);
  private readonly route = inject(ActivatedRoute);

  readonly saving = signal(false);
  readonly success = signal('');
  readonly error = signal('');
  readonly offeringId = signal('');
  readonly offeringSlug = signal('');

  readonly form = {
    organizationName: '',
    organizationType: 'School',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    city: '',
    audienceSize: null as number | null,
    needType: 'Workshop',
    preferredDate: '',
    notes: '',
  };

  readonly organizationTypes = [
    'School',
    'College',
    'Corporate',
    'NGO',
    'Clinic',
    'Community',
    'Other',
  ];
  readonly needTypes = [
    'Workshop',
    'Counselling program',
    'Employee wellness',
    'Student support',
    'Parent session',
    'Crisis support',
    'Custom program',
  ];

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      this.offeringId.set(params['offeringId'] || '');
      this.offeringSlug.set(params['offering'] || '');
    });
  }

  submit(): void {
    if (!this.form.organizationName || !this.form.contactName) {
      this.error.set('Organisation name and contact person are required.');
      return;
    }

    this.saving.set(true);
    this.error.set('');
    this.success.set('');
    this.bookingService
      .createOrganizationLead({
        ...this.form,
        offeringId: this.offeringId(),
        offeringSlug: this.offeringSlug(),
        entryPage: typeof window === 'undefined' ? undefined : window.location.href,
      })
      .subscribe({
        next: () => {
          this.success.set('Request received. Our team will contact you soon.');
          this.saving.set(false);
        },
        error: () => {
          this.error.set('Could not send request. Please try again.');
          this.saving.set(false);
        },
      });
  }
}

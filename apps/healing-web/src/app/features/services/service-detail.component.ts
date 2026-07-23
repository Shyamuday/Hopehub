import { Component, OnInit, signal, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NOTE_CONTENT } from '../../core/constants/note-content.constants';
import { Service } from '../../core/models';
import { ServiceInquiryComponent } from '../../shared/components';
import { SEOService } from '../../core/services';
import { getServiceById } from '../../core/data/services-data';

@Component({
  selector: 'app-service-detail',
  standalone: true,
  imports: [ServiceInquiryComponent],
  templateUrl: './service-detail.component.html',
  styleUrl: './service-detail.component.scss',
})
export class ServiceDetailComponent implements OnInit {
  readonly notes = NOTE_CONTENT;
  service = signal<Service | null>(null);
  loading = signal(true);

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private seoService = inject(SEOService);

  constructor() {
    this.route.params.pipe(takeUntilDestroyed()).subscribe((params: any) => {
      const serviceId = params['id'];
      this.loadService(serviceId);
    });
  }

  ngOnInit() {
    // Component initialization if needed
  }

  goBack() {
    this.router.navigate(['/services']);
  }

  bookService() {
    // Navigate to contact form with service pre-selected
    this.router.navigate(['/contact'], {
      queryParams: { service: this.service()?.name },
    });
  }

  contactForInfo() {
    // Navigate to contact form with inquiry type
    this.router.navigate(['/contact'], {
      queryParams: {
        service: this.service()?.name,
        type: 'inquiry',
      },
    });
  }

  formatPrice(amount: number | undefined, currency: string | undefined): string {
    if (!amount || !currency) return '';

    return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  whoThisIsFor(service: Service): string[] {
    const name = service.name.toLowerCase();

    if (name.includes('breakup')) {
      return [
        'You keep replaying the relationship',
        'No-contact feels difficult',
        'You need closure and steadier daily structure',
      ];
    }
    if (name.includes('anxiety')) {
      return [
        'Your thoughts feel fast or hard to stop',
        'You avoid situations because of fear',
        'You want practical calming tools',
      ];
    }
    if (name.includes('career') || name.includes('study')) {
      return [
        'You feel stuck between choices',
        'Pressure is affecting sleep or focus',
        'You need a small, clear next step',
      ];
    }
    if (name.includes('relationship')) {
      return [
        'Arguments keep repeating',
        'Trust or boundaries feel unclear',
        'You want to communicate without escalating',
      ];
    }
    if (name.includes('sleep')) {
      return [
        'Your mind gets loud at night',
        'You overthink conversations or decisions',
        'You want a calmer evening routine',
      ];
    }
    if (name.includes('family')) {
      return [
        'Family pressure feels heavy',
        'Boundaries are hard to hold',
        'You need help preparing a calmer conversation',
      ];
    }

    return [
      'You need a private space to talk',
      'You want emotional clarity',
      'You want one practical step after the session',
    ];
  }

  sessionFlow(): string[] {
    return [
      'Share what is happening right now',
      'Identify the main pressure point',
      'Practice one calming or clarity tool',
      'Leave with a simple next-step plan',
    ];
  }

  sessionOutcome(): string[] {
    return [
      'A clearer understanding of your concern',
      'One practical coping tool',
      'A next-step plan for the coming days',
    ];
  }

  faqs(service: Service): Array<{ question: string; answer: string }> {
    return [
      {
        question: 'Can I stay anonymous?',
        answer:
          'For community support, Telegram can be used with a display name or username. For paid bookings, basic account and payment details are still needed for confirmation.',
      },
      {
        question: 'Is this therapy or support?',
        answer: `${service.name} is supportive counselling and guidance. If your concern needs clinical diagnosis, emergency care, or specialist treatment, we will suggest the right next step.`,
      },
      {
        question: 'What happens after I submit?',
        answer:
          'Your request is reviewed, the team checks your concern and preferred contact method, then confirms the next step or session details.',
      },
      {
        question: 'Can I use Telegram?',
        answer:
          'Yes. Choose Telegram or the low-identity Telegram preference in the contact form if you are worried about identity reveal.',
      },
      {
        question: 'Is the ₹300 session refundable?',
        answer:
          'Refund or reschedule handling depends on whether the session has already been confirmed or started. Contact the team as early as possible if you need a change.',
      },
      {
        question: 'What if I need urgent help?',
        answer: NOTE_CONTENT.serviceSafety.text,
      },
    ];
  }

  private loadService(serviceId: string) {
    this.loading.set(true);

    setTimeout(() => {
      const foundService = getServiceById(serviceId) || null;
      this.service.set(foundService);
      this.loading.set(false);

      // Update SEO for service page
      if (foundService) {
        this.seoService.updateSEO({
          title: `${foundService.name} - Hope Hub`,
          description: foundService.detailedDescription || foundService.description,
          keywords: [
            foundService.name,
            foundService.category,
            'mental health',
            'counseling',
            'therapy',
          ],
          type: 'website',
          image: foundService.imageUrl,
        });

        // Add service structured data
        this.seoService.addServiceStructuredData({
          name: foundService.name,
          description: foundService.detailedDescription || foundService.description,
          provider: 'Hope Hub',
          areaServed: 'Worldwide',
          serviceType: 'Mental Health Counseling',
        });
      }
    }, 500);
  }
}

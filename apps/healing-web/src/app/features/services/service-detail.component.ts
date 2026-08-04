import { Component, OnInit, signal, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NOTE_CONTENT } from '../../core/constants/note-content.constants';
import { Service, ServiceCategory } from '../../core/models';
import { ServiceInquiryComponent } from '../../shared/components';
import { BookingService, NotificationService, SEOService } from '../../core/services';
import { PublicCommunicationConfigService } from '../../core/services/public-communication-config.service';
import {
  HOPE_HUB_ANALYTICS_EVENTS,
  ProductAnalyticsService,
} from '../../core/services/product-analytics.service';
import {
  HOPE_HUB_SESSION_DISCOUNT_PERCENT,
  HOPE_HUB_SESSION_OFFER_PRICE,
  HOPE_HUB_SESSION_PRICE,
  getServiceById,
} from '../../core/data/services-data';
import {
  HopeHubOffering,
  HopeHubOfferingQuote,
  HopeHubService,
} from '../../core/services/booking.service';

@Component({
  selector: 'app-service-detail',
  standalone: true,
  imports: [ServiceInquiryComponent],
  templateUrl: './service-detail.component.html',
  styleUrl: './service-detail.component.scss',
})
export class ServiceDetailComponent implements OnInit {
  readonly notes = NOTE_CONTENT;
  readonly sessionPrice = HOPE_HUB_SESSION_PRICE;
  readonly sessionOfferPrice = HOPE_HUB_SESSION_OFFER_PRICE;
  readonly sessionDiscountPercent = HOPE_HUB_SESSION_DISCOUNT_PERCENT;
  service = signal<Service | null>(null);
  singleSessionOffer = signal<HopeHubOffering | null>(null);
  singleSessionQuote = signal<HopeHubOfferingQuote | null>(null);
  loading = signal(true);

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private seoService = inject(SEOService);
  private bookingService = inject(BookingService);
  private publicConfig = inject(PublicCommunicationConfigService);
  private notificationService = inject(NotificationService);
  private productAnalytics = inject(ProductAnalyticsService);

  constructor() {
    this.route.params.pipe(takeUntilDestroyed()).subscribe((params: any) => {
      const serviceId = params['id'];
      this.loadService(serviceId);
    });
  }

  ngOnInit() {
    this.loadSingleSessionQuote();
  }

  goBack() {
    this.router.navigate(['/services']);
  }

  bookService() {
    const offering = this.publicConfig.defaultOfferingSlug;
    // Navigate to contact form with service pre-selected
    this.router.navigate(['/contact'], {
      queryParams: {
        service: this.service()?.id,
        serviceName: this.service()?.name,
        ...(offering ? { offering } : {}),
        price: this.sessionOfferPrice,
        duration: '30 minutes + 15 min follow-up',
        source: 'service-detail',
      },
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

  currentSessionPrice(): number {
    return this.singleSessionQuote()?.payableInPaise != null
      ? Math.round(this.singleSessionQuote()!.payableInPaise! / 100)
      : this.sessionOfferPrice;
  }

  currentOriginalPrice(): number {
    return this.singleSessionQuote()?.grossInPaise != null
      ? Math.round(this.singleSessionQuote()!.grossInPaise! / 100)
      : this.sessionPrice;
  }

  hasActiveSessionDiscount(): boolean {
    return Boolean(this.singleSessionQuote()?.discountInPaise);
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
      'Use your included 15-minute follow-up to review progress',
    ];
  }

  sessionOutcome(): string[] {
    return [
      'A clearer understanding of your concern',
      'One practical coping tool',
      'A next-step plan for the coming days',
      'One included follow-up check-in',
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
        question: 'Is the ₹500 session refundable?',
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

    this.bookingService.service(serviceId).subscribe({
      next: ({ service }) => {
        this.setLoadedService(this.toService(service));
      },
      error: () => {
        this.setLoadedService(getServiceById(serviceId) || null);
        this.notificationService.warning(
          'Live service details could not load. Showing saved details.',
        );
      },
    });
  }

  private loadSingleSessionQuote(): void {
    const offeringSlug = this.publicConfig.defaultOfferingSlug;
    if (!offeringSlug) return;
    this.bookingService.offeringQuote(offeringSlug).subscribe({
      next: ({ offering, quote }) => {
        this.singleSessionOffer.set(offering);
        this.singleSessionQuote.set(quote);
      },
      error: () => {
        this.singleSessionOffer.set(null);
        this.singleSessionQuote.set(null);
      },
    });
  }

  private setLoadedService(foundService: Service | null) {
    this.service.set(foundService);
    this.loading.set(false);

    // Update SEO for service page
    if (foundService) {
      this.productAnalytics.track(HOPE_HUB_ANALYTICS_EVENTS.SERVICE_VIEWED, {
        serviceId: foundService.id,
        serviceName: foundService.name,
        category: foundService.category,
      });

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
  }

  private toService(service: HopeHubService): Service {
    return {
      id: service.id,
      name: service.name,
      description: service.description,
      detailedDescription: service.detailedDescription,
      benefits: service.benefits || [],
      approach: service.approach || '',
      pricing: service.pricing || { individual: 500, currency: 'INR' },
      category: this.toServiceCategory(service.category),
      featured: service.featured,
      imageUrl: service.imageUrl || undefined,
    };
  }

  private toServiceCategory(category: string): ServiceCategory {
    return Object.values(ServiceCategory).includes(category as ServiceCategory)
      ? (category as ServiceCategory)
      : ServiceCategory.MENTAL_HEALTH;
  }
}

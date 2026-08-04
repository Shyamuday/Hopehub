import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NOTE_CONTENT } from '../../core/constants/note-content.constants';
import { Service, ServiceCategory } from '../../core/models';
import { getAllServices } from '../../core/data/services-data';
import { ServiceCardComponent } from '../../shared/components';
import {
  BookingService,
  HopeHubOffering,
  HopeHubOfferingQuote,
  HopeHubService,
} from '../../core/services/booking.service';
import { NotificationService } from '../../core/services/notification.service';
import { PublicCommunicationConfigService } from '../../core/services/public-communication-config.service';

@Component({
  selector: 'app-services',
  standalone: true,
  imports: [FormsModule, ServiceCardComponent],
  templateUrl: './services.component.html',
  styleUrl: './services.component.scss',
})
export class ServicesComponent implements OnInit {
  readonly notes = NOTE_CONTENT;
  services = signal<Service[]>([]);
  searchTerm = signal('');
  selectedFilter = signal('all');
  singleSessionOffer = signal<HopeHubOffering | null>(null);
  singleSessionQuote = signal<HopeHubOfferingQuote | null>(null);

  filters = [
    { id: 'all', label: 'All' },
    { id: 'relationship', label: 'Relationship' },
    { id: 'anxiety-stress', label: 'Anxiety / Stress' },
    { id: 'career', label: 'Career / Study' },
    { id: 'family', label: 'Family' },
    { id: 'habits', label: 'Habits' },
    { id: 'sleep', label: 'Sleep / Overthinking' },
  ];

  filteredServices = computed(() => {
    const query = this.searchTerm().trim().toLowerCase();
    const filter = this.selectedFilter();

    return this.services().filter((service) => {
      const searchable = [service.name, service.description, service.category, ...service.benefits]
        .join(' ')
        .toLowerCase();

      const matchesSearch = !query || searchable.includes(query);
      const matchesFilter = filter === 'all' || this.matchesFilter(service, filter);

      return matchesSearch && matchesFilter;
    });
  });

  constructor(
    private router: Router,
    private bookingService: BookingService,
    private notificationService: NotificationService,
    private publicConfig: PublicCommunicationConfigService,
  ) {}

  ngOnInit() {
    this.loadPageData();
  }

  navigateToService(serviceId: string) {
    this.router.navigate(['/services', serviceId]);
  }

  setFilter(filter: string): void {
    this.selectedFilter.set(filter);
  }

  updateSearch(value: string): void {
    this.searchTerm.set(value);
  }

  private loadPageData() {
    this.bookingService.servicesPageData().subscribe({
      next: ({ services, singleSessionQuote }) => {
        this.services.set(
          services.length
            ? services.map((service) => this.toService(service))
            : this.savedServicesWithConfigPricing(),
        );
        this.singleSessionOffer.set(singleSessionQuote?.offering ?? null);
        this.singleSessionQuote.set(singleSessionQuote?.quote ?? null);
      },
      error: () => {
        this.services.set(this.savedServicesWithConfigPricing());
        this.singleSessionOffer.set(null);
        this.singleSessionQuote.set(null);
        this.notificationService.warning('Live services could not load. Showing saved services.');
      },
    });
  }

  private toService(service: HopeHubService): Service {
    return {
      id: service.id,
      name: service.name,
      description: service.description,
      detailedDescription: service.detailedDescription,
      benefits: service.benefits || [],
      approach: service.approach || '',
      pricing: service.pricing || {
        individual: this.publicConfig.defaultSessionPriceRupees(),
        currency: 'INR',
      },
      duration: service.duration || this.publicConfig.defaultSessionLabel,
      category: this.toServiceCategory(service.category),
      featured: service.featured,
      imageUrl: service.imageUrl || undefined,
    };
  }

  private savedServicesWithConfigPricing(): Service[] {
    const defaultPrice = this.publicConfig.defaultSessionPriceRupees();
    return getAllServices().map((service) => ({
      ...service,
      pricing: {
        ...(service.pricing || { currency: 'INR' }),
        individual: defaultPrice,
        currency: service.pricing?.currency || 'INR',
      },
      duration: service.duration || this.publicConfig.defaultSessionLabel,
    }));
  }

  private toServiceCategory(category: string): ServiceCategory {
    return Object.values(ServiceCategory).includes(category as ServiceCategory)
      ? (category as ServiceCategory)
      : ServiceCategory.MENTAL_HEALTH;
  }

  private matchesFilter(service: Service, filter: string): boolean {
    const text = `${service.id} ${service.name} ${service.description}`.toLowerCase();

    if (filter === 'relationship') {
      return service.category === ServiceCategory.RELATIONSHIP || text.includes('breakup');
    }
    if (filter === 'anxiety-stress') {
      return (
        text.includes('anxiety') ||
        text.includes('stress') ||
        text.includes('panic') ||
        text.includes('burnout')
      );
    }
    if (filter === 'career') {
      return (
        service.category === ServiceCategory.CAREER ||
        text.includes('exam') ||
        text.includes('study')
      );
    }
    if (filter === 'family') {
      return (
        service.category === ServiceCategory.FAMILY ||
        text.includes('parenting') ||
        text.includes('family')
      );
    }
    if (filter === 'habits') {
      return (
        service.category === ServiceCategory.ADDICTION ||
        text.includes('habit') ||
        text.includes('addiction')
      );
    }
    if (filter === 'sleep') {
      return text.includes('sleep') || text.includes('overthinking');
    }

    return true;
  }
}

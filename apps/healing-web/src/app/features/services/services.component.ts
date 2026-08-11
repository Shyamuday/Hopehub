import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NOTE_CONTENT } from '../../core/constants/note-content.constants';
import { CONSUMER_ROUTES } from '../../core/constants/consumer-routes.constants';
import { Service, ServiceCategory } from '../../core/models';
import {
  ContinueSupportBannerComponent,
  FormDropdownComponent,
  FormDropdownOption,
  ServiceCardComponent,
} from '../../shared/components';
import {
  BookingService,
  HopeHubOffering,
  HopeHubOfferingQuote,
  HopeHubService,
} from '../../core/services/booking.service';

@Component({
  selector: 'app-services',
  standalone: true,
  imports: [
    FormsModule,
    ServiceCardComponent,
    FormDropdownComponent,
    ContinueSupportBannerComponent,
  ],
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

  needOptions: FormDropdownOption[] = [
    { value: '', label: 'Any need' },
    { value: 'anxiety overthinking panic', label: 'Anxiety / overthinking' },
    { value: 'low mood depression sadness', label: 'Low mood / depression' },
    { value: 'stress burnout pressure', label: 'Stress / burnout' },
    { value: 'relationship breakup heartbreak partner', label: 'Relationship / breakup' },
    { value: 'sleep insomnia night overthinking', label: 'Sleep trouble' },
    { value: 'career study exam job focus', label: 'Career / study stress' },
    { value: 'family parenting home conflict', label: 'Family concerns' },
  ];

  filters: FormDropdownOption[] = [
    { id: 'all', label: 'All' },
    { id: 'relationship', label: 'Relationship' },
    { id: 'anxiety-stress', label: 'Anxiety / Stress' },
    { id: 'career', label: 'Career / Study' },
    { id: 'family', label: 'Family' },
    { id: 'habits', label: 'Habits' },
    { id: 'sleep', label: 'Sleep / Overthinking' },
  ].map((filter) => ({ value: filter.id, label: filter.label }));

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
    private route: ActivatedRoute,
    private bookingService: BookingService,
  ) {}

  ngOnInit() {
    this.hydrateFromQueryParams();
    this.loadPageData();
  }

  navigateToService(serviceId: string) {
    this.router.navigate([...CONSUMER_ROUTES.links.services, serviceId]);
  }

  setFilter(filter: string): void {
    this.selectedFilter.set(filter);
  }

  updateSearch(value: string): void {
    this.searchTerm.set(value);
  }

  setNeed(value: string): void {
    this.searchTerm.set(value);
    this.selectedFilter.set(this.filterForConcern(value));
  }

  private loadPageData() {
    this.bookingService.servicesPageData().subscribe({
      next: ({ services, singleSessionQuote }) => {
        this.services.set(services.map((service) => this.toService(service)));
        this.singleSessionOffer.set(singleSessionQuote?.offering ?? null);
        this.singleSessionQuote.set(singleSessionQuote?.quote ?? null);
      },
      error: () => {
        this.services.set([]);
        this.singleSessionOffer.set(null);
        this.singleSessionQuote.set(null);
      },
    });
  }

  private hydrateFromQueryParams(): void {
    const q = this.route.snapshot.queryParamMap.get('q');
    const concern = this.route.snapshot.queryParamMap.get('concern');
    const search = q || concern || '';
    if (search) {
      this.searchTerm.set(search);
      this.selectedFilter.set(this.filterForConcern(search));
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
      pricing: service.pricing,
      duration: service.duration,
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

  private filterForConcern(value: string): string {
    const text = value.toLowerCase();
    if (/relationship|breakup|heartbreak|partner|marriage/.test(text)) return 'relationship';
    if (/anxiety|stress|panic|burnout|overthinking|pressure/.test(text)) return 'anxiety-stress';
    if (/career|study|exam|job/.test(text)) return 'career';
    if (/family|parenting/.test(text)) return 'family';
    if (/habit|addiction/.test(text)) return 'habits';
    if (/sleep|insomnia/.test(text)) return 'sleep';
    return 'all';
  }
}

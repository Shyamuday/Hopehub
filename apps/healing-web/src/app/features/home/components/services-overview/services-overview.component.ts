import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import {
  AppButtonComponent,
  PageHeaderComponent,
  ServiceCardComponent,
} from '../../../../shared/components';
import { Service, ServiceCategory } from '../../../../core/models';
import { BookingService, HopeHubService } from '../../../../core/services/booking.service';
import { CONSUMER_ROUTES } from '../../../../core/constants/consumer-routes.constants';

@Component({
  selector: 'app-services-overview',
  standalone: true,
  imports: [RouterModule, ServiceCardComponent, PageHeaderComponent, AppButtonComponent],
  templateUrl: './services-overview.component.html',
  styleUrl: './services-overview.component.scss',
})
export class ServicesOverviewComponent implements OnInit {
  private readonly bookingService = inject(BookingService);
  readonly services = signal<Service[]>([]);
  readonly ROUTES = CONSUMER_ROUTES;

  constructor(private readonly router: Router) {}

  ngOnInit(): void {
    this.bookingService.servicesPageData().subscribe({
      next: ({ services }) => {
        this.services.set(services.map((service) => this.toService(service)));
      },
      error: () => this.services.set([]),
    });
  }

  navigateToService(serviceId: string): void {
    this.router.navigate([...CONSUMER_ROUTES.links.services, serviceId]);
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
      category: Object.values(ServiceCategory).includes(service.category as ServiceCategory)
        ? (service.category as ServiceCategory)
        : ServiceCategory.MENTAL_HEALTH,
      featured: service.featured,
      imageUrl: service.imageUrl || undefined,
    };
  }
}

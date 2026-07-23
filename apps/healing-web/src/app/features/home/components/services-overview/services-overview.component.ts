import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { ServiceCardComponent } from '../../../../shared/components';
import { Service } from '../../../../core/models';
import { getAllServices } from '../../../../core/data/services-data';

@Component({
  selector: 'app-services-overview',
  standalone: true,
  imports: [RouterModule, ServiceCardComponent],
  templateUrl: './services-overview.component.html',
  styleUrl: './services-overview.component.scss',
})
export class ServicesOverviewComponent {
  readonly services: Service[] = getAllServices();

  constructor(private readonly router: Router) {}

  navigateToService(serviceId: string): void {
    this.router.navigate(['/services', serviceId]);
  }
}

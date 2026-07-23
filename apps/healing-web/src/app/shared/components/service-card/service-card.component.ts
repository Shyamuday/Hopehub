import { Component, input, output } from '@angular/core';
import { Service } from '../../../core/models';

@Component({
  selector: 'app-service-card',
  standalone: true,
  imports: [],
  templateUrl: './service-card.component.html',
  styleUrl: './service-card.component.scss',
})
export class ServiceCardComponent {
  service = input.required<Service>();
  hidePricing = input(false);
  learnMore = output<string>();

  categoryLabel(): string {
    return this.service().category.replace('-', ' ');
  }

  primaryBenefit(): string {
    return this.service().benefits?.[0] || 'Personalized support plan';
  }

  onLearnMore(event?: Event) {
    event?.stopPropagation();
    this.learnMore.emit(this.service().id);
  }
}

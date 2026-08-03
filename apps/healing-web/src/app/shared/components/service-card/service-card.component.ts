import { Component, input, output } from '@angular/core';
import { Service } from '../../../core/models';
import {
  HOPE_HUB_SESSION_DISCOUNT_PERCENT,
  HOPE_HUB_SESSION_OFFER_PRICE,
  HOPE_HUB_SESSION_PRICE,
} from '../../../core/data/services-data';

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
  readonly sessionPrice = HOPE_HUB_SESSION_PRICE;
  readonly sessionOfferPrice = HOPE_HUB_SESSION_OFFER_PRICE;
  readonly sessionDiscountPercent = HOPE_HUB_SESSION_DISCOUNT_PERCENT;

  categoryLabel(): string {
    return this.service().category.replace('-', ' ');
  }

  primaryBenefit(): string {
    return this.service().benefits?.[0] || 'Personalized support plan';
  }

  hasSessionOffer(): boolean {
    return !this.hidePricing() && Boolean(this.service().pricing?.individual);
  }

  onLearnMore(event?: Event) {
    event?.stopPropagation();
    this.learnMore.emit(this.service().id);
  }
}

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
  offerPrice = input<number | null>(null);
  originalPrice = input<number | null>(null);
  discountPercent = input<number | null>(null);
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
    return !this.hidePricing() && Boolean(this.offerPrice() && this.originalPrice());
  }

  displayPrice(): number {
    return this.offerPrice() || this.service().pricing?.individual || this.sessionPrice;
  }

  displayOriginalPrice(): number | null {
    const original = this.originalPrice();
    return original && original > this.displayPrice() ? original : null;
  }

  displayDiscountPercent(): number | null {
    return this.discountPercent();
  }

  onLearnMore(event?: Event) {
    event?.stopPropagation();
    this.learnMore.emit(this.service().id);
  }
}

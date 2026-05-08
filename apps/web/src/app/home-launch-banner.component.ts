import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import type { DiseaseInfo } from './interfaces';

/**
 * Single homepage block for campaign / search-style landings (`/?for=slug`, `?keyword=`, etc.).
 * Renders nothing when there is no matching disease.
 */
@Component({
  selector: 'app-home-launch-banner',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe],
  styles: [`
    :host { display: block; }
    .home-launch-banner {
      border: 1px solid #c7f0e2;
      background: linear-gradient(120deg, #f0fdf9 0%, #fff 55%);
      margin-bottom: 0;
    }
    .home-launch-title {
      margin: 0.35rem 0 0.5rem;
      font-size: clamp(1.35rem, 2.5vw, 1.65rem);
      color: #0f172a;
    }
    .home-launch-summary {
      margin: 0 0 1rem;
      color: #475569;
      line-height: 1.55;
      max-width: 52rem;
    }
    .home-launch-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.65rem;
      align-items: center;
    }
    .home-launch-actions a.primary {
      display: inline-flex;
    }
  `],
  template: `
    @if (disease) {
      <section class="panel home-launch-banner" [attr.aria-label]="'home.launchBanner.ariaTopic' | translate">
        <p class="eyebrow">{{ 'home.launchBanner.eyebrow' | translate }}</p>
        <h2 class="home-launch-title">{{ disease.shortName }}</h2>
        <p class="home-launch-summary">{{ disease.summary }}</p>
        <div class="home-launch-actions">
          <a class="primary home-action" [routerLink]="['/treatments', disease.slug]">
            {{ 'home.launchBanner.readGuide' | translate }}
          </a>
        </div>
      </section>
    }
  `
})
export class HomeLaunchBannerComponent {
  @Input() disease: DiseaseInfo | null = null;
}

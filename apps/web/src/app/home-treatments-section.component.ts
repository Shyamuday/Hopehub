import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-home-treatments-section',
  imports: [RouterLink, TranslatePipe],
  template: `
    <!-- Stats Section -->
    <section class="stats-section">
      <div class="stat-card">
        <span class="stat-number">5,000+</span>
        <span class="stat-label">{{ 'home.stats.consultations' | translate }}</span>
      </div>
      <div class="stat-card">
        <span class="stat-number">12+</span>
        <span class="stat-label">{{ 'home.stats.doctors' | translate }}</span>
      </div>
      <div class="stat-card">
        <span class="stat-number">4.8★</span>
        <span class="stat-label">{{ 'home.stats.rating' | translate }}</span>
      </div>
      <div class="stat-card">
        <span class="stat-number">92%</span>
        <span class="stat-label">{{ 'home.stats.followUpCompliance' | translate }}</span>
      </div>
    </section>

    <!-- Treatment Cards -->
    <section class="content-grid two">
      <article class="panel treatment-card featured-card">
        <div class="card-badge">{{ 'home.treatments.featuredBadge' | translate }}</div>
        <div class="card-icon">🩺</div>
        <h2>{{ 'home.treatments.featuredTitle' | translate }}</h2>
        <p>{{ 'home.treatments.featuredBody' | translate }}</p>
        <ul class="feature-list">
          <li>{{ 'home.treatments.featuredBullets.a' | translate }}</li>
          <li>{{ 'home.treatments.featuredBullets.b' | translate }}</li>
          <li>{{ 'home.treatments.featuredBullets.c' | translate }}</li>
        </ul>
        <a routerLink="/chronic-care" class="card-link">{{ 'home.treatments.featuredCta' | translate }}</a>
      </article>
      <article class="panel treatment-card">
        <div class="card-badge secondary-badge">{{ 'home.treatments.otherBadge' | translate }}</div>
        <h2>{{ 'home.treatments.otherTitle' | translate }}</h2>
        <p>{{ 'home.treatments.otherBody' | translate }}</p>
        <ul class="feature-list">
          <li>{{ 'home.treatments.otherBullets.a' | translate }}</li>
          <li>{{ 'home.treatments.otherBullets.b' | translate }}</li>
          <li>{{ 'home.treatments.otherBullets.c' | translate }}</li>
        </ul>
        <a routerLink="/treatments" class="card-link">{{ 'home.treatments.otherCta' | translate }}</a>
      </article>
    </section>
  `
})
export class HomeTreatmentsSectionComponent {}

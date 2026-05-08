import { Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-home-how-it-works-section',
  imports: [TranslatePipe],
  template: `
    <section class="how-it-works-section">
      <div class="section-header">
        <p class="eyebrow">{{ 'home.howItWorks.eyebrow' | translate }}</p>
        <h2 class="section-title">{{ 'home.howItWorks.title' | translate }}</h2>
        <p class="section-subtitle">{{ 'home.howItWorks.subtitle' | translate }}</p>
      </div>

      <div class="steps-grid">
        <article class="step-card">
          <div class="step-number">1</div>
          <div class="step-icon">📋</div>
          <h3>{{ 'home.howItWorks.steps.1Title' | translate }}</h3>
          <p>{{ 'home.howItWorks.steps.1Body' | translate }}</p>
        </article>

        <div class="step-connector"></div>

        <article class="step-card">
          <div class="step-number">2</div>
          <div class="step-icon">👨‍⚕️</div>
          <h3>{{ 'home.howItWorks.steps.2Title' | translate }}</h3>
          <p>{{ 'home.howItWorks.steps.2Body' | translate }}</p>
        </article>

        <div class="step-connector"></div>

        <article class="step-card">
          <div class="step-number">3</div>
          <div class="step-icon">📈</div>
          <h3>{{ 'home.howItWorks.steps.3Title' | translate }}</h3>
          <p>{{ 'home.howItWorks.steps.3Body' | translate }}</p>
        </article>
      </div>
    </section>
  `
})
export class HomeHowItWorksSectionComponent {}

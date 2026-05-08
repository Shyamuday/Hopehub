import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-home-safety-faq-section',
  imports: [RouterLink, TranslatePipe],
  template: `
    <section class="content-grid two">
      <article class="panel warning-panel">
        <h2>{{ 'home.safetyFaq.safetyTitle' | translate }}</h2>
        <p>{{ 'home.safetyFaq.safetyBody' | translate }}</p>
        <a routerLink="/safety">{{ 'home.safetyFaq.safetyLink' | translate }}</a>
      </article>
      <article class="panel">
        <h2>{{ 'home.safetyFaq.faqTitle' | translate }}</h2>
        <p>{{ 'home.safetyFaq.faqIntro' | translate }}</p>
        <p class="muted home-faq-deeper-link">
          {{ 'home.safetyFaq.methodologyLead' | translate }}
          <a routerLink="/why-successful" class="card-link">{{ 'home.safetyFaq.methodologyLink' | translate }}</a>
        </p>
        <a routerLink="/faq">{{ 'home.safetyFaq.faqLink' | translate }}</a>
      </article>
    </section>
  `
})
export class HomeSafetyFaqSectionComponent {}

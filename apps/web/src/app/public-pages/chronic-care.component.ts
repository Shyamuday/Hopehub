import { Component } from '@angular/core';
import { AppFooterComponent } from '../app-footer.component';
import { AppHeaderComponent } from '../app-header.component';
import { PUBLIC_WHATSAPP_LINK } from './public-whatsapp';

@Component({
  selector: 'app-chronic-care',
  imports: [AppHeaderComponent, AppFooterComponent],
  template: `
    <section class="public-shell">
      <app-header subtitle="Chronic care" [whatsappLink]="whatsappLink" />
      <main class="content-page">
        <section class="page-hero panel">
          <p class="eyebrow">Chronic and Rare Care</p>
          <h1>For long-running symptoms that need patience, pattern tracking, and follow-up.</h1>
          <p>
            Chronic and rare concerns often cannot be understood in one line. We focus on detailed history, symptom
            patterns, triggers, and continuity of care.
          </p>
        </section>
        <section class="content-grid three">
          <div class="panel"><h2>Listen deeply</h2><p>We collect the story behind recurring symptoms.</p></div>
          <div class="panel"><h2>Track patterns</h2><p>We look for triggers, timing, recurrence, and response.</p></div>
          <div class="panel"><h2>Guide follow-up</h2><p>We support long-term care instead of one-time advice.</p></div>
        </section>
      </main>
      <app-footer [whatsappLink]="whatsappLink" />
    </section>
  `
})
export class ChronicCareComponent {
  readonly whatsappLink = PUBLIC_WHATSAPP_LINK;
}

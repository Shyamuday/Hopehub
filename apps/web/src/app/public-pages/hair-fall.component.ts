import { Component } from '@angular/core';
import { AppFooterComponent } from '../app-footer.component';
import { AppHeaderComponent } from '../app-header.component';
import { PUBLIC_WHATSAPP_LINK } from './public-whatsapp';

@Component({
  selector: 'app-hair-fall',
  imports: [AppHeaderComponent, AppFooterComponent],
  template: `
    <section class="public-shell">
      <app-header subtitle="Hair fall care" [whatsappLink]="whatsappLink" />
      <main class="content-page">
        <section class="page-hero panel">
          <p class="eyebrow">Hair Fall Treatment</p>
          <h1>Structured care for hair fall, thinning, dandruff, and scalp health.</h1>
          <p>
            We look at duration, scalp condition, family history, stress, illness, diet, and medication history before
            suggesting a treatment path.
          </p>
        </section>
        <section class="content-grid two">
          <div class="panel">
            <h2>Common concerns</h2>
            <ul>
              <li>Hair fall after fever, stress, weight loss, or lifestyle changes</li>
              <li>Dandruff, itching, oily scalp, or scalp infection tendency</li>
              <li>Pattern thinning and family history of baldness</li>
              <li>Recurring hair fall despite trying multiple products</li>
            </ul>
          </div>
          <div class="panel">
            <h2>How we help</h2>
            <ul>
              <li>Short symptom intake before consultation</li>
              <li>Doctor-led chat consultation</li>
              <li>Homeopathy-led, low-medicine care where suitable</li>
              <li>Prescription and follow-up guidance</li>
            </ul>
          </div>
        </section>
      </main>
      <app-footer [whatsappLink]="whatsappLink" />
    </section>
  `
})
export class HairFallComponent {
  readonly whatsappLink = PUBLIC_WHATSAPP_LINK;
}

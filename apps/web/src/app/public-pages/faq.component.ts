import { Component } from '@angular/core';
import { AppFooterComponent } from '../app-footer.component';
import { AppHeaderComponent } from '../app-header.component';
import { PUBLIC_WHATSAPP_LINK } from './public-whatsapp';

@Component({
  selector: 'app-faq',
  imports: [AppHeaderComponent, AppFooterComponent],
  template: `
    <section class="public-shell">
      <app-header subtitle="FAQ" [whatsappLink]="whatsappLink" />
      <main class="content-page">
        <section class="page-hero panel">
          <p class="eyebrow">FAQ</p>
          <h1>Common questions before booking.</h1>
        </section>
        <section class="faq-list">
          <article class="panel">
            <h2>Can I choose my doctor?</h2>
            <p>
              No. Vitalis Care and Research Centre assigns from the internal doctor panel based on your concern and
              availability.
            </p>
          </article>
          <article class="panel">
            <h2>Is this emergency care?</h2>
            <p>No. This platform is not for emergencies or critical symptoms.</p>
          </article>
          <article class="panel">
            <h2>Do you use homeopathy?</h2>
            <p>Our approach is homeopathy-led and low-medicine where suitable, guided by doctor assessment.</p>
          </article>
          <article class="panel">
            <h2>Will I get a prescription?</h2>
            <p>Yes, after consultation if the doctor finds it appropriate.</p>
          </article>
        </section>
      </main>
      <app-footer [whatsappLink]="whatsappLink" />
    </section>
  `
})
export class FaqComponent {
  readonly whatsappLink = PUBLIC_WHATSAPP_LINK;
}

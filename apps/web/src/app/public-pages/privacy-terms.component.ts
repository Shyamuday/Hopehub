import { Component } from '@angular/core';
import { AppFooterComponent } from '../app-footer.component';
import { AppHeaderComponent } from '../app-header.component';
import { PUBLIC_WHATSAPP_LINK } from './public-whatsapp';

@Component({
  selector: 'app-privacy-terms',
  imports: [AppHeaderComponent, AppFooterComponent],
  template: `
    <section class="public-shell">
      <app-header subtitle="Privacy and terms" [whatsappLink]="whatsappLink" />
      <main class="content-page">
        <section class="page-hero panel">
          <p class="eyebrow">Privacy Policy / Terms</p>
          <h1>Your health information should be handled with care.</h1>
          <p>
            We collect only the information needed to provide consultation, payment, prescription, and follow-up
            support. Medical data is used for care delivery and clinic operations.
          </p>
        </section>
        <section class="content-grid two">
          <div class="panel">
            <h2>Privacy</h2>
            <p>
              We store account, consultation, chat, payment, and prescription data using secure third-party services
              such as Supabase and Razorpay.
            </p>
          </div>
          <div class="panel">
            <h2>Terms</h2>
            <p>
              By booking, you agree to online consultation, internal doctor assignment, payment verification, and digital
              prescription delivery where appropriate.
            </p>
          </div>
        </section>
      </main>
      <app-footer [whatsappLink]="whatsappLink" />
    </section>
  `
})
export class PrivacyTermsComponent {
  readonly whatsappLink = PUBLIC_WHATSAPP_LINK;
}

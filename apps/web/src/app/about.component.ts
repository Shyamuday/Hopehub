import { Component } from '@angular/core';
import { AppFooterComponent } from './app-footer.component';
import { AppHeaderComponent } from './app-header.component';

@Component({
  selector: 'app-about',
  imports: [AppHeaderComponent, AppFooterComponent],
  template: `
    <section class="public-shell">
      <app-header subtitle="About our care" [whatsappLink]="whatsappLink" />

      <main class="about-page">
        <section class="about-hero panel">
          <p class="eyebrow">Who we are</p>
          <h1>We are a doctor-led digital clinic for chronic, rare, and long-running health concerns.</h1>
          <p>
            Vitalis Care and Research Centre brings structured online care under one trusted clinic brand. Patients do not browse
            random doctor listings. They choose their health problem, share symptoms, and our internal care team guides
            the consultation journey.
          </p>
        </section>

        <section class="about-grid">
          <article class="panel">
            <p class="eyebrow">What we do</p>
            <h2>Personalized online consultations</h2>
            <p>
              We help patients with hair fall, skin issues, wellness concerns, chronic symptoms, and cases that need
              careful follow-up. Our focus is not one-time advice, but guided treatment and continuity.
            </p>
          </article>

          <article class="panel">
            <p class="eyebrow">Our approach</p>
            <h2>Homeopathy-led, less-medicine care</h2>
            <p>
              We prefer gentle, individualized care with a homeopathy-first mindset where appropriate. Our goal is to
              reduce unnecessary medication load and support the body's long-term healing process.
            </p>
          </article>

          <article class="panel">
            <p class="eyebrow">Special focus</p>
            <h2>Chronic and rare care specialists</h2>
            <p>
              Many patients come to us after living with recurring or confusing symptoms. We focus on listening deeply,
              tracking patterns, and creating a treatment plan that fits the person's history.
            </p>
          </article>
        </section>

        <section class="mission-grid">
          <div class="panel">
            <h2>Mission</h2>
            <p>
              To make trusted, affordable, doctor-led care accessible for patients who need thoughtful treatment,
              follow-up, and long-term support.
            </p>
          </div>

          <div class="panel">
            <h2>Vision</h2>
            <p>
              To build a digital clinic known for results, trust, ethical care, and a low-medicine approach to chronic
              and rare health conditions.
            </p>
          </div>
        </section>

        <section class="panel values-panel">
          <p class="eyebrow">What patients can expect</p>
          <div class="values-list">
            <span>Short symptom intake</span>
            <span>Internal doctor assignment</span>
            <span>Private chat consultation</span>
            <span>Prescription and follow-up guidance</span>
            <span>Chronic case tracking</span>
            <span>WhatsApp support</span>
          </div>
        </section>

        <section class="about-cta panel">
          <div>
            <p class="eyebrow">Need help choosing?</p>
            <h2>Talk to us before booking.</h2>
            <p>Message us on WhatsApp and our team will guide you to the right consultation path.</p>
          </div>
          <a class="whatsapp-action" [href]="whatsappLink" target="_blank" rel="noopener" aria-label="Chat on WhatsApp">
            <svg class="wa-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="currentColor" d="M19.05 4.91A9.82 9.82 0 0 0 12.07 2C6.64 2 2.2 6.41 2.2 11.85c0 1.74.45 3.43 1.31 4.93L2 22l5.38-1.41a9.9 9.9 0 0 0 4.69 1.2h.01c5.43 0 9.87-4.41 9.87-9.85a9.75 9.75 0 0 0-2.9-7.03zm-6.98 15.2h-.01a8.2 8.2 0 0 1-4.17-1.14l-.3-.18-3.19.84.85-3.12-.2-.32a8.1 8.1 0 0 1-1.24-4.33c0-4.48 3.68-8.12 8.21-8.12 2.19 0 4.24.85 5.8 2.4a8.04 8.04 0 0 1 2.4 5.73c0 4.48-3.69 8.12-8.15 8.12zm4.45-6.07c-.24-.12-1.43-.7-1.65-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1.01-.37-1.92-1.17a7.1 7.1 0 0 1-1.33-1.65c-.14-.24-.02-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.48-.4-.4-.54-.4h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.31.98 2.47c.12.16 1.68 2.57 4.08 3.6.57.25 1.02.4 1.37.52.58.18 1.1.15 1.52.09.46-.07 1.43-.58 1.63-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28z"/>
            </svg>
          </a>
        </section>
      </main>

      <app-footer [whatsappLink]="whatsappLink" />
    </section>
  `
})
export class AboutComponent {
  readonly whatsappLink =
    'https://wa.me/919876543210?text=Hi%20Vitalis%20Care%20and%20Research%20Centre%2C%20I%20want%20to%20know%20more%20about%20your%20care';
}

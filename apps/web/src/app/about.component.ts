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
            Vitalis Care brings structured online care under one trusted clinic brand. Patients do not browse
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
          <a class="whatsapp-action" [href]="whatsappLink" target="_blank" rel="noopener">Chat on WhatsApp</a>
        </section>
      </main>

      <app-footer [whatsappLink]="whatsappLink" />
    </section>
  `
})
export class AboutComponent {
  readonly whatsappLink =
    'https://wa.me/919876543210?text=Hi%20Vitalis%20Clinic%2C%20I%20want%20to%20know%20more%20about%20your%20care';
}

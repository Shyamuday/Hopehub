import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AppFooterComponent } from './app-footer.component';
import { AppHeaderComponent } from './app-header.component';

const whatsappLink =
  'https://wa.me/919876543210?text=Hi%20Betelgeuse%20Clinic%2C%20I%20want%20to%20know%20more';

type DiseaseInfo = {
  slug: string;
  name: string;
  shortName: string;
  imageUrl: string;
  imageAlt: string;
  about: string;
  summary: string;
  symptoms: string[];
  careApproach: string[];
  details: string[];
  warning?: string;
};

export const diseaseInfos: DiseaseInfo[] = [
  {
    slug: 'hair-fall',
    name: 'Hair Fall Treatment',
    shortName: 'Hair Fall Care',
    imageUrl:
      'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=1200&q=80',
    imageAlt: 'Hair care consultation',
    about: 'Structured care for hair fall, thinning, dandruff, and scalp health.',
    summary:
      'We look at duration, scalp condition, family history, stress, illness, diet, and medication history before suggesting a treatment path.',
    symptoms: [
      'Hair fall after fever, stress, weight loss, or lifestyle changes',
      'Dandruff, itching, oily scalp, or scalp infection tendency',
      'Pattern thinning and family history of baldness',
      'Recurring hair fall despite trying multiple products'
    ],
    careApproach: [
      'Short symptom intake before consultation',
      'Doctor-led chat consultation',
      'Homeopathy-led, low-medicine care where suitable',
      'Prescription and follow-up guidance'
    ],
    details: [
      'Hair fall often needs pattern tracking rather than only product changes.',
      'Your doctor may ask for scalp photos, lifestyle history, recent illness history, and family history.',
      'Follow-up helps track shedding, density changes, dandruff, and treatment response.'
    ]
  },
  {
    slug: 'skin-care',
    name: 'Skin Care',
    shortName: 'Skin Care',
    imageUrl:
      'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=1200&q=80',
    imageAlt: 'Skin care consultation',
    about: 'Care for recurring skin issues, sensitivity, acne, pigmentation, and allergies.',
    summary:
      'Skin concerns often need history, triggers, routine review, and follow-up. We focus on practical care with a gentle treatment approach.',
    symptoms: [
      'Acne and recurring breakouts',
      'Rashes, itching, and allergy tendency',
      'Pigmentation and uneven skin tone',
      'Sensitive skin and product reactions'
    ],
    careApproach: [
      'Understand triggers and previous product/medicine use',
      'Review severity, duration, and recurring patterns',
      'Use low-medicine care where appropriate',
      'Guide follow-up and routine correction'
    ],
    details: [
      'Skin problems can be linked to routine, sensitivity, hormones, stress, diet, and weather.',
      'Clear photos and timeline help the doctor understand the case better.',
      'The goal is long-term control, not only short-term suppression.'
    ],
    warning:
      'Severe swelling, breathing difficulty, spreading infection, high fever, burns, or rapidly worsening skin symptoms need urgent offline medical care.'
  },
  {
    slug: 'chronic-care',
    name: 'Chronic and Rare Care',
    shortName: 'Chronic Care',
    imageUrl:
      'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=1200&q=80',
    imageAlt: 'Chronic care consultation',
    about: 'For long-running symptoms that need patience, pattern tracking, and follow-up.',
    summary:
      'Chronic and rare concerns often cannot be understood in one line. We focus on detailed history, symptom patterns, triggers, and continuity of care.',
    symptoms: [
      'Recurring symptoms over weeks, months, or years',
      'Symptoms that keep returning after temporary relief',
      'Confusing or rare complaints that need deeper history',
      'Cases where follow-up and tracking are important'
    ],
    careApproach: [
      'Listen deeply to the full case history',
      'Track triggers, timing, recurrence, and response',
      'Create a care plan with follow-up',
      'Use homeopathy-led, low-medicine support where suitable'
    ],
    details: [
      'Chronic cases need continuity and structured notes.',
      'The doctor may ask about sleep, stress, appetite, past illness, family tendency, and previous treatments.',
      'Progress is reviewed over follow-ups rather than judged from a single interaction.'
    ]
  }
];

@Component({
  selector: 'app-treatments',
  imports: [CommonModule, AppHeaderComponent, AppFooterComponent],
  template: `
    <section class="public-shell">
      <app-header subtitle="Treatments" [whatsappLink]="whatsappLink" />
      <main class="content-page">
        <section class="page-hero panel">
          <p class="eyebrow">Treatments</p>
          <h1>Focused care programs for chronic, recurring, and lifestyle-linked concerns.</h1>
          <p>
            Betelgeuse Clinic starts with focused online consultations and gradually builds treatment plans around
            follow-up, symptom tracking, and doctor-led guidance.
          </p>
        </section>

        <section class="content-grid three">
          @for (disease of diseases; track disease.slug) {
            <article class="panel treatment-card">
              <img [src]="disease.imageUrl" [alt]="disease.imageAlt" />
              <h2>{{ disease.shortName }}</h2>
              <p>{{ disease.about }}</p>
              <a [href]="'/treatments/' + disease.slug">Explore details</a>
            </article>
          }
        </section>
      </main>
      <app-footer [whatsappLink]="whatsappLink" />
    </section>
  `
})
export class TreatmentsComponent {
  readonly whatsappLink = whatsappLink;
  readonly diseases = diseaseInfos;
}

@Component({
  selector: 'app-disease-detail',
  imports: [CommonModule, AppHeaderComponent, AppFooterComponent],
  template: `
    <section class="public-shell">
      <app-header [subtitle]="disease?.shortName || 'Treatment'" [whatsappLink]="whatsappLink" />

      <main class="content-page">
        @if (disease) {
          <section class="disease-hero panel">
            <div>
              <p class="eyebrow">Treatment detail</p>
              <h1>{{ disease.name }}</h1>
              <p>{{ disease.summary }}</p>
            </div>
            <img [src]="disease.imageUrl" [alt]="disease.imageAlt" />
          </section>

          <section class="content-grid two">
            <article class="panel">
              <h2>About {{ disease.shortName }}</h2>
              <p>{{ disease.about }}</p>
              <div class="detail-list">
                @for (item of disease.details; track item) {
                  <p>{{ item }}</p>
                }
              </div>
            </article>

            <article class="panel">
              <h2>Common symptoms</h2>
              <ul>
                @for (symptom of disease.symptoms; track symptom) {
                  <li>{{ symptom }}</li>
                }
              </ul>
            </article>
          </section>

          <section class="content-grid two">
            <article class="panel">
              <h2>Our care approach</h2>
              <ul>
                @for (step of disease.careApproach; track step) {
                  <li>{{ step }}</li>
                }
              </ul>
            </article>

            <article class="panel warning-panel">
              <h2>Safety note</h2>
              <p>{{ disease.warning || defaultWarning }}</p>
            </article>
          </section>

          <section class="about-cta panel">
            <div>
              <p class="eyebrow">Ready to begin?</p>
              <h2>Book a consultation for {{ disease.shortName }}.</h2>
              <p>Complete a short intake and our internal doctor panel will guide the next step.</p>
            </div>
            <a class="primary home-action" href="/login">Book consultation</a>
          </section>
        } @else {
          <section class="page-hero panel">
            <p class="eyebrow">Treatment not found</p>
            <h1>This treatment page is not available yet.</h1>
            <p>More disease-specific pages can be added from the disease data list.</p>
            <a class="primary home-action" href="/treatments">View treatments</a>
          </section>
        }
      </main>

      <app-footer [whatsappLink]="whatsappLink" />
    </section>
  `
})
export class DiseaseDetailComponent {
  readonly whatsappLink = whatsappLink;
  readonly defaultWarning = 'This service is not for emergency care. For severe, sudden, or rapidly worsening symptoms, seek immediate offline medical help.';
  readonly disease = diseaseInfos.find((item) => item.slug === this.route.snapshot.paramMap.get('slug'));

  constructor(private readonly route: ActivatedRoute) {}
}

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
  readonly whatsappLink = whatsappLink;
}

@Component({
  selector: 'app-skin-care',
  imports: [AppHeaderComponent, AppFooterComponent],
  template: `
    <section class="public-shell">
      <app-header subtitle="Skin care" [whatsappLink]="whatsappLink" />
      <main class="content-page">
        <section class="page-hero panel">
          <p class="eyebrow">Skin Care</p>
          <h1>Care for recurring skin issues, sensitivity, acne, pigmentation, and allergies.</h1>
          <p>
            Skin concerns often need history, triggers, routine review, and follow-up. We focus on practical care with
            a gentle treatment approach.
          </p>
        </section>
        <section class="content-grid two">
          <div class="panel">
            <h2>We commonly support</h2>
            <ul>
              <li>Acne and recurring breakouts</li>
              <li>Rashes, itching, and allergy tendency</li>
              <li>Pigmentation and uneven skin tone</li>
              <li>Sensitive skin and product reactions</li>
            </ul>
          </div>
          <div class="panel warning-panel">
            <h2>Important</h2>
            <p>
              Severe swelling, breathing difficulty, spreading infection, high fever, burns, or rapidly worsening skin
              symptoms need urgent offline medical care.
            </p>
          </div>
        </section>
      </main>
      <app-footer [whatsappLink]="whatsappLink" />
    </section>
  `
})
export class SkinCareComponent {
  readonly whatsappLink = whatsappLink;
}

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
  readonly whatsappLink = whatsappLink;
}

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
          <article class="panel"><h2>Can I choose my doctor?</h2><p>No. Betelgeuse assigns from the internal doctor panel based on your concern and availability.</p></article>
          <article class="panel"><h2>Is this emergency care?</h2><p>No. This platform is not for emergencies or critical symptoms.</p></article>
          <article class="panel"><h2>Do you use homeopathy?</h2><p>Our approach is homeopathy-led and low-medicine where suitable, guided by doctor assessment.</p></article>
          <article class="panel"><h2>Will I get a prescription?</h2><p>Yes, after consultation if the doctor finds it appropriate.</p></article>
        </section>
      </main>
      <app-footer [whatsappLink]="whatsappLink" />
    </section>
  `
})
export class FaqComponent {
  readonly whatsappLink = whatsappLink;
}

@Component({
  selector: 'app-contact',
  imports: [AppHeaderComponent, AppFooterComponent],
  template: `
    <section class="public-shell">
      <app-header subtitle="Contact" [whatsappLink]="whatsappLink" />
      <main class="content-page">
        <section class="page-hero panel">
          <p class="eyebrow">Contact</p>
          <h1>Need help before booking?</h1>
          <p>Message us on WhatsApp and our team will guide you to the right consultation path.</p>
          <a class="whatsapp-action" [href]="whatsappLink" target="_blank" rel="noopener">Chat on WhatsApp</a>
        </section>
      </main>
      <app-footer [whatsappLink]="whatsappLink" />
    </section>
  `
})
export class ContactComponent {
  readonly whatsappLink = whatsappLink;
}

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
            We collect only the information needed to provide consultation, payment, prescription, and follow-up support.
            Medical data is used for care delivery and clinic operations.
          </p>
        </section>
        <section class="content-grid two">
          <div class="panel">
            <h2>Privacy</h2>
            <p>We store account, consultation, chat, payment, and prescription data using secure third-party services such as Supabase and Razorpay.</p>
          </div>
          <div class="panel">
            <h2>Terms</h2>
            <p>By booking, you agree to online consultation, internal doctor assignment, payment verification, and digital prescription delivery where appropriate.</p>
          </div>
        </section>
      </main>
      <app-footer [whatsappLink]="whatsappLink" />
    </section>
  `
})
export class PrivacyTermsComponent {
  readonly whatsappLink = whatsappLink;
}

@Component({
  selector: 'app-safety',
  imports: [AppHeaderComponent, AppFooterComponent],
  template: `
    <section class="public-shell">
      <app-header subtitle="Safety and trust" [whatsappLink]="whatsappLink" />
      <main class="content-page">
        <section class="page-hero panel warning-panel">
          <p class="eyebrow">Safety / Trust</p>
          <h1>Not for emergency care.</h1>
          <p>
            Betelgeuse Clinic is for planned online consultation and follow-up. If you have severe symptoms, sudden
            worsening, breathing difficulty, chest pain, fainting, heavy bleeding, severe allergic reaction, high fever,
            or any emergency, seek immediate offline medical care.
          </p>
        </section>
        <section class="content-grid two">
          <div class="panel">
            <h2>Medical disclaimer</h2>
            <p>Online consultation supports care decisions but does not replace emergency services, physical examination when needed, or hospital care.</p>
          </div>
          <div class="panel">
            <h2>Refund and cancellation</h2>
            <p>Refunds depend on payment status, consultation assignment, and whether the doctor has started the consultation. Final policy should be confirmed before public launch.</p>
          </div>
        </section>
      </main>
      <app-footer [whatsappLink]="whatsappLink" />
    </section>
  `
})
export class SafetyComponent {
  readonly whatsappLink = whatsappLink;
}

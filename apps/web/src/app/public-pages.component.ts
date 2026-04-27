import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AppFooterComponent } from './app-footer.component';
import { AppHeaderComponent } from './app-header.component';
import { diseaseInfos } from './disease-info.constants';
import { homeopathyApproaches } from './homeopathy-approaches.constants';

const whatsappLink =
  'https://wa.me/919876543210?text=Hi%20Betelgeuse%20Clinic%2C%20I%20want%20to%20know%20more';

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
              <div class="disease-meta">
                @if (disease.category) {
                  <span>{{ disease.category }}</span>
                }
                @if (disease.diseaseType) {
                  <span>{{ disease.diseaseType }}</span>
                }
                @if (disease.icdCode) {
                  <span>ICD: {{ disease.icdCode }}</span>
                }
              </div>
            </div>
            <img [src]="disease.imageUrl" [alt]="disease.imageAlt" />
          </section>

          @if (disease.ourApproach) {
            <section class="panel root-cause-panel">
              <p class="eyebrow">Our approach</p>
              <h2>{{ disease.ourApproach.title }}</h2>
              <p>{{ disease.ourApproach.intro }}</p>
              <div class="values-list">
                @for (point of disease.ourApproach.points; track point) {
                  <span>{{ point }}</span>
                }
              </div>
            </section>
          }

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
            @if (disease.causes?.length) {
              <article class="panel">
                <h2>Possible causes</h2>
                <ul>
                  @for (cause of disease.causes; track cause) {
                    <li>{{ cause }}</li>
                  }
                </ul>
              </article>
            }

            @if (disease.riskFactors?.length) {
              <article class="panel">
                <h2>Risk factors</h2>
                <ul>
                  @for (risk of disease.riskFactors; track risk) {
                    <li>{{ risk }}</li>
                  }
                </ul>
              </article>
            }
          </section>

          <section class="content-grid two">
            @if (disease.diagnosis) {
              <article class="panel">
                <h2>Diagnosis approach</h2>
                <p>{{ disease.diagnosis }}</p>
              </article>
            }

            @if (disease.tests?.length) {
              <article class="panel">
                <h2>Tests, if needed</h2>
                <ul>
                  @for (test of disease.tests; track test) {
                    <li>{{ test }}</li>
                  }
                </ul>
              </article>
            }
          </section>

          @if (disease.treatmentOptions) {
            <section class="panel">
              <h2>Treatment options</h2>
              <div class="treatment-options">
                @if (disease.treatmentOptions.allopathy) {
                  <div><strong>Allopathy</strong><p>{{ disease.treatmentOptions.allopathy }}</p></div>
                }
                @if (disease.treatmentOptions.ayurveda) {
                  <div><strong>Ayurveda</strong><p>{{ disease.treatmentOptions.ayurveda }}</p></div>
                }
                @if (disease.treatmentOptions.homeopathy) {
                  <div><strong>Homeopathy</strong><p>{{ disease.treatmentOptions.homeopathy }}</p></div>
                }
                @if (disease.treatmentOptions.lifestyle) {
                  <div><strong>Lifestyle</strong><p>{{ disease.treatmentOptions.lifestyle }}</p></div>
                }
              </div>
            </section>
          }

          <section class="content-grid two">
            @if (disease.homeCare?.length) {
              <article class="panel">
                <h2>Home care</h2>
                <ul>
                  @for (item of disease.homeCare; track item) {
                    <li>{{ item }}</li>
                  }
                </ul>
              </article>
            }

            @if (disease.prevention?.length) {
              <article class="panel">
                <h2>Prevention</h2>
                <ul>
                  @for (item of disease.prevention; track item) {
                    <li>{{ item }}</li>
                  }
                </ul>
              </article>
            }
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
              @if (disease.emergencySigns?.length) {
                <h3>Emergency signs</h3>
                <ul>
                  @for (sign of disease.emergencySigns; track sign) {
                    <li>{{ sign }}</li>
                  }
                </ul>
              }
            </article>
          </section>

          <section class="content-grid three">
            @if (disease.severityLevel) {
              <article class="panel"><h2>Severity</h2><p>{{ disease.severityLevel }}</p></article>
            }
            @if (disease.whenToSeeDoctor) {
              <article class="panel"><h2>When to see doctor</h2><p>{{ disease.whenToSeeDoctor }}</p></article>
            }
            @if (disease.duration) {
              <article class="panel"><h2>Expected duration</h2><p>{{ disease.duration }}</p></article>
            }
          </section>

          <section class="content-grid two">
            @if (disease.stages?.length) {
              <article class="panel">
                <h2>Care stages</h2>
                <ul>
                  @for (stage of disease.stages; track stage) {
                    <li>{{ stage }}</li>
                  }
                </ul>
              </article>
            }

            @if (disease.commonIn) {
              <article class="panel">
                <h2>Common in</h2>
                @if (disease.commonIn.ageGroup) {
                  <p><strong>Age group:</strong> {{ disease.commonIn.ageGroup }}</p>
                }
                @if (disease.commonIn.gender) {
                  <p><strong>Gender:</strong> {{ disease.commonIn.gender }}</p>
                }
              </article>
            }
          </section>

          @if (disease.faq?.length) {
            <section class="faq-list">
              <h2>FAQ</h2>
              @for (item of disease.faq; track item.question) {
                <article class="panel">
                  <h3>{{ item.question }}</h3>
                  <p>{{ item.answer }}</p>
                </article>
              }
            </section>
          }

          <section class="panel review-panel">
            @if (disease.reviewedBy) {
              <p><strong>Reviewed by:</strong> {{ disease.reviewedBy }}</p>
            }
            @if (disease.lastUpdated) {
              <p><strong>Last updated:</strong> {{ disease.lastUpdated }}</p>
            }
            @if (disease.references && disease.references.length) {
              <p><strong>References:</strong> {{ disease.references.join(', ') }}</p>
            }
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

@Component({
  selector: 'app-why-successful',
  imports: [CommonModule, AppHeaderComponent, AppFooterComponent],
  template: `
    <section class="public-shell">
      <app-header subtitle="Why we are successful" [whatsappLink]="whatsappLink" />
      <main class="content-page">
        <section class="page-hero panel">
          <p class="eyebrow">Why We Are Successful</p>
          <h1>Structured homeopathy, clear case logic, and disciplined follow-up.</h1>
          <p>
            Our outcomes come from method-driven case-taking, individualized prescribing, and safe escalation. We do
            not rely on random remedy selection.
          </p>
        </section>

        <section class="content-grid two">
          <article class="panel">
            <h2>What makes the model work</h2>
            <ul>
              <li>Each case is captured with a repeatable structure before prescribing.</li>
              <li>Mental, physical, and pathology data are interpreted together.</li>
              <li>Remedy decisions are reviewed through follow-up, not one-time judgment.</li>
              <li>Safety red flags trigger offline referral when needed.</li>
            </ul>
          </article>
          <article class="panel">
            <h2>How this differs from generic treatment advice</h2>
            <ul>
              <li>We use method-specific frameworks, not symptom-only matching.</li>
              <li>Approach selection changes by case complexity and chronicity.</li>
              <li>Investigation and diagnosis are integrated with homeopathy planning.</li>
              <li>Documentation is designed for continuity and digital follow-up.</li>
            </ul>
          </article>
        </section>

        <section class="faq-list">
          <h2>Our Homeopathy Approaches</h2>
          @for (method of approaches; track method.slug) {
            <article class="panel">
              <p class="eyebrow">{{ method.slug }}</p>
              <h3>{{ method.title }}</h3>
              @if (method.developedBy) {
                <p><strong>Developed by:</strong> {{ method.developedBy }}</p>
              }
              <p>{{ method.shortDescription }}</p>
              <p><strong>Primary focus:</strong> {{ method.focus }}</p>

              <h4>Best for</h4>
              <ul>
                @for (item of method.bestFor; track item) {
                  <li>{{ item }}</li>
                }
              </ul>

              <h4>Process steps</h4>
              <ul>
                @for (step of method.processSteps; track step) {
                  <li>{{ step }}</li>
                }
              </ul>

              <section class="content-grid two">
                <div>
                  <h4>Strengths</h4>
                  <ul>
                    @for (point of method.strengths; track point) {
                      <li>{{ point }}</li>
                    }
                  </ul>
                </div>
                <div>
                  <h4>Limits</h4>
                  <ul>
                    @for (point of method.limits; track point) {
                      <li>{{ point }}</li>
                    }
                  </ul>
                </div>
              </section>

              @if (method.digitalMapping?.length) {
                <h4>Digital case-sheet mapping</h4>
                <div class="values-list">
                  @for (key of method.digitalMapping; track key) {
                    <span>{{ key }}</span>
                  }
                </div>
              }

              @if (method.uiFlow?.length) {
                <h4>Suggested UI flow</h4>
                <ul>
                  @for (step of method.uiFlow; track step) {
                    <li>{{ step }}</li>
                  }
                </ul>
              }

              @if (method.uiComponents?.length) {
                <h4>Suggested Angular components</h4>
                <div class="values-list">
                  @for (component of method.uiComponents; track component) {
                    <span>{{ component }}</span>
                  }
                </div>
              }
            </article>
          }
        </section>

        <section class="panel warning-panel">
          <h2>Clinical safety note</h2>
          <p>
            Homeopathy frameworks support structure and decision quality, but final remedy choice still depends on
            doctor skill, case quality, and follow-up response. Emergencies require immediate offline care.
          </p>
        </section>
      </main>
      <app-footer [whatsappLink]="whatsappLink" />
    </section>
  `
})
export class WhySuccessfulComponent {
  readonly whatsappLink = whatsappLink;
  readonly approaches = homeopathyApproaches;
}

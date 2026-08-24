import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { APP_CONSTANTS } from '../../core';

@Component({
  selector: 'app-privacy-policy',
  standalone: true,
  imports: [RouterModule],
  template: `
    <main class="bg-white">
      <section class="border-b border-slate-200 bg-slate-50 py-12 sm:py-16">
        <div class="container mx-auto px-4 sm:px-6 lg:px-8">
          <p class="text-sm font-semibold uppercase text-teal-700">Legal</p>
          <h1 class="mt-3 text-3xl font-bold text-slate-950 sm:text-4xl">Privacy Policy</h1>
          <p class="mt-4 max-w-3xl text-base leading-7 text-slate-700">
            This policy explains how Hope Hub collects, uses, and protects information shared
            through hopehub.in and related support channels.
          </p>
          <p class="mt-3 text-sm text-slate-600">Effective date: August 24, 2026</p>
        </div>
      </section>

      <section class="container mx-auto px-4 py-10 sm:px-6 lg:px-8">
        <div class="mx-auto max-w-4xl space-y-8 text-slate-700">
          <section>
            <h2 class="text-xl font-bold text-slate-950">Information We Collect</h2>
            <p class="mt-3 leading-7">
              We may collect details you submit through forms, including your name, contact details,
              concern type, preferred support channel, appointment request information, feedback,
              and any message you choose to share.
            </p>
          </section>

          <section>
            <h2 class="text-xl font-bold text-slate-950">How We Use Information</h2>
            <p class="mt-3 leading-7">
              We use submitted information to respond to requests, route you to suitable support,
              manage community or consultation workflows, improve our services, and maintain safety
              and reliability.
            </p>
          </section>

          <section>
            <h2 class="text-xl font-bold text-slate-950">Cookies And Local Storage</h2>
            <p class="mt-3 leading-7">
              Essential browser storage is used for sign-in, security, session continuity,
              preferences, bookings, and other features you request. Optional measurement and
              advertising cookies are used only after you choose “Accept optional cookies”. You can
              reject them initially or change your choice later through Cookie settings in the
              website footer.
            </p>
          </section>

          <section>
            <h2 class="text-xl font-bold text-slate-950">Google Measurement And Advertising</h2>
            <p class="mt-3 leading-7">
              With your permission, Hope Hub may use Google Ads conversion measurement and Google
              advertising services to understand whether a campaign resulted in a general action,
              such as opening a booking form, completing a booking, registering, starting live
              support, or opening our Telegram community. We configure these tags to disable ad
              personalisation and Google signals for this mental-wellness website. We do not send
              concern descriptions, assessment answers, chat content, diagnoses, or other health
              details in Google conversion events.
            </p>
            <p class="mt-3 leading-7">
              Google may process device, browser, page, consent and advertising-click information
              according to its own policies. You can learn more through
              <a
                class="font-semibold text-teal-700 hover:text-teal-800"
                href="https://policies.google.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                >Google’s Privacy Policy</a
              >.
            </p>
          </section>

          <section>
            <h2 class="text-xl font-bold text-slate-950">What We Do Not Use For Advertising</h2>
            <p class="mt-3 leading-7">
              We do not create personalised advertising audiences from mental-health conditions,
              assessment results, counselling conversations, session notes, or other sensitive
              health information. Advertising measurement is kept separate from clinical and support
              records.
            </p>
          </section>

          <section>
            <h2 class="text-xl font-bold text-slate-950">Retention And Security</h2>
            <p class="mt-3 leading-7">
              We retain personal information only for as long as needed to provide the requested
              service, meet safety, payment, legal and accounting obligations, resolve disputes, and
              prevent misuse. Retention periods vary by record type. We use access controls,
              encryption in transit, monitoring and restricted administrative access, but no
              internet service can guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 class="text-xl font-bold text-slate-950">Your Choices And Requests</h2>
            <p class="mt-3 leading-7">
              You may ask to access, correct, export or delete eligible personal information, or
              withdraw optional cookie consent. Some records may need to be retained where required
              for safety, fraud prevention, payments or law. Contact us using the address below and
              include enough information for us to verify and respond to your request securely.
            </p>
          </section>

          <section>
            <h2 class="text-xl font-bold text-slate-950">Service Providers</h2>
            <p class="mt-3 leading-7">
              We use carefully selected infrastructure, payment, communications, analytics and
              support providers only for the functions needed to operate Hope Hub. They may process
              limited information under their own terms and our applicable contractual controls.
            </p>
          </section>

          <section>
            <h2 class="text-xl font-bold text-slate-950">Telegram And WhatsApp</h2>
            <p class="mt-3 leading-7">
              If you join Telegram or WhatsApp groups, those platforms may process your account
              information under their own privacy policies. Use display names and privacy settings
              carefully, and avoid sharing sensitive personal details in public groups.
            </p>
          </section>

          <section>
            <h2 class="text-xl font-bold text-slate-950">Health And Emergency Limits</h2>
            <p class="mt-3 leading-7">
              Hope Hub is for supportive counselling, guidance, and mental wellness resources. It is
              not emergency care. If you are in immediate danger, contact local emergency services
              or Tele MANAS at 14416 in India.
            </p>
          </section>

          <section>
            <h2 class="text-xl font-bold text-slate-950">Contact</h2>
            <p class="mt-3 leading-7">
              For privacy questions, contact us at
              <a
                class="font-semibold text-teal-700 hover:text-teal-800"
                href="mailto:{{ APP_CONSTANTS.CONTACT.EMAIL }}"
              >
                {{ APP_CONSTANTS.CONTACT.EMAIL }} </a
              >.
            </p>
          </section>
        </div>
      </section>
    </main>
  `,
})
export class PrivacyPolicyComponent {
  readonly APP_CONSTANTS = APP_CONSTANTS;
}

import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-editorial-policy',
  standalone: true,
  imports: [RouterModule],
  template: `
    <main class="bg-white">
      <section class="border-b border-slate-200 bg-slate-50 py-12 sm:py-16">
        <div class="container mx-auto px-4 sm:px-6 lg:px-8">
          <p class="text-sm font-semibold uppercase text-teal-700">Trust and transparency</p>
          <h1 class="mt-3 text-3xl font-bold text-slate-950 sm:text-4xl">
            Editorial and medical content policy
          </h1>
          <p class="mt-4 max-w-3xl text-base leading-7 text-slate-700">
            This page explains how Hope Hub prepares, reviews, updates, and corrects mental wellness
            information. Our educational content supports informed decisions; it does not replace a
            diagnosis, treatment plan, or emergency care.
          </p>
          <p class="mt-3 text-sm text-slate-600">Last reviewed: August 24, 2026</p>
        </div>
      </section>

      <section class="container mx-auto px-4 py-10 sm:px-6 lg:px-8">
        <div class="mx-auto max-w-4xl space-y-8 text-slate-700">
          <section>
            <h2 class="text-xl font-bold text-slate-950">How content is created</h2>
            <p class="mt-3 leading-7">
              Hope Hub editorial content is written or curated for an Indian audience using plain,
              compassionate language. We favour practical explanations, clearly labelled self-help
              exercises, and information from recognised public-health bodies and peer-reviewed
              research. We do not publish automatically generated health content without human
              review.
            </p>
          </section>

          <section>
            <h2 class="text-xl font-bold text-slate-950">Authors and professional review</h2>
            <p class="mt-3 leading-7">
              Content that has not been reviewed by a named, verifiable professional is attributed
              to the Hope Hub Editorial Team. When a clinician or qualified professional reviews a
              page, we identify that reviewer and their relevant credentials. We do not present peer
              supporters or trained listeners as medical professionals.
            </p>
          </section>

          <section>
            <h2 class="text-xl font-bold text-slate-950">Sources and evidence</h2>
            <p class="mt-3 leading-7">
              Health claims should be supported by reliable sources such as the World Health
              Organization, India’s Ministry of Health and Family Welfare, established clinical
              guidance, or peer-reviewed research. Source links are shown on an article whenever
              they are available. Personal experiences and community guidance are clearly
              distinguished from clinical evidence.
            </p>
          </section>

          <section>
            <h2 class="text-xl font-bold text-slate-950">Updates and corrections</h2>
            <p class="mt-3 leading-7">
              We review content when guidance changes or when a reader, provider, or editor reports
              a concern. Material corrections are reflected in the article’s last-updated date. To
              report an inaccurate, unclear, or unsafe statement, email
              <a class="font-semibold text-primary-700 underline" href="mailto:contact@hopehub.in"
                >contact@hopehub.in</a
              >
              with the page link and the requested correction.
            </p>
          </section>

          <section class="rounded-lg border border-amber-200 bg-amber-50 p-5">
            <h2 class="text-xl font-bold text-slate-950">Safety and emergencies</h2>
            <p class="mt-3 leading-7">
              Hope Hub is not an emergency service. If you or another person may be in immediate
              danger, contact local emergency services. In India, Tele-MANAS mental health support
              is available at <a class="font-semibold underline" href="tel:14416">14416</a>.
            </p>
          </section>

          <p class="text-sm leading-6 text-slate-600">
            Questions about this policy can be sent through our
            <a class="font-semibold text-primary-700 underline" routerLink="/contact"
              >contact page</a
            >.
          </p>
        </div>
      </section>
    </main>
  `,
})
export class EditorialPolicyComponent {}

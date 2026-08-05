import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { APP_CONSTANTS } from '../../core';

type FooterLink = {
  label: string;
  routerLink?: string;
  externalUrl?: string;
  breakAll?: boolean;
};

type FooterSection = {
  title: string;
  links: FooterLink[];
};

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterModule],
  template: `
    <footer class="border-t border-gray-200 bg-white">
      <div class="container mx-auto px-4 py-10 sm:px-6 lg:px-8">
        <div class="grid gap-8 lg:grid-cols-[1.35fr_2fr]">
          <section>
            <a routerLink="/" class="inline-flex items-center" aria-label="Hope Hub homepage">
              <img
                [src]="APP_CONSTANTS.BRAND.LOGO_PATH"
                alt="Hope Hub"
                class="h-12 w-12 rounded-2xl object-cover"
                width="48"
                height="48"
              />
            </a>
            <p class="mt-4 max-w-md text-sm leading-6 text-gray-700">
              Private, affordable mental wellness support with assessments, self-help resources,
              community guidance, and expert-led counselling sessions.
            </p>
            <div class="mt-5 flex flex-col gap-3 sm:flex-row">
              <a routerLink="/contact" class="btn-primary btn-sm">Book session</a>
              <a routerLink="/mental-health-test" class="btn-outline btn-sm">Start test</a>
            </div>
            <div class="mt-5 flex gap-3">
              <a
                href="{{ APP_CONSTANTS.TELEGRAM.GROUP_URL }}"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex min-h-10 min-w-10 items-center justify-center rounded-md border border-gray-200 text-primary-700 transition-colors hover:border-primary-300 hover:bg-primary-50"
              >
                <span class="sr-only">Telegram</span>
                <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path
                    d="M12 0C5.374 0 0 5.373 0 12s5.374 12 12 12 12-5.373 12-12S18.626 0 12 0zm5.568 8.16l-1.61 7.59c-.12.54-.44.67-.89.42l-2.46-1.81-1.19 1.14c-.13.13-.24.24-.49.24l.17-2.43 4.47-4.03c.19-.17-.04-.27-.3-.1L9.28 13.47l-2.38-.75c-.52-.16-.53-.52.11-.77l9.28-3.58c.43-.16.81.11.67.77z"
                  />
                </svg>
              </a>
              <a
                href="{{ APP_CONSTANTS.WHATSAPP.GROUP_URL }}"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex min-h-10 min-w-10 items-center justify-center rounded-md border border-gray-200 text-primary-700 transition-colors hover:border-primary-300 hover:bg-primary-50"
              >
                <span class="sr-only">WhatsApp</span>
                <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path
                    d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"
                  />
                </svg>
              </a>
            </div>
          </section>

          <nav class="grid gap-6 sm:grid-cols-2 lg:grid-cols-4" aria-label="Footer navigation">
            @for (section of footerSections; track section.title) {
              <section>
                <h2 class="text-sm font-semibold uppercase tracking-wide text-gray-950">
                  {{ section.title }}
                </h2>
                <ul class="mt-3 space-y-2 text-sm">
                  @for (link of section.links; track link.label) {
                    <li>
                      @if (link.externalUrl) {
                        <a
                          [href]="link.externalUrl"
                          target="_blank"
                          rel="noopener noreferrer"
                          class="footer-link"
                          [class.break-all]="link.breakAll"
                        >
                          {{ link.label }}
                        </a>
                      } @else {
                        <a
                          [routerLink]="link.routerLink"
                          class="footer-link"
                          [class.break-all]="link.breakAll"
                        >
                          {{ link.label }}
                        </a>
                      }
                    </li>
                  }
                </ul>
              </section>
            }
          </nav>
        </div>

        <div
          class="mt-8 flex flex-col gap-4 border-t border-gray-200 pt-6 lg:flex-row lg:items-center lg:justify-between"
        >
          <p class="text-sm text-gray-600">© {{ currentYear }} Hope Hub. All rights reserved.</p>
          <div class="flex flex-wrap gap-x-5 gap-y-2 text-sm">
            @for (link of bottomLinks; track link.label) {
              <a [routerLink]="link.routerLink" class="footer-link">{{ link.label }}</a>
            }
          </div>
        </div>
      </div>
    </footer>
  `,
  styles: [
    `
      .footer-link {
        color: #4b5f6a;
        text-decoration: none;
        transition: color 160ms ease;
      }

      .footer-link:hover,
      .footer-link:focus-visible {
        color: var(--brand-primary);
      }
    `,
  ],
})
export class FooterComponent {
  currentYear = new Date().getFullYear();
  APP_CONSTANTS = APP_CONSTANTS;

  readonly footerSections: FooterSection[] = [
    {
      title: 'Care & booking',
      links: [
        { label: 'Services', routerLink: '/services' },
        { label: 'Care team', routerLink: '/care-team' },
        { label: 'Care packages', routerLink: '/packages' },
        { label: 'Book session', routerLink: '/contact' },
        { label: 'My consultations', routerLink: '/dashboard' },
        { label: 'My profile', routerLink: '/profile' },
      ],
    },
    {
      title: 'Community',
      links: [
        { label: 'Community', routerLink: '/community' },
        { label: 'Telegram hub', routerLink: '/telegram' },
        { label: 'WhatsApp group', externalUrl: APP_CONSTANTS.WHATSAPP.GROUP_URL },
        { label: 'Events', routerLink: '/events' },
        { label: 'Organisation programs', routerLink: '/organization' },
        { label: 'Join our care network', routerLink: '/careers' },
        { label: 'Support us', routerLink: '/donate' },
      ],
    },
    {
      title: 'Resources & tests',
      links: [
        { label: 'Assessments', routerLink: '/assessments' },
        { label: 'Mental health test', routerLink: '/mental-health-test' },
        { label: 'Anxiety test', routerLink: '/anxiety-test' },
        { label: 'Depression test', routerLink: '/depression-test' },
        { label: 'Stress test', routerLink: '/stress-test' },
        { label: 'Exercises', routerLink: '/exercises' },
        { label: 'Lifestyle tips', routerLink: '/lifestyle-tips' },
        { label: 'Articles', routerLink: '/articles' },
        { label: 'Recorded sessions', routerLink: '/resources' },
      ],
    },
    {
      title: 'Company & legal',
      links: [
        { label: 'About Hope Hub', routerLink: '/about' },
        { label: 'Share feedback', routerLink: '/feedback' },
        { label: 'Privacy policy', routerLink: '/privacy' },
        { label: 'Terms of service', routerLink: '/terms' },
        { label: 'Cancellation & refunds', routerLink: '/refund-policy' },
        { label: 'Payment policy', routerLink: '/payment-policy' },
        { label: 'Service delivery', routerLink: '/shipping-policy' },
        {
          label: APP_CONSTANTS.CONTACT.EMAIL,
          externalUrl: `mailto:${APP_CONSTANTS.CONTACT.EMAIL}`,
          breakAll: true,
        },
      ],
    },
  ];

  readonly bottomLinks: FooterLink[] = [
    { label: 'Telegram', routerLink: '/telegram' },
    { label: 'About', routerLink: '/about' },
    { label: 'Careers', routerLink: '/careers' },
    { label: 'Feedback', routerLink: '/feedback' },
    { label: 'Privacy', routerLink: '/privacy' },
    { label: 'Terms', routerLink: '/terms' },
    { label: 'Refunds', routerLink: '/refund-policy' },
    { label: 'Payments', routerLink: '/payment-policy' },
    { label: 'Service delivery', routerLink: '/shipping-policy' },
  ];
}

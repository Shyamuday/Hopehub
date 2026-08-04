import type { TelegramBotKind } from '@prisma/client';
import type { AssessmentDefinitionRecord } from './assessment-definitions.js';
import { botSlugByKind, telegramPaymentLinks, whatsappLinks } from './telegram-bots.config.js';
import type { InlineButton } from './telegram-bots.types.js';
import { menuCancelRows, webUrl } from './telegram-bots.ui.js';

export type PaymentLinkSession = {
  botKind: TelegramBotKind;
};

export function rupees(amountInPaise: number | null | undefined) {
  if (!amountInPaise || amountInPaise <= 0) return '';
  return `₹${Math.round(amountInPaise / 100)}`;
}

export function withTelegramSource(
  path: string,
  session: PaymentLinkSession,
  extra?: Record<string, string>
) {
  const [basePath, existingQuery = ''] = path.split('?');
  const params = new URLSearchParams(existingQuery);
  params.set('source', 'telegram');
  params.set('utm_source', 'telegram');
  params.set('utm_medium', 'bot');
  params.set('utm_campaign', `hopehub_${botSlugByKind[session.botKind]}_bot`);
  params.set('tgBot', botSlugByKind[session.botKind]);
  if (extra) {
    Object.entries(extra).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
  }
  return `${basePath}?${params.toString()}`;
}

export function assessmentPaymentUrl(
  definition: Pick<AssessmentDefinitionRecord, 'id'>,
  session: PaymentLinkSession
) {
  return webUrl(
    withTelegramSource(`/assessments/${encodeURIComponent(definition.id)}`, session, {
      action: 'pay',
      returnTo: 'telegram'
    })
  );
}

export function sessionPaymentUrl(
  session: PaymentLinkSession,
  paymentMode: 'FULL' | 'PARTIAL' = 'FULL'
) {
  return webUrl(
    withTelegramSource('/contact', session, {
      offering: telegramPaymentLinks.defaultSessionOfferingSlug,
      paymentMode,
      action: 'book_pay'
    })
  );
}

export function dashboardPaymentUrl(session: PaymentLinkSession) {
  return webUrl(withTelegramSource('/dashboard', session, { action: 'retry_payment' }));
}

export function donationPaymentUrl(session: PaymentLinkSession) {
  return webUrl(withTelegramSource('/donate', session, { action: 'donate' }));
}

export function volunteerTalkPaymentUrl(session: PaymentLinkSession) {
  return webUrl(
    withTelegramSource('/contact', session, {
      offering: telegramPaymentLinks.defaultSessionOfferingSlug,
      paymentMode: 'PARTIAL',
      action: 'volunteer_talk_pay'
    })
  );
}

export function volunteerApplicationUrl(session: PaymentLinkSession) {
  return webUrl(withTelegramSource('/careers', session, { action: 'volunteer_apply' }));
}

export function whatsappGroupUrl() {
  return whatsappLinks.groupUrl;
}

export function whatsappJoinButton(): InlineButton {
  return { text: whatsappLinks.label, url: whatsappLinks.groupUrl };
}

export function paymentHubRows(session: PaymentLinkSession): InlineButton[][] {
  return [
    [
      { text: 'Pay for session', url: sessionPaymentUrl(session) },
      { text: 'Pay deposit', url: sessionPaymentUrl(session, 'PARTIAL') }
    ],
    [
      {
        text: 'Paid assessments',
        url: webUrl(withTelegramSource('/assessments', session, { action: 'paid_tests' }))
      },
      { text: 'Retry pending payment', url: dashboardPaymentUrl(session) }
    ],
    [
      { text: 'Volunteer talk payment', url: volunteerTalkPaymentUrl(session) },
      { text: 'Donate', url: donationPaymentUrl(session) }
    ],
    [whatsappJoinButton()],
    [{ text: 'Payment policy', url: webUrl('/payment-policy') }],
    ...menuCancelRows()
  ];
}

import { CareTeamServicePricingMode, TelegramBotKind } from '@prisma/client';
import { prisma } from '../db.js';
import { requireLinked } from './telegram-bots.account.js';
import { sendTelegramMessage } from './telegram-bots.client.js';
import { escapeHtml } from './telegram-bots.helpers.js';
import type { TelegramSession } from './telegram-bots.sessions.js';
import { doctorUrl } from './telegram-bots.ui.js';

function rupees(amountInPaise?: number | null) {
  return amountInPaise ? `₹${Math.round(amountInPaise / 100)}` : 'Free';
}

function pricingLine(service: {
  pricingMode: CareTeamServicePricingMode;
  priceInPaise: number;
  firstSessionPriceInPaise?: number | null;
  followUpPriceInPaise?: number | null;
  packageSessionCount?: number | null;
  packagePriceInPaise?: number | null;
  freeMinutes?: number | null;
  pricePerMinuteInPaise?: number | null;
  durationMinutes: number;
  isFree: boolean;
}) {
  if (service.isFree || service.pricingMode === CareTeamServicePricingMode.FREE_VOLUNTEER) {
    return `Free · ${service.durationMinutes} min`;
  }
  if (service.pricingMode === CareTeamServicePricingMode.FREE_INTRO) {
    return `First free · then ${rupees(service.followUpPriceInPaise ?? service.priceInPaise)} · ${service.durationMinutes} min`;
  }
  if (service.pricingMode === CareTeamServicePricingMode.DISCOUNTED_FIRST) {
    return `First ${rupees(service.firstSessionPriceInPaise)} · then ${rupees(service.followUpPriceInPaise ?? service.priceInPaise)} · ${service.durationMinutes} min`;
  }
  if (service.pricingMode === CareTeamServicePricingMode.PACKAGE) {
    return `${service.packageSessionCount || 1} sessions · ${rupees(service.packagePriceInPaise)} · ${service.durationMinutes} min`;
  }
  if (service.pricingMode === CareTeamServicePricingMode.PER_MINUTE) {
    const freeMinutes = Math.max(0, service.freeMinutes ?? 0);
    const billableMinutes = Math.max(0, service.durationMinutes - freeMinutes);
    return `${freeMinutes ? `First ${freeMinutes} min free · ` : ''}${rupees(service.pricePerMinuteInPaise)}/min · ${billableMinutes} billable min`;
  }
  return `${rupees(service.priceInPaise)} · ${service.durationMinutes} min`;
}

async function providerProfile(userId: string) {
  return prisma.mentalHealthProviderProfile.findFirst({
    where: { doctor: { userId } },
    include: {
      services: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }] },
      doctor: { select: { id: true, user: { select: { name: true } } } }
    }
  });
}

export async function showProviderServices(kind: TelegramBotKind, session: TelegramSession) {
  if (!(await requireLinked(kind, session))) return;
  const profile = await providerProfile(session.linkedUserId!);
  if (!profile) {
    await sendTelegramMessage(kind, {
      chat_id: session.chatId,
      text: 'Care-team profile not found. Please complete provider signup or ask admin to approve your profile.',
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Apply / join care team', callback_data: 'doctor:signup' }],
          [{ text: 'Open provider portal', url: doctorUrl('/') }]
        ]
      }
    });
    return;
  }

  const servicesText = profile.services.length
    ? profile.services
        .map(
          (service, index) =>
            `${index + 1}. <b>${escapeHtml(service.title)}</b> · ${service.isActive ? 'Active' : 'Inactive'}\n${escapeHtml(pricingLine(service))}`
        )
        .join('\n\n')
    : 'No services yet. Add one from a pricing template.';

  await sendTelegramMessage(kind, {
    chat_id: session.chatId,
    text: [`<b>My services & pricing</b>`, '', servicesText].join('\n'),
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Add from pricing template', callback_data: 'provider:services:templates' }],
        ...profile.services.slice(0, 8).map((service) => [
          {
            text: `${service.isActive ? 'Pause' : 'Activate'} ${service.title.slice(0, 22)}`,
            callback_data: `provider:service:toggle:${service.id}`
          },
          {
            text: `Use template`,
            callback_data: `provider:service:templates:${service.id}`
          }
        ]),
        [{ text: 'Open provider portal', url: doctorUrl('/profile') }],
        [{ text: 'Main menu', callback_data: 'common:menu' }]
      ]
    }
  });
}

export async function showProviderPricingTemplates(
  kind: TelegramBotKind,
  session: TelegramSession,
  serviceId?: string
) {
  if (!(await requireLinked(kind, session))) return;
  const profile = await providerProfile(session.linkedUserId!);
  if (!profile) {
    await showProviderServices(kind, session);
    return;
  }
  if (serviceId && !profile.services.some((service) => service.id === serviceId)) {
    await sendTelegramMessage(kind, {
      chat_id: session.chatId,
      text: 'This service was not found in your profile.',
      reply_markup: {
        inline_keyboard: [[{ text: 'My services', callback_data: 'provider:services' }]]
      }
    });
    return;
  }

  const templates = await prisma.careTeamPricingTemplate.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
    take: 10
  });

  if (!templates.length) {
    await sendTelegramMessage(kind, {
      chat_id: session.chatId,
      text: 'No pricing templates are active right now. Please ask admin to create templates.',
      reply_markup: {
        inline_keyboard: [[{ text: 'My services', callback_data: 'provider:services' }]]
      }
    });
    return;
  }

  await sendTelegramMessage(kind, {
    chat_id: session.chatId,
    text: [
      serviceId ? '<b>Update service pricing</b>' : '<b>Add service from template</b>',
      'Choose a pricing template. You can fine-tune full details later in the provider portal.',
      '',
      ...templates.map(
        (template, index) =>
          `${index + 1}. ${escapeHtml(template.title)} · ${escapeHtml(pricingLine(template))}`
      )
    ].join('\n'),
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        ...templates.map((template) => [
          {
            text: template.title.slice(0, 42),
            callback_data: serviceId
              ? `provider:service:apply_template:${serviceId}:${template.id}`
              : `provider:service:create_template:${template.id}`
          }
        ]),
        [{ text: 'My services', callback_data: 'provider:services' }]
      ]
    }
  });
}

export async function createProviderServiceFromTemplate(
  kind: TelegramBotKind,
  session: TelegramSession,
  templateId: string
) {
  if (!(await requireLinked(kind, session))) return;
  const [profile, template] = await Promise.all([
    providerProfile(session.linkedUserId!),
    prisma.careTeamPricingTemplate.findFirst({ where: { id: templateId, isActive: true } })
  ]);
  if (!profile || !template) {
    await sendTelegramMessage(kind, {
      chat_id: session.chatId,
      text: 'Could not create service. Profile or template was not found.',
      reply_markup: {
        inline_keyboard: [[{ text: 'My services', callback_data: 'provider:services' }]]
      }
    });
    return;
  }

  await prisma.careTeamService.create({
    data: {
      mentalHealthProfileId: profile.id,
      providerRole: profile.careTeamType,
      providerRoleCode: profile.careTeamType,
      title: template.title,
      description: template.description,
      pricingMode: template.pricingMode,
      priceInPaise: template.priceInPaise,
      firstSessionPriceInPaise: template.firstSessionPriceInPaise,
      followUpPriceInPaise: template.followUpPriceInPaise,
      introSessionLimit: template.introSessionLimit,
      packageSessionCount: template.packageSessionCount,
      packagePriceInPaise: template.packagePriceInPaise,
      freeMinutes: template.freeMinutes,
      pricePerMinuteInPaise: template.pricePerMinuteInPaise,
      durationMinutes: template.durationMinutes,
      isFree: template.isFree,
      isActive: true,
      sortOrder: profile.services.length + 1
    }
  });

  await sendTelegramMessage(kind, {
    chat_id: session.chatId,
    text: `Service added: ${escapeHtml(template.title)}\n${escapeHtml(pricingLine(template))}`,
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [[{ text: 'My services', callback_data: 'provider:services' }]]
    }
  });
}

export async function applyTemplateToProviderService(
  kind: TelegramBotKind,
  session: TelegramSession,
  serviceId: string,
  templateId: string
) {
  if (!(await requireLinked(kind, session))) return;
  const [profile, template] = await Promise.all([
    providerProfile(session.linkedUserId!),
    prisma.careTeamPricingTemplate.findFirst({ where: { id: templateId, isActive: true } })
  ]);
  const service = profile?.services.find((item) => item.id === serviceId);
  if (!profile || !service || !template) {
    await sendTelegramMessage(kind, {
      chat_id: session.chatId,
      text: 'Could not update service. Service or template was not found.',
      reply_markup: {
        inline_keyboard: [[{ text: 'My services', callback_data: 'provider:services' }]]
      }
    });
    return;
  }

  await prisma.careTeamService.update({
    where: { id: service.id },
    data: {
      description: template.description,
      pricingMode: template.pricingMode,
      priceInPaise: template.priceInPaise,
      firstSessionPriceInPaise: template.firstSessionPriceInPaise,
      followUpPriceInPaise: template.followUpPriceInPaise,
      introSessionLimit: template.introSessionLimit,
      packageSessionCount: template.packageSessionCount,
      packagePriceInPaise: template.packagePriceInPaise,
      freeMinutes: template.freeMinutes,
      pricePerMinuteInPaise: template.pricePerMinuteInPaise,
      durationMinutes: template.durationMinutes,
      isFree: template.isFree,
      isActive: true
    }
  });

  await sendTelegramMessage(kind, {
    chat_id: session.chatId,
    text: `Service updated: ${escapeHtml(service.title)}\nNew pricing: ${escapeHtml(pricingLine(template))}`,
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [[{ text: 'My services', callback_data: 'provider:services' }]]
    }
  });
}

export async function toggleProviderService(
  kind: TelegramBotKind,
  session: TelegramSession,
  serviceId: string
) {
  if (!(await requireLinked(kind, session))) return;
  const profile = await providerProfile(session.linkedUserId!);
  const service = profile?.services.find((item) => item.id === serviceId);
  if (!profile || !service) {
    await sendTelegramMessage(kind, {
      chat_id: session.chatId,
      text: 'Service was not found in your profile.',
      reply_markup: {
        inline_keyboard: [[{ text: 'My services', callback_data: 'provider:services' }]]
      }
    });
    return;
  }

  const updated = await prisma.careTeamService.update({
    where: { id: service.id },
    data: { isActive: !service.isActive }
  });

  await sendTelegramMessage(kind, {
    chat_id: session.chatId,
    text: `${escapeHtml(updated.title)} is now ${updated.isActive ? 'active' : 'inactive'}.`,
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [[{ text: 'My services', callback_data: 'provider:services' }]]
    }
  });
}

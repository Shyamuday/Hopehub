import { TelegramBotKind } from '@prisma/client';
import { prisma } from '../db.js';
import {
  defaultGenerationRange,
  generateSlotsForAvailabilityRule
} from './provider-availability.js';
import { requireLinked } from './telegram-bots.account.js';
import { sendTelegramMessage } from './telegram-bots.client.js';
import { escapeHtml } from './telegram-bots.helpers.js';
import type { TelegramSession } from './telegram-bots.sessions.js';
import { doctorUrl } from './telegram-bots.ui.js';

const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const timePresets = [
  { key: 'morning', label: 'Morning 9-12', startTime: '09:00', endTime: '12:00' },
  { key: 'afternoon', label: 'Afternoon 2-5', startTime: '14:00', endTime: '17:00' },
  { key: 'evening', label: 'Evening 6-9', startTime: '18:00', endTime: '21:00' },
  { key: 'night', label: 'Night 8-10', startTime: '20:00', endTime: '22:00' }
] as const;

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

async function providerDoctor(userId: string) {
  return prisma.doctor.findUnique({
    where: { userId },
    select: {
      id: true,
      mentalHealthProfile: {
        select: {
          services: {
            where: { isActive: true },
            select: { id: true, title: true, durationMinutes: true },
            orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }]
          }
        }
      }
    }
  });
}

export async function showProviderAvailability(kind: TelegramBotKind, session: TelegramSession) {
  if (!(await requireLinked(kind, session))) return;
  const doctor = await providerDoctor(session.linkedUserId!);
  if (!doctor) {
    await sendTelegramMessage(kind, {
      chat_id: session.chatId,
      text: 'Doctor/care-team profile not found. Please complete provider signup first.',
      reply_markup: {
        inline_keyboard: [[{ text: 'Apply / join care team', callback_data: 'doctor:signup' }]]
      }
    });
    return;
  }

  const rules = await prisma.providerAvailabilityRule.findMany({
    where: { doctorId: doctor.id },
    include: { careTeamService: { select: { title: true, durationMinutes: true } } },
    orderBy: [{ isActive: 'desc' }, { weekday: 'asc' }, { startTime: 'asc' }],
    take: 8
  });
  const rows =
    rules
      .map(
        (rule, index) =>
          `${index + 1}. <b>${escapeHtml(rule.label)}</b> · ${rule.isActive ? 'Active' : 'Paused'}\n${weekdays[rule.weekday]} ${rule.startTime}-${rule.endTime} · ${rule.slotDurationMinutes} min${rule.careTeamService ? ` · ${escapeHtml(rule.careTeamService.title)}` : ''}`
      )
      .join('\n\n') || 'No weekly availability rules yet.';

  await sendTelegramMessage(kind, {
    chat_id: session.chatId,
    text: ['<b>My weekly availability</b>', '', rows].join('\n'),
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Add availability', callback_data: 'provider:availability:add' }],
        ...rules.map((rule) => [
          {
            text: `${rule.isActive ? 'Pause' : 'Activate'} ${weekdays[rule.weekday]} ${rule.startTime}`,
            callback_data: `provider:availability:toggle:${rule.id}`
          },
          {
            text: 'Generate slots',
            callback_data: `provider:availability:generate:${rule.id}`
          }
        ]),
        [{ text: 'Open slots', url: doctorUrl('/slots') }],
        [{ text: 'Main menu', callback_data: 'common:menu' }]
      ]
    }
  });
}

export async function chooseAvailabilityService(kind: TelegramBotKind, session: TelegramSession) {
  if (!(await requireLinked(kind, session))) return;
  const doctor = await providerDoctor(session.linkedUserId!);
  const services = doctor?.mentalHealthProfile?.services ?? [];
  if (!doctor) {
    await showProviderAvailability(kind, session);
    return;
  }

  await sendTelegramMessage(kind, {
    chat_id: session.chatId,
    text: '<b>Availability service</b>\nChoose which service this weekly availability is for.',
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [{ text: 'General availability', callback_data: 'provider:availability:service:none' }],
        ...services.slice(0, 8).map((service) => [
          {
            text: `${service.title.slice(0, 36)} · ${service.durationMinutes}m`,
            callback_data: `provider:availability:service:${service.id}`
          }
        ]),
        [{ text: 'Back', callback_data: 'provider:availability' }]
      ]
    }
  });
}

export async function chooseAvailabilityDay(
  kind: TelegramBotKind,
  session: TelegramSession,
  serviceId: string | null
) {
  if (!(await requireLinked(kind, session))) return;
  await sendTelegramMessage(kind, {
    chat_id: session.chatId,
    text: '<b>Choose day</b>\nSelect a weekly day for this availability.',
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [
          { text: 'Mon', callback_data: `provider:availability:day:${serviceId || 'none'}:1` },
          { text: 'Tue', callback_data: `provider:availability:day:${serviceId || 'none'}:2` },
          { text: 'Wed', callback_data: `provider:availability:day:${serviceId || 'none'}:3` }
        ],
        [
          { text: 'Thu', callback_data: `provider:availability:day:${serviceId || 'none'}:4` },
          { text: 'Fri', callback_data: `provider:availability:day:${serviceId || 'none'}:5` },
          { text: 'Sat', callback_data: `provider:availability:day:${serviceId || 'none'}:6` }
        ],
        [{ text: 'Sun', callback_data: `provider:availability:day:${serviceId || 'none'}:0` }],
        [{ text: 'Back', callback_data: 'provider:availability:add' }]
      ]
    }
  });
}

export async function chooseAvailabilityTime(
  kind: TelegramBotKind,
  session: TelegramSession,
  serviceId: string | null,
  weekday: number
) {
  if (!(await requireLinked(kind, session))) return;
  await sendTelegramMessage(kind, {
    chat_id: session.chatId,
    text: `<b>Choose time</b>\n${weekdays[weekday]} availability. Slots will be generated for next 30 days.`,
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        ...timePresets.map((preset) => [
          {
            text: preset.label,
            callback_data: `provider:availability:create:${serviceId || 'none'}:${weekday}:${preset.key}`
          }
        ]),
        [{ text: 'Back', callback_data: `provider:availability:service:${serviceId || 'none'}` }]
      ]
    }
  });
}

export async function createAvailabilityRuleFromPreset(
  kind: TelegramBotKind,
  session: TelegramSession,
  serviceId: string | null,
  weekday: number,
  presetKey: string
) {
  if (!(await requireLinked(kind, session))) return;
  const doctor = await providerDoctor(session.linkedUserId!);
  const preset = timePresets.find((item) => item.key === presetKey);
  if (!doctor || !preset || weekday < 0 || weekday > 6) {
    await showProviderAvailability(kind, session);
    return;
  }
  const selectedService = serviceId
    ? doctor.mentalHealthProfile?.services.find((service) => service.id === serviceId)
    : null;
  if (serviceId && !selectedService) {
    await sendTelegramMessage(kind, {
      chat_id: session.chatId,
      text: 'Selected service was not found in your active services.',
      reply_markup: {
        inline_keyboard: [[{ text: 'Availability', callback_data: 'provider:availability' }]]
      }
    });
    return;
  }

  const duration = selectedService?.durationMinutes || 30;
  const rule = await prisma.providerAvailabilityRule.create({
    data: {
      doctorId: doctor.id,
      careTeamServiceId: selectedService?.id ?? null,
      label: `${weekdays[weekday]} ${preset.label}`,
      weekday,
      startTime: preset.startTime,
      endTime: preset.endTime,
      slotDurationMinutes: duration,
      bufferMinutes: 0,
      startsOn: new Date(todayIso())
    },
    include: { careTeamService: { select: { title: true } } }
  });
  const generated = await generateSlotsForAvailabilityRule(
    rule.id,
    defaultGenerationRange().from,
    defaultGenerationRange().to
  );

  await sendTelegramMessage(kind, {
    chat_id: session.chatId,
    text: [
      '<b>Availability added</b>',
      `${weekdays[rule.weekday]} ${rule.startTime}-${rule.endTime}`,
      rule.careTeamService
        ? `Service: ${escapeHtml(rule.careTeamService.title)}`
        : 'Service: General',
      `Generated slots: ${generated.generated}`
    ].join('\n'),
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [[{ text: 'Availability', callback_data: 'provider:availability' }]]
    }
  });
}

export async function toggleAvailabilityRule(
  kind: TelegramBotKind,
  session: TelegramSession,
  ruleId: string
) {
  if (!(await requireLinked(kind, session))) return;
  const doctor = await providerDoctor(session.linkedUserId!);
  const rule = doctor
    ? await prisma.providerAvailabilityRule.findFirst({
        where: { id: ruleId, doctorId: doctor.id },
        select: { id: true, isActive: true, label: true }
      })
    : null;
  if (!rule) {
    await sendTelegramMessage(kind, {
      chat_id: session.chatId,
      text: 'Availability rule was not found.',
      reply_markup: {
        inline_keyboard: [[{ text: 'Availability', callback_data: 'provider:availability' }]]
      }
    });
    return;
  }
  const updated = await prisma.providerAvailabilityRule.update({
    where: { id: rule.id },
    data: { isActive: !rule.isActive }
  });
  await sendTelegramMessage(kind, {
    chat_id: session.chatId,
    text: `${escapeHtml(updated.label)} is now ${updated.isActive ? 'active' : 'paused'}.`,
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [[{ text: 'Availability', callback_data: 'provider:availability' }]]
    }
  });
}

export async function generateAvailabilitySlots(
  kind: TelegramBotKind,
  session: TelegramSession,
  ruleId: string
) {
  if (!(await requireLinked(kind, session))) return;
  const doctor = await providerDoctor(session.linkedUserId!);
  const rule = doctor
    ? await prisma.providerAvailabilityRule.findFirst({
        where: { id: ruleId, doctorId: doctor.id },
        select: { id: true, label: true }
      })
    : null;
  if (!rule) {
    await showProviderAvailability(kind, session);
    return;
  }
  const generated = await generateSlotsForAvailabilityRule(
    rule.id,
    defaultGenerationRange().from,
    defaultGenerationRange().to
  );
  await sendTelegramMessage(kind, {
    chat_id: session.chatId,
    text: `${escapeHtml(rule.label)} slots generated: ${generated.generated} new/updated, ${generated.skipped} skipped.`,
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [[{ text: 'Availability', callback_data: 'provider:availability' }]]
    }
  });
}

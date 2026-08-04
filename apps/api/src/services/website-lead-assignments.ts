import type { WebsiteLeadAssignmentType } from '@prisma/client';
import { TelegramBotKind } from '@prisma/client';
import { prisma } from '../db.js';
import { sendTelegramMessage } from './telegram-bots.client.js';
import { escapeHtml } from './telegram-bots.helpers.js';

export function isSafetyLead(concern?: string | null) {
  return /safety|self[-\s]?harm|suicide|unsafe|danger|emergency|violence|overdose/i.test(
    concern || ''
  );
}

function providerRoleFromDoctor(doctor: {
  doctorType: string;
  specialty: string;
  designation: string | null;
  department: string | null;
  focusAreas: string[];
  mentalHealthProfile?: {
    qualifications: string[];
    modalities: string[];
    sessionTypes: string[];
  } | null;
}): WebsiteLeadAssignmentType {
  const text = [
    doctor.doctorType,
    doctor.specialty,
    doctor.designation,
    doctor.department,
    ...doctor.focusAreas,
    ...(doctor.mentalHealthProfile?.qualifications ?? []),
    ...(doctor.mentalHealthProfile?.modalities ?? []),
    ...(doctor.mentalHealthProfile?.sessionTypes ?? [])
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return /psycholog/.test(text) ? 'PSYCHOLOGIST' : 'VOLUNTEER';
}

export async function listAssignableLeadProviders(params: { safety?: boolean } = {}) {
  const doctors = await prisma.doctor.findMany({
    where: {
      showOnWebsite: true,
      isAvailable: true,
      user: { isActive: true },
      OR: [
        { doctorType: 'PSYCHOLOGIST' },
        { specialty: { contains: 'psycholog', mode: 'insensitive' } },
        { designation: { contains: 'psycholog', mode: 'insensitive' } },
        { specialty: { contains: 'volunteer', mode: 'insensitive' } },
        { designation: { contains: 'volunteer', mode: 'insensitive' } },
        { specialty: { contains: 'peer support', mode: 'insensitive' } },
        { designation: { contains: 'peer support', mode: 'insensitive' } },
        { department: { contains: 'volunteer', mode: 'insensitive' } },
        {
          focusAreas: {
            hasSome: ['Volunteer support', 'Peer support', 'Non-clinical peer support']
          }
        }
      ]
    },
    orderBy: [{ websiteOrder: { sort: 'asc', nulls: 'last' } }, { user: { name: 'asc' } }],
    select: {
      id: true,
      userId: true,
      doctorType: true,
      specialty: true,
      designation: true,
      department: true,
      focusAreas: true,
      user: { select: { id: true, name: true, email: true } },
      mentalHealthProfile: {
        select: { qualifications: true, modalities: true, sessionTypes: true }
      }
    }
  });
  return doctors
    .map((doctor) => ({
      doctorId: doctor.id,
      providerId: doctor.userId,
      name: doctor.user.name,
      email: doctor.user.email,
      specialty: doctor.specialty,
      designation: doctor.designation,
      assignmentType: providerRoleFromDoctor(doctor)
    }))
    .filter((provider) => !params.safety || provider.assignmentType === 'PSYCHOLOGIST');
}

export async function notifyProviderAboutLeadAssignment(input: {
  assignmentId: string;
  providerId: string | null;
  lead: {
    id: string;
    visitorName: string | null;
    visitorEmail: string | null;
    visitorPhone: string | null;
    concern: string | null;
    preferredCallbackTime: string | null;
  };
}) {
  if (!input.providerId) return;
  const providerSessions = await prisma.telegramBotSession.findMany({
    where: {
      botKind: TelegramBotKind.DOCTOR,
      linkedUserId: input.providerId,
      linkedUser: { isActive: true, role: 'DOCTOR' }
    },
    select: { chatId: true }
  });
  if (!providerSessions.length) return;

  await Promise.allSettled(
    providerSessions.map((providerSession) =>
      sendTelegramMessage(TelegramBotKind.DOCTOR, {
        chat_id: providerSession.chatId,
        text: [
          '<b>New assigned support lead</b>',
          `Lead: ${escapeHtml(input.lead.id.slice(-8))}`,
          `User: ${escapeHtml(input.lead.visitorName || 'Visitor')}`,
          input.lead.visitorEmail ? `Email: ${escapeHtml(input.lead.visitorEmail)}` : '',
          input.lead.visitorPhone ? `Phone: ${escapeHtml(input.lead.visitorPhone)}` : '',
          `Concern: ${escapeHtml(input.lead.concern || 'No concern added')}`,
          input.lead.preferredCallbackTime
            ? `Preferred time: ${escapeHtml(input.lead.preferredCallbackTime)}`
            : '',
          '',
          'Please accept if you can handle this.'
        ]
          .filter(Boolean)
          .join('\n'),
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              { text: 'Accept', callback_data: `provider:assign:accept:${input.assignmentId}` },
              { text: 'Decline', callback_data: `provider:assign:decline:${input.assignmentId}` }
            ],
            [
              {
                text: 'Mark contacted',
                callback_data: `provider:assign:contacted:${input.assignmentId}`
              },
              { text: 'Complete', callback_data: `provider:assign:complete:${input.assignmentId}` }
            ],
            [{ text: 'My assignments', callback_data: 'doctor:assignments' }]
          ]
        }
      })
    )
  );
}

export async function assignWebsiteLead(input: {
  leadId: string;
  providerId: string;
  assignedById: string;
  assignedByName?: string | null;
}) {
  const lead = await prisma.websiteLead.findUnique({
    where: { id: input.leadId },
    select: {
      id: true,
      visitorName: true,
      visitorEmail: true,
      visitorPhone: true,
      concern: true,
      preferredCallbackTime: true,
      operatorNote: true
    }
  });
  if (!lead) throw new Error('LEAD_NOT_FOUND');

  const provider = await prisma.doctor.findFirst({
    where: { userId: input.providerId, user: { isActive: true } },
    select: {
      id: true,
      userId: true,
      doctorType: true,
      specialty: true,
      designation: true,
      department: true,
      focusAreas: true,
      user: { select: { id: true, name: true, email: true } },
      mentalHealthProfile: {
        select: { qualifications: true, modalities: true, sessionTypes: true }
      }
    }
  });
  if (!provider) throw new Error('PROVIDER_NOT_FOUND');

  const assignmentType = providerRoleFromDoctor(provider);
  if (isSafetyLead(lead.concern) && assignmentType !== 'PSYCHOLOGIST') {
    throw new Error('SAFETY_LEAD_REQUIRES_PSYCHOLOGIST');
  }

  const now = new Date();
  const note = `[Admin] Assigned to ${provider.user.name} by ${input.assignedByName || 'admin'} at ${now.toISOString()}`;
  const assignment = await prisma.websiteLeadAssignment.create({
    data: {
      leadId: input.leadId,
      providerId: provider.userId,
      assignedById: input.assignedById,
      assignmentType,
      status: 'PENDING',
      note
    }
  });
  await prisma.websiteLead.update({
    where: { id: input.leadId },
    data: {
      followUpStatus: 'NEEDS_CALLBACK',
      operatorNote: [note, lead.operatorNote].filter(Boolean).join('\n')
    }
  });
  await notifyProviderAboutLeadAssignment({
    assignmentId: assignment.id,
    providerId: provider.userId,
    lead
  });
  return { assignment, provider: provider.user };
}

export async function cancelWebsiteLeadAssignment(input: {
  assignmentId: string;
  actorName?: string | null;
}) {
  const assignment = await prisma.websiteLeadAssignment.findUnique({
    where: { id: input.assignmentId },
    include: { lead: { select: { id: true, operatorNote: true } } }
  });
  if (!assignment) throw new Error('ASSIGNMENT_NOT_FOUND');
  const now = new Date();
  const note = `[Admin] Assignment cancelled by ${input.actorName || 'admin'} at ${now.toISOString()}`;
  const updated = await prisma.websiteLeadAssignment.update({
    where: { id: input.assignmentId },
    data: { status: 'CANCELLED', note: [note, assignment.note].filter(Boolean).join('\n') }
  });
  await prisma.websiteLead.update({
    where: { id: assignment.leadId },
    data: { operatorNote: [note, assignment.lead.operatorNote].filter(Boolean).join('\n') }
  });
  return updated;
}

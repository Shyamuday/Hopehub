import {
  ConsultationReminderStatus,
  ConsultationReminderType,
  ConsultationStatus,
  Role
} from '@prisma/client';
import { SCHEDULER_CONFIG } from '../constants/config.constants.js';
import { prisma } from '../db.js';
import { enabledNotificationChannels, notificationService } from './notification-service.js';
import {
  notifyProviderBookingOnTelegram,
  notifyUserBookingOnTelegram
} from './telegram-provider-notifications.js';

export const consultationReminderSweepEnabled =
  (process.env.CONSULTATION_REMINDER_SWEEP_ENABLED || 'true').toLowerCase() !== 'false';

export const consultationReminderSweepIntervalMs = Math.max(
  60_000,
  Number(process.env.CONSULTATION_REMINDER_SWEEP_INTERVAL_MS || 5 * 60_000)
);

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {};
}

function time24HourFromDisplay(value: string) {
  const trimmed = value.trim();
  if (/^\d{2}:\d{2}$/.test(trimmed)) return trimmed;
  const match = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return '';
  let hour = Number(match[1]);
  const minute = match[2];
  const suffix = match[3].toUpperCase();
  if (suffix === 'PM' && hour !== 12) hour += 12;
  if (suffix === 'AM' && hour === 12) hour = 0;
  return `${String(hour).padStart(2, '0')}:${minute}`;
}

function appointmentDateTime(intakeAnswers: unknown): Date | null {
  const intake = asRecord(intakeAnswers);
  const date = String(intake['appointmentDate'] || '').trim();
  const time = time24HourFromDisplay(String(intake['appointmentTime'] || '').trim());
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !time) return null;
  const parsed = new Date(`${date}T${time}:00+05:30`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function appointmentLabel(date: Date | null) {
  if (!date) return 'your session time';
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata'
  }).format(date);
}

async function consultationForReminders(consultationId: string) {
  return prisma.consultation.findUnique({
    where: { id: consultationId },
    select: {
      id: true,
      status: true,
      patientId: true,
      assignedDoctorId: true,
      intakeAnswers: true,
      pricingSnapshot: true,
      patient: { select: { id: true, name: true, mobile: true, email: true } },
      assignedDoctor: { select: { id: true, name: true, mobile: true, email: true } },
      disease: { select: { name: true } }
    }
  });
}

async function activeAdmins() {
  return prisma.user.findMany({
    where: { role: Role.ADMIN, isActive: true },
    select: { id: true, name: true, mobile: true, email: true }
  });
}

async function sendToUser(input: {
  eventType:
    | 'BOOKING_CONFIRMED'
    | 'BOOKING_REMINDER'
    | 'BOOKING_CANCELLED'
    | 'BOOKING_UNASSIGNED_ALERT'
    | 'PROVIDER_BOOKING_ASSIGNED'
    | 'SESSION_MISSED';
  user: { id: string; name: string; mobile: string | null; email: string | null };
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
}) {
  await notificationService.sendBatch(
    enabledNotificationChannels.map((channel) => ({
      eventType: input.eventType,
      channel,
      recipientId: input.user.id,
      recipientName: input.user.name,
      recipientMobile: input.user.mobile,
      recipientEmail: input.user.email,
      title: input.title,
      body: input.body,
      metadata: input.metadata
    }))
  );
}

export async function scheduleConsultationReminders(consultationId: string) {
  const consultation = await consultationForReminders(consultationId);
  if (!consultation) return { scheduled: 0 };
  const appointment = appointmentDateTime(consultation.intakeAnswers);
  if (!appointment) return { scheduled: 0 };

  const recipients = [consultation.patient, consultation.assignedDoctor].filter(Boolean) as Array<{
    id: string;
  }>;
  const candidates = [
    {
      type: ConsultationReminderType.SESSION_24H,
      scheduledFor: new Date(appointment.getTime() - 24 * 60 * 60 * 1000)
    },
    {
      type: ConsultationReminderType.SESSION_1H,
      scheduledFor: new Date(appointment.getTime() - 60 * 60 * 1000)
    }
  ];
  let scheduled = 0;
  for (const recipient of recipients) {
    for (const candidate of candidates) {
      if (candidate.scheduledFor <= new Date()) continue;
      await prisma.consultationReminder.upsert({
        where: {
          consultationId_recipientUserId_type: {
            consultationId,
            recipientUserId: recipient.id,
            type: candidate.type
          }
        },
        create: {
          consultationId,
          recipientUserId: recipient.id,
          type: candidate.type,
          scheduledFor: candidate.scheduledFor,
          metadata: { appointmentAt: appointment.toISOString() }
        },
        update: {
          status: ConsultationReminderStatus.PENDING,
          scheduledFor: candidate.scheduledFor,
          cancelledAt: null,
          metadata: { appointmentAt: appointment.toISOString() }
        }
      });
      scheduled += 1;
    }
  }

  const missedAt = new Date(appointment.getTime() + 30 * 60 * 1000);
  await prisma.consultationReminder.upsert({
    where: {
      consultationId_recipientUserId_type: {
        consultationId,
        recipientUserId: consultation.patientId,
        type: ConsultationReminderType.MISSED_SESSION_FOLLOW_UP
      }
    },
    create: {
      consultationId,
      recipientUserId: consultation.patientId,
      type: ConsultationReminderType.MISSED_SESSION_FOLLOW_UP,
      scheduledFor: missedAt,
      metadata: { appointmentAt: appointment.toISOString() }
    },
    update: {
      status: ConsultationReminderStatus.PENDING,
      scheduledFor: missedAt,
      cancelledAt: null,
      metadata: { appointmentAt: appointment.toISOString() }
    }
  });

  return { scheduled: scheduled + 1 };
}

export async function notifyConsultationBooked(consultationId: string) {
  const consultation = await consultationForReminders(consultationId);
  if (!consultation) return;
  const appointment = appointmentDateTime(consultation.intakeAnswers);
  const service =
    asRecord(consultation.pricingSnapshot)['careTeamServiceTitle'] ||
    consultation.disease?.name ||
    'session';
  await sendToUser({
    eventType: 'BOOKING_CONFIRMED',
    user: consultation.patient,
    title: 'Session booked — Hope Hub',
    body: `Your ${service} is booked for ${appointmentLabel(appointment)}.`,
    metadata: { consultationId, appointmentAt: appointment?.toISOString() ?? null }
  });
  void notifyUserBookingOnTelegram({
    userId: consultation.patient.id,
    consultationId,
    title: 'Session booked — Hope Hub',
    body: `Your ${service} is booked for ${appointmentLabel(appointment)}.`
  }).catch((error) => console.error('[telegram-user] booking notification failed', error));

  if (consultation.assignedDoctor) {
    await sendToUser({
      eventType: 'PROVIDER_BOOKING_ASSIGNED',
      user: consultation.assignedDoctor,
      title: 'New session assigned',
      body: `${consultation.patient.name} booked ${service} for ${appointmentLabel(appointment)}.`,
      metadata: { consultationId, appointmentAt: appointment?.toISOString() ?? null }
    });
    void notifyProviderBookingOnTelegram({
      providerUserId: consultation.assignedDoctor.id,
      consultationId,
      title: 'New session assigned',
      body: `${consultation.patient.name} booked ${service} for ${appointmentLabel(appointment)}.`
    }).catch((error) => console.error('[telegram-provider] booking notification failed', error));
  } else {
    const admins = await activeAdmins();
    await Promise.all(
      admins.map((admin) =>
        sendToUser({
          eventType: 'BOOKING_UNASSIGNED_ALERT',
          user: admin,
          title: 'Booking needs assignment',
          body: `${consultation.patient.name} booked ${service} for ${appointmentLabel(appointment)}. Please assign a care team member.`,
          metadata: { consultationId, appointmentAt: appointment?.toISOString() ?? null }
        })
      )
    );
  }
  await scheduleConsultationReminders(consultationId);
}

export async function notifyProviderAssignedAndSchedule(consultationId: string) {
  const consultation = await consultationForReminders(consultationId);
  if (!consultation?.assignedDoctor) return;
  const appointment = appointmentDateTime(consultation.intakeAnswers);
  await sendToUser({
    eventType: 'PROVIDER_BOOKING_ASSIGNED',
    user: consultation.assignedDoctor,
    title: 'Session assigned to you',
    body: `${consultation.patient.name}'s session is scheduled for ${appointmentLabel(appointment)}.`,
    metadata: { consultationId, appointmentAt: appointment?.toISOString() ?? null }
  });
  void notifyUserBookingOnTelegram({
    userId: consultation.patient.id,
    consultationId,
    title: 'Care provider assigned',
    body: `Your Hope Hub session now has an assigned care provider and is scheduled for ${appointmentLabel(appointment)}.`
  }).catch((error) => console.error('[telegram-user] assignment notification failed', error));
  void notifyProviderBookingOnTelegram({
    providerUserId: consultation.assignedDoctor.id,
    consultationId,
    title: 'Session assigned to you',
    body: `${consultation.patient.name}'s session is scheduled for ${appointmentLabel(appointment)}.`
  }).catch((error) => console.error('[telegram-provider] assignment notification failed', error));
  await scheduleConsultationReminders(consultationId);
}

export async function cancelConsultationReminders(consultationId: string, reason?: string | null) {
  await prisma.consultationReminder.updateMany({
    where: { consultationId, status: ConsultationReminderStatus.PENDING },
    data: {
      status: ConsultationReminderStatus.CANCELLED,
      cancelledAt: new Date(),
      metadata: reason ? { reason } : undefined
    }
  });
  const consultation = await consultationForReminders(consultationId);
  if (!consultation) return;
  await sendToUser({
    eventType: 'BOOKING_CANCELLED',
    user: consultation.patient,
    title: 'Session cancelled',
    body: `Your session has been cancelled${reason ? `: ${reason}` : '.'}`,
    metadata: { consultationId, reason: reason ?? null }
  });
  void notifyUserBookingOnTelegram({
    userId: consultation.patient.id,
    consultationId,
    title: 'Session cancelled',
    body: `Your session was cancelled${reason ? `: ${reason}` : '.'}`
  }).catch((error) => console.error('[telegram-user] cancellation notification failed', error));
  if (consultation.assignedDoctor) {
    await sendToUser({
      eventType: 'BOOKING_CANCELLED',
      user: consultation.assignedDoctor,
      title: 'Assigned session cancelled',
      body: `${consultation.patient.name}'s session has been cancelled${reason ? `: ${reason}` : '.'}`,
      metadata: { consultationId, reason: reason ?? null }
    });
    void notifyProviderBookingOnTelegram({
      providerUserId: consultation.assignedDoctor.id,
      consultationId,
      title: 'Assigned session cancelled',
      body: `${consultation.patient.name}'s session was cancelled${reason ? `: ${reason}` : '.'}`
    }).catch((error) =>
      console.error('[telegram-provider] cancellation notification failed', error)
    );
  }
}

async function sendDueReminder(reminderId: string) {
  const reminder = await prisma.consultationReminder.findUnique({
    where: { id: reminderId },
    include: {
      recipientUser: { select: { id: true, name: true, mobile: true, email: true } },
      consultation: {
        select: {
          id: true,
          status: true,
          intakeAnswers: true,
          patient: { select: { name: true } },
          disease: { select: { name: true } }
        }
      }
    }
  });
  if (!reminder?.recipientUser) return;
  if (
    reminder.consultation.status === ConsultationStatus.CANCELLED ||
    reminder.consultation.status === ConsultationStatus.COMPLETED
  ) {
    await prisma.consultationReminder.update({
      where: { id: reminder.id },
      data: { status: ConsultationReminderStatus.SKIPPED }
    });
    return;
  }
  const appointment = appointmentDateTime(reminder.consultation.intakeAnswers);
  const label = appointmentLabel(appointment);
  const title =
    reminder.type === ConsultationReminderType.SESSION_24H
      ? 'Session reminder: tomorrow'
      : reminder.type === ConsultationReminderType.SESSION_1H
        ? 'Session reminder: 1 hour'
        : 'Did you miss your session?';
  const body =
    reminder.type === ConsultationReminderType.MISSED_SESSION_FOLLOW_UP
      ? `Your session scheduled for ${label} is still open. If it was missed, please contact support or rebook.`
      : `Reminder: your Hope Hub session is scheduled for ${label}.`;

  await sendToUser({
    eventType:
      reminder.type === ConsultationReminderType.MISSED_SESSION_FOLLOW_UP
        ? 'SESSION_MISSED'
        : 'BOOKING_REMINDER',
    user: reminder.recipientUser,
    title,
    body,
    metadata: {
      consultationId: reminder.consultationId,
      reminderId: reminder.id,
      reminderType: reminder.type,
      appointmentAt: appointment?.toISOString() ?? null
    }
  });
  await prisma.consultationReminder.update({
    where: { id: reminder.id },
    data: { status: ConsultationReminderStatus.SENT, sentAt: new Date() }
  });
}

export async function runConsultationReminderSchedulers() {
  if (!consultationReminderSweepEnabled) return;
  const due = await prisma.consultationReminder.findMany({
    where: {
      status: ConsultationReminderStatus.PENDING,
      scheduledFor: { lte: new Date() }
    },
    select: { id: true },
    take: SCHEDULER_CONFIG.BATCH_TAKE_LIMIT,
    orderBy: { scheduledFor: 'asc' }
  });
  for (const reminder of due) {
    await sendDueReminder(reminder.id);
  }
}

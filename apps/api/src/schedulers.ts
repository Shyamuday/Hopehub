import { DoseEventStatus } from '@prisma/client';
import { SCHEDULER_CONFIG } from './constants/config.constants.js';
import { prisma } from './db.js';
import { enabledNotificationChannels, notificationService } from './services/notification-service.js';

export const doseOverdueSweepEnabled =
  (process.env.DOSE_OVERDUE_SWEEP_ENABLED || 'true').toLowerCase() !== 'false';

export const doseOverdueSweepIntervalMs = Math.max(
  SCHEDULER_CONFIG.DOSE_OVERDUE_SWEEP_MIN_MS,
  Number(process.env.DOSE_OVERDUE_SWEEP_INTERVAL_MS || SCHEDULER_CONFIG.DOSE_OVERDUE_SWEEP_DEFAULT_MS)
);

export const doseReminderSweepEnabled =
  (process.env.DOSE_REMINDER_SWEEP_ENABLED || 'true').toLowerCase() !== 'false';

export const doseReminderWindowMinutes = Math.max(
  SCHEDULER_CONFIG.DOSE_REMINDER_WINDOW_MIN_MINUTES,
  Number(process.env.DOSE_REMINDER_WINDOW_MINUTES || SCHEDULER_CONFIG.DOSE_REMINDER_WINDOW_DEFAULT_MINUTES)
);

async function markOverdueDosesAsMissed() {
  const now = new Date();
  const overdueEvents = await prisma.medicineDoseEvent.findMany({
    where: { status: DoseEventStatus.PENDING, scheduledFor: { lt: now } },
    select: {
      id: true,
      patientId: true,
      scheduledFor: true,
      patient: { select: { name: true, mobile: true, email: true } },
      prescriptionItem: { select: { medicineName: true } }
    },
    take: SCHEDULER_CONFIG.BATCH_TAKE_LIMIT
  });

  if (!overdueEvents.length) return;

  const result = await prisma.medicineDoseEvent.updateMany({
    where: { id: { in: overdueEvents.map((e) => e.id) } },
    data: { status: DoseEventStatus.MISSED }
  });

  console.info(`[scheduler] Marked ${result.count} overdue dose event(s) as MISSED`);
  await notificationService.sendBatch(
    overdueEvents.flatMap((event) =>
      enabledNotificationChannels.map((channel) => ({
        eventType: 'DOSE_MISSED' as const,
        channel,
        recipientId: event.patientId,
        recipientName: event.patient?.name,
        recipientMobile: event.patient?.mobile,
        recipientEmail: event.patient?.email,
        title: 'Dose marked missed',
        body: `${event.prescriptionItem?.medicineName || 'Medicine'} dose at ${event.scheduledFor.toISOString()} was marked missed.`,
        metadata: { doseEventId: event.id, scheduledFor: event.scheduledFor.toISOString() }
      }))
    )
  );
}

// Runs daily — restores employees to ACTIVE when their approved leave has ended
export async function restoreEmployeesFromLeave() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiredLeaves = await prisma.leaveRequest.findMany({
    where: { status: 'APPROVED', endDate: { lt: today } },
    select: { id: true, employeeType: true, doctorId: true, storeStaffId: true }
  });

  if (!expiredLeaves.length) return;

  let restored = 0;
  for (const leave of expiredLeaves) {
    try {
      if (leave.employeeType === 'DOCTOR' && leave.doctorId) {
        await prisma.doctor.update({
          where: { id: leave.doctorId, employeeStatus: 'ON_LEAVE' },
          data: { employeeStatus: 'ACTIVE' }
        });
        restored++;
      } else if (leave.employeeType === 'STORE_STAFF' && leave.storeStaffId) {
        await prisma.storeStaff.update({
          where: { id: leave.storeStaffId, employeeStatus: 'ON_LEAVE' },
          data: { employeeStatus: 'ACTIVE' }
        });
        restored++;
      }
    } catch {
      // Employee status already changed manually — skip
    }
  }

  if (restored > 0) {
    console.info(`[scheduler] Restored ${restored} employee(s) to ACTIVE after leave ended`);
  }
}

async function emitUpcomingDoseReminders() {
  if (!doseReminderSweepEnabled) return;

  const now = new Date();
  const windowEnd = new Date(now.getTime() + doseReminderWindowMinutes * 60 * 1000);
  const upcomingEvents = await prisma.medicineDoseEvent.findMany({
    where: { status: DoseEventStatus.PENDING, scheduledFor: { gte: now, lte: windowEnd } },
    select: {
      id: true,
      patientId: true,
      scheduledFor: true,
      patient: { select: { name: true, mobile: true, email: true } },
      prescriptionItem: { select: { medicineName: true } }
    },
    take: SCHEDULER_CONFIG.BATCH_TAKE_LIMIT
  });

  if (!upcomingEvents.length) return;

  await notificationService.sendBatch(
    upcomingEvents.flatMap((event) =>
      enabledNotificationChannels.map((channel) => ({
        eventType: 'DOSE_REMINDER' as const,
        channel,
        recipientId: event.patientId,
        recipientName: event.patient?.name,
        recipientMobile: event.patient?.mobile,
        recipientEmail: event.patient?.email,
        title: 'Medicine reminder',
        body: `Upcoming dose for ${event.prescriptionItem?.medicineName || 'medicine'} at ${event.scheduledFor.toISOString()}.`,
        metadata: { doseEventId: event.id, scheduledFor: event.scheduledFor.toISOString() }
      }))
    )
  );
}

export async function runDoseSchedulers() {
  await Promise.all([markOverdueDosesAsMissed(), emitUpcomingDoseReminders()]);
}

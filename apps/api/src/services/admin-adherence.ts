import { DoseEventStatus, Role } from '@prisma/client';
import { prisma } from '../db.js';

export type AdherenceRiskTier = 'HIGH_RISK' | 'MEDIUM_RISK' | 'ON_TRACK';

export type PatientAdherenceStats = {
  total: number;
  taken: number;
  missed: number;
  skipped: number;
  pending: number;
};

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function emptyStats(): PatientAdherenceStats {
  return { total: 0, taken: 0, missed: 0, skipped: 0, pending: 0 };
}

function tallyEvent(stats: PatientAdherenceStats, status: DoseEventStatus) {
  stats.total += 1;
  if (status === DoseEventStatus.TAKEN) stats.taken += 1;
  else if (status === DoseEventStatus.MISSED) stats.missed += 1;
  else if (status === DoseEventStatus.SKIPPED) stats.skipped += 1;
  else stats.pending += 1;
}

function adherencePercent(stats: PatientAdherenceStats) {
  return stats.total ? Math.round((stats.taken / stats.total) * 100) : 0;
}

function classifyTier(percent: number, stats: PatientAdherenceStats, minDoses: number): AdherenceRiskTier | null {
  if (stats.total < minDoses) return null;
  if (percent < 50 || stats.missed > stats.taken) return 'HIGH_RISK';
  if (percent < 70) return 'MEDIUM_RISK';
  return 'ON_TRACK';
}

export async function buildAdminAdherenceRiskReport(days: number, minDoses: number) {
  const windowDays = Math.min(30, Math.max(7, days));
  const minimumDoses = Math.max(3, minDoses);

  const currentEnd = endOfDay(new Date());
  const currentStart = startOfDay(new Date(currentEnd));
  currentStart.setDate(currentStart.getDate() - (windowDays - 1));

  const priorEnd = endOfDay(new Date(currentStart));
  priorEnd.setDate(priorEnd.getDate() - 1);
  const priorStart = startOfDay(new Date(priorEnd));
  priorStart.setDate(priorStart.getDate() - (windowDays - 1));

  const [currentEvents, priorEvents] = await Promise.all([
    prisma.medicineDoseEvent.findMany({
      where: { scheduledFor: { gte: currentStart, lte: currentEnd } },
      select: { patientId: true, status: true, note: true, scheduledFor: true }
    }),
    prisma.medicineDoseEvent.findMany({
      where: { scheduledFor: { gte: priorStart, lte: priorEnd } },
      select: { patientId: true, status: true }
    })
  ]);

  const currentByPatient = new Map<string, PatientAdherenceStats>();
  const priorByPatient = new Map<string, PatientAdherenceStats>();
  const unexplainedByPatient = new Map<string, number>();

  const trendMap = new Map<string, PatientAdherenceStats>();
  for (let i = 0; i < windowDays; i++) {
    const date = new Date(currentStart);
    date.setDate(currentStart.getDate() + i);
    trendMap.set(dateKey(date), emptyStats());
  }

  for (const event of currentEvents) {
    let stats = currentByPatient.get(event.patientId);
    if (!stats) {
      stats = emptyStats();
      currentByPatient.set(event.patientId, stats);
    }
    tallyEvent(stats, event.status);

    const day = trendMap.get(dateKey(event.scheduledFor));
    if (day) tallyEvent(day, event.status);

    if (
      (event.status === DoseEventStatus.MISSED || event.status === DoseEventStatus.SKIPPED) &&
      !event.note?.trim()
    ) {
      unexplainedByPatient.set(event.patientId, (unexplainedByPatient.get(event.patientId) ?? 0) + 1);
    }
  }

  for (const event of priorEvents) {
    let stats = priorByPatient.get(event.patientId);
    if (!stats) {
      stats = emptyStats();
      priorByPatient.set(event.patientId, stats);
    }
    tallyEvent(stats, event.status);
  }

  const patientIds = Array.from(currentByPatient.keys());
  const patients = patientIds.length
    ? await prisma.user.findMany({
        where: { id: { in: patientIds }, role: Role.PATIENT },
        select: { id: true, name: true, patientCode: true, mobile: true }
      })
    : [];
  const patientMap = new Map(patients.map((p) => [p.id, p]));

  type CohortPatient = {
    patientId: string;
    name: string;
    patientCode: string | null;
    mobile: string | null;
    adherencePercent: number;
    priorAdherencePercent: number | null;
    trendDelta: number | null;
    stats: PatientAdherenceStats;
    riskTier: AdherenceRiskTier;
  };

  const cohorts: Record<AdherenceRiskTier, CohortPatient[]> = {
    HIGH_RISK: [],
    MEDIUM_RISK: [],
    ON_TRACK: []
  };

  const alerts: Array<{
    severity: 'HIGH' | 'MEDIUM';
    type: 'LOW_ADHERENCE' | 'ADHERENCE_DROP' | 'HIGH_MISSED' | 'UNEXPLAINED_MISSED';
    patientId: string;
    patientName: string;
    patientCode: string | null;
    message: string;
    adherencePercent: number;
    trendDelta: number | null;
  }> = [];

  for (const [patientId, stats] of currentByPatient) {
    const percent = adherencePercent(stats);
    const tier = classifyTier(percent, stats, minimumDoses);
    if (!tier) continue;

    const patient = patientMap.get(patientId);
    const priorStats = priorByPatient.get(patientId);
    const priorPercent = priorStats && priorStats.total >= minimumDoses ? adherencePercent(priorStats) : null;
    const trendDelta = priorPercent === null ? null : percent - priorPercent;

    const row: CohortPatient = {
      patientId,
      name: patient?.name ?? 'Patient',
      patientCode: patient?.patientCode ?? null,
      mobile: patient?.mobile ?? null,
      adherencePercent: percent,
      priorAdherencePercent: priorPercent,
      trendDelta,
      stats,
      riskTier: tier
    };
    cohorts[tier].push(row);

    if (tier === 'HIGH_RISK') {
      alerts.push({
        severity: 'HIGH',
        type: 'LOW_ADHERENCE',
        patientId,
        patientName: row.name,
        patientCode: row.patientCode,
        message: `Adherence ${percent}% in the last ${windowDays} days (${stats.missed} missed, ${stats.skipped} skipped).`,
        adherencePercent: percent,
        trendDelta
      });
    }

    if (trendDelta !== null && trendDelta <= -15) {
      alerts.push({
        severity: trendDelta <= -25 ? 'HIGH' : 'MEDIUM',
        type: 'ADHERENCE_DROP',
        patientId,
        patientName: row.name,
        patientCode: row.patientCode,
        message: `Adherence dropped ${Math.abs(trendDelta)} points vs prior ${windowDays}-day window.`,
        adherencePercent: percent,
        trendDelta
      });
    }

    if (stats.missed >= 3) {
      alerts.push({
        severity: stats.missed >= 5 ? 'HIGH' : 'MEDIUM',
        type: 'HIGH_MISSED',
        patientId,
        patientName: row.name,
        patientCode: row.patientCode,
        message: `${stats.missed} missed doses in the last ${windowDays} days.`,
        adherencePercent: percent,
        trendDelta
      });
    }

    const unexplained = unexplainedByPatient.get(patientId) ?? 0;
    if (unexplained >= 2) {
      alerts.push({
        severity: 'MEDIUM',
        type: 'UNEXPLAINED_MISSED',
        patientId,
        patientName: row.name,
        patientCode: row.patientCode,
        message: `${unexplained} skipped/missed doses without a patient reason.`,
        adherencePercent: percent,
        trendDelta
      });
    }
  }

  for (const list of Object.values(cohorts)) {
    list.sort((a, b) => a.adherencePercent - b.adherencePercent);
  }

  const dedupedAlerts = Array.from(
    new Map(alerts.map((alert) => [`${alert.patientId}:${alert.type}`, alert])).values()
  ).sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === 'HIGH' ? -1 : 1;
    return a.adherencePercent - b.adherencePercent;
  });

  const platformTotals = Array.from(trendMap.values()).reduce(
    (acc, day) => {
      acc.total += day.total;
      acc.taken += day.taken;
      acc.missed += day.missed;
      acc.skipped += day.skipped;
      acc.pending += day.pending;
      return acc;
    },
    emptyStats()
  );

  const platformTrend = Array.from(trendMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, stats]) => ({
      date,
      ...stats,
      adherencePercent: adherencePercent(stats)
    }));

  return {
    windowDays,
    minDoses: minimumDoses,
    summary: {
      patientsTracked: cohorts.HIGH_RISK.length + cohorts.MEDIUM_RISK.length + cohorts.ON_TRACK.length,
      highRiskCount: cohorts.HIGH_RISK.length,
      mediumRiskCount: cohorts.MEDIUM_RISK.length,
      onTrackCount: cohorts.ON_TRACK.length,
      alertCount: dedupedAlerts.length,
      platformAdherencePercent: adherencePercent(platformTotals),
      platformTotals
    },
    platformTrend,
    cohorts,
    alerts: dedupedAlerts
  };
}

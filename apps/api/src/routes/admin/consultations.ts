import { Router } from 'express';
import { z } from 'zod';
import {
  Role,
  ConsultationStatus,
  SupportNoteCategory,
  Prisma,
  HomeopathicDoctorType
} from '@prisma/client';
import type { Server as SocketIoServer } from 'socket.io';
import { authRequired, allowRoles } from '../../auth.js';
import { getAuthorizedAdminWorkspace } from '../../admin-workspace-access.js';
import { prisma } from '../../db.js';
import {
  asyncRoute,
  routeParam,
  queryText,
  queryPositiveInt,
  writeAuditLog,
  includeConsultationRelations
} from '../../utils/helpers.js';
import {
  enabledNotificationChannels,
  notificationService
} from '../../services/notification-service.js';
import { emitConsultationAssigned } from '../../services/consultation-realtime.js';
import { PRODUCT_EVENTS, trackProductEvent } from '../../services/product-analytics.js';
import { upsertProviderEarningForPayment } from '../../services/provider-earnings.js';
import { applyConsultationCancellationEffects } from '../../services/consultation-cancellation.js';
import { notifyProviderAssignedAndSchedule } from '../../services/consultation-reminders.js';

function consultationWorkspaceWhere(workspace: string): Prisma.ConsultationWhereInput {
  const hopeHubSources: Prisma.ConsultationWhereInput[] = [
    { pricingSnapshot: { path: ['source'], equals: 'hope-hub' } },
    { pricingSnapshot: { path: ['source'], equals: 'hope-hub-quick-talk' } }
  ];
  if (workspace === 'hope-hub') return { OR: hopeHubSources };
  if (workspace === 'homeopathy') return { NOT: hopeHubSources };
  return {};
}

function doctorWorkspaceWhere(workspace: string): Prisma.UserWhereInput {
  if (workspace === 'hope-hub') {
    return { doctorProfile: { is: { doctorType: HomeopathicDoctorType.PSYCHOLOGIST } } };
  }
  if (workspace === 'homeopathy') {
    return {
      doctorProfile: { is: { doctorType: { not: HomeopathicDoctorType.PSYCHOLOGIST } } }
    };
  }
  return {};
}

function providerAssignedCopy(workspace: string, providerName: string) {
  if (workspace === 'hope-hub') {
    return {
      title: 'Hope Hub provider assigned — HopeHub Care',
      body: `${providerName} has been assigned to your Hope Hub session. You can now chat from the app.`,
      auditSummary: `Assigned Hope Hub provider ${providerName}`
    };
  }
  return {
    title: 'Homeopathy provider assigned — HopeHub Care',
    body: `Dr. ${providerName} has been assigned to your consultation. You can now chat with your provider in the app.`,
    auditSummary: `Assigned homeopathy provider Dr. ${providerName}`
  };
}

export function registerAdminConsultationRoutes(router: Router, io: SocketIoServer) {
  // ─── Admin consultations ───────────────────────────────────────────────────────

  router.get(
    '/admin/call-health',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
    asyncRoute(async (req, res) => {
      const days = Math.max(1, Math.min(90, queryPositiveInt(req, 'days', 30)));
      const workspace = getAuthorizedAdminWorkspace(req, res);
      if (workspace === null) return;
      const from = new Date();
      from.setDate(from.getDate() - days);

      const sessions = await prisma.consultationCallSession.findMany({
        where: {
          startedAt: { gte: from },
          consultation: consultationWorkspaceWhere(workspace)
        },
        orderBy: { startedAt: 'desc' },
        take: 500,
        include: {
          consultation: {
            select: {
              id: true,
              status: true,
              patient: { select: { id: true, name: true, mobile: true, patientCode: true } },
              assignedDoctor: { select: { id: true, name: true, email: true, mobile: true } },
              disease: { select: { id: true, name: true } }
            }
          }
        }
      });

      const reasonCounts = new Map<string, number>();
      const modeCounts = new Map<string, number>();
      const providerCounts = new Map<
        string,
        {
          providerId: string;
          providerName: string;
          total: number;
          answered: number;
          failed: number;
          turnRelay: number;
        }
      >();

      let answered = 0;
      let failed = 0;
      let rejected = 0;
      let noAnswer = 0;
      let mediaPermission = 0;
      let connectionFailed = 0;
      let reconnectTimeout = 0;
      let turnRelay = 0;
      let direct = 0;
      let unknownRoute = 0;
      let totalDuration = 0;
      let durationCount = 0;
      const setupToConnectedSamples: number[] = [];
      const setupToFirstMediaSamples: number[] = [];

      const addTimingSample = (samples: number[], value: unknown) => {
        if (typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 120_000) {
          samples.push(value);
        }
      };
      const percentile = (samples: number[], percentage: number) => {
        if (!samples.length) return 0;
        const sorted = [...samples].sort((a, b) => a - b);
        return Math.round(
          sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * percentage) - 1)]!
        );
      };

      for (const session of sessions) {
        const metadata =
          session.metadata &&
          typeof session.metadata === 'object' &&
          !Array.isArray(session.metadata)
            ? (session.metadata as Record<string, unknown>)
            : {};
        const reason = session.endReason || session.status || 'UNKNOWN';
        const reasonKey = String(reason).toUpperCase();
        const modeKey = String(session.mode || 'UNKNOWN').toUpperCase();
        const wasAnswered = Boolean(session.answeredAt);
        const wasFailed =
          String(session.status).toUpperCase() === 'FAILED' ||
          [
            'NO_ANSWER',
            'MEDIA_PERMISSION_DENIED',
            'MEDIA_TIMEOUT',
            'CONNECTION_FAILED',
            'RECONNECT_TIMEOUT'
          ].includes(reasonKey);
        const usedTurn = session.usedTurnRelay === true || metadata['usedTurnRelay'] === true;
        const candidateTypes = Array.isArray(metadata['candidateTypes'])
          ? (metadata['candidateTypes'] as unknown[])
          : [];
        const routeKnown =
          typeof session.usedTurnRelay === 'boolean' ||
          typeof metadata['usedTurnRelay'] === 'boolean' ||
          candidateTypes.length > 0;

        reasonCounts.set(reasonKey, (reasonCounts.get(reasonKey) ?? 0) + 1);
        modeCounts.set(modeKey, (modeCounts.get(modeKey) ?? 0) + 1);
        if (wasAnswered) answered += 1;
        if (wasFailed) failed += 1;
        if (reasonKey === 'REJECTED' || reasonKey === 'DECLINED') rejected += 1;
        if (reasonKey === 'NO_ANSWER') noAnswer += 1;
        if (reasonKey === 'MEDIA_PERMISSION_DENIED' || reasonKey === 'MEDIA_TIMEOUT')
          mediaPermission += 1;
        if (reasonKey === 'CONNECTION_FAILED' || reasonKey === 'ICE_FAILED') connectionFailed += 1;
        if (reasonKey === 'RECONNECT_TIMEOUT') reconnectTimeout += 1;
        if (usedTurn) turnRelay += 1;
        else if (routeKnown) direct += 1;
        else unknownRoute += 1;
        if (typeof session.durationSeconds === 'number' && session.durationSeconds > 0) {
          totalDuration += session.durationSeconds;
          durationCount += 1;
        }
        addTimingSample(setupToConnectedSamples, metadata['setupToConnectedMs']);
        addTimingSample(setupToFirstMediaSamples, metadata['setupToFirstMediaMs']);

        const providerId = session.consultation.assignedDoctor?.id ?? 'unassigned';
        const existing = providerCounts.get(providerId) ?? {
          providerId,
          providerName: session.consultation.assignedDoctor?.name ?? 'Unassigned',
          total: 0,
          answered: 0,
          failed: 0,
          turnRelay: 0
        };
        existing.total += 1;
        if (wasAnswered) existing.answered += 1;
        if (wasFailed) existing.failed += 1;
        if (usedTurn) existing.turnRelay += 1;
        providerCounts.set(providerId, existing);
      }

      const total = sessions.length;
      const toRows = (map: Map<string, number>) =>
        Array.from(map.entries())
          .map(([key, count]) => ({ key, count }))
          .sort((a, b) => b.count - a.count);

      res.json({
        windowDays: days,
        from: from.toISOString(),
        summary: {
          total,
          answered,
          failed,
          rejected,
          noAnswer,
          mediaPermission,
          connectionFailed,
          reconnectTimeout,
          turnRelay,
          direct,
          unknownRoute,
          answerRate: total ? Math.round((answered / total) * 100) : 0,
          failureRate: total ? Math.round((failed / total) * 100) : 0,
          turnRelayRate: total ? Math.round((turnRelay / total) * 100) : 0,
          averageDurationSeconds: durationCount ? Math.round(totalDuration / durationCount) : 0,
          medianConnectMs: percentile(setupToConnectedSamples, 0.5),
          p95ConnectMs: percentile(setupToConnectedSamples, 0.95),
          medianFirstMediaMs: percentile(setupToFirstMediaSamples, 0.5),
          p95FirstMediaMs: percentile(setupToFirstMediaSamples, 0.95)
        },
        byReason: toRows(reasonCounts),
        byMode: toRows(modeCounts),
        byProvider: Array.from(providerCounts.values())
          .sort((a, b) => b.total - a.total)
          .slice(0, 30),
        recent: sessions.slice(0, 80).map((session) => {
          const metadata =
            session.metadata &&
            typeof session.metadata === 'object' &&
            !Array.isArray(session.metadata)
              ? (session.metadata as Record<string, unknown>)
              : {};
          return {
            id: session.id,
            consultationId: session.consultationId,
            mode: session.mode,
            status: session.status,
            endReason: session.endReason,
            durationSeconds: session.durationSeconds,
            startedAt: session.startedAt,
            answeredAt: session.answeredAt,
            endedAt: session.endedAt,
            lastSignalEvent: session.lastSignalEvent,
            callId: typeof metadata['callId'] === 'string' ? metadata['callId'] : null,
            reconnectCount: session.reconnectCount,
            usedTurnRelay: session.usedTurnRelay === true || metadata['usedTurnRelay'] === true,
            candidateTypes: Array.isArray(metadata['candidateTypes'])
              ? metadata['candidateTypes']
              : [],
            averageRttMs: session.averageRttMs,
            packetLossPercent: session.packetLossPercent,
            maxJitterMs: session.maxJitterMs,
            setupToConnectedMs:
              typeof metadata['setupToConnectedMs'] === 'number'
                ? metadata['setupToConnectedMs']
                : null,
            setupToFirstMediaMs:
              typeof metadata['setupToFirstMediaMs'] === 'number'
                ? metadata['setupToFirstMediaMs']
                : null,
            consultation: session.consultation
          };
        })
      });
    })
  );

  router.get(
    '/admin/call-health/:sessionId/events',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
    asyncRoute(async (req, res) => {
      const workspace = getAuthorizedAdminWorkspace(req, res);
      if (workspace === null) return;
      const sessionId = routeParam(req, 'sessionId');
      const session = await prisma.consultationCallSession.findFirst({
        where: {
          id: sessionId,
          consultation: consultationWorkspaceWhere(workspace)
        },
        include: {
          consultation: {
            select: {
              id: true,
              status: true,
              patient: { select: { id: true, name: true, patientCode: true } },
              assignedDoctor: { select: { id: true, name: true } }
            }
          },
          events: { orderBy: { createdAt: 'asc' }, take: 500 }
        }
      });
      if (!session) return res.status(404).json({ message: 'Call session not found' });

      const actorIds = Array.from(
        new Set(
          session.events
            .flatMap((event) => [event.actorUserId, event.targetUserId])
            .filter((id): id is string => Boolean(id))
        )
      );
      const actors = actorIds.length
        ? await prisma.user.findMany({
            where: { id: { in: actorIds } },
            select: { id: true, name: true, role: true }
          })
        : [];
      const actorById = new Map(actors.map((actor) => [actor.id, actor]));

      res.json({
        session: {
          id: session.id,
          consultationId: session.consultationId,
          callId:
            typeof (session.metadata as Record<string, unknown> | null)?.['callId'] === 'string'
              ? (session.metadata as Record<string, unknown>)['callId']
              : null,
          mode: session.mode,
          status: session.status,
          endReason: session.endReason,
          startedAt: session.startedAt,
          answeredAt: session.answeredAt,
          endedAt: session.endedAt,
          durationSeconds: session.durationSeconds,
          reconnectCount: session.reconnectCount,
          usedTurnRelay: session.usedTurnRelay,
          averageRttMs: session.averageRttMs,
          packetLossPercent: session.packetLossPercent,
          maxJitterMs: session.maxJitterMs,
          consultation: session.consultation
        },
        events: session.events.map((event) => ({
          id: event.id,
          event: event.event,
          phase: event.phase,
          outcome: event.outcome,
          reason: event.reason,
          sequence: event.sequence,
          clientOccurredAt: event.clientOccurredAt,
          serverReceivedAt: event.createdAt,
          actor: event.actorUserId
            ? actorById.get(event.actorUserId) || { id: event.actorUserId, name: 'Unknown user' }
            : null,
          target: event.targetUserId
            ? actorById.get(event.targetUserId) || { id: event.targetUserId, name: 'Unknown user' }
            : null,
          metadata: event.metadata
        }))
      });
    })
  );

  router.get(
    '/admin/safety-flags',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
    asyncRoute(async (req, res) => {
      const page = queryPositiveInt(req, 'page', 1);
      const pageSize = Math.max(1, Math.min(50, queryPositiveInt(req, 'pageSize', 20)));

      const where = {
        OR: [
          { category: SupportNoteCategory.ESCALATION },
          { body: { startsWith: '[SAFETY]', mode: 'insensitive' as const } }
        ]
      };

      const [notes, total] = await Promise.all([
        prisma.supportCaseNote.findMany({
          where,
          include: {
            author: { select: { id: true, name: true, role: true } },
            patient: {
              select: { id: true, name: true, email: true, mobile: true, patientCode: true }
            },
            consultation: {
              include: {
                assignedDoctor: { select: { id: true, name: true, email: true, mobile: true } },
                disease: { select: { id: true, name: true } },
                payment: { select: { status: true, amountInPaise: true } }
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize
        }),
        prisma.supportCaseNote.count({ where })
      ]);

      res.json({
        flags: notes,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.max(1, Math.ceil(total / pageSize))
        }
      });
    })
  );

  router.post(
    '/admin/safety-flags/:consultationId/notes',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
    asyncRoute(async (req, res) => {
      const body = z.object({ note: z.string().trim().min(3).max(5000) }).parse(req.body);
      const consultation = await prisma.consultation.findUniqueOrThrow({
        where: { id: routeParam(req, 'consultationId') },
        select: { id: true, patientId: true }
      });

      const note = await prisma.supportCaseNote.create({
        data: {
          patientId: consultation.patientId,
          consultationId: consultation.id,
          authorId: req.user!.id,
          category: SupportNoteCategory.ESCALATION,
          body: `[SAFETY FOLLOW-UP] ${body.note}`
        },
        include: { author: { select: { id: true, name: true, role: true } } }
      });

      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'safety_flag.follow_up',
        targetType: 'consultation',
        targetId: consultation.id,
        summary: 'Admin added a safety follow-up note.'
      });

      res.status(201).json({ note });
    })
  );

  router.get(
    '/admin/consultations',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
    asyncRoute(async (req, res) => {
      const page = queryPositiveInt(req, 'page', 1);
      const pageSize = queryPositiveInt(req, 'pageSize', 20);
      const status = queryText(req, 'status');
      const assigned = queryText(req, 'assigned');
      const outcome = queryText(req, 'outcome');
      const outcomeFlag = queryText(req, 'outcomeFlag');
      const workspace = getAuthorizedAdminWorkspace(req, res);
      if (workspace === null) return;
      const q = queryText(req, 'q').trim().toLowerCase();

      const where: Prisma.ConsultationWhereInput = {};
      const andFilters: Prisma.ConsultationWhereInput[] = [];
      const workspaceWhere = consultationWorkspaceWhere(workspace);
      if (Object.keys(workspaceWhere).length) andFilters.push(workspaceWhere);
      if (Object.values(ConsultationStatus).includes(status as ConsultationStatus)) {
        where['status'] = status as ConsultationStatus;
      }
      if (assigned === 'no') where['assignedDoctorId'] = null;
      if (assigned === 'yes') where['assignedDoctorId'] = { not: null };
      if (['COMPLETED', 'USER_MISSED', 'PROVIDER_NO_SHOW', 'RESCHEDULE_NEEDED'].includes(outcome)) {
        andFilters.push({
          pricingSnapshot: {
            path: ['sessionOutcome', 'outcome'],
            equals: outcome
          }
        });
      } else if (outcomeFlag === 'package_restored') {
        andFilters.push({
          pricingSnapshot: {
            path: ['sessionOutcome', 'packageRestored'],
            equals: true
          }
        });
      } else if (outcomeFlag === 'payout_hold') {
        andFilters.push({
          pricingSnapshot: {
            path: ['sessionOutcome', 'payoutAction'],
            equals: 'HOLD'
          }
        });
      }
      if (andFilters.length) where['AND'] = andFilters;

      const [consultations, total] = await Promise.all([
        prisma.consultation.findMany({
          where,
          include: {
            patient: { select: { id: true, name: true, mobile: true } },
            assignedDoctor: { select: { id: true, name: true } },
            disease: { select: { id: true, name: true } },
            payment: {
              select: {
                status: true,
                amountInPaise: true,
                refundedAmountInPaise: true,
                lineItems: true,
                providerEarning: {
                  select: {
                    payoutStatus: true,
                    providerEarningInPaise: true,
                    platformFeeInPaise: true,
                    payoutReference: true,
                    payoutNote: true
                  }
                }
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize
        }),
        prisma.consultation.count({ where })
      ]);

      const filtered = q
        ? consultations.filter((c) => {
            const text = [c.patient?.name, c.patient?.mobile, c.disease?.name]
              .join(' ')
              .toLowerCase();
            return text.includes(q);
          })
        : consultations;

      res.json({ consultations: filtered, total, page, pageSize });
    })
  );

  router.get(
    '/admin/consultations/quality-summary',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
    asyncRoute(async (req, res) => {
      const days = Math.max(1, Math.min(365, queryPositiveInt(req, 'days', 30)));
      const workspace = getAuthorizedAdminWorkspace(req, res);
      if (workspace === null) return;
      const from = new Date();
      from.setDate(from.getDate() - days);

      const baseWhere: Prisma.ConsultationWhereInput = {
        updatedAt: { gte: from },
        ...consultationWorkspaceWhere(workspace)
      };

      const jsonOutcome = (outcome: string): Prisma.ConsultationWhereInput => ({
        ...baseWhere,
        pricingSnapshot: { path: ['sessionOutcome', 'outcome'], equals: outcome }
      });
      const jsonFlag = (
        key: 'packageRestored' | 'payoutAction',
        value: boolean | string
      ): Prisma.ConsultationWhereInput => ({
        ...baseWhere,
        pricingSnapshot: { path: ['sessionOutcome', key], equals: value }
      });

      const [
        totalClosed,
        completed,
        userMissed,
        providerNoShow,
        rescheduleNeeded,
        packageRestored,
        payoutHeld,
        cancelled
      ] = await Promise.all([
        prisma.consultation.count({
          where: {
            ...baseWhere,
            OR: [
              { status: ConsultationStatus.COMPLETED },
              { status: ConsultationStatus.CANCELLED },
              { pricingSnapshot: { path: ['sessionOutcome', 'outcome'], not: Prisma.JsonNull } }
            ]
          }
        }),
        prisma.consultation.count({ where: jsonOutcome('COMPLETED') }),
        prisma.consultation.count({ where: jsonOutcome('USER_MISSED') }),
        prisma.consultation.count({ where: jsonOutcome('PROVIDER_NO_SHOW') }),
        prisma.consultation.count({ where: jsonOutcome('RESCHEDULE_NEEDED') }),
        prisma.consultation.count({ where: jsonFlag('packageRestored', true) }),
        prisma.consultation.count({ where: jsonFlag('payoutAction', 'HOLD') }),
        prisma.consultation.count({ where: { ...baseWhere, status: ConsultationStatus.CANCELLED } })
      ]);

      const issueCount = userMissed + providerNoShow + rescheduleNeeded;
      const issueRate = totalClosed ? Math.round((issueCount / totalClosed) * 100) : 0;

      res.json({
        days,
        from: from.toISOString(),
        summary: {
          totalClosed,
          completed,
          userMissed,
          providerNoShow,
          rescheduleNeeded,
          packageRestored,
          payoutHeld,
          cancelled,
          issueCount,
          issueRate
        }
      });
    })
  );

  router.put(
    '/admin/consultations/:id/assign',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
    asyncRoute(async (req, res) => {
      const body = z.object({ doctorId: z.string().min(1) }).parse(req.body);
      const workspace = getAuthorizedAdminWorkspace(req, res);
      if (workspace === null) return;
      const doctor = await prisma.user.findFirst({
        where: {
          id: body.doctorId,
          role: Role.DOCTOR,
          isActive: true,
          ...doctorWorkspaceWhere(workspace)
        },
        include: { doctorProfile: { select: { clinicStoreId: true, doctorType: true } } }
      });
      if (!doctor) {
        return res.status(400).json({
          message:
            workspace === 'hope-hub'
              ? 'Select an active Hope Hub provider for this session.'
              : 'Select an active homeopathy provider for this consultation.'
        });
      }

      const existing = await prisma.consultation.findFirst({
        where: { id: routeParam(req, 'id'), ...consultationWorkspaceWhere(workspace) },
        select: { id: true }
      });
      if (!existing) {
        return res.status(404).json({
          message:
            workspace === 'hope-hub'
              ? 'Hope Hub session not found in this workspace.'
              : 'Homeopathy consultation not found in this workspace.'
        });
      }

      const consultation = await prisma.consultation.update({
        where: { id: existing.id },
        data: {
          assignedDoctorId: doctor.id,
          status: 'ASSIGNED' as const,
          clinicStoreId: doctor.doctorProfile?.clinicStoreId ?? undefined
        },
        include: {
          patient: {
            select: { id: true, name: true, mobile: true, email: true, patientCode: true }
          },
          disease: { select: { name: true } },
          payment: { select: { id: true } }
        }
      });

      const patient = consultation.patient;
      const copy = providerAssignedCopy(workspace, doctor.name);
      if (patient) {
        void notificationService.sendBatch(
          enabledNotificationChannels.map((ch) => ({
            eventType: 'DOCTOR_ASSIGNED' as const,
            channel: ch,
            recipientId: patient.id,
            recipientName: patient.name,
            recipientMobile: patient.mobile,
            recipientEmail: patient.email,
            title: copy.title,
            body: copy.body
          }))
        );
        io.to(`user:${patient.id}`).emit('consultation:updated', {
          consultationId: consultation.id,
          status: consultation.status
        });
      }

      emitConsultationAssigned(io, doctor.id, {
        consultationId: consultation.id,
        patientCode: patient?.patientCode ?? null,
        patientName: patient?.name ?? null,
        diseaseName: consultation.disease?.name ?? null,
        status: consultation.status
      });

      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'consultation.assign_doctor',
        targetType: 'consultation',
        targetId: consultation.id,
        summary: `${copy.auditSummary} to ${patient?.name || 'patient'} consultation.`,
        metadata: {
          doctorId: doctor.id,
          doctorName: doctor.name,
          workspace,
          patientId: consultation.patientId,
          diseaseName: consultation.disease?.name ?? null
        }
      });

      if (consultation.payment?.id) {
        await upsertProviderEarningForPayment(consultation.payment.id);
      }
      void notifyProviderAssignedAndSchedule(consultation.id).catch((err) =>
        console.error('[booking-reminders] Provider assignment notification failed', err)
      );

      void trackProductEvent({
        name: PRODUCT_EVENTS.CONSULTATION_ASSIGNED,
        actorId: req.user!.id,
        actorRole: req.user!.role,
        properties: {
          consultationId: consultation.id,
          doctorId: doctor.id,
          workspace,
          patientId: consultation.patientId
        }
      });

      res.json({ consultation, message: 'Provider assigned successfully.' });
    })
  );

  router.patch(
    '/admin/consultations/:id/status',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
    asyncRoute(async (req, res) => {
      const body = z
        .object({
          status: z.nativeEnum(ConsultationStatus),
          reason: z.string().trim().max(1000).optional(),
          restorePackageSession: z.boolean().optional()
        })
        .parse(req.body);

      const existing = await prisma.consultation.findUnique({
        where: { id: routeParam(req, 'id') },
        include: {
          patient: { select: { id: true, name: true } },
          disease: { select: { name: true } }
        }
      });
      if (!existing) {
        return res.status(404).json({ message: 'Consultation not found.' });
      }

      let consultation = await prisma.consultation.update({
        where: { id: existing.id },
        data: { status: body.status },
        include: {
          patient: { select: { id: true, name: true, mobile: true } },
          assignedDoctor: { select: { id: true, name: true } },
          disease: { select: { id: true, name: true } },
          payment: {
            select: {
              status: true,
              amountInPaise: true,
              refundedAmountInPaise: true,
              lineItems: true,
              providerEarning: {
                select: {
                  payoutStatus: true,
                  providerEarningInPaise: true,
                  platformFeeInPaise: true,
                  payoutReference: true,
                  payoutNote: true
                }
              }
            }
          }
        }
      });

      const cancellationResult =
        body.status === ConsultationStatus.CANCELLED
          ? await applyConsultationCancellationEffects({
              consultationId: existing.id,
              actorId: req.user!.id,
              actorRole: req.user!.role,
              reason: body.reason,
              restorePackageSession: body.restorePackageSession
            })
          : null;

      if (cancellationResult) {
        consultation = await prisma.consultation.findUniqueOrThrow({
          where: { id: existing.id },
          include: {
            patient: { select: { id: true, name: true, mobile: true } },
            assignedDoctor: { select: { id: true, name: true } },
            disease: { select: { id: true, name: true } },
            payment: {
              select: {
                status: true,
                amountInPaise: true,
                refundedAmountInPaise: true,
                lineItems: true,
                providerEarning: {
                  select: {
                    payoutStatus: true,
                    providerEarningInPaise: true,
                    platformFeeInPaise: true,
                    payoutReference: true,
                    payoutNote: true
                  }
                }
              }
            }
          }
        });
      }

      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'consultation.status_override',
        targetType: 'consultation',
        targetId: consultation.id,
        summary: `Status changed ${existing.status} → ${body.status} for ${existing.patient?.name || 'patient'}.`,
        metadata: {
          previousStatus: existing.status,
          nextStatus: body.status,
          reason: body.reason || null,
          restoredPackageSession: cancellationResult?.restoredPackageSession ?? false,
          packageConsultationId: cancellationResult?.packageConsultationId ?? null,
          patientId: consultation.patientId,
          diseaseName: existing.disease?.name ?? null
        }
      });

      io.to(`user:${consultation.patientId}`).emit('consultation:updated', {
        consultationId: consultation.id,
        status: consultation.status
      });
      if (consultation.assignedDoctorId) {
        io.to(`user:${consultation.assignedDoctorId}`).emit('consultation:updated', {
          consultationId: consultation.id,
          status: consultation.status
        });
      }
      io.to(`consultation:${consultation.id}`).emit('consultation:updated', {
        consultationId: consultation.id,
        status: consultation.status
      });

      res.json({ consultation, message: 'Consultation status updated.' });
    })
  );

  router.patch(
    '/admin/consultations/:id/hope-hub-usage',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
    asyncRoute(async (req, res) => {
      const body = z.object({ usedSessions: z.number().int().min(0) }).parse(req.body);
      const existing = await prisma.consultation.findUnique({
        where: { id: routeParam(req, 'id') },
        select: { id: true, pricingSnapshot: true, patient: { select: { name: true } } }
      });
      if (!existing) return res.status(404).json({ message: 'Consultation not found.' });

      const snapshot = ((existing.pricingSnapshot || {}) as Record<string, unknown>) || {};
      const currentUsage = (snapshot['packageUsage'] || null) as Record<string, unknown> | null;
      if (!currentUsage) {
        return res.status(400).json({ message: 'This consultation has no package usage.' });
      }

      const totalSessions = Math.max(1, Number(currentUsage['totalSessions'] || 1));
      const usedSessions = Math.min(totalSessions, body.usedSessions);
      const nextSnapshot = {
        ...snapshot,
        packageUsage: {
          ...currentUsage,
          totalSessions,
          usedSessions,
          remainingSessions: Math.max(0, totalSessions - usedSessions)
        }
      };

      const consultation = await prisma.consultation.update({
        where: { id: existing.id },
        data: { pricingSnapshot: nextSnapshot as Prisma.InputJsonObject },
        include: {
          patient: { select: { id: true, name: true, mobile: true } },
          assignedDoctor: { select: { id: true, name: true } },
          disease: { select: { id: true, name: true } },
          payment: {
            select: {
              status: true,
              amountInPaise: true,
              refundedAmountInPaise: true,
              lineItems: true,
              providerEarning: {
                select: {
                  payoutStatus: true,
                  providerEarningInPaise: true,
                  platformFeeInPaise: true,
                  payoutReference: true,
                  payoutNote: true
                }
              }
            }
          }
        }
      });

      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'hopehub.package_usage.update',
        targetType: 'consultation',
        targetId: consultation.id,
        summary: `Updated package usage to ${usedSessions}/${totalSessions} for ${existing.patient?.name || 'patient'}.`
      });

      res.json({ consultation, packageUsage: nextSnapshot.packageUsage });
    })
  );
}

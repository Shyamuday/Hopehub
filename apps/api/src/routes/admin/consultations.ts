import { Router } from 'express';
import { z } from 'zod';
import { Role, ConsultationStatus, SupportNoteCategory, Prisma } from '@prisma/client';
import type { Server as SocketIoServer } from 'socket.io';
import { authRequired, allowRoles } from '../../auth.js';
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

export function registerAdminConsultationRoutes(router: Router, io: SocketIoServer) {
  // ─── Admin consultations ───────────────────────────────────────────────────────

  router.get(
    '/admin/safety-flags',
    authRequired,
    allowRoles(Role.ADMIN),
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
    allowRoles(Role.ADMIN),
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
    allowRoles(Role.ADMIN),
    asyncRoute(async (req, res) => {
      const page = queryPositiveInt(req, 'page', 1);
      const pageSize = queryPositiveInt(req, 'pageSize', 20);
      const status = queryText(req, 'status');
      const assigned = queryText(req, 'assigned');
      const outcome = queryText(req, 'outcome');
      const outcomeFlag = queryText(req, 'outcomeFlag');
      const q = queryText(req, 'q').trim().toLowerCase();

      const where: Prisma.ConsultationWhereInput = {};
      if (Object.values(ConsultationStatus).includes(status as ConsultationStatus)) {
        where['status'] = status as ConsultationStatus;
      }
      if (assigned === 'no') where['assignedDoctorId'] = null;
      if (assigned === 'yes') where['assignedDoctorId'] = { not: null };
      if (['COMPLETED', 'USER_MISSED', 'PROVIDER_NO_SHOW', 'RESCHEDULE_NEEDED'].includes(outcome)) {
        where['pricingSnapshot'] = {
          path: ['sessionOutcome', 'outcome'],
          equals: outcome
        };
      } else if (outcomeFlag === 'package_restored') {
        where['pricingSnapshot'] = {
          path: ['sessionOutcome', 'packageRestored'],
          equals: true
        };
      } else if (outcomeFlag === 'payout_hold') {
        where['pricingSnapshot'] = {
          path: ['sessionOutcome', 'payoutAction'],
          equals: 'HOLD'
        };
      }

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
    allowRoles(Role.ADMIN),
    asyncRoute(async (req, res) => {
      const days = Math.max(1, Math.min(365, queryPositiveInt(req, 'days', 30)));
      const from = new Date();
      from.setDate(from.getDate() - days);

      const baseWhere: Prisma.ConsultationWhereInput = {
        updatedAt: { gte: from }
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
    allowRoles(Role.ADMIN),
    asyncRoute(async (req, res) => {
      const body = z.object({ doctorId: z.string().min(1) }).parse(req.body);
      const doctor = await prisma.user.findFirstOrThrow({
        where: { id: body.doctorId, role: Role.DOCTOR, isActive: true },
        include: { doctorProfile: { select: { clinicStoreId: true } } }
      });

      const consultation = await prisma.consultation.update({
        where: { id: routeParam(req, 'id') },
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
      if (patient) {
        void notificationService.sendBatch(
          enabledNotificationChannels.map((ch) => ({
            eventType: 'DOCTOR_ASSIGNED' as const,
            channel: ch,
            recipientId: patient.id,
            recipientName: patient.name,
            recipientMobile: patient.mobile,
            recipientEmail: patient.email,
            title: 'Doctor assigned — HopeHub Care',
            body: `Dr. ${doctor.name} has been assigned to your consultation. You can now chat with your doctor in the app.`
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
        summary: `Assigned Dr. ${doctor.name} to ${patient?.name || 'patient'} consultation.`,
        metadata: {
          doctorId: doctor.id,
          doctorName: doctor.name,
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
          patientId: consultation.patientId
        }
      });

      res.json({ consultation, message: 'Doctor assigned successfully.' });
    })
  );

  router.patch(
    '/admin/consultations/:id/status',
    authRequired,
    allowRoles(Role.ADMIN),
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

      res.json({ consultation, message: 'Consultation status updated.' });
    })
  );

  router.patch(
    '/admin/consultations/:id/hope-hub-usage',
    authRequired,
    allowRoles(Role.ADMIN),
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

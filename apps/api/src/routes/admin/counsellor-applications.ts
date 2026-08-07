import { Router } from 'express';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { authRequired, allowRoles } from '../../auth.js';
import { prisma } from '../../db.js';
import {
  listenerScreeningReviewDetails,
  sanitizeListenerScreeningQuestions
} from '../../services/listener-screening-question-sets.js';
import { asyncRoute, routeParam, writeAuditLog } from '../../utils/helpers.js';

const statusSchema = z.object({
  status: z.enum(['NEW', 'REVIEWING', 'SHORTLISTED', 'REJECTED', 'ONBOARDED']),
  adminNote: z.string().trim().max(3000).optional().or(z.literal(''))
});

const onboardingSchema = z.object({
  credentialVerified: z.boolean().optional().default(false),
  supervisionVerified: z.boolean().optional().default(false),
  orientationCompleted: z.boolean().optional().default(false),
  onboardingNote: z.string().trim().max(3000).optional().or(z.literal(''))
});

const contributorStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED', 'INACTIVE']),
  orientationCompleted: z.boolean().optional().default(false),
  onboardingNote: z.string().trim().max(3000).optional().or(z.literal(''))
});

function serviceScopeFor(track: string) {
  switch (track) {
    case 'PROFESSIONAL_PSYCHOLOGIST':
      return 'CLINICAL_PSYCHOLOGY' as const;
    case 'PSYCHOLOGY_STUDENT_VOLUNTEER':
      return 'SUPERVISED_STUDENT_SUPPORT' as const;
    default:
      return 'NON_CLINICAL_PEER_SUPPORT' as const;
  }
}

function normalizeListenerAnswers(raw: unknown): Array<{ questionId: string; optionId: string }> {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const record = item as Record<string, unknown>;
      return {
        questionId: String(record['questionId'] || ''),
        optionId: String(record['optionId'] || '')
      };
    })
    .filter((item): item is { questionId: string; optionId: string } =>
      Boolean(item?.questionId && item.optionId)
    );
}

function listenerProfileChecklist(application: any) {
  const doctorProfile = application.autoApprovedDoctorUser?.doctorProfile;
  const mental = doctorProfile?.mentalHealthProfile;
  const services = mental?.services ?? [];
  const items = [
    {
      key: 'photo',
      label: 'Profile photo added',
      complete: Boolean(
        application.autoApprovedDoctorUser?.profileImageKey ||
        application.autoApprovedDoctorUser?.profileImageUrl
      )
    },
    {
      key: 'bio',
      label: 'Public bio has at least 80 characters',
      complete: Boolean((doctorProfile?.bio || '').trim().length >= 80)
    },
    {
      key: 'gender',
      label: 'Gender selected',
      complete: Boolean(application.autoApprovedDoctorUser?.gender)
    },
    {
      key: 'languages',
      label: 'Languages added',
      complete: Boolean(mental?.languages?.length)
    },
    {
      key: 'sessionTypes',
      label: 'Session types added',
      complete: Boolean(mental?.sessionTypes?.length)
    },
    {
      key: 'concerns',
      label: 'Concerns handled added',
      complete: Boolean(mental?.concernsHandled?.length)
    },
    {
      key: 'safety',
      label: 'Safety escalation note added',
      complete: Boolean((mental?.safetyEscalationNote || '').trim())
    },
    {
      key: 'availability',
      label: 'Available and accepting new users',
      complete: Boolean(doctorProfile?.isAvailable && mental?.acceptingNewUsers)
    },
    {
      key: 'services',
      label: 'At least one active service/pricing plan',
      complete: services.some((service: any) => service.isActive)
    }
  ];
  const completed = items.filter((item) => item.complete).length;
  return {
    items,
    completed,
    total: items.length,
    ready: completed === items.length,
    showOnWebsite: Boolean(doctorProfile?.showOnWebsite)
  };
}

export function registerAdminCounsellorApplicationRoutes(router: Router) {
  router.get(
    '/admin/counsellor-applications',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
    asyncRoute(async (req, res) => {
      const { status } = req.query as { status?: string };
      const applications = await prisma.counsellorApplication.findMany({
        where: status ? { status: status as any } : {},
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        include: {
          reviewedBy: { select: { id: true, name: true, email: true } },
          onboardedContributor: {
            select: {
              id: true,
              status: true,
              serviceScope: true,
              credentialVerificationStatus: true,
              orientationCompletedAt: true,
              activatedAt: true,
              platformAccountLinkedAt: true
            }
          },
          listenerScreeningAttempts: {
            orderBy: { createdAt: 'desc' },
            take: 5,
            include: {
              questionSet: {
                select: {
                  id: true,
                  version: true,
                  passScore: true,
                  questions: true
                }
              }
            }
          }
        }
      });

      const counts = await prisma.counsellorApplication.groupBy({
        by: ['status'],
        _count: { id: true }
      });
      const listenerEmails = applications
        .filter((application) => application.applicationTrack !== 'PROFESSIONAL_PSYCHOLOGIST')
        .map((application) => application.email.toLowerCase());
      const recentFailedAttempts = listenerEmails.length
        ? await prisma.listenerScreeningAttempt.groupBy({
            by: ['email'],
            where: {
              email: { in: listenerEmails, mode: 'insensitive' },
              passed: false,
              createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
            },
            _count: { id: true }
          })
        : [];
      const recentFailedAttemptCountByEmail = new Map(
        recentFailedAttempts.map((row) => [row.email.toLowerCase(), row._count.id])
      );
      const autoApprovedUserIds = applications
        .map((application) => application.autoApprovedDoctorUserId)
        .filter((id): id is string => Boolean(id));
      const autoApprovedUsers = autoApprovedUserIds.length
        ? await prisma.user.findMany({
            where: { id: { in: autoApprovedUserIds } },
            select: {
              id: true,
              name: true,
              gender: true,
              profileImageKey: true,
              profileImageUrl: true,
              doctorProfile: {
                select: {
                  id: true,
                  showOnWebsite: true,
                  isAvailable: true,
                  bio: true,
                  mentalHealthProfile: {
                    select: {
                      languages: true,
                      sessionTypes: true,
                      concernsHandled: true,
                      safetyEscalationNote: true,
                      acceptingNewUsers: true,
                      services: {
                        select: {
                          id: true,
                          title: true,
                          pricingMode: true,
                          priceInPaise: true,
                          durationMinutes: true,
                          isFree: true,
                          isActive: true
                        }
                      }
                    }
                  }
                }
              }
            }
          })
        : [];
      const autoApprovedUserById = new Map(autoApprovedUsers.map((user) => [user.id, user]));
      const summary = { NEW: 0, REVIEWING: 0, SHORTLISTED: 0, REJECTED: 0, ONBOARDED: 0 };
      for (const row of counts) {
        summary[row.status as keyof typeof summary] = row._count.id;
      }

      res.json({
        applications: applications.map((application) => {
          const { listenerScreeningAttempts, ...applicationPayload } = application;
          const questionSet = listenerScreeningAttempts[0]?.questionSet;
          const answers = normalizeListenerAnswers(application.listenerScreeningAnswers);
          const reviewDetails = questionSet
            ? listenerScreeningReviewDetails(
                sanitizeListenerScreeningQuestions(questionSet.questions),
                answers
              )
            : [];
          return {
            ...applicationPayload,
            autoApprovedDoctorUser: application.autoApprovedDoctorUserId
              ? (autoApprovedUserById.get(application.autoApprovedDoctorUserId) ?? null)
              : null,
            listenerScreeningAttempts: listenerScreeningAttempts.map((attempt) => ({
              id: attempt.id,
              questionSetId: attempt.questionSetId,
              questionSetVersion: attempt.questionSetVersion,
              score: attempt.score,
              maxScore: attempt.maxScore,
              passed: attempt.passed,
              guidelinesAccepted: attempt.guidelinesAccepted,
              guidelinesReadSeconds: attempt.guidelinesReadSeconds,
              trainingCompleted: attempt.trainingCompleted,
              cooldownExpiresAt: attempt.cooldownExpiresAt?.toISOString() ?? null,
              createdAt: attempt.createdAt.toISOString()
            })),
            listenerRecentFailedAttempts:
              recentFailedAttemptCountByEmail.get(application.email.toLowerCase()) ?? 0,
            listenerScreeningReview: {
              questionSetId: questionSet?.id ?? application.listenerScreeningQuestionSetId,
              questionSetVersion:
                questionSet?.version ?? application.listenerScreeningQuestionSetVersion,
              passScore: questionSet?.passScore ?? null,
              incorrect: reviewDetails.filter((item) => !item.correct),
              correctCount: reviewDetails.filter((item) => item.correct).length,
              details: reviewDetails
            },
            listenerProfileChecklist: listenerProfileChecklist({
              ...application,
              autoApprovedDoctorUser: application.autoApprovedDoctorUserId
                ? (autoApprovedUserById.get(application.autoApprovedDoctorUserId) ?? null)
                : null
            })
          };
        }),
        summary
      });
    })
  );

  router.patch(
    '/admin/counsellor-applications/:id/status',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
    asyncRoute(async (req, res) => {
      const id = routeParam(req, 'id');
      const body = statusSchema.parse(req.body);
      if (body.status === 'ONBOARDED') {
        return res.status(400).json({
          message:
            'Use the onboarding action so the contributor profile and safeguards are recorded.'
        });
      }
      const existing = await prisma.counsellorApplication.findUnique({
        where: { id },
        select: { id: true, onboardedContributor: { select: { id: true } } }
      });
      if (!existing) return res.status(404).json({ message: 'Application not found.' });
      if (existing.onboardedContributor) {
        return res.status(400).json({
          message: 'Manage the contributor profile instead of changing an onboarded application.'
        });
      }

      const application = await prisma.counsellorApplication.update({
        where: { id },
        data: {
          status: body.status,
          adminNote: body.adminNote || null,
          reviewedById: req.user?.id || null,
          reviewedAt: new Date()
        }
      });

      await writeAuditLog({
        actorId: req.user?.id,
        actorRole: req.user?.role,
        action: 'COUNSELLOR_APPLICATION_STATUS_UPDATED',
        targetType: 'CounsellorApplication',
        targetId: application.id,
        summary: `Updated counsellor application ${application.fullName} to ${application.status}`
      });

      res.json({ application });
    })
  );

  router.post(
    '/admin/counsellor-applications/:id/onboard',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
    asyncRoute(async (req, res) => {
      const id = routeParam(req, 'id');
      const body = onboardingSchema.parse(req.body);
      const application = await prisma.counsellorApplication.findUnique({ where: { id } });

      if (!application) return res.status(404).json({ message: 'Application not found.' });
      if (application.status !== 'SHORTLISTED') {
        return res.status(400).json({ message: 'Shortlist the application before onboarding.' });
      }

      const existing = await prisma.careContributor.findUnique({ where: { applicationId: id } });
      if (existing) {
        return res
          .status(409)
          .json({ message: 'A contributor profile already exists for this application.' });
      }

      if (
        application.applicationTrack === 'PROFESSIONAL_PSYCHOLOGIST' &&
        !body.credentialVerified
      ) {
        return res
          .status(400)
          .json({ message: 'Verify the psychologist credential before onboarding.' });
      }
      if (
        application.applicationTrack === 'PSYCHOLOGY_STUDENT_VOLUNTEER' &&
        !body.supervisionVerified
      ) {
        return res
          .status(400)
          .json({ message: 'Verify the student supervision details before onboarding.' });
      }
      if (
        application.applicationTrack !== 'PROFESSIONAL_PSYCHOLOGIST' &&
        !application.agreesToNonClinicalRole
      ) {
        return res
          .status(400)
          .json({ message: 'The non-clinical role agreement is required before onboarding.' });
      }

      const now = new Date();
      const status = body.orientationCompleted ? 'ACTIVE' : 'PENDING_ORIENTATION';
      const credentialVerificationStatus =
        application.applicationTrack === 'PROFESSIONAL_PSYCHOLOGIST' ? 'VERIFIED' : 'NOT_REQUIRED';

      const contributor = await prisma.$transaction(async (tx) => {
        const created = await tx.careContributor.create({
          data: {
            applicationId: application.id,
            applicationTrack: application.applicationTrack,
            careTeamType: application.careTeamType,
            serviceScope: serviceScopeFor(application.applicationTrack),
            status,
            credentialVerificationStatus,
            fullName: application.fullName,
            email: application.email,
            phone: application.phone,
            gender: application.gender,
            city: application.city,
            qualification: application.qualification,
            qualifiedFrom: application.qualifiedFrom,
            specialization: application.specialization,
            registrationDetails: application.registrationDetails,
            languages: application.languages,
            availability: application.availability,
            supervisionDetails: application.supervisionDetails,
            nonClinicalAgreementAccepted: application.agreesToNonClinicalRole,
            credentialVerifiedAt: body.credentialVerified ? now : null,
            supervisionVerifiedAt: body.supervisionVerified ? now : null,
            orientationCompletedAt: body.orientationCompleted ? now : null,
            activatedAt: body.orientationCompleted ? now : null,
            onboardingNote: body.onboardingNote || null
          }
        });
        await tx.counsellorApplication.update({
          where: { id: application.id },
          data: {
            status: 'ONBOARDED',
            adminNote: body.onboardingNote || application.adminNote,
            reviewedById: req.user?.id || null,
            reviewedAt: now
          }
        });
        return created;
      });

      await writeAuditLog({
        actorId: req.user?.id,
        actorRole: req.user?.role,
        action: 'CARE_CONTRIBUTOR_ONBOARDED',
        targetType: 'CareContributor',
        targetId: contributor.id,
        summary: `Onboarded ${contributor.fullName} as ${contributor.serviceScope}.`,
        metadata: {
          applicationId: application.id,
          track: contributor.applicationTrack,
          status: contributor.status,
          credentialVerificationStatus: contributor.credentialVerificationStatus
        }
      });

      res.status(201).json({ contributor });
    })
  );

  router.patch(
    '/admin/care-contributors/:id/status',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
    asyncRoute(async (req, res) => {
      const id = routeParam(req, 'id');
      const body = contributorStatusSchema.parse(req.body);
      const existing = await prisma.careContributor.findUnique({ where: { id } });
      if (!existing) return res.status(404).json({ message: 'Care contributor not found.' });

      const orientationCompletedAt =
        existing.orientationCompletedAt ?? (body.orientationCompleted ? new Date() : null);
      if (body.status === 'ACTIVE' && !orientationCompletedAt) {
        return res
          .status(400)
          .json({ message: 'Complete orientation before activating this contributor.' });
      }

      const contributor = await prisma.careContributor.update({
        where: { id },
        data: {
          status: body.status,
          orientationCompletedAt,
          activatedAt:
            body.status === 'ACTIVE' ? existing.activatedAt || new Date() : existing.activatedAt,
          onboardingNote: body.onboardingNote || existing.onboardingNote
        }
      });

      await writeAuditLog({
        actorId: req.user?.id,
        actorRole: req.user?.role,
        action: 'CARE_CONTRIBUTOR_STATUS_UPDATED',
        targetType: 'CareContributor',
        targetId: contributor.id,
        summary: `Updated ${contributor.fullName} to ${contributor.status}.`,
        metadata: {
          status: contributor.status,
          orientationCompleted: Boolean(contributor.orientationCompletedAt)
        }
      });

      res.json({ contributor });
    })
  );
}

import { randomBytes } from 'node:crypto';
import { Router } from 'express';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { authRequired, allowRoles } from '../auth.js';
import { SERVER_CONFIG } from '../constants/config.constants.js';
import { prisma } from '../db.js';
import { asyncRoute } from '../utils/helpers.js';

export const providerShareLinksRouter = Router();

const createSchema = z.object({
  kind: z.enum(['PROFILE', 'BOOK', 'TALK']),
  mode: z.enum(['chat', 'voice', 'video']).optional(),
  careTeamServiceId: z.string().trim().min(1).optional(),
  label: z.string().trim().max(80).optional(),
  expiresAt: z.string().datetime().optional()
});

const updateSchema = z.object({
  isActive: z.boolean().optional(),
  label: z.string().trim().max(80).nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional()
});

function slugify(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'provider'
  );
}

function profileSlug(doctor: { id: string; user: { name: string } }) {
  return `${slugify(doctor.user.name)}-${doctor.id}`;
}

function publicBaseUrl() {
  return SERVER_CONFIG.ORIGINS.WEB.replace(/\/$/, '');
}

function routeParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] || '' : value || '';
}

async function currentDoctor(userId: string) {
  return prisma.doctor.findUnique({
    where: { userId },
    select: {
      id: true,
      showOnWebsite: true,
      user: { select: { name: true } },
      mentalHealthProfile: {
        select: {
          services: {
            where: { isActive: true, approvalStatus: 'APPROVED' },
            orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
            select: {
              id: true,
              title: true,
              durationMinutes: true,
              priceInPaise: true,
              isFree: true
            }
          }
        }
      }
    }
  });
}

function linkPayload(link: any) {
  return { ...link, url: `${publicBaseUrl()}/s/${link.code}` };
}

providerShareLinksRouter.get(
  '/doctor/share-links',
  authRequired,
  allowRoles(Role.DOCTOR, Role.ADMIN),
  asyncRoute(async (req, res) => {
    const doctor = await currentDoctor(req.user!.id);
    if (!doctor) return res.status(404).json({ message: 'Provider profile not found.' });
    const links = await prisma.providerShareLink.findMany({
      where: { doctorId: doctor.id },
      include: { careTeamService: { select: { id: true, title: true, durationMinutes: true } } },
      orderBy: { createdAt: 'desc' }
    });
    const slug = profileSlug(doctor);
    res.json({
      provider: { name: doctor.user.name, slug, isPublic: doctor.showOnWebsite },
      permanentLinks: {
        profile: `${publicBaseUrl()}/p/${slug}`,
        book: `${publicBaseUrl()}/p/${slug}?intent=book`,
        chat: `${publicBaseUrl()}/p/${slug}?intent=talk&mode=chat`,
        voice: `${publicBaseUrl()}/p/${slug}?intent=talk&mode=voice`,
        video: `${publicBaseUrl()}/p/${slug}?intent=talk&mode=video`
      },
      services: doctor.mentalHealthProfile?.services ?? [],
      links: links.map(linkPayload),
      totalClicks: links.reduce((total, link) => total + link.clickCount, 0)
    });
  })
);

providerShareLinksRouter.post(
  '/doctor/share-links',
  authRequired,
  allowRoles(Role.DOCTOR, Role.ADMIN),
  asyncRoute(async (req, res) => {
    const body = createSchema.parse(req.body);
    const doctor = await currentDoctor(req.user!.id);
    if (!doctor) return res.status(404).json({ message: 'Provider profile not found.' });
    if (
      body.careTeamServiceId &&
      !doctor.mentalHealthProfile?.services.some((service) => service.id === body.careTeamServiceId)
    ) {
      return res.status(400).json({ message: 'Choose one of your active services.' });
    }
    const link = await prisma.providerShareLink.create({
      data: {
        code: randomBytes(6).toString('base64url'),
        doctorId: doctor.id,
        careTeamServiceId: body.careTeamServiceId,
        kind: body.kind,
        mode: body.kind === 'TALK' ? (body.mode ?? 'chat') : null,
        label: body.label || null,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null
      },
      include: { careTeamService: { select: { id: true, title: true, durationMinutes: true } } }
    });
    res.status(201).json({ link: linkPayload(link) });
  })
);

providerShareLinksRouter.patch(
  '/doctor/share-links/:id',
  authRequired,
  allowRoles(Role.DOCTOR, Role.ADMIN),
  asyncRoute(async (req, res) => {
    const body = updateSchema.parse(req.body);
    const doctor = await currentDoctor(req.user!.id);
    if (!doctor) return res.status(404).json({ message: 'Provider profile not found.' });
    const existing = await prisma.providerShareLink.findFirst({
      where: { id: routeParam(req.params['id']), doctorId: doctor.id }
    });
    if (!existing) return res.status(404).json({ message: 'Share link not found.' });
    const link = await prisma.providerShareLink.update({
      where: { id: existing.id },
      data: {
        isActive: body.isActive,
        label: body.label === undefined ? undefined : body.label,
        expiresAt:
          body.expiresAt === undefined
            ? undefined
            : body.expiresAt
              ? new Date(body.expiresAt)
              : null
      },
      include: { careTeamService: { select: { id: true, title: true, durationMinutes: true } } }
    });
    res.json({ link: linkPayload(link) });
  })
);

providerShareLinksRouter.get(
  '/hope-hub/share/:code',
  asyncRoute(async (req, res) => {
    const link = await prisma.providerShareLink.findFirst({
      where: {
        code: routeParam(req.params['code']),
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        doctor: { showOnWebsite: true, suspendedAt: null, user: { isActive: true } }
      }
    });
    if (!link) return res.status(404).json({ message: 'This share link is unavailable.' });
    const doctor = await prisma.doctor.findUniqueOrThrow({
      where: { id: link.doctorId },
      select: { id: true, user: { select: { name: true } } }
    });
    await prisma.providerShareLink.update({
      where: { id: link.id },
      data: { clickCount: { increment: 1 }, lastOpenedAt: new Date() }
    });
    const params = new URLSearchParams();
    if (link.kind === 'BOOK') params.set('intent', 'book');
    if (link.kind === 'TALK') {
      params.set('intent', 'talk');
      params.set('mode', link.mode || 'chat');
    }
    if (link.careTeamServiceId) params.set('service', link.careTeamServiceId);
    params.set('shareCode', link.code);
    const query = params.toString();
    res.json({ target: `/p/${profileSlug(doctor)}${query ? `?${query}` : ''}` });
  })
);

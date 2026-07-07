import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { authRequired, allowRoles } from '../../auth.js';
import { prisma } from '../../db.js';
import { DEFAULT_REMINDER_PREFERENCE } from '../../constants/reminder-preferences.constants.js';
import { asyncRoute, patientProfileSelect } from '../../utils/helpers.js';
import { buildPatientIdCard } from '../../services/patient-identity.js';
import { normalizeMobile } from '../../services/patient-identity.js';
import {
  formatDateOfBirth,
  mapProfileUpdateToUserData,
  patientPasswordSchema,
  patientProfileUpdateSchema,
  reminderPreferencesSchema
} from '../../services/patient-profile.js';
import {
  capabilitiesForRole,
  defaultRouteForRole,
  portalForRole,
  sessionPayloadForUser
} from '../../constants/rbac-helpers.js';
import { attachStaffProfile } from '../../staff-profile.js';
import { enrichWithProfileImageUrl, userProfileImagePath } from '../../utils/profile-image-url.js';

function serializePatientProfile(user: {
  passwordHash?: string | null;
  dateOfBirth?: Date | null;
  profileImageKey?: string | null;
  [key: string]: unknown;
}) {
  const { passwordHash, dateOfBirth, profileImageKey, ...rest } = user;
  return {
    ...enrichWithProfileImageUrl(
      { ...rest, id: String(rest.id), profileImageKey },
      userProfileImagePath
    ),
    dateOfBirth: formatDateOfBirth(dateOfBirth ?? null),
    hasPassword: Boolean(passwordHash)
  };
}

export function registerAuthProfileRoutes(router: Router) {
  router.get('/me', authRequired, asyncRoute(async (req, res) => {
    const userRow = await prisma.user.findUniqueOrThrow({
      where: { id: req.user!.id },
      select: {
        id: true,
        name: true,
        role: true,
        email: true,
        mobile: true,
        patientCode: true,
        profileImageKey: true
      }
    });
    const withProfile = await attachStaffProfile(userRow);
    const payload = sessionPayloadForUser(withProfile);
    payload.user = enrichWithProfileImageUrl(withProfile, userProfileImagePath);
    res.json(payload);
  }));

  router.get('/capabilities', authRequired, asyncRoute(async (req, res) => {
    const withProfile = await attachStaffProfile(req.user!);
    const role = withProfile.role;
    const roleCaps = capabilitiesForRole(role);
    const capabilities = sessionPayloadForUser(withProfile).capabilities;
    res.json({
      role,
      capabilities,
      portal: portalForRole(role),
      defaultRoute: defaultRouteForRole(role, capabilities)
    });
  }));

  router.get(
    '/patient/profile',
    authRequired,
    allowRoles(Role.PATIENT),
    asyncRoute(async (req, res) => {
      const [user, reminderPreferences] = await Promise.all([
        prisma.user.findUniqueOrThrow({
          where: { id: req.user!.id },
          select: patientProfileSelect
        }),
        prisma.reminderPreference.findUnique({
          where: { userId: req.user!.id },
          select: {
            inApp: true,
            sms: true,
            whatsapp: true,
            push: true,
            quietHoursStart: true,
            quietHoursEnd: true
          }
        })
      ]);

      res.json({
        profile: serializePatientProfile(user),
        reminderPreferences: reminderPreferences || DEFAULT_REMINDER_PREFERENCE
      });
    })
  );

  router.get(
    '/patient/card',
    authRequired,
    allowRoles(Role.PATIENT),
    asyncRoute(async (req, res) => {
      const card = await buildPatientIdCard(req.user!.id);
      if (!card) {
        return res.status(404).json({ message: 'Patient ID card is not available yet.' });
      }
      res.json({ card });
    })
  );

  router.put(
    '/patient/profile',
    authRequired,
    allowRoles(Role.PATIENT),
    asyncRoute(async (req, res) => {
      const body = patientProfileUpdateSchema.parse(req.body);

      if (body.email) {
        const emailTaken = await prisma.user.findFirst({
          where: { email: body.email, role: Role.PATIENT, NOT: { id: req.user!.id } },
          select: { id: true }
        });
        if (emailTaken) {
          return res.status(409).json({ message: 'This email is already linked to another account.' });
        }
      }

      const alternateMobile = body.alternateMobile ? normalizeMobile(body.alternateMobile) : null;
      if (body.alternateMobile && !alternateMobile) {
        return res.status(400).json({ message: 'Invalid alternate mobile number.' });
      }

      const updated = await prisma.user.update({
        where: { id: req.user!.id },
        data: mapProfileUpdateToUserData(body, alternateMobile),
        select: patientProfileSelect
      });

      res.json({ profile: serializePatientProfile(updated) });
    })
  );

  router.put(
    '/patient/profile/password',
    authRequired,
    allowRoles(Role.PATIENT),
    asyncRoute(async (req, res) => {
      const body = patientPasswordSchema.parse(req.body);
      const user = await prisma.user.findUniqueOrThrow({
        where: { id: req.user!.id },
        select: { id: true, passwordHash: true }
      });

      if (user.passwordHash) {
        if (!body.currentPassword) {
          return res.status(400).json({ message: 'Current password is required.' });
        }
        const valid = await bcrypt.compare(body.currentPassword, user.passwordHash);
        if (!valid) {
          return res.status(401).json({ message: 'Current password is incorrect.' });
        }
      }

      const passwordHash = await bcrypt.hash(body.newPassword, 10);
      await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
      res.json({ message: 'Password saved.' });
    })
  );

  router.put(
    '/patient/reminder-preferences',
    authRequired,
    allowRoles(Role.PATIENT),
    asyncRoute(async (req, res) => {
      const body = reminderPreferencesSchema.parse(req.body);

      await prisma.reminderPreference.upsert({
        where: { userId: req.user!.id },
        create: { userId: req.user!.id, ...body },
        update: body
      });

      res.json({ preferences: body, message: 'Reminder preferences saved.' });
    })
  );
}

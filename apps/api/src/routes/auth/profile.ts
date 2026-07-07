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
  parseDateOfBirth,
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

function serializePatientProfile(user: {
  passwordHash?: string | null;
  dateOfBirth?: Date | null;
  [key: string]: unknown;
}) {
  const { passwordHash, dateOfBirth, ...rest } = user;
  return {
    ...rest,
    dateOfBirth: formatDateOfBirth(dateOfBirth ?? null),
    hasPassword: Boolean(passwordHash)
  };
}

export function registerAuthProfileRoutes(router: Router) {
  router.get('/me', authRequired, asyncRoute(async (req, res) => {
    const withProfile = await attachStaffProfile(req.user!);
    res.json(sessionPayloadForUser(withProfile));
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
        data: {
          name: body.name,
          email: body.email,
          alternateMobile,
          dateOfBirth: parseDateOfBirth(body.dateOfBirth),
          gender: body.gender,
          bloodGroup: body.bloodGroup,
          addressLine1: body.addressLine1,
          addressLine2: body.addressLine2,
          city: body.city,
          state: body.state,
          pincode: body.pincode,
          country: body.country ?? 'India',
          emergencyContactName: body.emergencyContactName,
          emergencyContactPhone: body.emergencyContactPhone,
          emergencyContactRelation: body.emergencyContactRelation,
          occupation: body.occupation,
          maritalStatus: body.maritalStatus,
          heightCm: body.heightCm,
          weightKg: body.weightKg,
          allergies: body.allergies,
          currentMedications: body.currentMedications,
          chronicConditions: body.chronicConditions,
          pastSurgeries: body.pastSurgeries,
          familyMedicalHistory: body.familyMedicalHistory,
          smokingStatus: body.smokingStatus,
          alcoholUse: body.alcoholUse,
          preferredLanguage: body.preferredLanguage,
          patientNotes: body.patientNotes
        },
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

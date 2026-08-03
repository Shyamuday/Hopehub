import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { PrismaClient, Role, HomeopathicDoctorType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const email = process.env.DOCTOR_EMAIL?.trim().toLowerCase();
const password = process.env.DOCTOR_PASSWORD;
const name = process.env.DOCTOR_NAME?.trim();
const mobile = process.env.DOCTOR_MOBILE?.trim() || null;
const specialty = process.env.DOCTOR_SPECIALTY?.trim() || 'Psychology';
const designation = process.env.DOCTOR_DESIGNATION?.trim() || 'Psychologist';
const department = process.env.DOCTOR_DEPARTMENT?.trim() || 'Healing Hub';
const yearsOfExperience = Number.parseInt(process.env.DOCTOR_EXPERIENCE_YEARS ?? '', 10);
const showOnWebsite = (process.env.DOCTOR_SHOW_ON_WEBSITE ?? 'true').toLowerCase() !== 'false';
const websiteOrder = Number.parseInt(process.env.DOCTOR_WEBSITE_ORDER ?? '', 10);

function csv(name: string, fallback: string[]) {
  return (process.env[name] ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean).length
    ? (process.env[name] ?? '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    : fallback;
}

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is missing.');
}
if (!name || !email || !password) {
  throw new Error('DOCTOR_NAME, DOCTOR_EMAIL, and DOCTOR_PASSWORD are required.');
}
if (password.length < 8) {
  throw new Error('DOCTOR_PASSWORD must be at least 8 characters.');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL })
});

const passwordHash = await bcrypt.hash(password, 10);

const result = await prisma.$transaction(async (tx) => {
  const existing = await tx.user.findUnique({ where: { email } });

  if (existing && existing.role !== Role.DOCTOR) {
    throw new Error(`A ${existing.role} account already exists for ${email}.`);
  }

  const user = existing
    ? await tx.user.update({
        where: { id: existing.id },
        data: {
          name,
          mobile,
          passwordHash,
          isActive: true
        }
      })
    : await tx.user.create({
        data: {
          name,
          email,
          mobile,
          passwordHash,
          role: Role.DOCTOR,
          isActive: true
        }
      });

  const doctor = await tx.doctor.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      doctorType: HomeopathicDoctorType.PSYCHOLOGIST,
      specialty,
      isAvailable: true,
      isOnline: true,
      designation,
      department,
      consultationFee: 0,
      consultationSharePercent: 60,
      bio:
        process.env.DOCTOR_BIO?.trim() ||
        `${name} is a psychologist and breakup coach specialist with ${Number.isFinite(yearsOfExperience) ? yearsOfExperience : 7}+ years of experience supporting people through relationship stress, emotional overwhelm, and recovery after separation.`,
      showOnWebsite,
      websiteOrder: Number.isFinite(websiteOrder) ? websiteOrder : null,
      yearsOfExperience: Number.isFinite(yearsOfExperience) ? yearsOfExperience : 7,
      focusAreas: csv('DOCTOR_FOCUS_AREAS', [
        'Breakup recovery',
        'Relationship stress',
        'Emotional resilience',
        'Self-worth and confidence'
      ])
    },
    update: {
      doctorType: HomeopathicDoctorType.PSYCHOLOGIST,
      specialty,
      isAvailable: true,
      isOnline: true,
      designation,
      department,
      consultationFee: 0,
      consultationSharePercent: 60,
      bio:
        process.env.DOCTOR_BIO?.trim() ||
        `${name} is a psychologist and breakup coach specialist with ${Number.isFinite(yearsOfExperience) ? yearsOfExperience : 7}+ years of experience supporting people through relationship stress, emotional overwhelm, and recovery after separation.`,
      showOnWebsite,
      websiteOrder: Number.isFinite(websiteOrder) ? websiteOrder : undefined,
      yearsOfExperience: Number.isFinite(yearsOfExperience) ? yearsOfExperience : 7,
      focusAreas: csv('DOCTOR_FOCUS_AREAS', [
        'Breakup recovery',
        'Relationship stress',
        'Emotional resilience',
        'Self-worth and confidence'
      ])
    }
  });

  await tx.mentalHealthProviderProfile.upsert({
    where: { doctorId: doctor.id },
    create: {
      doctorId: doctor.id,
      qualifications: csv('DOCTOR_QUALIFICATIONS', ['Psychologist', 'Breakup Coach Specialist']),
      languages: csv('DOCTOR_LANGUAGES', ['English', 'Hindi']),
      modalities: csv('DOCTOR_MODALITIES', [
        'Breakup recovery coaching',
        'Supportive counselling',
        'Emotional resilience work'
      ]),
      sessionTypes: csv('DOCTOR_SESSION_TYPES', ['Online audio', 'Online video', 'Chat support']),
      ageGroups: csv('DOCTOR_AGE_GROUPS', ['Adults', 'Young adults']),
      concernsHandled: csv('DOCTOR_CONCERNS', [
        'Breakup recovery',
        'Relationship anxiety',
        'Low mood',
        'Self-esteem',
        'Loneliness'
      ]),
      introSessionTitle:
        process.env.DOCTOR_INTRO_TITLE?.trim() || 'Breakup recovery and emotional support',
      counsellingApproach:
        process.env.DOCTOR_APPROACH?.trim() ||
        'Warm, practical, and recovery-focused support for people processing relationship loss and emotional stress.',
      acceptsHighRiskCases: false
    },
    update: {
      qualifications: csv('DOCTOR_QUALIFICATIONS', ['Psychologist', 'Breakup Coach Specialist']),
      languages: csv('DOCTOR_LANGUAGES', ['English', 'Hindi']),
      modalities: csv('DOCTOR_MODALITIES', [
        'Breakup recovery coaching',
        'Supportive counselling',
        'Emotional resilience work'
      ]),
      sessionTypes: csv('DOCTOR_SESSION_TYPES', ['Online audio', 'Online video', 'Chat support']),
      ageGroups: csv('DOCTOR_AGE_GROUPS', ['Adults', 'Young adults']),
      concernsHandled: csv('DOCTOR_CONCERNS', [
        'Breakup recovery',
        'Relationship anxiety',
        'Low mood',
        'Self-esteem',
        'Loneliness'
      ]),
      introSessionTitle:
        process.env.DOCTOR_INTRO_TITLE?.trim() || 'Breakup recovery and emotional support',
      counsellingApproach:
        process.env.DOCTOR_APPROACH?.trim() ||
        'Warm, practical, and recovery-focused support for people processing relationship loss and emotional stress.',
      acceptsHighRiskCases: false
    }
  });

  return tx.user.findUniqueOrThrow({
    where: { id: user.id },
    select: {
      id: true,
      name: true,
      email: true,
      isActive: true,
      doctorProfile: {
        select: {
          id: true,
          doctorType: true,
          specialty: true,
          showOnWebsite: true,
          websiteOrder: true,
          yearsOfExperience: true
        }
      }
    }
  });
});

await prisma.$disconnect();

console.log(
  JSON.stringify(
    {
      id: result.id,
      name: result.name,
      email: result.email,
      active: result.isActive,
      doctorProfile: result.doctorProfile
    },
    null,
    2
  )
);

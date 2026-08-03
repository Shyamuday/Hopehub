import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const email = process.env.DOCTOR_EMAIL?.trim().toLowerCase();
const startTime = process.env.AVAILABILITY_START_TIME?.trim() || '10:00';
const endTime = process.env.AVAILABILITY_END_TIME?.trim() || '21:00';
const daysAhead = Number.parseInt(process.env.AVAILABILITY_DAYS_AHEAD ?? '90', 10);
const slotMinutes = Number.parseInt(process.env.AVAILABILITY_SLOT_MINUTES ?? '30', 10);

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is missing.');
}
if (!email) {
  throw new Error('DOCTOR_EMAIL is required.');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL })
});

function minutes(value: string) {
  const [hour, minute = '0'] = value.split(':').map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    throw new Error(`Invalid time: ${value}`);
  }
  return hour * 60 + minute;
}

function timeFromMinutes(value: number) {
  const hour = Math.floor(value / 60);
  const minute = value % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function dateOnly(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

const doctor = await prisma.doctor.findFirst({
  where: { user: { email } },
  select: { id: true, userId: true, user: { select: { name: true, email: true } } }
});

if (!doctor) {
  throw new Error(`Doctor not found for ${email}.`);
}

const start = minutes(startTime);
const end = minutes(endTime);
if (end <= start) {
  throw new Error('AVAILABILITY_END_TIME must be after AVAILABILITY_START_TIME.');
}

const now = new Date();
const today = dateOnly(now);
const days = Number.isFinite(daysAhead) && daysAhead > 0 ? daysAhead : 90;
const size = Number.isFinite(slotMinutes) && slotMinutes > 0 ? slotMinutes : 30;
const weekendDates: Date[] = [];

for (let offset = 0; offset <= days; offset += 1) {
  const date = new Date(today);
  date.setUTCDate(today.getUTCDate() + offset);
  const day = date.getUTCDay();
  if (day === 0 || day === 6) {
    weekendDates.push(date);
  }
}

let upserted = 0;
await prisma.$transaction(async (tx) => {
  await tx.doctor.update({
    where: { id: doctor.id },
    data: {
      shiftStart: startTime,
      shiftEnd: endTime,
      weeklyOffDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      isAvailable: true,
      isOnline: true,
      showOnWebsite: true
    }
  });

  for (const date of weekendDates) {
    for (let cursor = start; cursor + size <= end; cursor += size) {
      await tx.doctorSlot.upsert({
        where: {
          doctorId_date_startTime: {
            doctorId: doctor.id,
            date,
            startTime: timeFromMinutes(cursor)
          }
        },
        create: {
          doctorId: doctor.id,
          date,
          startTime: timeFromMinutes(cursor),
          endTime: timeFromMinutes(cursor + size),
          isBlocked: false
        },
        update: {
          endTime: timeFromMinutes(cursor + size),
          isBlocked: false
        }
      });
      upserted += 1;
    }
  }
});

await prisma.$disconnect();

console.log(
  JSON.stringify(
    {
      doctorId: doctor.id,
      name: doctor.user.name,
      email: doctor.user.email,
      availability: 'Saturday and Sunday',
      startTime,
      endTime,
      slotMinutes: size,
      daysAhead: days,
      weekendDates: weekendDates.length,
      slotsUpserted: upserted
    },
    null,
    2
  )
);

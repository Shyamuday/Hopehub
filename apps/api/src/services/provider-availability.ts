import type { ProviderAvailabilityRule } from '@prisma/client';
import { prisma } from '../db.js';

export function addMinutesToTime(time: string, minutes: number): string {
  const [hour = 0, minute = 0] = time.split(':').map(Number);
  const total = hour * 60 + minute + minutes;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export function minutesBetween(start: string, end: string): number {
  const [sh = 0, sm = 0] = start.split(':').map(Number);
  const [eh = 0, em = 0] = end.split(':').map(Number);
  return eh * 60 + em - (sh * 60 + sm);
}

function dateOnly(date: Date) {
  return new Date(date.toISOString().slice(0, 10));
}

function eachDate(from: Date, to: Date) {
  const dates: Date[] = [];
  const cursor = dateOnly(from);
  const end = dateOnly(to);
  while (cursor <= end) {
    dates.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

function slotTimes(
  rule: Pick<
    ProviderAvailabilityRule,
    'startTime' | 'endTime' | 'slotDurationMinutes' | 'bufferMinutes' | 'maxSessionsPerDay'
  >
) {
  const slots: Array<{ startTime: string; endTime: string }> = [];
  let cursor = rule.startTime;
  const step = rule.slotDurationMinutes + rule.bufferMinutes;
  while (cursor < rule.endTime) {
    const endTime = addMinutesToTime(cursor, rule.slotDurationMinutes);
    if (endTime > rule.endTime) break;
    slots.push({ startTime: cursor, endTime });
    if (rule.maxSessionsPerDay && slots.length >= rule.maxSessionsPerDay) break;
    cursor = addMinutesToTime(cursor, step);
  }
  return slots;
}

export async function generateSlotsForAvailabilityRule(ruleId: string, from: Date, to: Date) {
  const rule = await prisma.providerAvailabilityRule.findUnique({ where: { id: ruleId } });
  if (!rule || !rule.isActive) return { generated: 0, skipped: 0 };
  const effectiveFrom = rule.startsOn > from ? rule.startsOn : from;
  const effectiveTo = rule.endsOn && rule.endsOn < to ? rule.endsOn : to;
  let generated = 0;
  let skipped = 0;
  const times = slotTimes(rule);

  for (const date of eachDate(effectiveFrom, effectiveTo)) {
    if (date.getDay() !== rule.weekday) continue;
    for (const time of times) {
      try {
        await prisma.doctorSlot.upsert({
          where: {
            doctorId_date_startTime: {
              doctorId: rule.doctorId,
              date,
              startTime: time.startTime
            }
          },
          create: {
            doctorId: rule.doctorId,
            careTeamServiceId: rule.careTeamServiceId,
            generatedByRuleId: rule.id,
            date,
            startTime: time.startTime,
            endTime: time.endTime,
            bufferMinutes: rule.bufferMinutes
          },
          update: {
            careTeamServiceId: rule.careTeamServiceId,
            generatedByRuleId: rule.id,
            endTime: time.endTime,
            bufferMinutes: rule.bufferMinutes
          }
        });
        generated += 1;
      } catch {
        skipped += 1;
      }
    }
  }

  return { generated, skipped };
}

export function defaultGenerationRange() {
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  to.setDate(to.getDate() + 30);
  return { from, to };
}

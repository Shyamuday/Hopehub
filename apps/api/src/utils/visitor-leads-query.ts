import type { Prisma, WebsiteLeadFollowUp } from '@prisma/client';
import type { Request } from 'express';
import { queryText } from '../utils/helpers.js';
import { FOLLOW_UP_STATUSES } from '../services/website-leads.service.js';

export type VisitorLeadListFilters = {
  followUpStatus?: WebsiteLeadFollowUp;
  source?: 'CHAT_BOT' | 'HOME_BOOKING' | 'PROMO_POPUP';
  dateFrom?: Date;
  dateTo?: Date;
  notInterestedOnly?: boolean;
};

export function parseVisitorLeadListFilters(req: Request): VisitorLeadListFilters {
  const status = queryText(req, 'followUpStatus').toUpperCase();
  const source = queryText(req, 'source').toUpperCase();
  const dateFromRaw = queryText(req, 'dateFrom');
  const dateToRaw = queryText(req, 'dateTo');
  const notInterestedOnly = queryText(req, 'notInterestedOnly') === 'true';

  const where: VisitorLeadListFilters = {};

  if (status && status !== 'ALL' && FOLLOW_UP_STATUSES.includes(status as WebsiteLeadFollowUp)) {
    where.followUpStatus = status as WebsiteLeadFollowUp;
  }
  if (source && source !== 'ALL' && ['CHAT_BOT', 'HOME_BOOKING', 'PROMO_POPUP'].includes(source)) {
    where.source = source as VisitorLeadListFilters['source'];
  }
  if (dateFromRaw) {
    const d = new Date(dateFromRaw);
    if (!Number.isNaN(d.getTime())) where.dateFrom = d;
  }
  if (dateToRaw) {
    const d = new Date(dateToRaw);
    if (!Number.isNaN(d.getTime())) {
      d.setHours(23, 59, 59, 999);
      where.dateTo = d;
    }
  }
  if (notInterestedOnly) {
    where.notInterestedOnly = true;
  }

  return where;
}

export function buildVisitorLeadWhere(filters: VisitorLeadListFilters): Prisma.WebsiteLeadWhereInput {
  const where: Prisma.WebsiteLeadWhereInput = {};

  if (filters.followUpStatus) {
    where.followUpStatus = filters.followUpStatus;
  } else if (filters.notInterestedOnly) {
    where.followUpStatus = 'NOT_INTERESTED';
  }

  if (filters.source) {
    where.source = filters.source;
  }

  if (filters.dateFrom || filters.dateTo) {
    where.createdAt = {};
    if (filters.dateFrom) where.createdAt.gte = filters.dateFrom;
    if (filters.dateTo) where.createdAt.lte = filters.dateTo;
  }

  return where;
}

const CSV_HEADERS = [
  'id',
  'createdAt',
  'source',
  'followUpStatus',
  'visitorName',
  'visitorPhone',
  'visitorIssue',
  'concern',
  'preferredCallbackTime',
  'notInterestedReason',
  'registeredAt',
  'calledAt',
  'bookedAt',
  'operatorNote',
  'entryPage'
] as const;

function csvEscape(value: string | null | undefined) {
  const s = value ?? '';
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function leadsToCsv(
  leads: Array<{
    id: string;
    createdAt: Date;
    source: string;
    followUpStatus: string;
    visitorName: string | null;
    visitorPhone: string | null;
    visitorIssue: string | null;
    concern: string | null;
    preferredCallbackTime: string | null;
    notInterestedReason: string | null;
    registeredAt: Date | null;
    calledAt: Date | null;
    bookedAt: Date | null;
    operatorNote: string | null;
    entryPage: string | null;
  }>
) {
  const lines = [CSV_HEADERS.join(',')];
  for (const lead of leads) {
    lines.push(
      [
        lead.id,
        lead.createdAt.toISOString(),
        lead.source,
        lead.followUpStatus,
        lead.visitorName,
        lead.visitorPhone,
        lead.visitorIssue,
        lead.concern,
        lead.preferredCallbackTime,
        lead.notInterestedReason,
        lead.registeredAt?.toISOString() ?? '',
        lead.calledAt?.toISOString() ?? '',
        lead.bookedAt?.toISOString() ?? '',
        lead.operatorNote,
        lead.entryPage
      ]
        .map((v) => csvEscape(v == null ? '' : String(v)))
        .join(',')
    );
  }
  return lines.join('\n');
}

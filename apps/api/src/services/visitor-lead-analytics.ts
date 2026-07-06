import { WebsiteLeadFollowUp } from '@prisma/client';
import { prisma } from '../db.js';

export const LEAD_FUNNEL_STEPS: { status: WebsiteLeadFollowUp; label: string }[] = [
  { status: 'NEW', label: 'New leads' },
  { status: 'NEEDS_CALLBACK', label: 'Needs callback' },
  { status: 'CALLED', label: 'Called' },
  { status: 'REGISTERED', label: 'Registered' },
  { status: 'BOOKED', label: 'Consultation booked' }
];

export async function buildLeadFunnelReport(days: number) {
  const windowDays = Math.min(90, Math.max(7, days));
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - (windowDays - 1));
  start.setHours(0, 0, 0, 0);

  const leads = await prisma.websiteLead.findMany({
    where: { createdAt: { gte: start, lte: end } },
    select: {
      id: true,
      source: true,
      followUpStatus: true,
      createdAt: true,
      calledAt: true,
      registeredAt: true,
      bookedAt: true
    }
  });

  const total = leads.length;
  const statusOrder: WebsiteLeadFollowUp[] = ['NEW', 'NEEDS_CALLBACK', 'CALLED', 'REGISTERED', 'BOOKED'];

  const reached = (lead: (typeof leads)[number], status: WebsiteLeadFollowUp) => {
    const currentIdx = statusOrder.indexOf(lead.followUpStatus);
    const idx = statusOrder.indexOf(status);
    if (currentIdx >= idx) return true;
    if (status === 'CALLED' && lead.calledAt) return true;
    if (status === 'REGISTERED' && lead.registeredAt) return true;
    if (status === 'BOOKED' && lead.bookedAt) return true;
    return false;
  };

  const funnel = LEAD_FUNNEL_STEPS.map((step, index) => {
    const count = leads.filter((l) => reached(l, step.status)).length;
    const prevCount = index === 0 ? total : leads.filter((l) => reached(l, LEAD_FUNNEL_STEPS[index - 1].status)).length;
    return {
      key: step.status,
      label: step.label,
      total: count,
      conversionFromStart: total ? Math.round((count / total) * 1000) / 10 : 0,
      conversionFromPrevious: prevCount ? Math.round((count / prevCount) * 1000) / 10 : 0
    };
  });

  const bySource = (['CHAT_BOT', 'HOME_BOOKING', 'PROMO_POPUP'] as const).map((source) => {
    const subset = leads.filter((l) => l.source === source);
    const booked = subset.filter((l) => l.followUpStatus === 'BOOKED' || l.bookedAt).length;
    return {
      source,
      total: subset.length,
      booked,
      conversionRate: subset.length ? Math.round((booked / subset.length) * 1000) / 10 : 0
    };
  });

  const notInterestedLeads = await prisma.websiteLead.findMany({
    where: {
      createdAt: { gte: start, lte: end },
      followUpStatus: 'NOT_INTERESTED',
      notInterestedReason: { not: null }
    },
    select: { notInterestedReason: true }
  });

  const reasonCounts = new Map<string, number>();
  for (const row of notInterestedLeads) {
    const reason = row.notInterestedReason ?? 'Unknown';
    const key = reason.split(' — ')[0]?.split(': ')[0] ?? reason;
    reasonCounts.set(key, (reasonCounts.get(key) ?? 0) + 1);
  }
  const notInterestedByReason = [...reasonCounts.entries()]
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count);

  const issueLeads = await prisma.websiteLead.findMany({
    where: {
      createdAt: { gte: start, lte: end },
      visitorIssue: { not: null }
    },
    select: { visitorIssue: true },
    take: 500
  });
  const issueCounts = new Map<string, number>();
  for (const row of issueLeads) {
    const issue = row.visitorIssue?.trim();
    if (!issue) continue;
    const key = issue.length > 80 ? `${issue.slice(0, 77)}…` : issue;
    issueCounts.set(key, (issueCounts.get(key) ?? 0) + 1);
  }
  const topVisitorIssues = [...issueCounts.entries()]
    .map(([issue, count]) => ({ issue, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    windowDays,
    summary: {
      totalLeads: total,
      needsCallback: leads.filter((l) => l.followUpStatus === 'NEEDS_CALLBACK').length,
      called: leads.filter((l) => l.calledAt || l.followUpStatus === 'CALLED').length,
      registered: leads.filter((l) => l.registeredAt || l.followUpStatus === 'REGISTERED').length,
      booked: leads.filter((l) => l.bookedAt || l.followUpStatus === 'BOOKED').length,
      notInterested: leads.filter((l) => l.followUpStatus === 'NOT_INTERESTED').length
    },
    funnel,
    bySource,
    notInterestedByReason,
    topVisitorIssues
  };
}

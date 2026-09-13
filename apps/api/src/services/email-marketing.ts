import { createHmac, timingSafeEqual } from 'node:crypto';
import {
  EmailCampaignAudience,
  EmailCampaignRecipientStatus,
  EmailCampaignStatus,
  EmailMarketingContactStatus,
  EmailSuppressionReason,
  Prisma,
  Role
} from '@prisma/client';
import { prisma } from '../db.js';
import { DEFAULT_JWT_SECRET } from '../constants/auth.constants.js';
import { sendEmail } from './mail.js';

const PUBLIC_API_ORIGIN = (
  process.env.HOPEHUB_API_PUBLIC_URL ||
  process.env.API_PUBLIC_URL ||
  'https://api.hopehub.in'
).replace(/\/$/, '');
const TRACKING_SECRET =
  process.env.EMAIL_MARKETING_SIGNING_SECRET || process.env.JWT_SECRET || DEFAULT_JWT_SECRET;
const DELIVERY_BATCH_SIZE = Math.min(
  50,
  Math.max(1, Number(process.env.EMAIL_MARKETING_BATCH_SIZE || 10))
);
const MAX_ATTEMPTS = 3;
const PROCESSING_STALE_MS = 10 * 60_000;

type TrackingPurpose = 'unsubscribe' | 'open' | 'click';
type TrackingPayload = {
  purpose: TrackingPurpose;
  recipientId: string;
  email?: string;
  url?: string;
};

export type ImportedEmailContact = { email: string; normalizedEmail: string; name?: string };

export type StructuredMarketingContact = {
  email: string;
  name?: string | null;
  mobile?: string | null;
  alternatePhone?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  landmark?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
  sourceChannel?: string | null;
  sourceSegments?: string[];
  tags?: string[];
  productNames?: string[];
  productSkus?: string[];
  paymentMethods?: string[];
  orderStatuses?: string[];
  firstOrderAt?: string | Date | null;
  lastOrderAt?: string | Date | null;
  orderCount?: number;
  totalOrderValue?: number;
  currency?: string | null;
};

export type EmailAudienceFilter = {
  states?: string[];
  cities?: string[];
  postalCodes?: string[];
  sourceLabels?: string[];
  sourceChannels?: string[];
  sourceSegments?: string[];
  paymentMethods?: string[];
  orderStatuses?: string[];
  tags?: string[];
  productQuery?: string;
  minOrderCount?: number;
  maxOrderCount?: number;
  minTotalOrderValue?: number;
  maxTotalOrderValue?: number;
  lastOrderFrom?: string;
  lastOrderTo?: string;
  hasMobile?: boolean;
};

export function normalizeMarketingEmail(value: string) {
  return value.trim().toLowerCase();
}

export function normalizeMarketingMobile(value: string) {
  const digits = value.replace(/\D/g, '');
  return digits.length >= 7 ? digits.slice(-15) : '';
}

const cleanText = (value?: string | null) => value?.trim() || undefined;
const canonicalValues = (values?: string[], limit = 100) =>
  [...new Set((values || []).map((value) => value.trim().toUpperCase()).filter(Boolean))].slice(
    0,
    limit
  );
const displayValues = (values?: string[], limit = 100) =>
  [...new Set((values || []).map((value) => value.trim()).filter(Boolean))].slice(0, limit);
const safeDate = (value?: string | Date | null) => {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

export function normalizeStructuredMarketingContact(
  contact: StructuredMarketingContact
): StructuredMarketingContact & { normalizedEmail: string; normalizedMobile?: string } {
  const email = normalizeMarketingEmail(contact.email);
  const mobile = cleanText(contact.mobile);
  const productNames = displayValues(contact.productNames);
  const productSkus = canonicalValues(contact.productSkus);
  return {
    email,
    normalizedEmail: email,
    name: cleanText(contact.name),
    mobile,
    normalizedMobile: mobile ? normalizeMarketingMobile(mobile) || undefined : undefined,
    alternatePhone: cleanText(contact.alternatePhone),
    addressLine1: cleanText(contact.addressLine1),
    addressLine2: cleanText(contact.addressLine2),
    landmark: cleanText(contact.landmark),
    city: cleanText(contact.city),
    state: cleanText(contact.state),
    postalCode: cleanText(contact.postalCode),
    country: cleanText(contact.country),
    sourceChannel: cleanText(contact.sourceChannel)?.toUpperCase(),
    sourceSegments: canonicalValues(contact.sourceSegments),
    tags: canonicalValues(contact.tags),
    productNames,
    productSkus,
    paymentMethods: canonicalValues(contact.paymentMethods),
    orderStatuses: canonicalValues(contact.orderStatuses),
    firstOrderAt: safeDate(contact.firstOrderAt),
    lastOrderAt: safeDate(contact.lastOrderAt),
    orderCount:
      contact.orderCount === undefined ? undefined : Math.max(0, Math.floor(contact.orderCount)),
    totalOrderValue:
      contact.totalOrderValue === undefined
        ? undefined
        : Math.max(0, Number(contact.totalOrderValue) || 0),
    currency: cleanText(contact.currency)?.toUpperCase() || 'INR'
  };
}

const normalizedFilterList = (values?: string[], uppercase = false) =>
  [...new Set((values || []).map((value) => value.trim()).filter(Boolean))].map((value) =>
    uppercase ? value.toUpperCase() : value
  );

export function normalizeEmailAudienceFilter(
  filter?: EmailAudienceFilter | null
): EmailAudienceFilter {
  if (!filter) return {};
  const normalized: EmailAudienceFilter = {};
  const listFields: Array<[keyof EmailAudienceFilter, boolean]> = [
    ['states', false],
    ['cities', false],
    ['postalCodes', false],
    ['sourceLabels', false],
    ['sourceChannels', true],
    ['sourceSegments', true],
    ['paymentMethods', true],
    ['orderStatuses', true],
    ['tags', true]
  ];
  for (const [key, uppercase] of listFields) {
    const values = normalizedFilterList(filter[key] as string[] | undefined, uppercase).slice(
      0,
      50
    );
    if (values.length) (normalized as Record<string, unknown>)[key] = values;
  }
  const productQuery = filter.productQuery?.trim();
  if (productQuery) normalized.productQuery = productQuery.slice(0, 120);
  for (const key of [
    'minOrderCount',
    'maxOrderCount',
    'minTotalOrderValue',
    'maxTotalOrderValue'
  ] as const) {
    const value = filter[key];
    if (value !== undefined && Number.isFinite(value) && value >= 0) normalized[key] = value;
  }
  for (const key of ['lastOrderFrom', 'lastOrderTo'] as const) {
    const date = safeDate(filter[key]);
    if (date) normalized[key] = date.toISOString();
  }
  if (filter.hasMobile !== undefined) normalized.hasMobile = filter.hasMobile;
  return normalized;
}

function insensitiveAny(field: 'state' | 'city' | 'postalCode' | 'sourceLabel', values?: string[]) {
  return (values || []).map((value) => ({
    [field]: { equals: value, mode: 'insensitive' as const }
  }));
}

export function buildMarketingContactWhere(input: {
  filter?: EmailAudienceFilter | null;
  query?: string;
  status?: EmailMarketingContactStatus;
  activeUnregisteredOnly?: boolean;
}): Prisma.EmailMarketingContactWhereInput {
  const filter = normalizeEmailAudienceFilter(input.filter);
  const and: Prisma.EmailMarketingContactWhereInput[] = [];
  for (const [field, values] of [
    ['state', filter.states],
    ['city', filter.cities],
    ['postalCode', filter.postalCodes],
    ['sourceLabel', filter.sourceLabels]
  ] as const) {
    if (values?.length) and.push({ OR: insensitiveAny(field, values) });
  }
  if (filter.sourceChannels?.length) and.push({ sourceChannel: { in: filter.sourceChannels } });
  if (filter.sourceSegments?.length)
    and.push({ sourceSegments: { hasSome: filter.sourceSegments } });
  if (filter.paymentMethods?.length)
    and.push({ paymentMethods: { hasSome: filter.paymentMethods } });
  if (filter.orderStatuses?.length) and.push({ orderStatuses: { hasSome: filter.orderStatuses } });
  if (filter.tags?.length) and.push({ tags: { hasSome: filter.tags } });
  if (filter.productQuery)
    and.push({ productSearchText: { contains: filter.productQuery, mode: 'insensitive' } });
  if (filter.minOrderCount !== undefined || filter.maxOrderCount !== undefined) {
    and.push({
      orderCount: { gte: filter.minOrderCount, lte: filter.maxOrderCount }
    });
  }
  if (filter.minTotalOrderValue !== undefined || filter.maxTotalOrderValue !== undefined) {
    and.push({
      totalOrderValue: {
        gte: filter.minTotalOrderValue,
        lte: filter.maxTotalOrderValue
      }
    });
  }
  if (filter.lastOrderFrom || filter.lastOrderTo) {
    and.push({
      lastOrderAt: {
        gte: filter.lastOrderFrom ? new Date(filter.lastOrderFrom) : undefined,
        lte: filter.lastOrderTo ? new Date(filter.lastOrderTo) : undefined
      }
    });
  }
  if (filter.hasMobile === true) and.push({ normalizedMobile: { not: null } });
  if (filter.hasMobile === false) and.push({ normalizedMobile: null });
  const query = input.query?.trim();
  if (query) {
    and.push({
      OR: [
        { email: { contains: query, mode: 'insensitive' } },
        { name: { contains: query, mode: 'insensitive' } },
        { mobile: { contains: query, mode: 'insensitive' } },
        { city: { contains: query, mode: 'insensitive' } },
        { state: { contains: query, mode: 'insensitive' } },
        { postalCode: { contains: query, mode: 'insensitive' } },
        { sourceLabel: { contains: query, mode: 'insensitive' } },
        { productSearchText: { contains: query, mode: 'insensitive' } }
      ]
    });
  }
  return {
    ...(input.activeUnregisteredOnly
      ? { status: EmailMarketingContactStatus.ACTIVE, registeredUserId: null }
      : input.status
        ? { status: input.status }
        : {}),
    ...(and.length ? { AND: and } : {})
  };
}

let filterOptionsCache:
  { expiresAt: number; value: Awaited<ReturnType<typeof loadMarketingFilterOptions>> } | undefined;

async function loadMarketingFilterOptions() {
  const contacts = await prisma.emailMarketingContact.findMany({
    where: { status: EmailMarketingContactStatus.ACTIVE },
    select: {
      state: true,
      city: true,
      postalCode: true,
      sourceLabel: true,
      sourceChannel: true,
      sourceSegments: true,
      paymentMethods: true,
      orderStatuses: true,
      tags: true
    }
  });
  const values = (items: Array<string | null | undefined>, limit = 500) =>
    [...new Set(items.map((item) => item?.trim()).filter((item): item is string => Boolean(item)))]
      .sort((left, right) => left.localeCompare(right))
      .slice(0, limit);
  return {
    states: values(contacts.map((contact) => contact.state)),
    cities: values(contacts.map((contact) => contact.city)),
    postalCodes: values(contacts.map((contact) => contact.postalCode)),
    sourceLabels: values(contacts.map((contact) => contact.sourceLabel)),
    sourceChannels: values(contacts.map((contact) => contact.sourceChannel)),
    sourceSegments: values(contacts.flatMap((contact) => contact.sourceSegments)),
    paymentMethods: values(contacts.flatMap((contact) => contact.paymentMethods)),
    orderStatuses: values(contacts.flatMap((contact) => contact.orderStatuses)),
    tags: values(contacts.flatMap((contact) => contact.tags))
  };
}

export async function marketingFilterOptions() {
  if (filterOptionsCache && filterOptionsCache.expiresAt > Date.now()) {
    return filterOptionsCache.value;
  }
  const value = await loadMarketingFilterOptions();
  filterOptionsCache = { expiresAt: Date.now() + 5 * 60_000, value };
  return value;
}

export function parseMarketingContacts(value: string): ImportedEmailContact[] {
  const contacts = new Map<string, ImportedEmailContact>();
  const add = (rawEmail: string, rawName = '') => {
    const email = normalizeMarketingEmail(rawEmail);
    const name = rawName.trim().replace(/^['"]|['"]$/g, '');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    const existing = contacts.get(email);
    contacts.set(email, {
      email,
      normalizedEmail: email,
      ...(name || existing?.name ? { name: name || existing?.name } : {})
    });
  };
  for (const rawLine of value.split(/[\r\n;]+/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const angle = line.match(/^(.+?)\s*<([^<>\s]+@[^<>\s]+)>$/);
    if (angle) {
      add(angle[2], angle[1]);
      continue;
    }
    const parts = line
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);
    if (parts.length === 2 && !parts[0].includes('@') && parts[1].includes('@')) {
      add(parts[1], parts[0]);
      continue;
    }
    for (const part of parts) add(part);
  }
  return [...contacts.values()];
}

export function sanitizeMarketingHtml(value: string) {
  return value
    .replace(/<(script|style|iframe|object|embed|form)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<(script|style|iframe|object|embed|form)\b[^>]*\/?\s*>/gi, '')
    .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\s+(?:src|href)\s*=\s*(["'])\s*javascript:[\s\S]*?\1/gi, '')
    .trim();
}

function trackingSignature(encoded: string) {
  return createHmac('sha256', TRACKING_SECRET).update(encoded).digest('base64url');
}

export function createEmailTrackingToken(payload: TrackingPayload) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${encoded}.${trackingSignature(encoded)}`;
}

export function readEmailTrackingToken(token: string, purpose: TrackingPurpose) {
  const [encoded, signature] = token.split('.');
  if (!encoded || !signature) return null;
  const expected = trackingSignature(encoded);
  const actualBytes = Buffer.from(signature);
  const expectedBytes = Buffer.from(expected);
  if (actualBytes.length !== expectedBytes.length || !timingSafeEqual(actualBytes, expectedBytes)) {
    return null;
  }
  try {
    const payload = JSON.parse(
      Buffer.from(encoded, 'base64url').toString('utf8')
    ) as TrackingPayload;
    return payload.purpose === purpose && payload.recipientId ? payload : null;
  } catch {
    return null;
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function personalizeMarketingContent(
  value: string,
  recipient: { name?: string | null; email: string },
  html = false
) {
  const fullName = recipient.name?.trim() || 'there';
  const firstName = fullName === 'there' ? fullName : fullName.split(/\s+/)[0];
  const replacements: Record<string, string> = {
    '{{firstName}}': firstName,
    '{{fullName}}': fullName,
    '{{email}}': recipient.email
  };
  let result = value;
  for (const [placeholder, replacement] of Object.entries(replacements)) {
    result = result.replaceAll(placeholder, html ? escapeHtml(replacement) : replacement);
  }
  return result;
}

function trackedLinks(html: string, recipientId: string) {
  return html.replace(/href\s*=\s*(["'])(https:\/\/[^"']+)\1/gi, (_match, quote, url) => {
    const token = createEmailTrackingToken({ purpose: 'click', recipientId, url });
    return `href=${quote}${PUBLIC_API_ORIGIN}/email-marketing/click?token=${encodeURIComponent(token)}${quote}`;
  });
}

export function renderMarketingEmail(input: {
  recipientId: string;
  email: string;
  name?: string | null;
  subject: string;
  previewText?: string | null;
  htmlBody: string;
  textBody: string;
}) {
  const unsubscribeToken = createEmailTrackingToken({
    purpose: 'unsubscribe',
    recipientId: input.recipientId,
    email: normalizeMarketingEmail(input.email)
  });
  const openToken = createEmailTrackingToken({ purpose: 'open', recipientId: input.recipientId });
  const unsubscribeUrl = `${PUBLIC_API_ORIGIN}/email-marketing/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`;
  const openUrl = `${PUBLIC_API_ORIGIN}/email-marketing/open.gif?token=${encodeURIComponent(openToken)}`;
  const recipient = { email: input.email, name: input.name };
  const subject = personalizeMarketingContent(input.subject, recipient).replace(/[\r\n]+/g, ' ');
  const personalizedPreview = input.previewText
    ? personalizeMarketingContent(input.previewText, recipient)
    : '';
  const body = trackedLinks(
    sanitizeMarketingHtml(personalizeMarketingContent(input.htmlBody, recipient, true)),
    input.recipientId
  );
  const preview = personalizedPreview
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(personalizedPreview)}</div>`
    : '';
  const reason =
    'You received this email because you registered with Hope Hub, requested updates, or had a prior customer relationship.';
  const html = `<!doctype html><html><body style="margin:0;background:#f5f7f9;color:#17202a;font-family:Arial,sans-serif"><div style="max-width:640px;margin:0 auto;padding:24px"><div style="background:#ffffff;border-radius:14px;padding:28px">${preview}<div style="font-size:20px;font-weight:700;color:#0f766e;margin-bottom:20px">Hope Hub</div>${body}<hr style="border:0;border-top:1px solid #e2e8f0;margin:28px 0 18px"><p style="font-size:12px;line-height:1.5;color:#64748b">${reason} <a href="${unsubscribeUrl}" style="color:#0f766e">Unsubscribe</a> at any time.</p></div></div><img src="${openUrl}" width="1" height="1" alt="" style="display:block;border:0" /></body></html>`;
  const textBody = personalizeMarketingContent(input.textBody, recipient);
  const text = `${textBody.trim()}\n\n---\n${reason}\nUnsubscribe: ${unsubscribeUrl}`;
  return { subject, html, text, unsubscribeUrl };
}

async function registeredUsersByEmail() {
  const users = await prisma.user.findMany({
    where: { email: { not: null } },
    select: { id: true, name: true, email: true, role: true, isActive: true },
    orderBy: { createdAt: 'asc' }
  });
  const result = new Map<string, (typeof users)[number]>();
  for (const user of users) {
    if (!user.email) continue;
    const normalized = normalizeMarketingEmail(user.email);
    if (!result.has(normalized)) result.set(normalized, user);
  }
  return result;
}

export async function reconcileRegisteredMarketingContacts() {
  const contacts = await prisma.emailMarketingContact.findMany({
    where: { status: EmailMarketingContactStatus.ACTIVE },
    select: { id: true, normalizedEmail: true }
  });
  if (!contacts.length) return 0;
  const users = await registeredUsersByEmail();
  let converted = 0;
  for (const contact of contacts) {
    const user = users.get(contact.normalizedEmail);
    if (!user) continue;
    await prisma.emailMarketingContact.update({
      where: { id: contact.id },
      data: {
        status: EmailMarketingContactStatus.CONVERTED,
        registeredUserId: user.id,
        convertedAt: new Date()
      }
    });
    converted++;
  }
  return converted;
}

export async function importMarketingContacts(input: {
  rawContacts: string;
  sourceLabel: string;
  consentBasis: string;
  importedById?: string;
}) {
  const parsed = parseMarketingContacts(input.rawContacts);
  if (!parsed.length) throw new Error('No valid email addresses were found.');
  return importStructuredMarketingContacts({
    contacts: parsed,
    sourceLabel: input.sourceLabel,
    consentBasis: input.consentBasis,
    importedById: input.importedById
  });
}

const mergedValues = (existing: string[], incoming: string[], limit = 100) =>
  [...new Set([...existing, ...incoming])].slice(0, limit);

export async function importStructuredMarketingContacts(input: {
  contacts: StructuredMarketingContact[];
  sourceLabel: string;
  consentBasis: string;
  importedById?: string;
}) {
  const parsed = input.contacts
    .map(normalizeStructuredMarketingContact)
    .filter((contact) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.normalizedEmail));
  const deduplicated = new Map(parsed.map((contact) => [contact.normalizedEmail, contact]));
  const contacts = [...deduplicated.values()];
  if (!contacts.length) throw new Error('No valid email addresses were found.');
  if (contacts.length > 5000) throw new Error('Import at most 5,000 unique contacts at a time.');
  const users = await registeredUsersByEmail();
  const normalizedEmails = contacts.map((item) => item.normalizedEmail);
  const [suppressions, existingContacts] = await Promise.all([
    prisma.emailSuppression.findMany({
      where: { normalizedEmail: { in: normalizedEmails } },
      select: { normalizedEmail: true }
    }),
    prisma.emailMarketingContact.findMany({
      where: { normalizedEmail: { in: normalizedEmails } }
    })
  ]);
  const suppressed = new Set(suppressions.map((item) => item.normalizedEmail));
  const existingByEmail = new Map(existingContacts.map((item) => [item.normalizedEmail, item]));
  const now = new Date();
  let imported = 0;
  let updated = 0;
  let converted = 0;
  let suppressedCount = 0;

  for (const contact of contacts) {
    const user = users.get(contact.normalizedEmail);
    const status = suppressed.has(contact.normalizedEmail)
      ? EmailMarketingContactStatus.SUPPRESSED
      : user
        ? EmailMarketingContactStatus.CONVERTED
        : EmailMarketingContactStatus.ACTIVE;
    if (status === EmailMarketingContactStatus.CONVERTED) converted++;
    if (status === EmailMarketingContactStatus.SUPPRESSED) suppressedCount++;
    const existing = existingByEmail.get(contact.normalizedEmail);
    const sourceSegments = mergedValues(
      existing?.sourceSegments || [],
      contact.sourceSegments || []
    );
    const tags = mergedValues(existing?.tags || [], contact.tags || []);
    const productNames = mergedValues(existing?.productNames || [], contact.productNames || []);
    const productSkus = mergedValues(existing?.productSkus || [], contact.productSkus || []);
    const paymentMethods = mergedValues(
      existing?.paymentMethods || [],
      contact.paymentMethods || []
    );
    const orderStatuses = mergedValues(existing?.orderStatuses || [], contact.orderStatuses || []);
    const productSearchText = [...productNames, ...productSkus].join(' | ') || undefined;
    const richData = {
      ...(contact.name ? { name: contact.name } : {}),
      ...(contact.mobile ? { mobile: contact.mobile } : {}),
      ...(contact.normalizedMobile ? { normalizedMobile: contact.normalizedMobile } : {}),
      ...(contact.alternatePhone ? { alternatePhone: contact.alternatePhone } : {}),
      ...(contact.addressLine1 ? { addressLine1: contact.addressLine1 } : {}),
      ...(contact.addressLine2 ? { addressLine2: contact.addressLine2 } : {}),
      ...(contact.landmark ? { landmark: contact.landmark } : {}),
      ...(contact.city ? { city: contact.city } : {}),
      ...(contact.state ? { state: contact.state } : {}),
      ...(contact.postalCode ? { postalCode: contact.postalCode } : {}),
      ...(contact.country ? { country: contact.country } : {}),
      ...(contact.sourceChannel ? { sourceChannel: contact.sourceChannel } : {}),
      sourceSegments,
      tags,
      productNames,
      productSkus,
      paymentMethods,
      orderStatuses,
      productSearchText,
      ...(contact.firstOrderAt ? { firstOrderAt: contact.firstOrderAt } : {}),
      ...(contact.lastOrderAt ? { lastOrderAt: contact.lastOrderAt } : {}),
      ...(contact.orderCount !== undefined ? { orderCount: contact.orderCount } : {}),
      ...(contact.totalOrderValue !== undefined
        ? { totalOrderValue: contact.totalOrderValue }
        : {}),
      ...(contact.currency ? { currency: contact.currency } : {})
    };
    await prisma.emailMarketingContact.upsert({
      where: { normalizedEmail: contact.normalizedEmail },
      create: {
        email: contact.email,
        normalizedEmail: contact.normalizedEmail,
        ...richData,
        sourceLabel: input.sourceLabel,
        consentBasis: input.consentBasis,
        consentCapturedAt: now,
        importedById: input.importedById,
        status,
        registeredUserId: user?.id,
        convertedAt: user ? now : null
      },
      update: {
        email: contact.email,
        ...richData,
        sourceLabel: input.sourceLabel,
        consentBasis: input.consentBasis,
        consentCapturedAt: now,
        importedById: input.importedById,
        status,
        registeredUserId: user?.id || null,
        convertedAt: user ? now : null
      }
    });
    if (existing) updated++;
    else imported++;
  }
  filterOptionsCache = undefined;
  return { found: contacts.length, imported, updated, converted, suppressed: suppressedCount };
}

type AudienceRecipient = {
  email: string;
  normalizedEmail: string;
  name?: string;
  userId?: string;
  contactId?: string;
};

async function eligibleCampaignAudience(campaign: {
  audience: EmailCampaignAudience;
  registeredRole: Role | null;
  audienceFilter?: Prisma.JsonValue | EmailAudienceFilter | null;
}) {
  await reconcileRegisteredMarketingContacts();
  const recipients = new Map<string, AudienceRecipient>();
  if (
    campaign.audience === EmailCampaignAudience.REGISTERED_USERS ||
    campaign.audience === EmailCampaignAudience.ALL_ELIGIBLE
  ) {
    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        email: { not: null },
        ...(campaign.registeredRole ? { role: campaign.registeredRole } : {})
      },
      select: { id: true, name: true, email: true },
      orderBy: { createdAt: 'asc' }
    });
    for (const user of users) {
      if (!user.email) continue;
      const normalizedEmail = normalizeMarketingEmail(user.email);
      if (!recipients.has(normalizedEmail)) {
        recipients.set(normalizedEmail, {
          email: user.email,
          normalizedEmail,
          name: user.name,
          userId: user.id
        });
      }
    }
  }
  if (
    campaign.audience === EmailCampaignAudience.PROMOTIONAL_CONTACTS ||
    campaign.audience === EmailCampaignAudience.ALL_ELIGIBLE
  ) {
    const contacts = await prisma.emailMarketingContact.findMany({
      where: buildMarketingContactWhere({
        filter: (campaign.audienceFilter || {}) as EmailAudienceFilter,
        activeUnregisteredOnly: true
      }),
      select: { id: true, email: true, normalizedEmail: true, name: true },
      orderBy: { createdAt: 'asc' }
    });
    for (const contact of contacts) {
      if (!recipients.has(contact.normalizedEmail)) {
        recipients.set(contact.normalizedEmail, {
          email: contact.email,
          normalizedEmail: contact.normalizedEmail,
          name: contact.name || undefined,
          contactId: contact.id
        });
      }
    }
  }
  const suppressions = await prisma.emailSuppression.findMany({
    where: { normalizedEmail: { in: [...recipients.keys()] } },
    select: { normalizedEmail: true }
  });
  for (const suppression of suppressions) recipients.delete(suppression.normalizedEmail);
  return [...recipients.values()];
}

export async function previewEmailCampaignAudience(
  audience: EmailCampaignAudience,
  registeredRole: Role | null,
  audienceFilter?: EmailAudienceFilter | null
) {
  const eligible = await eligibleCampaignAudience({ audience, registeredRole, audienceFilter });
  const registered = eligible.filter((item) => item.userId).length;
  const promotional = eligible.filter((item) => item.contactId).length;
  return { eligible: eligible.length, registered, promotional };
}

export async function queueEmailCampaign(campaignId: string) {
  const campaign = await prisma.emailCampaign.findUnique({ where: { id: campaignId } });
  if (!campaign) throw new Error('Campaign not found.');
  if (
    campaign.status !== EmailCampaignStatus.DRAFT &&
    campaign.status !== EmailCampaignStatus.SCHEDULED
  ) {
    return campaign;
  }
  const recipients = await eligibleCampaignAudience(campaign);
  if (!recipients.length) {
    return prisma.emailCampaign.update({
      where: { id: campaign.id },
      data: { status: EmailCampaignStatus.FAILED, completedAt: new Date() }
    });
  }
  for (let index = 0; index < recipients.length; index += 500) {
    await prisma.emailCampaignRecipient.createMany({
      data: recipients.slice(index, index + 500).map((recipient) => ({
        campaignId: campaign.id,
        ...recipient
      })),
      skipDuplicates: true
    });
  }
  const recipientCount = await prisma.emailCampaignRecipient.count({
    where: { campaignId: campaign.id }
  });
  return prisma.emailCampaign.update({
    where: { id: campaign.id },
    data: {
      status: EmailCampaignStatus.QUEUED,
      queuedAt: new Date(),
      recipientCount
    }
  });
}

async function isSuppressed(normalizedEmail: string) {
  return Boolean(
    await prisma.emailSuppression.findUnique({
      where: { normalizedEmail },
      select: { id: true }
    })
  );
}

async function promotionalContactRegistered(normalizedEmail: string) {
  const users = await registeredUsersByEmail();
  return users.has(normalizedEmail);
}

export async function refreshEmailCampaignMetrics(campaignId: string) {
  const [groups, openedCount, clickedCount] = await Promise.all([
    prisma.emailCampaignRecipient.groupBy({
      by: ['status'],
      where: { campaignId },
      _count: { _all: true }
    }),
    prisma.emailCampaignRecipient.count({ where: { campaignId, firstOpenedAt: { not: null } } }),
    prisma.emailCampaignRecipient.count({ where: { campaignId, firstClickedAt: { not: null } } })
  ]);
  const count = (status: EmailCampaignRecipientStatus) =>
    groups.find((group) => group.status === status)?._count._all || 0;
  const remaining =
    count(EmailCampaignRecipientStatus.QUEUED) + count(EmailCampaignRecipientStatus.PROCESSING);
  const sentCount = count(EmailCampaignRecipientStatus.SENT);
  const failedCount = count(EmailCampaignRecipientStatus.FAILED);
  const skippedCount =
    count(EmailCampaignRecipientStatus.SKIPPED_REGISTERED) +
    count(EmailCampaignRecipientStatus.SKIPPED_SUPPRESSED) +
    count(EmailCampaignRecipientStatus.CANCELLED);
  const counts = {
    sentCount,
    failedCount,
    skippedCount,
    openedCount,
    clickedCount
  };
  const updated = await prisma.emailCampaign.updateMany({
    where: { id: campaignId, status: { not: EmailCampaignStatus.CANCELLED } },
    data: {
      ...counts,
      status: remaining ? EmailCampaignStatus.SENDING : EmailCampaignStatus.COMPLETED,
      ...(remaining ? {} : { completedAt: new Date() })
    }
  });
  if (!updated.count) {
    await prisma.emailCampaign.updateMany({
      where: { id: campaignId, status: EmailCampaignStatus.CANCELLED },
      data: counts
    });
  }
}

let schedulerRunning = false;

export async function runEmailMarketingScheduler() {
  if (schedulerRunning) return;
  schedulerRunning = true;
  try {
    const now = new Date();
    const due = await prisma.emailCampaign.findMany({
      where: { status: EmailCampaignStatus.SCHEDULED, scheduledAt: { lte: now } },
      select: { id: true },
      take: 5
    });
    for (const campaign of due) await queueEmailCampaign(campaign.id);

    await prisma.emailCampaignRecipient.updateMany({
      where: {
        status: EmailCampaignRecipientStatus.PROCESSING,
        processingAt: { lt: new Date(now.getTime() - PROCESSING_STALE_MS) }
      },
      data: { status: EmailCampaignRecipientStatus.QUEUED, processingAt: null }
    });

    const pending = await prisma.emailCampaignRecipient.findMany({
      where: {
        status: EmailCampaignRecipientStatus.QUEUED,
        nextAttemptAt: { lte: now },
        campaign: { status: { in: [EmailCampaignStatus.QUEUED, EmailCampaignStatus.SENDING] } }
      },
      include: { campaign: true },
      orderBy: { createdAt: 'asc' },
      take: DELIVERY_BATCH_SIZE
    });
    const touchedCampaigns = new Set<string>();
    for (const recipient of pending) {
      const claimed = await prisma.emailCampaignRecipient.updateMany({
        where: { id: recipient.id, status: EmailCampaignRecipientStatus.QUEUED },
        data: { status: EmailCampaignRecipientStatus.PROCESSING, processingAt: new Date() }
      });
      if (!claimed.count) continue;
      touchedCampaigns.add(recipient.campaignId);
      const campaignStarted = await prisma.emailCampaign.updateMany({
        where: {
          id: recipient.campaignId,
          status: { in: [EmailCampaignStatus.QUEUED, EmailCampaignStatus.SENDING] }
        },
        data: { status: EmailCampaignStatus.SENDING }
      });
      if (!campaignStarted.count) {
        await prisma.emailCampaignRecipient.updateMany({
          where: { id: recipient.id, status: EmailCampaignRecipientStatus.PROCESSING },
          data: { status: EmailCampaignRecipientStatus.CANCELLED, processingAt: null }
        });
        continue;
      }
      await prisma.emailCampaign.updateMany({
        where: {
          id: recipient.campaignId,
          startedAt: null,
          status: { in: [EmailCampaignStatus.QUEUED, EmailCampaignStatus.SENDING] }
        },
        data: { startedAt: new Date() }
      });
      try {
        if (await isSuppressed(recipient.normalizedEmail)) {
          await prisma.emailCampaignRecipient.update({
            where: { id: recipient.id },
            data: {
              status: EmailCampaignRecipientStatus.SKIPPED_SUPPRESSED,
              processingAt: null,
              lastError: 'Address is on the suppression list.'
            }
          });
          continue;
        }
        if (
          recipient.contactId &&
          recipient.campaign.audience === EmailCampaignAudience.PROMOTIONAL_CONTACTS &&
          (await promotionalContactRegistered(recipient.normalizedEmail))
        ) {
          await reconcileRegisteredMarketingContacts();
          await prisma.emailCampaignRecipient.update({
            where: { id: recipient.id },
            data: {
              status: EmailCampaignRecipientStatus.SKIPPED_REGISTERED,
              processingAt: null,
              lastError: 'Promotional contact has become a registered user.'
            }
          });
          continue;
        }
        const rendered = renderMarketingEmail({
          recipientId: recipient.id,
          email: recipient.email,
          name: recipient.name,
          subject: recipient.campaign.subject,
          previewText: recipient.campaign.previewText,
          htmlBody: recipient.campaign.htmlBody,
          textBody: recipient.campaign.textBody
        });
        const stillSendable = await prisma.emailCampaign.count({
          where: {
            id: recipient.campaignId,
            status: { in: [EmailCampaignStatus.QUEUED, EmailCampaignStatus.SENDING] }
          }
        });
        if (!stillSendable) {
          await prisma.emailCampaignRecipient.updateMany({
            where: { id: recipient.id, status: EmailCampaignRecipientStatus.PROCESSING },
            data: { status: EmailCampaignRecipientStatus.CANCELLED, processingAt: null }
          });
          continue;
        }
        const delivery = await sendEmail({
          to: recipient.email,
          subject: rendered.subject,
          html: rendered.html,
          text: rendered.text,
          headers: {
            'List-Unsubscribe': `<${rendered.unsubscribeUrl}>`,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
          }
        });
        const sentAt = new Date();
        await prisma.$transaction([
          prisma.emailCampaignRecipient.update({
            where: { id: recipient.id },
            data: {
              status: EmailCampaignRecipientStatus.SENT,
              attempts: { increment: 1 },
              providerMessageId: delivery.messageId || null,
              sentAt,
              processingAt: null,
              lastError: null
            }
          }),
          ...(recipient.contactId
            ? [
                prisma.emailMarketingContact.update({
                  where: { id: recipient.contactId },
                  data: { lastSentAt: sentAt }
                })
              ]
            : [])
        ]);
      } catch (error) {
        const attempts = recipient.attempts + 1;
        const terminal = attempts >= MAX_ATTEMPTS;
        await prisma.emailCampaignRecipient.update({
          where: { id: recipient.id },
          data: {
            status: terminal
              ? EmailCampaignRecipientStatus.FAILED
              : EmailCampaignRecipientStatus.QUEUED,
            attempts,
            processingAt: null,
            nextAttemptAt: new Date(Date.now() + attempts * 5 * 60_000),
            lastError: (error instanceof Error ? error.message : String(error)).slice(0, 1000)
          }
        });
      }
    }
    for (const campaignId of touchedCampaigns) await refreshEmailCampaignMetrics(campaignId);
  } finally {
    schedulerRunning = false;
  }
}

export async function suppressMarketingEmail(input: {
  email: string;
  reason: EmailSuppressionReason;
  source?: string;
}) {
  const normalizedEmail = normalizeMarketingEmail(input.email);
  const now = new Date();
  const suppression = await prisma.emailSuppression.upsert({
    where: { normalizedEmail },
    create: {
      email: input.email,
      normalizedEmail,
      reason: input.reason,
      source: input.source,
      suppressedAt: now
    },
    update: {
      email: input.email,
      reason: input.reason,
      source: input.source,
      suppressedAt: now
    }
  });
  await Promise.all([
    prisma.emailMarketingContact.updateMany({
      where: { normalizedEmail },
      data: {
        status:
          input.reason === EmailSuppressionReason.UNSUBSCRIBED
            ? EmailMarketingContactStatus.UNSUBSCRIBED
            : EmailMarketingContactStatus.SUPPRESSED,
        ...(input.reason === EmailSuppressionReason.UNSUBSCRIBED ? { unsubscribedAt: now } : {})
      }
    }),
    prisma.emailCampaignRecipient.updateMany({
      where: {
        normalizedEmail,
        status: {
          in: [EmailCampaignRecipientStatus.QUEUED, EmailCampaignRecipientStatus.PROCESSING]
        }
      },
      data: {
        status: EmailCampaignRecipientStatus.SKIPPED_SUPPRESSED,
        processingAt: null,
        unsubscribedAt: input.reason === EmailSuppressionReason.UNSUBSCRIBED ? now : undefined,
        lastError: `Suppressed: ${input.reason}`
      }
    })
  ]);
  return suppression;
}

export async function unsubscribeWithToken(token: string) {
  const payload = readEmailTrackingToken(token, 'unsubscribe');
  if (!payload?.email) return false;
  const recipient = await prisma.emailCampaignRecipient.findUnique({
    where: { id: payload.recipientId },
    select: { id: true, normalizedEmail: true }
  });
  if (!recipient || recipient.normalizedEmail !== normalizeMarketingEmail(payload.email)) {
    return false;
  }
  await suppressMarketingEmail({
    email: payload.email,
    reason: EmailSuppressionReason.UNSUBSCRIBED,
    source: 'recipient_link'
  });
  await prisma.emailCampaignRecipient.update({
    where: { id: recipient.id },
    data: { unsubscribedAt: new Date() }
  });
  return true;
}

export async function recordMarketingOpen(token: string) {
  const payload = readEmailTrackingToken(token, 'open');
  if (!payload) return false;
  const recipient = await prisma.emailCampaignRecipient.findUnique({
    where: { id: payload.recipientId },
    select: { id: true, campaignId: true }
  });
  if (!recipient) return false;
  const now = new Date();
  const first = await prisma.emailCampaignRecipient.updateMany({
    where: { id: recipient.id, firstOpenedAt: null },
    data: {
      openCount: { increment: 1 },
      firstOpenedAt: now,
      lastOpenedAt: now
    }
  });
  if (first.count) {
    await prisma.emailCampaign.update({
      where: { id: recipient.campaignId },
      data: { openedCount: { increment: 1 } }
    });
  } else {
    await prisma.emailCampaignRecipient.update({
      where: { id: recipient.id },
      data: {
        openCount: { increment: 1 },
        lastOpenedAt: now
      }
    });
  }
  return true;
}

export async function recordMarketingClick(token: string) {
  const payload = readEmailTrackingToken(token, 'click');
  if (!payload?.url || !payload.url.startsWith('https://')) return null;
  const recipient = await prisma.emailCampaignRecipient.findUnique({
    where: { id: payload.recipientId },
    select: { id: true, campaignId: true }
  });
  if (!recipient) return null;
  const now = new Date();
  const first = await prisma.emailCampaignRecipient.updateMany({
    where: { id: recipient.id, firstClickedAt: null },
    data: {
      clickCount: { increment: 1 },
      firstClickedAt: now,
      lastClickedAt: now
    }
  });
  if (first.count) {
    await prisma.emailCampaign.update({
      where: { id: recipient.campaignId },
      data: { clickedCount: { increment: 1 } }
    });
  } else {
    await prisma.emailCampaignRecipient.update({
      where: { id: recipient.id },
      data: {
        clickCount: { increment: 1 },
        lastClickedAt: now
      }
    });
  }
  return payload.url;
}

export function campaignCreateData(input: {
  name: string;
  subject: string;
  previewText?: string;
  htmlBody: string;
  textBody: string;
  audience: EmailCampaignAudience;
  registeredRole?: Role | null;
  audienceFilter?: EmailAudienceFilter | null;
  templateId?: string | null;
  scheduledAt?: Date | null;
  createdById?: string;
}): Prisma.EmailCampaignUncheckedCreateInput {
  return {
    name: input.name.trim(),
    subject: input.subject.trim(),
    previewText: input.previewText?.trim() || null,
    htmlBody: sanitizeMarketingHtml(input.htmlBody),
    textBody: input.textBody.trim(),
    audience: input.audience,
    registeredRole: input.registeredRole || null,
    audienceFilter: normalizeEmailAudienceFilter(input.audienceFilter) as Prisma.InputJsonValue,
    templateId: input.templateId || null,
    scheduledAt: input.scheduledAt || null,
    status: input.scheduledAt ? EmailCampaignStatus.SCHEDULED : EmailCampaignStatus.DRAFT,
    createdById: input.createdById || null
  };
}

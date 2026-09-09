import assert from 'node:assert/strict';
import test from 'node:test';
import { EmailCampaignAudience, EmailMarketingContactStatus } from '@prisma/client';
import {
  buildMarketingContactWhere,
  campaignCreateData,
  createEmailTrackingToken,
  normalizeMarketingEmail,
  normalizeEmailAudienceFilter,
  normalizeStructuredMarketingContact,
  parseMarketingContacts,
  personalizeMarketingContent,
  readEmailTrackingToken,
  renderMarketingEmail,
  sanitizeMarketingHtml
} from './email-marketing.js';

test('normalizes structured contact data for repeatable filtering', () => {
  const contact = normalizeStructuredMarketingContact({
    email: ' Buyer@Example.com ',
    name: ' Asha ',
    mobile: '+91 98765-43210',
    state: 'Maharashtra',
    sourceSegments: ['Sightometer', 'sightometer'],
    paymentMethods: ['cod', 'COD'],
    productNames: ['Blue Shirt'],
    productSkus: [' sku-1 '],
    orderCount: 2.9,
    totalOrderValue: 1499.5
  });
  assert.equal(contact.normalizedEmail, 'buyer@example.com');
  assert.equal(contact.normalizedMobile, '919876543210');
  assert.deepEqual(contact.sourceSegments, ['SIGHTOMETER']);
  assert.deepEqual(contact.paymentMethods, ['COD']);
  assert.deepEqual(contact.productSkus, ['SKU-1']);
  assert.equal(contact.orderCount, 2);
  assert.equal(contact.totalOrderValue, 1499.5);
});

test('builds one AND-combined query for contact browsing and campaign selection', () => {
  const where = buildMarketingContactWhere({
    activeUnregisteredOnly: true,
    filter: {
      states: [' Maharashtra '],
      sourceSegments: ['Sightometer'],
      paymentMethods: ['cod'],
      productQuery: 'shirt',
      minOrderCount: 2,
      minTotalOrderValue: 1000,
      hasMobile: true
    }
  });
  assert.equal(where.status, EmailMarketingContactStatus.ACTIVE);
  assert.equal(where.registeredUserId, null);
  assert.deepEqual(where.AND, [
    { OR: [{ state: { equals: 'Maharashtra', mode: 'insensitive' } }] },
    { sourceSegments: { hasSome: ['SIGHTOMETER'] } },
    { paymentMethods: { hasSome: ['COD'] } },
    { productSearchText: { contains: 'shirt', mode: 'insensitive' } },
    { orderCount: { gte: 2, lte: undefined } },
    { totalOrderValue: { gte: 1000, lte: undefined } },
    { normalizedMobile: { not: null } }
  ]);
});

test('stores the normalized audience filter on a campaign snapshot', () => {
  const filter = normalizeEmailAudienceFilter({
    cities: [' Mumbai ', 'Mumbai'],
    orderStatuses: ['delivered'],
    minOrderCount: 2
  });
  const data = campaignCreateData({
    name: 'Repeat customers',
    subject: 'Hello',
    htmlBody: '<p>Hello</p>',
    textBody: 'Hello',
    audience: EmailCampaignAudience.PROMOTIONAL_CONTACTS,
    audienceFilter: filter
  });
  assert.deepEqual(data.audienceFilter, {
    cities: ['Mumbai'],
    orderStatuses: ['DELIVERED'],
    minOrderCount: 2
  });
});

test('normalizes and deduplicates pasted marketing contacts', () => {
  assert.equal(normalizeMarketingEmail(' Person@Example.COM '), 'person@example.com');
  assert.deepEqual(
    parseMarketingContacts(
      'Asha <ASHA@example.com>\nRahul, rahul@example.com; asha@example.com, invalid'
    ),
    [
      { name: 'Asha', email: 'asha@example.com', normalizedEmail: 'asha@example.com' },
      { name: 'Rahul', email: 'rahul@example.com', normalizedEmail: 'rahul@example.com' }
    ]
  );
});

test('sanitizes executable content from admin-authored email HTML', () => {
  const result = sanitizeMarketingHtml(
    '<p onclick="steal()">Hello</p><script>alert(1)</script><a href="javascript:steal()">Bad</a>'
  );
  assert.equal(result.includes('onclick'), false);
  assert.equal(result.includes('<script'), false);
  assert.equal(result.includes('javascript:'), false);
  assert.match(result, /Hello/);
});

test('tracking tokens are purpose-bound and reject tampering', () => {
  const token = createEmailTrackingToken({
    purpose: 'unsubscribe',
    recipientId: 'recipient-1',
    email: 'person@example.com'
  });
  assert.deepEqual(readEmailTrackingToken(token, 'unsubscribe'), {
    purpose: 'unsubscribe',
    recipientId: 'recipient-1',
    email: 'person@example.com'
  });
  assert.equal(readEmailTrackingToken(token, 'open'), null);
  assert.equal(readEmailTrackingToken(`${token}x`, 'unsubscribe'), null);
});

test('personalizes only supported recipient fields and safely escapes HTML', () => {
  assert.equal(
    personalizeMarketingContent('Hello {{firstName}} ({{email}})', {
      name: 'Asha Sharma',
      email: 'asha@example.com'
    }),
    'Hello Asha (asha@example.com)'
  );
  assert.equal(
    personalizeMarketingContent(
      '<p>{{fullName}}</p>',
      {
        name: 'Asha <Admin>',
        email: 'asha@example.com'
      },
      true
    ),
    '<p>Asha &lt;Admin&gt;</p>'
  );
  assert.equal(
    personalizeMarketingContent('Hello {{firstName}}', { email: 'unknown@example.com' }),
    'Hello there'
  );
});

test('renders tracked links, an open pixel, and an unsubscribe path', () => {
  const rendered = renderMarketingEmail({
    recipientId: 'recipient-1',
    email: 'person@example.com',
    name: 'Asha Sharma',
    subject: 'Hope Hub update for {{firstName}}',
    previewText: 'A short preview',
    htmlBody: '<p>Hello</p><a href="https://hopehub.in/support">Support</a>',
    textBody: 'Hello'
  });
  assert.match(rendered.html, /email-marketing\/click\?token=/);
  assert.match(rendered.html, /email-marketing\/open\.gif\?token=/);
  assert.match(rendered.html, /Unsubscribe/);
  assert.match(rendered.text, /Unsubscribe: https:\/\/api\.hopehub\.in/);
  assert.match(rendered.unsubscribeUrl, /email-marketing\/unsubscribe\?token=/);
  assert.equal(rendered.subject, 'Hope Hub update for Asha');
});

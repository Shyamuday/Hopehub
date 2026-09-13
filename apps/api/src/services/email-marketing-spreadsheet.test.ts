import assert from 'node:assert/strict';
import test from 'node:test';
import {
  parseMarketingSpreadsheet,
  publicMarketingSpreadsheetPreview
} from './email-marketing-spreadsheet.js';

test('automatically maps and aggregates a quoted customer CSV', async () => {
  const csv = [
    'Order ID,Channel Created At,Channel,Status,Product Name,Channel SKU,Customer Name,Customer Email,Customer Mobile,Address Line 1,Address City,Address State,Address Pincode,Payment Method,Order Total,Order Tags',
    'ORD-1,2026-01-02,CUSTOM,DELIVERED,"Blue Shirt, Large",SKU-1,Asha,ASHA@example.com,+919876543210,Street 1,Mumbai,Maharashtra,400001,COD,1000,"VIP, Repeat"',
    'ORD-1,2026-01-02,CUSTOM,DELIVERED,Socks,SKU-2,Asha,asha@example.com,+919876543210,Street 1,Mumbai,Maharashtra,400001,COD,1000,VIP',
    'ORD-2,2026-02-03,CUSTOM,SHIPPED,Scarf,SKU-3,Asha,asha@example.com,+919876543210,Street 2,Pune,Maharashtra,411001,PREPAID,500,Repeat',
    'ORD-3,2026-02-03,CUSTOM,SHIPPED,Scarf,SKU-4,Invalid,not-an-email,123,Street 3,Pune,Maharashtra,411001,COD,99,Test'
  ].join('\n');
  const parsed = await parseMarketingSpreadsheet({
    buffer: Buffer.from(csv),
    fileName: 'customers.csv'
  });

  assert.equal(parsed.validContacts, 1);
  assert.equal(parsed.sourceRows, 4);
  assert.equal(parsed.skippedRows, 1);
  assert.equal(parsed.contacts[0].email, 'asha@example.com');
  assert.equal(parsed.contacts[0].city, 'Pune');
  assert.equal(parsed.contacts[0].orderCount, 2);
  assert.equal(parsed.contacts[0].totalOrderValue, 1500);
  assert.deepEqual(parsed.contacts[0].productSkus, ['SKU-1', 'SKU-2', 'SKU-3']);
  assert.deepEqual(parsed.contacts[0].paymentMethods, ['COD', 'PREPAID']);
  assert.deepEqual(parsed.contacts[0].sourceSegments, ['customers']);
  assert.ok(parsed.mappedFields.includes('postalCode'));
});

test('public spreadsheet preview never exposes parsed customer records', async () => {
  const parsed = await parseMarketingSpreadsheet({
    buffer: Buffer.from('Email,Name\nperson@example.com,Person'),
    fileName: 'simple.csv'
  });
  const preview = publicMarketingSpreadsheetPreview(parsed);
  assert.equal('contacts' in preview, false);
  assert.equal(preview.validContacts, 1);
});

test('rejects files without a recognizable email column', async () => {
  await assert.rejects(
    parseMarketingSpreadsheet({
      buffer: Buffer.from('Customer,Phone\nAsha,1234567890'),
      fileName: 'missing-email.csv'
    }),
    /No worksheet contains a recognizable Email column/
  );
});

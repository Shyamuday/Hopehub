import assert from 'node:assert/strict';
import test from 'node:test';
import { EmailSuppressionReason } from '@prisma/client';
import { sesFeedbackSuppressions, snsSignatureContent } from './email-marketing-ses-feedback.js';

test('SNS signature content follows the documented notification field order', () => {
  assert.equal(
    snsSignatureContent({
      Type: 'Notification',
      Message: 'payload',
      MessageId: 'message-id',
      Timestamp: '2026-09-09T00:00:00.000Z',
      TopicArn: 'arn:aws:sns:us-east-1:123456789012:feedback'
    }),
    'Message\npayload\nMessageId\nmessage-id\nTimestamp\n2026-09-09T00:00:00.000Z\nTopicArn\narn:aws:sns:us-east-1:123456789012:feedback\nType\nNotification\n'
  );
});

test('permanent SES bounces and complaints become suppressions', () => {
  assert.deepEqual(
    sesFeedbackSuppressions({
      notificationType: 'Bounce',
      bounce: {
        bounceType: 'Permanent',
        bouncedRecipients: [{ emailAddress: 'bad@example.com' }]
      }
    }),
    [{ email: 'bad@example.com', reason: EmailSuppressionReason.HARD_BOUNCE }]
  );
  assert.deepEqual(
    sesFeedbackSuppressions({
      eventType: 'Complaint',
      complaint: { complainedRecipients: [{ emailAddress: 'complaint@example.com' }] }
    }),
    [{ email: 'complaint@example.com', reason: EmailSuppressionReason.COMPLAINT }]
  );
});

test('transient SES bounces do not permanently suppress recipients', () => {
  assert.deepEqual(
    sesFeedbackSuppressions({
      notificationType: 'Bounce',
      bounce: {
        bounceType: 'Transient',
        bouncedRecipients: [{ emailAddress: 'full@example.com' }]
      }
    }),
    []
  );
});

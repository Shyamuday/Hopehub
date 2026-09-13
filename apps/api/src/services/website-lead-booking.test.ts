import assert from 'node:assert/strict';
import test from 'node:test';
import { canAttachSubmittedWebsiteLead } from './website-lead-booking.js';

test('attaches a submitted lead only after the same email is verified', () => {
  const lead = { id: 'lead-1', visitorEmail: ' Person@Example.com ' };

  assert.equal(canAttachSubmittedWebsiteLead(lead, 'person@example.com'), true);
  assert.equal(canAttachSubmittedWebsiteLead(lead, 'someone-else@example.com'), false);
  assert.equal(canAttachSubmittedWebsiteLead(lead, null), false);
  assert.equal(canAttachSubmittedWebsiteLead(null, 'person@example.com'), false);
});

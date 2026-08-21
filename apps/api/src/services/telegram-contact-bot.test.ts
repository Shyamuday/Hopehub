import assert from 'node:assert/strict';
import test from 'node:test';
import { isContactBotTrustedResponder } from './telegram-contact-bot.js';

test('contact-ticket responder access is restricted to the explicit trusted username', () => {
  assert.equal(isContactBotTrustedResponder('spiritualspirirt'), true);
  assert.equal(isContactBotTrustedResponder('@SpiritualSpirirt'), true);
  assert.equal(isContactBotTrustedResponder('spiritualspirit'), false);
  assert.equal(isContactBotTrustedResponder('stoic_helper'), false);
  assert.equal(isContactBotTrustedResponder(undefined), false);
});

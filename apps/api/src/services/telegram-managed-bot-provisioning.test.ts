import assert from 'node:assert/strict';
import test from 'node:test';
import {
  managedBotSecretName,
  telegramManagedBotErrorMessage,
  validateManagedBotProvisioningInput
} from './telegram-managed-bot-provisioning.js';

test('validates and normalizes managed bot provisioning details', () => {
  assert.deepEqual(
    validateManagedBotProvisioningInput({
      name: ' Hope Hub Care ',
      username: '@HopeHubCareBot',
      managerUsername: '@HopeHubAiBot'
    }),
    {
      name: 'Hope Hub Care',
      username: 'HopeHubCareBot',
      managerUsername: 'HopeHubAiBot',
      secretName: 'hopehub-telegram-hope-hub-care-token',
      description: undefined,
      shortDescription: undefined
    }
  );
});

test('rejects usernames that do not end in bot', () => {
  assert.throws(
    () => validateManagedBotProvisioningInput({ name: 'Care', username: 'HopeHubCare' }),
    /end in bot/i
  );
});

test('creates a safe secret filename from the bot username', () => {
  assert.equal(managedBotSecretName('Daily_HealthBot'), 'hopehub-telegram-daily-health-token');
});

test('turns manager permission errors into an actionable message', () => {
  assert.match(
    telegramManagedBotErrorMessage(new Error('MANAGER_PERMISSION_MISSING')),
    /Bot Management Mode/i
  );
});

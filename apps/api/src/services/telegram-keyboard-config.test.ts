import assert from 'node:assert/strict';
import test from 'node:test';
import { configuredUrlKeyboard } from './telegram-keyboard-config.js';

test('configured Telegram links become compact styled rows', () => {
  assert.deepEqual(
    configuredUrlKeyboard(
      'Support | https://hopehub.in/support | success\nConfess | https://t.me/example | danger\nWebsite | https://hopehub.in | unsupported'
    ),
    {
      inline_keyboard: [
        [
          { text: 'Support', url: 'https://hopehub.in/support', style: 'success' },
          { text: 'Confess', url: 'https://t.me/example', style: 'danger' }
        ],
        [{ text: 'Website', url: 'https://hopehub.in', style: 'primary' }]
      ]
    }
  );
});

test('invalid or empty Telegram links do not create an empty keyboard', () => {
  assert.equal(configuredUrlKeyboard('Broken | javascript:alert(1)'), undefined);
  assert.equal(configuredUrlKeyboard(''), undefined);
});

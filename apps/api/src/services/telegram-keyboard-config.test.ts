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

test('explicit && rows use the GroupHelp layout and preserve button styles', () => {
  assert.deepEqual(
    configuredUrlKeyboard(
      '📢 Channel | https://t.me/HopeHubGlobal | primary && 🌐 Website | https://hopehub.in | success\n💚 Private support | https://hopehub.in/#live-connect | success && 🩷 Confessions | https://t.me/Hopehubconfessionbot | danger\n📜 Rules | https://t.me/HHrules | danger'
    ),
    {
      inline_keyboard: [
        [
          { text: '📢 Channel', url: 'https://t.me/HopeHubGlobal', style: 'primary' },
          { text: '🌐 Website', url: 'https://hopehub.in', style: 'success' }
        ],
        [
          { text: '💚 Private support', url: 'https://hopehub.in/#live-connect', style: 'success' },
          { text: '🩷 Confessions', url: 'https://t.me/Hopehubconfessionbot', style: 'danger' }
        ],
        [{ text: '📜 Rules', url: 'https://t.me/HHrules', style: 'danger' }]
      ]
    }
  );
});

test('invalid or empty Telegram links do not create an empty keyboard', () => {
  assert.equal(configuredUrlKeyboard('Broken | javascript:alert(1)'), undefined);
  assert.equal(configuredUrlKeyboard(''), undefined);
});

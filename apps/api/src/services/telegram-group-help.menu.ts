import type { TelegramKeyboard } from './telegram-community-bots.types.js';

/** A compact, button-first entry point for people who do not know bot commands yet. */
export function groupHelpMainMenuKeyboard(): TelegramKeyboard {
  return {
    inline_keyboard: [
      [
        { text: 'Rules', callback_data: 'hh_menu_rules', style: 'primary' },
        { text: 'Private support', callback_data: 'hh_menu_support', style: 'success' }
      ],
      [
        { text: 'My warnings', callback_data: 'hh_menu_warnings', style: 'primary' },
        { text: 'Report a concern', callback_data: 'hh_menu_report', style: 'danger' }
      ],
      [
        { text: 'Bot help', callback_data: 'hh_menu_help', style: 'success' },
        { text: 'Admin settings', callback_data: 'hh_menu_settings', style: 'primary' }
      ]
    ]
  };
}

export function groupHelpSettingsHomeKeyboard(): TelegramKeyboard {
  return {
    inline_keyboard: [
      [
        { text: 'Messages', callback_data: 'hh_settings_messages', style: 'primary' },
        { text: 'Safety', callback_data: 'hh_settings_safety', style: 'primary' }
      ],
      [
        { text: 'Operations', callback_data: 'hh_settings_operations', style: 'primary' },
        { text: 'Help', callback_data: 'hh_settings_help', style: 'success' }
      ],
      [{ text: 'Configure group', callback_data: 'hh_cfg_home', style: 'success' }],
      [{ text: 'Main menu', callback_data: 'hh_menu_home' }]
    ]
  };
}

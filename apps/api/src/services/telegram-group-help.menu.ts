import type { TelegramKeyboard } from './telegram-community-bots.types.js';
import { TELEGRAM_BOT_URLS } from '../constants/telegram-community-bot.constants.js';

/** A compact, button-first entry point for people who do not know bot commands yet. */
export function groupHelpPrivateSettingsUrl(chatId: string): string {
  return `${TELEGRAM_BOT_URLS.GROUP_HELP}?start=group_settings_${encodeURIComponent(chatId)}`;
}

export function groupHelpPrivateSettingsKeyboard(chatId: string): TelegramKeyboard {
  return {
    inline_keyboard: [
      [
        {
          text: 'Open settings privately',
          url: groupHelpPrivateSettingsUrl(chatId),
          style: 'success'
        }
      ]
    ]
  };
}

export function groupHelpMainMenuKeyboard(chatId?: string): TelegramKeyboard {
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
        ...(chatId
          ? [
              {
                text: 'Admin settings',
                url: groupHelpPrivateSettingsUrl(chatId),
                style: 'primary' as const
              }
            ]
          : [
              {
                text: 'Admin settings',
                callback_data: 'hh_menu_settings',
                style: 'primary' as const
              }
            ])
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

import type { TelegramKeyboard } from './telegram-community-bots.types.js';
import { TELEGRAM_BOT_URLS } from '../constants/telegram-community-bot.constants.js';
import { withCrossCommunityButton } from './telegram-group-help.community-navigation.js';

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

export function groupHelpMainMenuKeyboard(
  chatId?: string,
  values: Record<string, string> = {}
): TelegramKeyboard {
  return withCrossCommunityButton(
    {
      inline_keyboard: [
        [
          { text: 'Rules', callback_data: 'hh_menu_rules', style: 'success' },
          { text: 'Private support', callback_data: 'hh_menu_support', style: 'success' }
        ],
        [
          { text: 'My warnings', callback_data: 'hh_menu_warnings', style: 'success' },
          { text: 'Report a concern', callback_data: 'hh_menu_report', style: 'danger' }
        ],
        [
          { text: 'Bot help', callback_data: 'hh_menu_help', style: 'success' },
          { text: 'HopeHub website', url: 'https://hopehub.in/', style: 'success' }
        ]
      ]
    },
    values,
    chatId
  )!;
}

export function groupHelpSettingsHomeKeyboard(): TelegramKeyboard {
  return {
    inline_keyboard: [
      [
        { text: 'Messages', callback_data: 'hh_settings_messages', style: 'success' },
        { text: 'Safety', callback_data: 'hh_settings_safety', style: 'success' }
      ],
      [
        { text: 'Operations', callback_data: 'hh_settings_operations', style: 'success' },
        { text: 'Help', callback_data: 'hh_settings_help', style: 'success' }
      ],
      [{ text: 'Configure group', callback_data: 'hh_cfg_home', style: 'success' }],
      [{ text: 'Main menu', callback_data: 'hh_menu_home' }]
    ]
  };
}

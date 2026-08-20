import { Prisma } from '@prisma/client';
import { prisma } from '../db.js';
import {
  GROUP_HELP_CONFIG_FIELDS,
  type GroupHelpConfigField
} from '../constants/group-help-config.constants.js';
import { GROUP_HELP_BOT_SLUG } from '../constants/telegram-community-bot.constants.js';
import { answerCommunityCallback, sendCommunityMessage } from './telegram-community-bots.client.js';
import { sendGroupHelpActivityLog } from './telegram-group-help.actions.js';
import { groupHelpConfig } from './telegram-group-help.config.js';
import { canUseGroupHelpAdminCommand } from './telegram-group-help.permissions.js';
import type {
  CommunityTelegramMessage,
  CommunityTelegramUpdate,
  TelegramKeyboard
} from './telegram-community-bots.types.js';

const PREFIX = 'hh_cfg_';
const DRAFT_LIFETIME_MS = 10 * 60 * 1000;
const SETTINGS_SESSION_LIFETIME_MS = 30 * 60 * 1000;
const SETTINGS_SESSION_STATE = 'group-help:settings-session';
const SETTINGS_DRAFT_STATE = 'group-help:settings-draft';

type SettingsDraft = { key: string; value?: string };

function draftKey(chatId: string, userId: number) {
  return `${chatId}:${userId}`;
}

function fieldByKey(key: string) {
  return GROUP_HELP_CONFIG_FIELDS.find((field) => field.key === key);
}

function sectionFields(section: GroupHelpConfigField['section']) {
  return GROUP_HELP_CONFIG_FIELDS.filter((field) => field.section === section);
}

function button(
  text: string,
  callback_data: string,
  style: 'primary' | 'success' | 'danger' = 'success'
) {
  return { text, callback_data, style };
}

function sectionKeyboard(): TelegramKeyboard {
  const sections = Array.from(new Set(GROUP_HELP_CONFIG_FIELDS.map((field) => field.section)));
  return {
    inline_keyboard: [
      ...sections.map((section) => [
        button(section[0].toUpperCase() + section.slice(1), `${PREFIX}section:${section}`)
      ]),
      [button('← Settings home', `${PREFIX}home`)]
    ]
  };
}

function fieldsKeyboard(section: GroupHelpConfigField['section']): TelegramKeyboard {
  return {
    inline_keyboard: [
      ...sectionFields(section).map((field) => [
        button(field.label, `${PREFIX}field:${field.key}`)
      ]),
      [button('← All sections', `${PREFIX}home`)]
    ]
  };
}

function fieldKeyboard(field: GroupHelpConfigField, currentValue: string): TelegramKeyboard {
  if (field.type === 'select' && field.options?.length) {
    return {
      inline_keyboard: [
        ...field.options.map((option, index) => [
          button(
            `${option === currentValue ? '✓ ' : ''}${option}`,
            `${PREFIX}set:${field.key}:${index}`,
            'success'
          )
        ]),
        [button('← Back', `${PREFIX}section:${field.section}`)]
      ]
    };
  }
  return {
    inline_keyboard: [
      [button('Send new value', `${PREFIX}input:${field.key}`, 'success')],
      [button('← Back', `${PREFIX}section:${field.section}`)]
    ]
  };
}

function confirmKeyboard(): TelegramKeyboard {
  return {
    inline_keyboard: [
      [
        button('Save change', `${PREFIX}confirm`, 'success'),
        button('Cancel', `${PREFIX}cancel`, 'danger')
      ]
    ]
  };
}

function cancelKeyboard(): TelegramKeyboard {
  return { inline_keyboard: [[button('Cancel', `${PREFIX}cancel`, 'danger')]] };
}

async function canEditGroupSettings(
  chatId: string,
  actor: NonNullable<CommunityTelegramMessage['from']>,
  messageId: number
) {
  const values = await groupHelpConfig(chatId);
  return canUseGroupHelpAdminCommand(
    {
      message_id: messageId,
      chat: { id: chatId, type: 'supergroup' },
      from: actor,
      text: '/settings'
    },
    values,
    '/settings'
  );
}

async function readSettingsState<T>(bot: string, chatId: string): Promise<T | null> {
  const row = await prisma.telegramCommunityState.findUnique({
    where: { bot_chatId: { bot, chatId } },
    select: { payload: true, expiresAt: true }
  });
  if (!row) return null;
  if (row.expiresAt <= new Date()) {
    await prisma.telegramCommunityState.delete({ where: { bot_chatId: { bot, chatId } } });
    return null;
  }
  return row.payload as T | null;
}

async function writeSettingsState(
  bot: string,
  chatId: string,
  payload: Record<string, unknown>,
  ttlMs: number
) {
  const expiresAt = new Date(Date.now() + ttlMs);
  await prisma.telegramCommunityState.upsert({
    where: { bot_chatId: { bot, chatId } },
    create: { bot, chatId, state: 'OPEN', payload: payload as Prisma.InputJsonValue, expiresAt },
    update: { state: 'OPEN', payload: payload as Prisma.InputJsonValue, expiresAt }
  });
}

function clearSettingsState(bot: string, chatId: string) {
  return prisma.telegramCommunityState.deleteMany({ where: { bot, chatId } });
}

async function selectedPrivateSettingsGroup(userId: number): Promise<string | null> {
  const session = await readSettingsState<{ targetChatId?: string }>(
    SETTINGS_SESSION_STATE,
    String(userId)
  );
  return session?.targetChatId || null;
}

function readSettingsDraft(chatId: string, userId: number) {
  return readSettingsState<SettingsDraft>(SETTINGS_DRAFT_STATE, draftKey(chatId, userId));
}

function writeSettingsDraft(chatId: string, userId: number, draft: SettingsDraft) {
  return writeSettingsState(
    SETTINGS_DRAFT_STATE,
    draftKey(chatId, userId),
    draft,
    DRAFT_LIFETIME_MS
  );
}

function clearSettingsDraft(chatId: string, userId: number) {
  return clearSettingsState(SETTINGS_DRAFT_STATE, draftKey(chatId, userId));
}

/** Opens a group-scoped editor in private chat after checking Telegram admin rights. */
export async function handleGroupHelpPrivateSettingsStart(message: CommunityTelegramMessage) {
  if (!message.from || message.chat.type !== 'private') return false;
  const match = (message.text || '').trim().match(/^\/start\s+group_settings_(-?\d+)$/i);
  if (!match) return false;
  const settingsChatId = match[1];
  if (!(await canEditGroupSettings(settingsChatId, message.from, message.message_id))) {
    await sendCommunityMessage(
      GROUP_HELP_BOT_SLUG,
      String(message.chat.id),
      'You need to be an administrator of that Hope Hub group to open its settings.'
    );
    return true;
  }
  await writeSettingsState(
    SETTINGS_SESSION_STATE,
    String(message.from.id),
    { targetChatId: settingsChatId },
    SETTINGS_SESSION_LIFETIME_MS
  );
  await sendCommunityMessage(
    GROUP_HELP_BOT_SLUG,
    String(message.chat.id),
    '⚙️ *Group settings*\n\nYou are editing the selected group privately. Your admin access is checked again before each change.',
    { parse_mode: 'Markdown', reply_markup: sectionKeyboard() }
  );
  return true;
}

async function currentValue(field: GroupHelpConfigField) {
  const stored = await prisma.siteConfig.findUnique({ where: { key: field.key } });
  return stored?.value ?? field.defaultValue;
}

async function saveValue(
  field: GroupHelpConfigField,
  value: string,
  chatId: string,
  actor: string
) {
  const normalized = value.trim();
  if (normalized.length > field.maxLength) {
    throw new Error(`${field.label} is too long. Maximum ${field.maxLength} characters.`);
  }
  if (field.type === 'select' && field.options && !field.options.includes(normalized)) {
    throw new Error('Choose one of the available options.');
  }
  if (field.type === 'number' && normalized && !/^\d+$/.test(normalized)) {
    throw new Error(`${field.label} must be a whole number.`);
  }
  await prisma.siteConfig.upsert({
    where: { key: field.key },
    create: { key: field.key, value: normalized, label: field.label },
    update: { value: normalized, label: field.label }
  });
  const logChannel = await prisma.siteConfig.findUnique({
    where: { key: 'telegramGroupHelpLogChannelId' },
    select: { value: true }
  });
  await sendGroupHelpActivityLog(
    { telegramGroupHelpLogChannelId: logChannel?.value || '' },
    'Group settings changed from Telegram',
    [`Setting: ${field.label}`, `Group: ${chatId}`, `Admin: ${actor}`]
  );
}

export async function handleGroupHelpBotSettingsCallback(update: CommunityTelegramUpdate) {
  const callback = update.callback_query;
  if (!callback?.message || !callback.data?.startsWith(PREFIX)) return false;
  const privateChat = callback.message.chat.type === 'private';
  if (!privateChat) {
    await answerCommunityCallback(
      GROUP_HELP_BOT_SLUG,
      callback.id,
      'Open Admin settings privately from the group menu.'
    );
    return true;
  }
  const chatId = privateChat
    ? await selectedPrivateSettingsGroup(callback.from.id)
    : String(callback.message.chat.id);
  const replyChatId = String(callback.message.chat.id);
  if (!chatId) {
    await answerCommunityCallback(
      GROUP_HELP_BOT_SLUG,
      callback.id,
      'Open Admin settings from the group first, then continue here.'
    );
    return true;
  }
  if (!(await canEditGroupSettings(chatId, callback.from, callback.message.message_id))) {
    await answerCommunityCallback(
      GROUP_HELP_BOT_SLUG,
      callback.id,
      'Only Telegram admins can change settings.'
    );
    return true;
  }

  const action = callback.data.slice(PREFIX.length);
  if (action === 'home') {
    await sendCommunityMessage(
      GROUP_HELP_BOT_SLUG,
      replyChatId,
      '⚙️ *Configure Hope Hub group*\n\nChoose an area.',
      {
        parse_mode: 'Markdown',
        reply_markup: sectionKeyboard()
      }
    );
  } else if (action.startsWith('section:')) {
    const section = action.slice('section:'.length) as GroupHelpConfigField['section'];
    const fields = sectionFields(section);
    if (!fields.length) {
      await answerCommunityCallback(
        GROUP_HELP_BOT_SLUG,
        callback.id,
        'This section is unavailable.'
      );
      return true;
    }
    await sendCommunityMessage(
      GROUP_HELP_BOT_SLUG,
      replyChatId,
      `⚙️ *${section[0].toUpperCase() + section.slice(1)} settings*\n\nChoose a setting to change.`,
      {
        parse_mode: 'Markdown',
        reply_markup: fieldsKeyboard(section)
      }
    );
  } else if (action.startsWith('field:')) {
    const field = fieldByKey(action.slice('field:'.length));
    if (!field) {
      await answerCommunityCallback(
        GROUP_HELP_BOT_SLUG,
        callback.id,
        'That setting is unavailable.'
      );
      return true;
    }
    const value = await currentValue(field);
    await sendCommunityMessage(
      GROUP_HELP_BOT_SLUG,
      replyChatId,
      `*${field.label}*\n\n${field.description}\n\nCurrent value: \`${value || 'Not set'}\``,
      { parse_mode: 'Markdown', reply_markup: fieldKeyboard(field, value) }
    );
  } else if (action.startsWith('set:')) {
    const [, key, indexText] = action.split(':');
    const field = fieldByKey(key);
    const option = field?.options?.[Number(indexText)];
    if (!field || option === undefined) {
      await answerCommunityCallback(
        GROUP_HELP_BOT_SLUG,
        callback.id,
        'That option is unavailable.'
      );
      return true;
    }
    await writeSettingsDraft(chatId, callback.from.id, {
      key: field.key,
      value: option
    });
    await sendCommunityMessage(
      GROUP_HELP_BOT_SLUG,
      replyChatId,
      `Change *${field.label}* to \`${option}\`?`,
      {
        parse_mode: 'Markdown',
        reply_markup: confirmKeyboard()
      }
    );
  } else if (action.startsWith('input:')) {
    const field = fieldByKey(action.slice('input:'.length));
    if (!field) {
      await answerCommunityCallback(
        GROUP_HELP_BOT_SLUG,
        callback.id,
        'That setting is unavailable.'
      );
      return true;
    }
    if (field.maxLength > 4000) {
      await sendCommunityMessage(
        GROUP_HELP_BOT_SLUG,
        replyChatId,
        `${field.label} can be very long. Please edit it in Hope Hub Admin so nothing is truncated.`
      );
    } else {
      await writeSettingsDraft(chatId, callback.from.id, { key: field.key });
      await sendCommunityMessage(
        GROUP_HELP_BOT_SLUG,
        replyChatId,
        `Send the new value for *${field.label}* in your next message. It will expire in 10 minutes.`,
        { parse_mode: 'Markdown', reply_markup: cancelKeyboard() }
      );
    }
  } else if (action === 'confirm') {
    const draft = await readSettingsDraft(chatId, callback.from.id);
    const field = draft && fieldByKey(draft.key);
    if (!draft || !field || draft.value === undefined) {
      await clearSettingsDraft(chatId, callback.from.id);
      await answerCommunityCallback(
        GROUP_HELP_BOT_SLUG,
        callback.id,
        'This change has expired. Choose the setting again.'
      );
      return true;
    }
    try {
      await saveValue(
        field,
        draft.value,
        chatId,
        `${callback.from.first_name || 'Telegram staff'}${callback.from.username ? ` (@${callback.from.username})` : ''} [${callback.from.id}]`
      );
      await clearSettingsDraft(chatId, callback.from.id);
      await sendCommunityMessage(
        GROUP_HELP_BOT_SLUG,
        replyChatId,
        `✅ *${field.label}* is now set to \`${draft.value}\`.`,
        {
          parse_mode: 'Markdown',
          reply_markup: fieldKeyboard(field, draft.value)
        }
      );
    } catch (error) {
      await sendCommunityMessage(
        GROUP_HELP_BOT_SLUG,
        replyChatId,
        error instanceof Error ? error.message : 'Could not save this setting.',
        { reply_markup: cancelKeyboard() }
      );
    }
  } else if (action === 'cancel') {
    await clearSettingsDraft(chatId, callback.from.id);
    await sendCommunityMessage(GROUP_HELP_BOT_SLUG, replyChatId, 'No changes were saved.');
  }
  await answerCommunityCallback(GROUP_HELP_BOT_SLUG, callback.id);
  return true;
}

export async function handleGroupHelpBotSettingsInput(message: CommunityTelegramMessage) {
  if (!message.from || !message.text || message.chat.type !== 'private') return false;
  const chatId = await selectedPrivateSettingsGroup(message.from.id);
  if (!chatId) return false;
  const replyChatId = String(message.chat.id);
  const draft = await readSettingsDraft(chatId, message.from.id);
  if (!draft) return false;
  if (!(await canEditGroupSettings(chatId, message.from, message.message_id))) return true;
  const field = fieldByKey(draft.key);
  if (!field) return true;
  if (draft.value !== undefined) return false;
  const value = message.text.trim();
  if (value.length > field.maxLength) {
    await sendCommunityMessage(
      GROUP_HELP_BOT_SLUG,
      replyChatId,
      `${field.label} is too long. Maximum ${field.maxLength} characters. Send a shorter value or cancel.`,
      { reply_markup: cancelKeyboard() }
    );
    return true;
  }
  if (field.type === 'number' && value && !/^\d+$/.test(value)) {
    await sendCommunityMessage(
      GROUP_HELP_BOT_SLUG,
      replyChatId,
      `${field.label} must be a whole number. Send it again or cancel.`,
      { reply_markup: cancelKeyboard() }
    );
    return true;
  }
  await writeSettingsDraft(chatId, message.from.id, { ...draft, value });
  await sendCommunityMessage(
    GROUP_HELP_BOT_SLUG,
    replyChatId,
    `Save this new value for *${field.label}*?\n\n\`${value}\``,
    { parse_mode: 'Markdown', reply_markup: confirmKeyboard() }
  );
  return true;
}

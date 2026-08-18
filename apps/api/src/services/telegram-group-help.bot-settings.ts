import { prisma } from '../db.js';
import {
  GROUP_HELP_CONFIG_FIELDS,
  type GroupHelpConfigField
} from '../constants/group-help-config.constants.js';
import { GROUP_HELP_BOT_SLUG } from '../constants/telegram-community-bot.constants.js';
import {
  answerCommunityCallback,
  callCommunityTelegramApi,
  sendCommunityMessage
} from './telegram-community-bots.client.js';
import { sendGroupHelpActivityLog } from './telegram-group-help.actions.js';
import type {
  CommunityTelegramMessage,
  CommunityTelegramUpdate,
  TelegramKeyboard
} from './telegram-community-bots.types.js';

const PREFIX = 'hh_cfg_';
const DRAFT_LIFETIME_MS = 10 * 60 * 1000;
const inputDrafts = new Map<string, { key: string; expiresAt: number; value?: string }>();

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
  style: 'primary' | 'success' | 'danger' = 'primary'
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
      [button('← Settings home', 'hh_settings_home')]
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
            option === currentValue ? 'success' : 'primary'
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

async function isTelegramAdmin(chatId: string, userId: number) {
  const member = await callCommunityTelegramApi<{ status?: string }>(
    GROUP_HELP_BOT_SLUG,
    'getChatMember',
    { chat_id: chatId, user_id: userId }
  ).catch(() => null);
  return Boolean(member && ['creator', 'administrator'].includes(member.status || ''));
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
  const chatId = String(callback.message.chat.id);
  if (!['group', 'supergroup'].includes(callback.message.chat.type || '')) {
    await answerCommunityCallback(
      GROUP_HELP_BOT_SLUG,
      callback.id,
      'Open settings inside the community group.'
    );
    return true;
  }
  if (!(await isTelegramAdmin(chatId, callback.from.id))) {
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
      chatId,
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
      chatId,
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
      chatId,
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
    inputDrafts.set(draftKey(chatId, callback.from.id), {
      key: field.key,
      value: option,
      expiresAt: Date.now() + DRAFT_LIFETIME_MS
    });
    await sendCommunityMessage(
      GROUP_HELP_BOT_SLUG,
      chatId,
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
        chatId,
        `${field.label} can be very long. Please edit it in Hope Hub Admin so nothing is truncated.`
      );
    } else {
      inputDrafts.set(draftKey(chatId, callback.from.id), {
        key: field.key,
        expiresAt: Date.now() + DRAFT_LIFETIME_MS
      });
      await sendCommunityMessage(
        GROUP_HELP_BOT_SLUG,
        chatId,
        `Send the new value for *${field.label}* in your next message. It will expire in 10 minutes.`,
        { parse_mode: 'Markdown', reply_markup: cancelKeyboard() }
      );
    }
  } else if (action === 'confirm') {
    const key = draftKey(chatId, callback.from.id);
    const draft = inputDrafts.get(key);
    const field = draft && fieldByKey(draft.key);
    if (!draft || !field || draft.expiresAt < Date.now() || draft.value === undefined) {
      inputDrafts.delete(key);
      await answerCommunityCallback(
        GROUP_HELP_BOT_SLUG,
        callback.id,
        'This change has expired. Choose the setting again.'
      );
      return true;
    }
    try {
      await saveValue(field, draft.value, chatId, String(callback.from.id));
      inputDrafts.delete(key);
      await sendCommunityMessage(
        GROUP_HELP_BOT_SLUG,
        chatId,
        `✅ *${field.label}* is now set to \`${draft.value}\`.`,
        {
          parse_mode: 'Markdown',
          reply_markup: fieldKeyboard(field, draft.value)
        }
      );
    } catch (error) {
      await sendCommunityMessage(
        GROUP_HELP_BOT_SLUG,
        chatId,
        error instanceof Error ? error.message : 'Could not save this setting.',
        { reply_markup: cancelKeyboard() }
      );
    }
  } else if (action === 'cancel') {
    inputDrafts.delete(draftKey(chatId, callback.from.id));
    await sendCommunityMessage(GROUP_HELP_BOT_SLUG, chatId, 'No changes were saved.');
  }
  await answerCommunityCallback(GROUP_HELP_BOT_SLUG, callback.id);
  return true;
}

export async function handleGroupHelpBotSettingsInput(message: CommunityTelegramMessage) {
  if (
    !message.from ||
    !message.text ||
    !['group', 'supergroup'].includes(message.chat.type || '')
  ) {
    return false;
  }
  const chatId = String(message.chat.id);
  const key = draftKey(chatId, message.from.id);
  const draft = inputDrafts.get(key);
  if (!draft) return false;
  if (draft.expiresAt < Date.now()) return false;
  if (!(await isTelegramAdmin(chatId, message.from.id))) return true;
  const field = fieldByKey(draft.key);
  if (!field) return true;
  if (draft.value !== undefined) return false;
  const value = message.text.trim();
  if (value.length > field.maxLength) {
    await sendCommunityMessage(
      GROUP_HELP_BOT_SLUG,
      chatId,
      `${field.label} is too long. Maximum ${field.maxLength} characters. Send a shorter value or cancel.`,
      { reply_markup: cancelKeyboard() }
    );
    return true;
  }
  if (field.type === 'number' && value && !/^\d+$/.test(value)) {
    await sendCommunityMessage(
      GROUP_HELP_BOT_SLUG,
      chatId,
      `${field.label} must be a whole number. Send it again or cancel.`,
      { reply_markup: cancelKeyboard() }
    );
    return true;
  }
  inputDrafts.set(key, { ...draft, value });
  await sendCommunityMessage(
    GROUP_HELP_BOT_SLUG,
    chatId,
    `Save this new value for *${field.label}*?\n\n\`${value}\``,
    { parse_mode: 'Markdown', reply_markup: confirmKeyboard() }
  );
  return true;
}

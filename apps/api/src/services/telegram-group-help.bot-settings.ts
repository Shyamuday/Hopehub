import { Prisma } from '@prisma/client';
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
import { groupHelpConfig } from './telegram-group-help.config.js';
import { telegramPersonLogLabel } from './telegram-group-help.people.js';
import { canUseGroupHelpAdminCommand } from './telegram-group-help.permissions.js';
import {
  GROUP_HELP_DEFAULT_STAFF_COMMANDS,
  GROUP_HELP_STAFF_PERMISSION_GROUPS
} from './telegram-group-help.commands.js';
import {
  groupHelpStaffPermissions,
  saveGroupHelpStaffPermissions
} from './telegram-group-help.staff-permissions.js';
import type {
  CommunityTelegramMessage,
  CommunityTelegramUser,
  CommunityTelegramUpdate,
  TelegramKeyboard
} from './telegram-community-bots.types.js';

const PREFIX = 'hh_cfg_';
const DRAFT_LIFETIME_MS = 10 * 60 * 1000;
const SETTINGS_SESSION_LIFETIME_MS = 30 * 60 * 1000;
const SETTINGS_SESSION_STATE = 'group-help:settings-session';
const SETTINGS_DRAFT_STATE = 'group-help:settings-draft';

type SettingsDraft = { key: string; value?: string };

type TelegramGroupAdministrator = {
  user: CommunityTelegramUser;
  status: string;
  can_manage_chat?: boolean;
  can_delete_messages?: boolean;
  can_restrict_members?: boolean;
  can_promote_members?: boolean;
  can_change_info?: boolean;
  can_invite_users?: boolean;
  can_pin_messages?: boolean;
  is_anonymous?: boolean;
  custom_title?: string;
};

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

function twoColumnRows<T>(items: readonly T[]): T[][] {
  const rows: T[][] = [];
  for (let index = 0; index < items.length; index += 2) {
    rows.push([...items.slice(index, index + 2)]);
  }
  return rows;
}

function sectionKeyboard(): TelegramKeyboard {
  const sections = Array.from(new Set(GROUP_HELP_CONFIG_FIELDS.map((field) => field.section)));
  return {
    inline_keyboard: [
      ...twoColumnRows(
        sections.map((section) =>
          button(section[0].toUpperCase() + section.slice(1), `${PREFIX}section:${section}`)
        )
      ),
      [button('People & access', `${PREFIX}staff`), button('← Settings home', `${PREFIX}home`)]
    ]
  };
}

function fieldsKeyboard(section: GroupHelpConfigField['section']): TelegramKeyboard {
  return {
    inline_keyboard: [
      ...twoColumnRows(
        sectionFields(section).map((field) => button(field.label, `${PREFIX}field:${field.key}`))
      ),
      [button('← All sections', `${PREFIX}home`)]
    ]
  };
}

function fieldKeyboard(field: GroupHelpConfigField, currentValue: string): TelegramKeyboard {
  if (field.type === 'select' && field.options?.length) {
    return {
      inline_keyboard: [
        ...twoColumnRows(
          field.options.map((option, index) =>
            button(
              `${option === currentValue ? '✓ ' : ''}${option}`,
              `${PREFIX}set:${field.key}:${index}`,
              'success'
            )
          )
        ),
        [button('← Back', `${PREFIX}section:${field.section}`)]
      ]
    };
  }
  return {
    inline_keyboard: [
      [
        button('Send new value', `${PREFIX}input:${field.key}`, 'success'),
        button('← Back', `${PREFIX}section:${field.section}`)
      ]
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
  messageId: number,
  command = '/settings'
) {
  const values = await groupHelpConfig(chatId);
  return canUseGroupHelpAdminCommand(
    {
      message_id: messageId,
      chat: { id: chatId, type: 'supergroup' },
      from: actor,
      text: command
    },
    values,
    command
  );
}

function staffMemberLabel(member: {
  telegramUserId: string;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
}) {
  const name = [member.firstName, member.lastName].filter(Boolean).join(' ');
  return (name || (member.username ? `@${member.username}` : member.telegramUserId)).slice(0, 48);
}

function personButtonLabel(member: {
  telegramUserId?: string;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
}) {
  const name = [member.firstName, member.lastName].filter(Boolean).join(' ').trim();
  const username = member.username ? `@${member.username}` : '';
  return [name || member.telegramUserId || 'Unknown member', username]
    .filter(Boolean)
    .join(' · ')
    .slice(0, 64);
}

function telegramAdminCapabilities(admin: TelegramGroupAdministrator) {
  if (['creator', 'owner'].includes(admin.status)) return ['Owner — all Telegram admin powers'];
  const capabilities = [
    admin.can_manage_chat && 'manage chat',
    admin.can_delete_messages && 'delete messages',
    admin.can_restrict_members && 'restrict members',
    admin.can_pin_messages && 'pin messages',
    admin.can_invite_users && 'invite members',
    admin.can_promote_members && 'promote admins',
    admin.can_change_info && 'change group info'
  ].filter((value): value is string => Boolean(value));
  return capabilities.length ? capabilities : ['Telegram administrator'];
}

async function groupAdministrators(chatId: string) {
  return callCommunityTelegramApi<TelegramGroupAdministrator[]>(
    GROUP_HELP_BOT_SLUG,
    'getChatAdministrators',
    { chat_id: chatId }
  ).catch(() => []);
}

function staffAccessSummary(permissions: string[], fullAdmin: boolean) {
  if (fullAdmin) {
    return {
      enabled: ['All Hope Hub bot actions'],
      disabled: [] as string[]
    };
  }
  const selected = new Set(permissions);
  const enabled = GROUP_HELP_STAFF_PERMISSION_GROUPS.filter((group) =>
    group.commands.every((command) => selected.has(command))
  ).map((group) => group.label);
  const disabled = GROUP_HELP_STAFF_PERMISSION_GROUPS.filter(
    (group) => !group.commands.every((command) => selected.has(command))
  ).map((group) => group.label);
  return { enabled, disabled };
}

function staffPermissionsKeyboard(
  telegramUserId: string,
  permissions: string[],
  fullAdmin: boolean
): TelegramKeyboard {
  const selected = new Set(permissions);
  return {
    inline_keyboard: [
      [
        button(
          `${fullAdmin ? '✓ ' : ''}Full bot administrator`,
          `${PREFIX}staff-full:${telegramUserId}`,
          fullAdmin ? 'success' : 'danger'
        )
      ],
      ...twoColumnRows(
        GROUP_HELP_STAFF_PERMISSION_GROUPS.map((group, index) => {
          const enabled = fullAdmin || group.commands.every((command) => selected.has(command));
          return button(
            `${enabled ? '✓ ' : ''}${group.label}`,
            `${PREFIX}staff-toggle:${telegramUserId}:${index}`,
            enabled ? 'success' : 'primary'
          );
        })
      ),
      [
        button('Restore daily defaults', `${PREFIX}staff-daily:${telegramUserId}`),
        button('Remove all access', `${PREFIX}staff-none:${telegramUserId}`, 'danger')
      ],
      [button('← Staff members', `${PREFIX}staff`)]
    ]
  };
}

async function sendPrivateStaffEditor(
  replyChatId: string,
  mainGroupId: string,
  staffGroupId: string,
  telegramUserId: string
) {
  const member = await prisma.telegramCommunityMember.findFirst({
    where: { chatId: staffGroupId, telegramUserId, leftAt: null }
  });
  if (!member) {
    await sendCommunityMessage(
      GROUP_HELP_BOT_SLUG,
      replyChatId,
      'This member is no longer active in the private staff group.'
    );
    return false;
  }
  const access = await groupHelpStaffPermissions(mainGroupId, telegramUserId);
  const summary = staffAccessSummary(access.permissions, access.fullAdmin);
  await sendCommunityMessage(
    GROUP_HELP_BOT_SLUG,
    replyChatId,
    [
      `Staff permissions — ${staffMemberLabel(member)}`,
      `Name: ${[member.firstName, member.lastName].filter(Boolean).join(' ') || 'Not available'}`,
      `Username: ${member.username ? `@${member.username}` : 'Not set'}`,
      `Telegram ID: ${telegramUserId}`,
      'Private staff group: active',
      '',
      access.fullAdmin
        ? 'Full bot administrator access is enabled.'
        : 'Choose the daily and sensitive actions this member may use.',
      `Enabled: ${summary.enabled.length ? summary.enabled.join(', ') : 'No delegated bot powers'}`,
      `Not enabled: ${summary.disabled.length ? summary.disabled.join(', ') : 'None'}`
    ]
      .filter((line) => line !== '')
      .join('\n'),
    {
      reply_markup: staffPermissionsKeyboard(telegramUserId, access.permissions, access.fullAdmin)
    }
  );
  return true;
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
  if (action === 'staff' || action.startsWith('staff-') || action.startsWith('admin-user:')) {
    if (
      !(await canEditGroupSettings(chatId, callback.from, callback.message.message_id, '/helper'))
    ) {
      await answerCommunityCallback(
        GROUP_HELP_BOT_SLUG,
        callback.id,
        'You do not have permission to manage staff access.'
      );
      return true;
    }
    const values = await groupHelpConfig(chatId);
    const staffGroupId = values.telegramGroupHelpStaffGroupId?.trim() || '';
    if (!staffGroupId) {
      await answerCommunityCallback(
        GROUP_HELP_BOT_SLUG,
        callback.id,
        'Connect the private staff group first.'
      );
      return true;
    }
    if (action === 'staff') {
      const [members, administrators] = await Promise.all([
        prisma.telegramCommunityMember.findMany({
          where: { chatId: staffGroupId, leftAt: null },
          orderBy: [{ firstName: 'asc' }, { updatedAt: 'desc' }],
          take: 50
        }),
        groupAdministrators(chatId)
      ]);
      const staffIds = new Set(members.map((member) => member.telegramUserId));
      const mainGroupOnlyAdmins = administrators.filter(
        (administrator) => !staffIds.has(String(administrator.user.id))
      );
      await sendCommunityMessage(
        GROUP_HELP_BOT_SLUG,
        replyChatId,
        members.length
          ? [
              'Choose a person to review their access.',
              '',
              'Private staff members can have their Hope Hub bot powers changed here.',
              'Main-group administrators already have full bot access through their Telegram role; open one to see their Telegram permissions and identity.',
              '',
              `Private staff: ${members.length} · Main-group admins: ${administrators.length}`
            ].join('\n')
          : 'No private staff members have been detected yet. Ask them to send one message in the staff group.',
        {
          reply_markup: {
            inline_keyboard: [
              ...twoColumnRows(
                members.map((member) =>
                  button(staffMemberLabel(member), `${PREFIX}staff-user:${member.telegramUserId}`)
                )
              ),
              ...twoColumnRows(
                mainGroupOnlyAdmins.map((administrator) =>
                  button(
                    personButtonLabel({
                      telegramUserId: String(administrator.user.id),
                      firstName: administrator.user.first_name,
                      lastName: administrator.user.last_name,
                      username: administrator.user.username
                    }),
                    `${PREFIX}admin-user:${administrator.user.id}`,
                    'primary'
                  )
                )
              ),
              [button('← Settings home', `${PREFIX}home`)]
            ]
          }
        }
      );
      await answerCommunityCallback(GROUP_HELP_BOT_SLUG, callback.id);
      return true;
    }
    const parts = action.split(':');
    const staffAction = parts[0];
    const telegramUserId = parts[1];
    if (!telegramUserId || !/^\d+$/.test(telegramUserId)) {
      await answerCommunityCallback(
        GROUP_HELP_BOT_SLUG,
        callback.id,
        'That staff member is unavailable.'
      );
      return true;
    }
    if (staffAction === 'admin-user') {
      const administrator = (await groupAdministrators(chatId)).find(
        (entry) => String(entry.user.id) === telegramUserId
      );
      if (!administrator) {
        await answerCommunityCallback(
          GROUP_HELP_BOT_SLUG,
          callback.id,
          'That administrator is no longer available. Refresh the list.'
        );
        return true;
      }
      const name =
        [administrator.user.first_name, administrator.user.last_name].filter(Boolean).join(' ') ||
        'Not available';
      await sendCommunityMessage(
        GROUP_HELP_BOT_SLUG,
        replyChatId,
        [
          'Main group administrator',
          '',
          `Name: ${name}`,
          `Username: ${administrator.user.username ? `@${administrator.user.username}` : 'Not set'}`,
          `Telegram ID: ${telegramUserId}`,
          `Telegram role: ${['creator', 'owner'].includes(administrator.status) ? 'Owner' : 'Administrator'}`,
          administrator.custom_title ? `Admin title: ${administrator.custom_title}` : '',
          administrator.is_anonymous ? 'Anonymous admin: yes' : 'Anonymous admin: no',
          '',
          'Hope Hub bot access: full through their Telegram main-group administrator role.',
          `Telegram abilities: ${telegramAdminCapabilities(administrator).join(', ')}`,
          '',
          'To manage separate delegated staff powers, add this person to the private staff group.'
        ]
          .filter(Boolean)
          .join('\n'),
        { reply_markup: { inline_keyboard: [[button('← People & access', `${PREFIX}staff`)]] } }
      );
      await answerCommunityCallback(GROUP_HELP_BOT_SLUG, callback.id);
      return true;
    }
    if (staffAction === 'staff-user') {
      await sendPrivateStaffEditor(replyChatId, chatId, staffGroupId, telegramUserId);
      await answerCommunityCallback(GROUP_HELP_BOT_SLUG, callback.id);
      return true;
    }
    const current = await groupHelpStaffPermissions(chatId, telegramUserId);
    let nextPermissions = [...current.permissions.filter((permission) => permission !== '*')];
    let fullAdmin = false;
    let changeLabel = '';
    if (staffAction === 'staff-full') {
      fullAdmin = !current.fullAdmin;
      nextPermissions = fullAdmin ? [] : [...GROUP_HELP_DEFAULT_STAFF_COMMANDS];
      changeLabel = fullAdmin ? 'Full bot administrator enabled' : 'Daily defaults restored';
    } else if (staffAction === 'staff-daily') {
      nextPermissions = [...GROUP_HELP_DEFAULT_STAFF_COMMANDS];
      changeLabel = 'Daily defaults restored';
    } else if (staffAction === 'staff-none') {
      nextPermissions = [];
      changeLabel = 'All delegated access removed';
    } else if (staffAction === 'staff-toggle') {
      if (current.fullAdmin) {
        await answerCommunityCallback(
          GROUP_HELP_BOT_SLUG,
          callback.id,
          'Turn off Full bot administrator before changing individual permissions.'
        );
        return true;
      }
      const group = GROUP_HELP_STAFF_PERMISSION_GROUPS[Number(parts[2])];
      if (!group) {
        await answerCommunityCallback(
          GROUP_HELP_BOT_SLUG,
          callback.id,
          'That permission is unavailable.'
        );
        return true;
      }
      const selected = new Set(nextPermissions);
      const enabled = group.commands.every((command) => selected.has(command));
      for (const command of group.commands) {
        if (enabled) selected.delete(command);
        else selected.add(command);
      }
      nextPermissions = [...selected];
      changeLabel = `${group.label} ${enabled ? 'disabled' : 'enabled'}`;
    } else {
      await answerCommunityCallback(
        GROUP_HELP_BOT_SLUG,
        callback.id,
        'That staff action is unavailable.'
      );
      return true;
    }
    try {
      await saveGroupHelpStaffPermissions({
        mainGroupId: chatId,
        staffGroupId,
        telegramUserId,
        permissions: nextPermissions,
        fullAdmin,
        actorId: `telegram:${callback.from.id}`
      });
      await sendGroupHelpActivityLog(values, 'Staff permissions changed privately', [
        `Member: ${telegramUserId}`,
        `Change: ${changeLabel}`,
        `By: ${telegramPersonLogLabel(callback.from, 'Telegram administrator')}`
      ]);
      await sendPrivateStaffEditor(replyChatId, chatId, staffGroupId, telegramUserId);
      await answerCommunityCallback(GROUP_HELP_BOT_SLUG, callback.id, 'Permissions updated.');
    } catch (error) {
      await answerCommunityCallback(
        GROUP_HELP_BOT_SLUG,
        callback.id,
        error instanceof Error ? error.message : 'Could not update these permissions.'
      );
    }
    return true;
  } else if (action === 'home') {
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
        telegramPersonLogLabel(callback.from, 'Telegram staff')
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

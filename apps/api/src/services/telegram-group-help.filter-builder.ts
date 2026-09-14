import { Prisma } from '@prisma/client';
import { prisma } from '../db.js';
import { GROUP_HELP_BOT_SLUG } from '../constants/telegram-community-bot.constants.js';
import {
  answerCommunityCallback,
  editCommunityReplyMarkup,
  syncGroupHelpChatCommands
} from './telegram-community-bots.client.js';
import type {
  CommunityTelegramMessage,
  CommunityTelegramUpdate,
  TelegramKeyboard
} from './telegram-community-bots.types.js';
import { groupHelpConfig } from './telegram-group-help.config.js';
import { messageForGroupHelpTarget } from './telegram-group-help.command-context.js';
import { canUseGroupHelpAdminCommand } from './telegram-group-help.permissions.js';
import {
  groupHelpFilterCommandSuggestions,
  groupHelpFilterMediaFromMessage,
  parseGroupHelpFilters,
  parseGroupHelpFilterTrigger,
  serializeGroupHelpFilters,
  type GroupHelpFilter,
  type GroupHelpFilterMedia,
  type GroupHelpFilterTrigger
} from './telegram-group-help.filters.js';
import {
  getTelegramCommunityGroupPolicy,
  saveTelegramCommunityGroupPolicy
} from './telegram-community-group-policy.js';
import { sendTemporaryGroupHelpMessage } from './telegram-group-help.actions.js';

const STATE_BOT = 'group-help:filter-builder';
const PREFIX = 'hh_filter_';
const TTL_MS = 15 * 60_000;
const MAX_TEXT_LENGTH = 3500;
const MAX_MEDIA_CAPTION_LENGTH = 900;

type FilterBuilderStep =
  'menu' | 'triggers' | 'kind' | 'text' | 'media' | 'media_text' | 'preview' | 'confirm_remove';

type FilterBuilderDraft = {
  sourceChatId: string;
  targetChatId: string;
  step: FilterBuilderStep;
  triggers?: GroupHelpFilterTrigger[];
  responseKind?: 'text' | 'media' | 'media_text';
  text?: string;
  media?: GroupHelpFilterMedia;
  removeKeys?: string[];
};

function stateKey(sourceChatId: string, userId: number) {
  return `${sourceChatId}:${userId}`;
}

function button(
  text: string,
  callback_data: string,
  style: 'primary' | 'success' | 'danger' = 'success'
) {
  return { text, callback_data, style };
}

function menuKeyboard(): TelegramKeyboard {
  return {
    inline_keyboard: [
      [button('➕ Add keyword reply', `${PREFIX}add`, 'success')],
      [button('📋 View or remove filters', `${PREFIX}manage`, 'primary')],
      [button('Close', `${PREFIX}cancel`, 'danger')]
    ]
  };
}

function cancelKeyboard(back = false): TelegramKeyboard {
  return {
    inline_keyboard: [
      [
        ...(back ? [button('← Back', `${PREFIX}menu`, 'primary')] : []),
        button('Cancel', `${PREFIX}cancel`, 'danger')
      ]
    ]
  };
}

function kindKeyboard(): TelegramKeyboard {
  return {
    inline_keyboard: [
      [button('📝 Text', `${PREFIX}kind:text`), button('🖼 Media', `${PREFIX}kind:media`)],
      [button('🖼 Media + text', `${PREFIX}kind:media_text`, 'primary')],
      [
        button('← Start again', `${PREFIX}add`, 'primary'),
        button('Cancel', `${PREFIX}cancel`, 'danger')
      ]
    ]
  };
}

function previewKeyboard(): TelegramKeyboard {
  return {
    inline_keyboard: [
      [button('✅ Save filter', `${PREFIX}save`, 'success')],
      [
        button('↻ Start again', `${PREFIX}add`, 'primary'),
        button('Cancel', `${PREFIX}cancel`, 'danger')
      ]
    ]
  };
}

async function readDraft(sourceChatId: string, userId: number) {
  const key = stateKey(sourceChatId, userId);
  const row = await prisma.telegramCommunityState.findUnique({
    where: { bot_chatId: { bot: STATE_BOT, chatId: key } },
    select: { payload: true, expiresAt: true }
  });
  if (!row) return null;
  if (row.expiresAt <= new Date()) {
    await prisma.telegramCommunityState.deleteMany({ where: { bot: STATE_BOT, chatId: key } });
    return null;
  }
  return row.payload as FilterBuilderDraft | null;
}

async function writeDraft(draft: FilterBuilderDraft, userId: number) {
  const key = stateKey(draft.sourceChatId, userId);
  const expiresAt = new Date(Date.now() + TTL_MS);
  const payload = JSON.parse(JSON.stringify(draft)) as Prisma.InputJsonValue;
  await prisma.telegramCommunityState.upsert({
    where: { bot_chatId: { bot: STATE_BOT, chatId: key } },
    create: {
      bot: STATE_BOT,
      chatId: key,
      state: draft.step,
      payload,
      expiresAt
    },
    update: { state: draft.step, payload, expiresAt }
  });
}

function clearDraft(sourceChatId: string, userId: number) {
  return prisma.telegramCommunityState.deleteMany({
    where: { bot: STATE_BOT, chatId: stateKey(sourceChatId, userId) }
  });
}

export function parseFilterBuilderTriggers(input: string) {
  const candidates = input.includes(',') || input.includes('\n') ? input.split(/[\n,]+/) : [input];
  const unique = new Map<string, GroupHelpFilterTrigger>();
  for (const candidate of candidates) {
    const parsed = parseGroupHelpFilterTrigger(candidate);
    if (!parsed) continue;
    unique.set(`${parsed.mode}:${parsed.value.toLocaleLowerCase()}`, parsed);
  }
  return [...unique.values()].slice(0, 20);
}

function triggerKey(trigger: GroupHelpFilterTrigger) {
  return `${trigger.mode}:${trigger.value.toLocaleLowerCase()}`;
}

function triggerLabel(trigger: GroupHelpFilterTrigger) {
  return `${trigger.mode === 'contains' ? '' : `${trigger.mode}:`}${trigger.value}`;
}

function draftFilter(draft: FilterBuilderDraft): GroupHelpFilter | null {
  if (!draft.triggers?.length || (!draft.text && !draft.media)) return null;
  return {
    triggers: draft.triggers,
    ...(draft.text ? { text: draft.text } : {}),
    ...(draft.media ? { media: draft.media } : {}),
    audience: 'all',
    allowBots: false
  };
}

export function upsertFilterBuilderFilter(definitions: string, filter: GroupHelpFilter): string {
  const current = parseGroupHelpFilters(definitions);
  const replacementKeys = new Set(filter.triggers.map(triggerKey));
  const filters = current.filters
    .map((existing) => ({
      ...existing,
      triggers: existing.triggers.filter((trigger) => !replacementKeys.has(triggerKey(trigger)))
    }))
    .filter((existing) => existing.triggers.length);
  filters.push(filter);
  return serializeGroupHelpFilters(filters, current.passthrough);
}

async function saveDefinitions(targetChatId: string, definitions: string) {
  const policy = await getTelegramCommunityGroupPolicy(targetChatId);
  await saveTelegramCommunityGroupPolicy(targetChatId, {
    ...policy,
    telegramGroupHelpCustomReplies: definitions
  });
  await syncGroupHelpChatCommands(
    targetChatId,
    groupHelpFilterCommandSuggestions(definitions)
  ).catch(() => null);
}

async function canManage(draft: FilterBuilderDraft, message: CommunityTelegramMessage) {
  if (!message.from) return false;
  const values = await groupHelpConfig(draft.targetChatId);
  return canUseGroupHelpAdminCommand(
    messageForGroupHelpTarget(message, draft.targetChatId),
    values,
    '/filter'
  );
}

async function sendStep(
  chatId: string,
  text: string,
  targetChatId: string,
  replyMarkup: TelegramKeyboard
) {
  const values = await groupHelpConfig(targetChatId);
  await sendTemporaryGroupHelpMessage(chatId, text, values, { reply_markup: replyMarkup });
}

async function showPreview(draft: FilterBuilderDraft, userId: number) {
  const filter = draftFilter(draft);
  if (!filter) return;
  const next = { ...draft, step: 'preview' as const };
  await writeDraft(next, userId);
  const triggers = filter.triggers.map(triggerLabel).join(', ');
  const summary = [
    '🔎 Filter preview',
    '',
    `When a message contains: ${triggers}`,
    filter.text ? `Bot reply:\n${filter.text}` : 'Bot reply: media only',
    filter.media ? `Media: ${filter.media.type}` : null,
    '',
    'Save this filter?'
  ]
    .filter((line): line is string => line !== null)
    .join('\n');
  await sendStep(draft.sourceChatId, summary, draft.targetChatId, previewKeyboard());
}

/** Opens the no-code filter editor after /filter has passed the normal admin check. */
export async function startGroupHelpFilterBuilder(input: {
  message: CommunityTelegramMessage;
  targetChatId: string;
  initialTriggers?: GroupHelpFilterTrigger[];
}) {
  if (!input.message.from) return;
  const sourceChatId = String(input.message.chat.id);
  const draft: FilterBuilderDraft = input.initialTriggers?.length
    ? {
        sourceChatId,
        targetChatId: input.targetChatId,
        step: 'kind',
        triggers: input.initialTriggers
      }
    : { sourceChatId, targetChatId: input.targetChatId, step: 'menu' };
  await writeDraft(draft, input.message.from.id);
  await sendStep(
    sourceChatId,
    input.initialTriggers?.length
      ? `⚙️ Filter builder\n\nTrigger added: ${input.initialTriggers.map(triggerLabel).join(', ')}\n\nNow choose what the bot should send.`
      : '⚙️ Filter builder\n\nCreate an automatic reply without remembering command syntax. You can use one word, a full sentence, or several phrases.',
    input.targetChatId,
    input.initialTriggers?.length ? kindKeyboard() : menuKeyboard()
  );
}

function mediaPrompt(kind: 'media' | 'media_text') {
  return kind === 'media'
    ? 'Send the photo, sticker, animation, video, document, audio, voice, or video note the bot should reply with.'
    : 'Send the media now. Add the reply text as its caption, or send the text in the next message.';
}

async function showManageMenu(draft: FilterBuilderDraft) {
  const values = await groupHelpConfig(draft.targetChatId);
  const filters = parseGroupHelpFilters(values.telegramGroupHelpCustomReplies || '').filters;
  const visible = filters.slice(0, 30);
  const rows = visible.map((filter, index) => [
    button(
      `⚙️ ${triggerLabel(filter.triggers[0]).slice(0, 45)}${filter.triggers.length > 1 ? ` +${filter.triggers.length - 1}` : ''}`,
      `${PREFIX}select:${index}`,
      'primary'
    )
  ]);
  await sendStep(
    draft.sourceChatId,
    filters.length
      ? `Active filters: ${filters.length}\n\nSelect a filter to view, edit, or remove it. Nothing is deleted until you confirm.${filters.length > visible.length ? '\n\nShowing the first 30 filters.' : ''}`
      : 'No filters are active yet.',
    draft.targetChatId,
    {
      inline_keyboard: [...rows, [button('← Back', `${PREFIX}menu`, 'primary')]]
    }
  );
}

export async function handleGroupHelpFilterBuilderCallback(update: CommunityTelegramUpdate) {
  const callback = update.callback_query;
  if (!callback?.message || !callback.data?.startsWith(PREFIX)) return false;
  const sourceChatId = String(callback.message.chat.id);
  const draft = await readDraft(sourceChatId, callback.from.id);
  if (!draft) {
    await answerCommunityCallback(
      GROUP_HELP_BOT_SLUG,
      callback.id,
      'This filter editor expired. Send /filter to start again.'
    );
    return true;
  }
  const actorMessage = { ...callback.message, from: callback.from, text: '/filter' };
  if (!(await canManage(draft, actorMessage))) {
    await answerCommunityCallback(
      GROUP_HELP_BOT_SLUG,
      callback.id,
      'You no longer have permission to manage filters.'
    );
    return true;
  }
  const action = callback.data.slice(PREFIX.length);
  if (action === 'cancel') {
    await clearDraft(sourceChatId, callback.from.id);
    await editCommunityReplyMarkup(GROUP_HELP_BOT_SLUG, sourceChatId, callback.message.message_id, {
      inline_keyboard: []
    }).catch(() => null);
    await answerCommunityCallback(GROUP_HELP_BOT_SLUG, callback.id, 'Filter editor closed.');
    return true;
  }
  if (action === 'menu') {
    await writeDraft({ ...draft, step: 'menu', removeKeys: undefined }, callback.from.id);
    await sendStep(sourceChatId, 'What would you like to do?', draft.targetChatId, menuKeyboard());
  } else if (action === 'add') {
    await writeDraft(
      {
        sourceChatId,
        targetChatId: draft.targetChatId,
        step: 'triggers'
      },
      callback.from.id
    );
    await sendStep(
      sourceChatId,
      'Step 1 of 3 — Send the word or sentence that should trigger the reply.\n\nFor several alternatives, separate them with commas or put each on a new line. You can also use exact: or prefix: before a phrase.',
      draft.targetChatId,
      cancelKeyboard(true)
    );
  } else if (action === 'manage') {
    await showManageMenu(draft);
  } else if (action.startsWith('kind:')) {
    if (!draft.triggers?.length) {
      await answerCommunityCallback(GROUP_HELP_BOT_SLUG, callback.id, 'Add trigger words first.');
      return true;
    }
    const kind = action.slice('kind:'.length) as FilterBuilderDraft['responseKind'];
    if (!kind || !['text', 'media', 'media_text'].includes(kind)) return true;
    const step = kind === 'text' ? 'text' : 'media';
    await writeDraft({ ...draft, responseKind: kind, step }, callback.from.id);
    await sendStep(
      sourceChatId,
      kind === 'text'
        ? 'Step 3 of 3 — Send the message the bot should reply with.'
        : `Step 3 of 3 — ${mediaPrompt(kind)}`,
      draft.targetChatId,
      cancelKeyboard(true)
    );
  } else if (action === 'save') {
    const filter = draftFilter(draft);
    if (!filter) {
      await answerCommunityCallback(GROUP_HELP_BOT_SLUG, callback.id, 'The draft is incomplete.');
      return true;
    }
    const values = await groupHelpConfig(draft.targetChatId);
    const definitions = upsertFilterBuilderFilter(
      values.telegramGroupHelpCustomReplies || '',
      filter
    );
    await saveDefinitions(draft.targetChatId, definitions);
    await clearDraft(sourceChatId, callback.from.id);
    await editCommunityReplyMarkup(GROUP_HELP_BOT_SLUG, sourceChatId, callback.message.message_id, {
      inline_keyboard: []
    }).catch(() => null);
    await sendStep(
      sourceChatId,
      `✅ Filter saved for ${filter.triggers.length} trigger${filter.triggers.length === 1 ? '' : 's'}. It is active immediately.`,
      draft.targetChatId,
      { inline_keyboard: [] }
    );
  } else if (action.startsWith('select:')) {
    const index = Number(action.slice('select:'.length));
    const values = await groupHelpConfig(draft.targetChatId);
    const filter = parseGroupHelpFilters(values.telegramGroupHelpCustomReplies || '').filters[
      index
    ];
    if (!filter) {
      await answerCommunityCallback(
        GROUP_HELP_BOT_SLUG,
        callback.id,
        'That filter changed. Refresh the list.'
      );
      return true;
    }
    await sendStep(
      sourceChatId,
      `Filter details\n\nTriggers: ${filter.triggers.map(triggerLabel).join(', ')}\nReply: ${filter.text || `${filter.media?.type || 'media'} only`}\nMedia: ${filter.media?.type || 'none'}`,
      draft.targetChatId,
      {
        inline_keyboard: [
          [button('✏️ Replace response', `${PREFIX}edit:${index}`, 'success')],
          [button('🗑 Remove filter', `${PREFIX}remove:${index}`, 'danger')],
          [button('← Back', `${PREFIX}manage`, 'primary')]
        ]
      }
    );
  } else if (action.startsWith('edit:')) {
    const index = Number(action.slice('edit:'.length));
    const values = await groupHelpConfig(draft.targetChatId);
    const filter = parseGroupHelpFilters(values.telegramGroupHelpCustomReplies || '').filters[
      index
    ];
    if (!filter) {
      await answerCommunityCallback(
        GROUP_HELP_BOT_SLUG,
        callback.id,
        'That filter changed. Refresh the list.'
      );
      return true;
    }
    await writeDraft(
      {
        sourceChatId,
        targetChatId: draft.targetChatId,
        step: 'kind',
        triggers: filter.triggers
      },
      callback.from.id
    );
    await sendStep(
      sourceChatId,
      `Choose the new response type for: ${filter.triggers.map(triggerLabel).join(', ')}`,
      draft.targetChatId,
      kindKeyboard()
    );
  } else if (action.startsWith('remove:')) {
    const index = Number(action.slice('remove:'.length));
    const values = await groupHelpConfig(draft.targetChatId);
    const filter = parseGroupHelpFilters(values.telegramGroupHelpCustomReplies || '').filters[
      index
    ];
    if (!filter) {
      await answerCommunityCallback(
        GROUP_HELP_BOT_SLUG,
        callback.id,
        'That filter changed. Refresh the list.'
      );
      return true;
    }
    const removeKeys = filter.triggers.map(triggerKey);
    await writeDraft({ ...draft, step: 'confirm_remove', removeKeys }, callback.from.id);
    await sendStep(
      sourceChatId,
      `Remove this filter?\n\nTriggers: ${filter.triggers.map(triggerLabel).join(', ')}\nReply: ${filter.text || `${filter.media?.type || 'media'} only`}`,
      draft.targetChatId,
      {
        inline_keyboard: [
          [button('Yes, remove', `${PREFIX}remove_confirm`, 'danger')],
          [button('← Back', `${PREFIX}manage`, 'primary')]
        ]
      }
    );
  } else if (action === 'remove_confirm') {
    if (!draft.removeKeys?.length) return true;
    const values = await groupHelpConfig(draft.targetChatId);
    const current = parseGroupHelpFilters(values.telegramGroupHelpCustomReplies || '');
    const removeKeys = new Set(draft.removeKeys);
    let removed = 0;
    const filters = current.filters
      .map((filter) => ({
        ...filter,
        triggers: filter.triggers.filter((trigger) => {
          const remove = removeKeys.has(triggerKey(trigger));
          if (remove) removed += 1;
          return !remove;
        })
      }))
      .filter((filter) => filter.triggers.length);
    await saveDefinitions(
      draft.targetChatId,
      serializeGroupHelpFilters(filters, current.passthrough)
    );
    await writeDraft({ ...draft, step: 'menu', removeKeys: undefined }, callback.from.id);
    await sendStep(
      sourceChatId,
      removed
        ? `✅ Removed ${removed} trigger${removed === 1 ? '' : 's'}.`
        : 'That filter was already removed.',
      draft.targetChatId,
      menuKeyboard()
    );
  }
  await answerCommunityCallback(GROUP_HELP_BOT_SLUG, callback.id);
  return true;
}

export async function handleGroupHelpFilterBuilderInput(message: CommunityTelegramMessage) {
  if (!message.from) return false;
  const sourceChatId = String(message.chat.id);
  const draft = await readDraft(sourceChatId, message.from.id);
  if (!draft || !['triggers', 'text', 'media', 'media_text'].includes(draft.step)) return false;
  if (!(await canManage(draft, message))) return true;
  if ((message.text || '').trim().toLowerCase() === '/cancel') {
    await clearDraft(sourceChatId, message.from.id);
    await sendStep(sourceChatId, 'Filter editor closed.', draft.targetChatId, {
      inline_keyboard: []
    });
    return true;
  }
  if (draft.step === 'triggers') {
    const triggers = parseFilterBuilderTriggers(message.text || message.caption || '');
    if (!triggers.length) {
      await sendStep(
        sourceChatId,
        'Please send at least one valid word or sentence. Separate alternatives with commas or new lines.',
        draft.targetChatId,
        cancelKeyboard(true)
      );
      return true;
    }
    await writeDraft({ ...draft, step: 'kind', triggers }, message.from.id);
    await sendStep(
      sourceChatId,
      `Step 2 of 3 — Choose the reply type.\n\nTriggers: ${triggers.map(triggerLabel).join(', ')}`,
      draft.targetChatId,
      kindKeyboard()
    );
    return true;
  }
  if (draft.step === 'text' || draft.step === 'media_text') {
    const text = (message.text || message.caption || '').trim();
    const maximum = draft.media ? MAX_MEDIA_CAPTION_LENGTH : MAX_TEXT_LENGTH;
    if (!text || text.length > maximum) {
      await sendStep(
        sourceChatId,
        `Send reply text between 1 and ${maximum} characters.`,
        draft.targetChatId,
        cancelKeyboard(true)
      );
      return true;
    }
    await showPreview({ ...draft, text }, message.from.id);
    return true;
  }
  const media = groupHelpFilterMediaFromMessage(message);
  if (!media) {
    await sendStep(
      sourceChatId,
      mediaPrompt(draft.responseKind === 'media_text' ? 'media_text' : 'media'),
      draft.targetChatId,
      cancelKeyboard(true)
    );
    return true;
  }
  const caption = (message.caption || '').trim();
  if (draft.responseKind === 'media_text' && !caption) {
    await writeDraft({ ...draft, media, step: 'media_text' }, message.from.id);
    await sendStep(
      sourceChatId,
      `Media added (${media.type}). Now send the reply text.`,
      draft.targetChatId,
      cancelKeyboard(true)
    );
    return true;
  }
  if (draft.responseKind === 'media_text' && caption.length > MAX_MEDIA_CAPTION_LENGTH) {
    await sendStep(
      sourceChatId,
      `The media caption is too long. Keep it within ${MAX_MEDIA_CAPTION_LENGTH} characters.`,
      draft.targetChatId,
      cancelKeyboard(true)
    );
    return true;
  }
  await showPreview(
    {
      ...draft,
      media,
      ...(draft.responseKind === 'media_text' && caption ? { text: caption } : {})
    },
    message.from.id
  );
  return true;
}

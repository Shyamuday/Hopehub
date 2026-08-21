import {
  answerCommunityCallback,
  callCommunityTelegramApi,
  editCommunityReplyMarkup,
  sendCommunityMessage
} from './telegram-community-bots.client.js';
import {
  clearCommunityState,
  createCommunitySubmission,
  communitySubmissionLimitReached,
  deleteDraftCommunitySubmission,
  findCommunitySubmission,
  getCommunityState,
  setCommunityState,
  updateCommunitySubmission
} from './telegram-community-bots.store.js';
import type {
  CommunityTelegramUpdate,
  CommunityTelegramUser,
  TelegramKeyboard
} from './telegram-community-bots.types.js';
import {
  controlBoolean,
  controlNumber,
  getTelegramBotControls,
  type TelegramBotControls
} from './telegram-bot-controls.js';
import { configuredUrlButtons } from './telegram-keyboard-config.js';
import {
  COMMUNITY_BOT_SLUGS,
  TELEGRAM_BOT_URLS
} from '../constants/telegram-community-bot.constants.js';
import { prisma } from '../db.js';

const slug = COMMUNITY_BOT_SLUGS.CONFESSION;
const CONFESSION_REVIEWER_TELEGRAM_USER_ID = '7217536617';
const keyOf = (value: string | number) => String(value);
const isCommand = (text: string, command: string) =>
  new RegExp(`^/${command}(?:@[A-Za-z0-9_]+)?(?:\\s|$)`, 'i').test(text.trim());

function confessionRouting(controls: TelegramBotControls) {
  return {
    // Sender identity and the pending text are sensitive. These must never be
    // redirected by a general admin setting to another person or group.
    adminChatId: CONFESSION_REVIEWER_TELEGRAM_USER_ID,
    approvalGroupId: '',
    channelId:
      controls.telegramConfessionChannelId.trim() ||
      process.env.TELEGRAM_CONFESSION_CHANNEL_ID?.trim() ||
      '',
    channelName:
      controls.telegramConfessionChannelName.trim() ||
      process.env.TELEGRAM_CONFESSION_CHANNEL_NAME?.trim() ||
      'Hope Hub Anonymous Confessions',
    channelUrl: controls.telegramConfessionChannelUrl.trim(),
    startNumber: controlNumber(controls.telegramConfessionStartNumber, 1000)
  };
}

const confessionNumber = (serial: bigint, startNumber: number) => Number(serial) + startNumber;

export async function confessionDestinationLabel(target: string, configuredName?: string) {
  const fallback =
    configuredName || (target.startsWith('@') ? target : 'Hope Hub Anonymous Confessions');
  try {
    const chat = await callCommunityTelegramApi<{
      title?: string;
      username?: string;
      first_name?: string;
    }>(slug, 'getChat', { chat_id: target });
    return chat.title || (chat.username ? `@${chat.username}` : chat.first_name) || fallback;
  } catch {
    return fallback;
  }
}

async function confessionChannelUrl(target: string, configuredUrl: string) {
  if (/^https:\/\//i.test(configuredUrl)) return configuredUrl;
  if (target.startsWith('@')) return `https://t.me/${target.slice(1)}`;
  try {
    const chat = await callCommunityTelegramApi<{ username?: string }>(slug, 'getChat', {
      chat_id: target
    });
    return chat.username ? `https://t.me/${chat.username}` : '';
  } catch {
    return '';
  }
}

export function publishedConfessionText(input: {
  text: string;
  destinationName: string;
  number?: number;
}) {
  return [
    input.number ? `🕊 Anonymous Confession #${input.number}` : '🕊 Anonymous Confession',
    '',
    input.text,
    '',
    '━━━━━━━━━━━━━━',
    `💙 ${input.destinationName}`
  ].join('\n');
}

export async function publishApprovedConfession(input: {
  text: string;
  serial: bigint;
}): Promise<string[]> {
  const controls = await getTelegramBotControls();
  const routing = confessionRouting(controls);
  if (!routing.channelId) throw new Error('A confession publishing channel is not configured.');

  const number = confessionNumber(input.serial, routing.startNumber);
  const channelName = await confessionDestinationLabel(routing.channelId, routing.channelName);
  await sendCommunityMessage(
    slug,
    routing.channelId,
    publishedConfessionText({ text: input.text, number, destinationName: channelName }),
    {
      reply_markup: {
        inline_keyboard: [
          [
            { text: 'Hope Hub', url: 'https://hopehub.in' },
            { text: 'Write your confession', url: TELEGRAM_BOT_URLS.CONFESSION }
          ]
        ]
      }
    }
  );

  const destinations = [channelName];
  const groupConfigRows = await prisma.siteConfig.findMany({
    where: {
      key: {
        in: [
          'telegramCommunityConfessionsInGroup',
          'telegramGroupHelpGroupChatId',
          'telegramCommunityDefaultTopicId'
        ]
      }
    },
    select: { key: true, value: true }
  });
  const groupConfig = Object.fromEntries(groupConfigRows.map((row) => [row.key, row.value]));
  const groupChatId = groupConfig.telegramGroupHelpGroupChatId?.trim();
  if (groupConfig.telegramCommunityConfessionsInGroup === 'Disabled' || !groupChatId) {
    return destinations;
  }

  try {
    const groupName = await confessionDestinationLabel(groupChatId, 'Hope Hub Community');
    const channelUrl = await confessionChannelUrl(routing.channelId, routing.channelUrl);
    await sendCommunityMessage(
      COMMUNITY_BOT_SLUGS.GROUP_HELP,
      groupChatId,
      publishedConfessionText({ text: input.text, number, destinationName: groupName }),
      {
        message_thread_id: Number(groupConfig.telegramCommunityDefaultTopicId) || undefined,
        reply_markup: channelUrl
          ? {
              inline_keyboard: [
                [
                  { text: 'Read all', url: channelUrl },
                  { text: 'Write yours', url: TELEGRAM_BOT_URLS.CONFESSION }
                ]
              ]
            }
          : {
              inline_keyboard: [
                [{ text: 'Write your confession', url: TELEGRAM_BOT_URLS.CONFESSION }]
              ]
            }
      }
    );
    destinations.push(groupName);
  } catch (error) {
    // A channel publication remains valid even if an optional group mirror is unavailable.
    console.error('Could not mirror approved confession to the Hope Hub group.', error);
  }
  return destinations;
}

function mainKeyboard(controls: TelegramBotControls): TelegramKeyboard {
  const linkButtons = configuredUrlButtons(controls.telegramConfessionMenuLinks, 6);
  const linkRows: TelegramKeyboard['inline_keyboard'] = [];
  for (let index = 0; index < linkButtons.length; index += 2) {
    linkRows.push(linkButtons.slice(index, index + 2));
  }
  return {
    inline_keyboard: [[{ text: 'Send confession', callback_data: 'send_confession' }], ...linkRows]
  };
}

function postConfessionKeyboard(controls: TelegramBotControls): TelegramKeyboard {
  const communityUrl = controls.telegramConfessionCommunityUrl.trim();
  return {
    inline_keyboard: [
      ...(/^https:\/\//i.test(communityUrl)
        ? [[{ text: 'Back to Hope Hub group', url: communityUrl }]]
        : []),
      ...mainKeyboard(controls).inline_keyboard
    ]
  };
}

const cancelKeyboard: TelegramKeyboard = {
  inline_keyboard: [[{ text: 'Cancel', callback_data: 'cancel_confession' }]]
};

async function showStart(chatId: string | number) {
  await clearCommunityState(slug, keyOf(chatId));
  const controls = await getTelegramBotControls();
  await sendCommunityMessage(
    slug,
    chatId,
    `${controls.telegramConfessionWelcomeText}\n\n🔒 Your Telegram name, username, and profile are not published.\n\n⚠️ This bot is not emergency support.\n\nTap Send Confession when you are ready.`,
    { reply_markup: mainKeyboard(controls) }
  );
}

const POSSIBLE_IMMEDIATE_RISK =
  /\b(suicid(?:e|al)|kill myself|end my life|self[- ]?harm|hurt myself|overdose|cannot stay safe|can't stay safe)\b/i;

function isConfessionReviewInbox(chatId: string | number, controls: TelegramBotControls) {
  const routing = confessionRouting(controls);
  return keyOf(chatId) === routing.adminChatId || keyOf(chatId) === routing.approvalGroupId;
}

/** Confession content and sender identity are restricted to this named reviewer. */
export function isConfessionReviewer(user: CommunityTelegramUser | undefined) {
  return String(user?.id || '') === CONFESSION_REVIEWER_TELEGRAM_USER_ID;
}

export async function handleConfessionBotUpdate(update: CommunityTelegramUpdate) {
  const controls = await getTelegramBotControls();
  const routing = confessionRouting(controls);
  const callback = update.callback_query;
  if (callback?.message && callback.data) {
    const chatId = callback.message.chat.id;
    const stateKey = keyOf(chatId);
    const data = callback.data;
    await answerCommunityCallback(slug, callback.id);
    if (data === 'send_confession') {
      await setCommunityState(slug, stateKey, 'writing');
      await sendCommunityMessage(
        slug,
        chatId,
        `📝 *Write your confession*\n\nType what is on your mind below. It will be submitted anonymously.\n\n_Use /cancel anytime._`,
        {
          parse_mode: 'Markdown',
          reply_markup: cancelKeyboard
        }
      );
      return;
    }
    if (data === 'cancel_confession' || data.startsWith('cancel_preview_')) {
      if (data.startsWith('cancel_preview_')) {
        await deleteDraftCommunitySubmission(data.slice('cancel_preview_'.length), stateKey);
      }
      await clearCommunityState(slug, stateKey);
      await sendCommunityMessage(slug, chatId, `❌ Confession cancelled. Nothing was submitted.`, {
        reply_markup: mainKeyboard(controls)
      });
      return;
    }
    if (data.startsWith('submit_')) {
      const confession = await findCommunitySubmission(data.slice('submit_'.length));
      if (
        !confession ||
        confession.bot !== slug ||
        confession.userChatId !== stateKey ||
        confession.status !== 'draft'
      ) {
        await sendCommunityMessage(
          slug,
          chatId,
          '⚠️ This confession expired. Please start again.',
          { reply_markup: mainKeyboard(controls) }
        );
        return;
      }
      const dailyLimit = controlNumber(controls.telegramConfessionDailyLimit, 5);
      if (
        await communitySubmissionLimitReached({
          bot: slug,
          userChatId: stateKey,
          limit: dailyLimit
        })
      ) {
        await deleteDraftCommunitySubmission(confession.reference, stateKey);
        await clearCommunityState(slug, stateKey);
        await sendCommunityMessage(
          slug,
          chatId,
          `You have reached today’s confession limit (${dailyLimit}). Please try again after 24 hours.`,
          { reply_markup: mainKeyboard(controls) }
        );
        return;
      }
      const approvalTarget = routing.approvalGroupId || routing.adminChatId;
      if (!approvalTarget) throw new Error('TELEGRAM_CONFESSION_ADMIN_CHAT_ID is not configured.');
      await updateCommunitySubmission(confession.reference, { status: 'pending' });
      await clearCommunityState(slug, stateKey);
      await sendCommunityMessage(
        slug,
        approvalTarget,
        `${confession.category === 'SAFETY_REVIEW' ? '🚨 POSSIBLE URGENT SAFETY REVIEW\n\n' : ''}🔔 NEW ANONYMOUS CONFESSION\n\n🆔 Confession #${confessionNumber(confession.serial, routing.startNumber)}\n👤 Admin-only sender: ${confession.firstName || 'Telegram user'}${confession.username ? ` (@${confession.username.replace(/^@/, '')})` : ''}\n🔢 Telegram ID: ${confession.userChatId}\n━━━━━━━━━━━━━━\n\n${confession.text}\n\n━━━━━━━━━━━━━━\nSender details above are only for safety and moderation. They will never be published.`,
        {
          reply_markup: {
            inline_keyboard: [
              [
                { text: 'Approve & publish', callback_data: `approve_${confession.reference}` },
                { text: 'Reject', callback_data: `reject_${confession.reference}` }
              ]
            ]
          }
        }
      );
      await sendCommunityMessage(
        slug,
        chatId,
        `💙 *Your confession has been received.*\n\nIt will be reviewed and published anonymously if approved.`,
        {
          parse_mode: 'Markdown',
          reply_markup: postConfessionKeyboard(controls)
        }
      );
      return;
    }
    if (data.startsWith('approve_') || data.startsWith('reject_')) {
      if (!isConfessionReviewInbox(chatId, controls) || !isConfessionReviewer(callback.from)) {
        await answerCommunityCallback(
          slug,
          callback.id,
          'Only the private Confession reviewer can approve or reject submissions.'
        );
        return;
      }
      const approved = data.startsWith('approve_');
      const id = data.slice(approved ? 'approve_'.length : 'reject_'.length);
      const confession = await findCommunitySubmission(id);
      if (!confession || confession.bot !== slug || confession.status !== 'pending') {
        await sendCommunityMessage(slug, chatId, '⚠️ Confession not found or already processed.');
        return;
      }
      if (approved) {
        await publishApprovedConfession({ text: confession.text, serial: confession.serial });
      }
      await updateCommunitySubmission(confession.reference, {
        status: approved ? 'approved' : 'rejected'
      });
      await editCommunityReplyMarkup(slug, chatId, callback.message.message_id, {
        inline_keyboard: [
          [
            {
              text: approved ? 'Approved & published' : 'Rejected',
              callback_data: 'already_processed'
            }
          ]
        ]
      });
      try {
        await sendCommunityMessage(
          slug,
          confession.userChatId,
          approved
            ? '💙 Your confession has been approved and published anonymously.'
            : `Your confession wasn't approved for publication at this time.`,
          {
            reply_markup: postConfessionKeyboard(controls)
          }
        );
      } catch {
        /* A user may block the bot. */
      }
      return;
    }
    if (data === 'already_processed') {
      await answerCommunityCallback(
        slug,
        callback.id,
        'This confession has already been processed.'
      );
    }
    return;
  }

  const message = update.message;
  if (!message?.text || message.chat.type !== 'private') return;
  const chatId = message.chat.id;
  const stateKey = keyOf(chatId);
  const text = message.text.trim();
  if (isCommand(text, 'start')) return showStart(chatId);
  if (isCommand(text, 'cancel')) {
    await clearCommunityState(slug, stateKey);
    await sendCommunityMessage(slug, chatId, '❌ Confession cancelled.', {
      reply_markup: mainKeyboard(controls)
    });
    return;
  }
  if (isCommand(text, 'help')) {
    await sendCommunityMessage(
      slug,
      chatId,
      `*HopeHub Confession Bot — Help*\n\n/start — Welcome\n/cancel — Cancel current confession\n/help — Help`,
      { parse_mode: 'Markdown', reply_markup: mainKeyboard(controls) }
    );
    return;
  }
  if (text.startsWith('/')) return;
  const state = await getCommunityState(slug, stateKey);
  if (!state || state.state !== 'writing') {
    await sendCommunityMessage(
      slug,
      chatId,
      '💙 Tap *Send Confession* below to share anonymously.',
      { parse_mode: 'Markdown', reply_markup: mainKeyboard(controls) }
    );
    return;
  }
  const minCharacters = controlNumber(controls.telegramConfessionMinCharacters, 5);
  const maxCharacters = controlNumber(controls.telegramConfessionMaxCharacters, 4000);
  if (text.length < minCharacters || text.length > maxCharacters) {
    await sendCommunityMessage(
      slug,
      chatId,
      text.length < minCharacters
        ? `Please write at least ${minCharacters} characters. 💙`
        : `Please keep your confession under ${maxCharacters.toLocaleString()} characters.`
    );
    return;
  }
  const needsSafetyReview =
    controlBoolean(controls.telegramConfessionSafetyScreeningEnabled) &&
    POSSIBLE_IMMEDIATE_RISK.test(text);
  if (needsSafetyReview) {
    await sendCommunityMessage(slug, chatId, controls.telegramConfessionSafetyMessage);
  }
  const id = `CONF-${Date.now().toString(36).toUpperCase()}`;
  await createCommunitySubmission({
    reference: id,
    bot: slug,
    userChatId: stateKey,
    firstName: message.from?.first_name || 'Telegram user',
    username: message.from?.username || null,
    category: needsSafetyReview ? 'SAFETY_REVIEW' : null,
    text,
    status: 'draft'
  });
  await setCommunityState(slug, stateKey, 'preview', { confessionId: id });
  await sendCommunityMessage(
    slug,
    chatId,
    `📝 *Preview your confession*\n\n━━━━━━━━━━━━━━\n\n${text}\n\n━━━━━━━━━━━━━━\n\n🔒 This will be submitted *anonymously.*`,
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Submit anonymously', callback_data: `submit_${id}` }],
          [{ text: 'Cancel', callback_data: `cancel_preview_${id}` }]
        ]
      }
    }
  );
}

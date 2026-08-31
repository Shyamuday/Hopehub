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
  recordCommunitySubmissionOwnerReply,
  setCommunityState,
  submissionForGroupMessage,
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
import { withPublicCommunityLinks } from './telegram-public-community-links.js';
import { withCrossCommunityButton } from './telegram-group-help.community-navigation.js';

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

type ConfessionIdentity = {
  reference: string;
  serial: bigint;
  userChatId: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  category: string | null;
  text: string;
  createdAt: Date;
};

function confessionDisplayName(confession: Pick<ConfessionIdentity, 'firstName' | 'lastName'>) {
  return (
    [confession.firstName, confession.lastName].filter(Boolean).join(' ').trim() || 'Telegram user'
  );
}

const CONFESSION_PREVIEW_START =
  /^\s*(?:📝\s*)?\*{0,2}Preview your confession\*{0,2}\s*[\r\n]+\s*[━─—_-]{5,}\s*[\r\n]*/i;
const CONFESSION_PREVIEW_END =
  /[\r\n]*\s*[━─—_-]{5,}\s*[\r\n]+\s*(?:🔒\s*)?This will be submitted\s*\*{0,2}anonymously[.!]?\*{0,2}\s*$/i;

/** Removes bot-generated preview chrome that may be pasted back into a confession. */
export function normalizeConfessionText(value: string) {
  let normalized = value.replace(/\r\n?/g, '\n').trim();
  for (let pass = 0; pass < 5; pass += 1) {
    const previous = normalized;
    normalized = normalized
      .replace(CONFESSION_PREVIEW_START, '')
      .replace(CONFESSION_PREVIEW_END, '')
      .trim();
    if (normalized === previous) break;
  }
  return normalized;
}

export function confessionOwnerReviewText(confession: ConfessionIdentity, startNumber: number) {
  return `${confession.category === 'SAFETY_REVIEW' ? '🚨 POSSIBLE URGENT SAFETY REVIEW\n\n' : ''}🔔 NEW ANONYMOUS CONFESSION

🆔 Confession #${confessionNumber(confession.serial, startNumber)}
🧾 Internal reference: ${confession.reference}
👤 Name: ${confessionDisplayName(confession)}
🔗 Username: ${confession.username ? `@${confession.username.replace(/^@/, '')}` : 'Not set'}
🔢 Telegram ID: ${confession.userChatId}
🕐 Submitted: ${confession.createdAt.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
🛡 Review type: ${confession.category === 'SAFETY_REVIEW' ? 'Possible immediate safety risk' : 'Standard'}
━━━━━━━━━━━━━━

${normalizeConfessionText(confession.text)}

━━━━━━━━━━━━━━
These identity details are visible only to the designated Confession owner for safety, moderation and a private response. They are never published.`;
}

export function confessionPrivateReplyText(input: { text: string; number: number }) {
  return `💙 Private response from HopeHub

Re: Anonymous Confession #${input.number}

━━━━━━━━━━━━━━

${input.text}

━━━━━━━━━━━━━━

This response is private and was sent through the Confession bot. Your identity remains hidden from public confession posts.`;
}

export function confessionRejectionReplyText(input: { text: string; number: number }) {
  return `💙 Update about your confession

Re: Anonymous Confession #${input.number}

Your confession wasn't approved for public posting at this time.

Private review note:
${input.text}

This note is private and was sent through the Confession bot. The reviewer’s identity and your identity remain hidden.`;
}

function confessionReviewKeyboard(
  reference: string,
  processed?: 'approved' | 'approved-pinned' | 'rejected'
) {
  return {
    inline_keyboard: [
      processed
        ? [
            {
              text:
                processed === 'approved-pinned'
                  ? 'Approved, published & pinned'
                  : processed === 'approved'
                    ? 'Approved & published'
                    : 'Rejected',
              callback_data: 'already_processed'
            }
          ]
        : [
            { text: 'Approve & publish', callback_data: `approve_${reference}` },
            { text: 'Publish & pin', callback_data: `approve_pin_${reference}` }
          ],
      ...(processed
        ? []
        : [
            [
              { text: 'Reject', callback_data: `reject_${reference}` },
              {
                text: 'Reject with reply',
                callback_data: `reject_reply_${reference}`
              }
            ]
          ]),
      [{ text: 'Reply privately', callback_data: `reply_confession_${reference}` }]
    ]
  } satisfies TelegramKeyboard;
}

export function confessionApprovalAction(data: string) {
  if (data.startsWith('approve_pin_')) {
    return { approved: true, pin: true, reference: data.slice('approve_pin_'.length) };
  }
  if (data.startsWith('approve_')) {
    return { approved: true, pin: false, reference: data.slice('approve_'.length) };
  }
  if (data.startsWith('reject_') && !data.startsWith('reject_reply_')) {
    return { approved: false, pin: false, reference: data.slice('reject_'.length) };
  }
  return null;
}

async function deliverConfessionOwnerReply(input: {
  confession: ConfessionIdentity;
  text: string;
  controls: TelegramBotControls;
  ownerChatId: string | number;
  ownerReplyToMessageId?: number;
  kind?: 'reply' | 'rejection';
}) {
  const routing = confessionRouting(input.controls);
  const number = confessionNumber(input.confession.serial, routing.startNumber);
  await sendCommunityMessage(
    slug,
    input.confession.userChatId,
    input.kind === 'rejection'
      ? confessionRejectionReplyText({ text: input.text, number })
      : confessionPrivateReplyText({ text: input.text, number }),
    { reply_markup: postConfessionKeyboard(input.controls) }
  );
  try {
    await recordCommunitySubmissionOwnerReply(input.confession.reference);
  } catch (error) {
    // Delivery has already succeeded. Never invite a duplicate retry merely
    // because audit metadata could not be updated.
    console.error('[telegram-confession] Could not record owner reply metadata.', error);
  }
  try {
    await sendCommunityMessage(
      slug,
      input.ownerChatId,
      `✅ ${input.kind === 'rejection' ? 'Rejected and private review note delivered' : 'Private reply delivered'}.\n\nConfession #${number} · ${input.confession.reference}\nRecipient: ${confessionDisplayName(input.confession)}${input.confession.username ? ` (@${input.confession.username.replace(/^@/, '')})` : ''}\nTelegram ID: ${input.confession.userChatId}`,
      { reply_to_message_id: input.ownerReplyToMessageId }
    );
  } catch (error) {
    // The private recipient received the response even if Telegram could not
    // render the owner's acknowledgement message.
    console.error('[telegram-confession] Could not acknowledge an owner reply.', error);
  }
}

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
    normalizeConfessionText(input.text),
    '',
    '━━━━━━━━━━━━━━',
    `💙 ${input.destinationName}`
  ].join('\n');
}

export async function publishApprovedConfession(input: {
  text: string;
  serial: bigint;
  reviewerChatId?: string | number;
  pin?: boolean;
}): Promise<string[]> {
  const controls = await getTelegramBotControls();
  const routing = confessionRouting(controls);
  if (!routing.channelId) throw new Error('A confession publishing channel is not configured.');

  const number = confessionNumber(input.serial, routing.startNumber);
  const channelName = await confessionDestinationLabel(routing.channelId, routing.channelName);
  const channelMessage = await sendCommunityMessage(
    slug,
    routing.channelId,
    publishedConfessionText({ text: input.text, number, destinationName: channelName }),
    {
      reply_markup: withPublicCommunityLinks(
        {
          inline_keyboard: [
            [
              { text: 'Hope Hub', url: 'https://hopehub.in' },
              { text: 'Write your confession', url: TELEGRAM_BOT_URLS.CONFESSION }
            ]
          ]
        },
        controls
      )
    }
  );

  const destinations = [channelName];
  const failedPins: string[] = [];
  if (input.pin) {
    try {
      await callCommunityTelegramApi(slug, 'pinChatMessage', {
        chat_id: routing.channelId,
        message_id: channelMessage.message_id,
        disable_notification: true
      });
    } catch (error) {
      failedPins.push(channelName);
      console.error('[telegram-confession] Could not pin confession channel post.', error);
    }
  }
  const groupConfigRows = await prisma.siteConfig.findMany({
    where: {
      key: {
        in: [
          'telegramCommunityConfessionsInGroup',
          'telegramCommunityConfessionsInOffTopicGroup',
          'telegramGroupHelpGroupChatId',
          'telegramGroupHelpOffTopicGroupChatId',
          'telegramGroupHelpMainGroupUrl',
          'telegramGroupHelpOffTopicGroupUrl',
          'telegramGroupHelpGroupTitle',
          'telegramCommunityDefaultTopicId'
        ]
      }
    },
    select: { key: true, value: true }
  });
  const groupConfig = Object.fromEntries(groupConfigRows.map((row) => [row.key, row.value]));
  const groupChatId = groupConfig.telegramGroupHelpGroupChatId?.trim();
  const offTopicChatId = groupConfig.telegramGroupHelpOffTopicGroupChatId?.trim();
  const channelUrl = await confessionChannelUrl(routing.channelId, routing.channelUrl);
  const groupKeyboard = (targetChatId: string) =>
    withCrossCommunityButton(
      channelUrl
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
          },
      groupConfig,
      targetChatId
    );
  const groupTargets = [
    {
      enabled: groupConfig.telegramCommunityConfessionsInGroup !== 'Disabled',
      chatId: groupChatId,
      fallbackName: 'Hope Hub Community',
      messageThreadId: Number(groupConfig.telegramCommunityDefaultTopicId) || undefined
    },
    {
      enabled: groupConfig.telegramCommunityConfessionsInOffTopicGroup !== 'Disabled',
      chatId: offTopicChatId,
      fallbackName: 'HopeHub Chit-Chat',
      messageThreadId: undefined
    }
  ].filter(
    (target, index, targets) =>
      target.enabled &&
      Boolean(target.chatId) &&
      targets.findIndex((candidate) => candidate.chatId === target.chatId) === index
  );
  const failedDestinations: string[] = [];

  for (const target of groupTargets) {
    const targetChatId = target.chatId!;
    try {
      const groupName = await confessionDestinationLabel(targetChatId, target.fallbackName);
      const sent = await sendCommunityMessage(
        COMMUNITY_BOT_SLUGS.GROUP_HELP,
        targetChatId,
        publishedConfessionText({ text: input.text, number, destinationName: groupName }),
        {
          message_thread_id: target.messageThreadId,
          reply_markup: groupKeyboard(targetChatId)
        }
      );
      destinations.push(groupName);
      if (input.pin) {
        try {
          await callCommunityTelegramApi(COMMUNITY_BOT_SLUGS.GROUP_HELP, 'pinChatMessage', {
            chat_id: targetChatId,
            message_id: sent.message_id,
            disable_notification: true
          });
        } catch (error) {
          failedPins.push(groupName);
          console.error(
            `[telegram-confession] Could not pin approved confession in ${groupName}.`,
            error
          );
        }
      }
    } catch (error) {
      failedDestinations.push(target.fallbackName);
      // Channel publication remains valid if an optional group mirror is unavailable.
      console.error(
        `[telegram-confession] Could not mirror approved confession to ${target.fallbackName}.`,
        error
      );
    }
  }

  if (failedDestinations.length && input.reviewerChatId) {
    try {
      await sendCommunityMessage(
        slug,
        input.reviewerChatId,
        `⚠️ Confession #${number} was published, but mirroring failed for: ${failedDestinations.join(', ')}. Check that the Hope Hub bot is present and allowed to post there.`
      );
    } catch (error) {
      console.error('[telegram-confession] Could not notify reviewer about mirror failure.', error);
    }
  }
  if (failedPins.length && input.reviewerChatId) {
    try {
      await sendCommunityMessage(
        slug,
        input.reviewerChatId,
        `⚠️ Confession #${number} was published, but pinning failed for: ${failedPins.join(', ')}. Check the bot's Pin messages permission.`
      );
    } catch (error) {
      console.error('[telegram-confession] Could not notify reviewer about pin failure.', error);
    }
  }
  return destinations;
}

function mainKeyboard(controls: TelegramBotControls): TelegramKeyboard {
  const linkButtons = configuredUrlButtons(controls.telegramConfessionMenuLinks, 6);
  const linkRows: TelegramKeyboard['inline_keyboard'] = [];
  for (let index = 0; index < linkButtons.length; index += 2) {
    linkRows.push(linkButtons.slice(index, index + 2));
  }
  return withPublicCommunityLinks(
    {
      inline_keyboard: [
        [{ text: 'Send confession', callback_data: 'send_confession' }],
        ...linkRows
      ]
    },
    controls
  )!;
}

function postConfessionKeyboard(controls: TelegramBotControls): TelegramKeyboard {
  const menu = mainKeyboard(controls);
  const mainUrl = controls.telegramGroupHelpMainGroupUrl.trim();
  const offTopicUrl = controls.telegramGroupHelpOffTopicGroupUrl.trim();
  const communityUrls = new Set([mainUrl, offTopicUrl].filter(Boolean));
  const communityButtons = menu.inline_keyboard
    .flat()
    .filter((button) => button.url && communityUrls.has(button.url))
    .map((button) =>
      button.url === mainUrl ? { ...button, text: 'Back to HopeHub group' } : button
    );
  const otherRows = menu.inline_keyboard
    .map((row) => row.filter((button) => !button.url || !communityUrls.has(button.url)))
    .filter((row) => row.length);
  return {
    inline_keyboard: [...(communityButtons.length ? [communityButtons] : []), ...otherRows]
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
    `${controls.telegramConfessionWelcomeText}\n\n🔒 Your Telegram name, username, and profile are never published. Only the designated Confession reviewer can see your account details for safety and moderation, and may reply to you privately through this bot.\n\n⚠️ This bot is not emergency support.\n\nTap Send Confession when you are ready.`,
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
    if (data === 'cancel_confession_reply') {
      if (!isConfessionReviewInbox(chatId, controls) || !isConfessionReviewer(callback.from)) {
        await answerCommunityCallback(slug, callback.id, 'Only the Confession owner can do this.');
        return;
      }
      const activeReply = await getCommunityState(slug, stateKey);
      await clearCommunityState(slug, stateKey);
      await sendCommunityMessage(
        slug,
        chatId,
        activeReply?.state === 'owner_confession_reject_reply'
          ? 'Rejection cancelled. The confession is still pending.'
          : 'Private reply cancelled.'
      );
      return;
    }
    if (data.startsWith('reply_confession_')) {
      if (!isConfessionReviewInbox(chatId, controls) || !isConfessionReviewer(callback.from)) {
        await answerCommunityCallback(
          slug,
          callback.id,
          'Only the private Confession owner can reply.'
        );
        return;
      }
      const reference = data.slice('reply_confession_'.length);
      const confession = await findCommunitySubmission(reference);
      if (!confession || confession.bot !== slug || confession.status === 'draft') {
        await sendCommunityMessage(slug, chatId, '⚠️ Confession not found or unavailable.');
        return;
      }
      await setCommunityState(
        slug,
        stateKey,
        'owner_confession_reply',
        { reference },
        30 * 60 * 1000
      );
      await sendCommunityMessage(
        slug,
        chatId,
        `Write the private reply for Confession #${confessionNumber(confession.serial, routing.startNumber)}.\n\nRecipient: ${confessionDisplayName(confession)}${confession.username ? ` (@${confession.username.replace(/^@/, '')})` : ''}\nTelegram ID: ${confession.userChatId}\n\nYour next message will be delivered privately through this bot.`,
        {
          reply_markup: {
            inline_keyboard: [[{ text: 'Cancel', callback_data: 'cancel_confession_reply' }]]
          }
        }
      );
      return;
    }
    if (data.startsWith('reject_reply_')) {
      if (!isConfessionReviewInbox(chatId, controls) || !isConfessionReviewer(callback.from)) {
        await answerCommunityCallback(
          slug,
          callback.id,
          'Only the private Confession reviewer can reject submissions.'
        );
        return;
      }
      const reference = data.slice('reject_reply_'.length);
      const confession = await findCommunitySubmission(reference);
      if (!confession || confession.bot !== slug || confession.status !== 'pending') {
        await sendCommunityMessage(slug, chatId, '⚠️ Confession not found or already processed.');
        return;
      }
      await setCommunityState(
        slug,
        stateKey,
        'owner_confession_reject_reply',
        { reference, reviewMessageId: callback.message.message_id },
        30 * 60 * 1000
      );
      await sendCommunityMessage(
        slug,
        chatId,
        `Write the private reason for rejecting Confession #${confessionNumber(confession.serial, routing.startNumber)}.\n\nThe confession will be rejected and your next text message will be sent privately to the sender. Your identity will not be shown.`,
        {
          reply_markup: {
            inline_keyboard: [[{ text: 'Cancel', callback_data: 'cancel_confession_reply' }]]
          }
        }
      );
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
      const reviewMessage = await sendCommunityMessage(
        slug,
        approvalTarget,
        confessionOwnerReviewText(confession, routing.startNumber),
        {
          reply_markup: confessionReviewKeyboard(confession.reference)
        }
      );
      await updateCommunitySubmission(confession.reference, {
        groupChatId: keyOf(approvalTarget),
        groupMessageId: reviewMessage.message_id
      });
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
    const approvalAction = confessionApprovalAction(data);
    if (approvalAction) {
      if (!isConfessionReviewInbox(chatId, controls) || !isConfessionReviewer(callback.from)) {
        await answerCommunityCallback(
          slug,
          callback.id,
          'Only the private Confession reviewer can approve or reject submissions.'
        );
        return;
      }
      const { approved, pin, reference } = approvalAction;
      const confession = await findCommunitySubmission(reference);
      if (!confession || confession.bot !== slug || confession.status !== 'pending') {
        await sendCommunityMessage(slug, chatId, '⚠️ Confession not found or already processed.');
        return;
      }
      if (approved) {
        await publishApprovedConfession({
          text: confession.text,
          serial: confession.serial,
          reviewerChatId: chatId,
          pin
        });
      }
      await updateCommunitySubmission(confession.reference, {
        status: approved ? 'approved' : 'rejected'
      });
      await editCommunityReplyMarkup(slug, chatId, callback.message.message_id, {
        ...confessionReviewKeyboard(
          confession.reference,
          approved ? (pin ? 'approved-pinned' : 'approved') : 'rejected'
        )
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
  if (isConfessionReviewInbox(chatId, controls) && isConfessionReviewer(message.from)) {
    const replyState = await getCommunityState<{
      reference?: string;
      reviewMessageId?: number;
    }>(slug, stateKey);
    if (replyState?.state === 'owner_confession_reject_reply' && replyState.payload?.reference) {
      if (isCommand(text, 'cancel')) {
        await clearCommunityState(slug, stateKey);
        await sendCommunityMessage(slug, chatId, 'Rejection cancelled. The confession is pending.');
        return;
      }
      if (text.startsWith('/')) {
        await sendCommunityMessage(
          slug,
          chatId,
          'Write a normal text rejection reason, or use /cancel.'
        );
        return;
      }
      const confession = await findCommunitySubmission(replyState.payload.reference);
      if (!confession || confession.bot !== slug || confession.status !== 'pending') {
        await clearCommunityState(slug, stateKey);
        await sendCommunityMessage(slug, chatId, '⚠️ Confession not found or already processed.');
        return;
      }

      await updateCommunitySubmission(confession.reference, { status: 'rejected' });
      if (replyState.payload.reviewMessageId) {
        try {
          await editCommunityReplyMarkup(slug, chatId, replyState.payload.reviewMessageId, {
            ...confessionReviewKeyboard(confession.reference, 'rejected')
          });
        } catch (error) {
          console.error('[telegram-confession] Could not update rejected review markup.', error);
        }
      }
      try {
        await deliverConfessionOwnerReply({
          confession,
          text,
          controls,
          ownerChatId: chatId,
          ownerReplyToMessageId: message.message_id,
          kind: 'rejection'
        });
      } catch {
        await sendCommunityMessage(
          slug,
          chatId,
          '⚠️ Confession rejected, but the private reason could not be delivered. The user may have blocked the bot.',
          { reply_to_message_id: message.message_id }
        );
      } finally {
        await clearCommunityState(slug, stateKey);
      }
      return;
    }
    if (replyState?.state === 'owner_confession_reply' && replyState.payload?.reference) {
      if (isCommand(text, 'cancel')) {
        await clearCommunityState(slug, stateKey);
        await sendCommunityMessage(slug, chatId, 'Private reply cancelled.');
        return;
      }
      if (text.startsWith('/')) {
        await sendCommunityMessage(
          slug,
          chatId,
          'Write a normal text message to deliver it, or use /cancel.'
        );
        return;
      }
      const confession = await findCommunitySubmission(replyState.payload.reference);
      if (!confession || confession.bot !== slug || confession.status === 'draft') {
        await clearCommunityState(slug, stateKey);
        await sendCommunityMessage(slug, chatId, '⚠️ Confession not found or unavailable.');
        return;
      }
      try {
        await deliverConfessionOwnerReply({
          confession,
          text,
          controls,
          ownerChatId: chatId,
          ownerReplyToMessageId: message.message_id
        });
        await clearCommunityState(slug, stateKey);
      } catch {
        await sendCommunityMessage(
          slug,
          chatId,
          '⚠️ Reply could not be delivered. The user may have blocked the bot. Your reply mode is still open; use /cancel or try again.',
          { reply_to_message_id: message.message_id }
        );
      }
      return;
    }

    if (message.reply_to_message && !text.startsWith('/')) {
      const confession = await submissionForGroupMessage(
        slug,
        stateKey,
        message.reply_to_message.message_id
      );
      if (confession && confession.status !== 'draft') {
        try {
          await deliverConfessionOwnerReply({
            confession,
            text,
            controls,
            ownerChatId: chatId,
            ownerReplyToMessageId: message.message_id
          });
        } catch {
          await sendCommunityMessage(
            slug,
            chatId,
            '⚠️ Reply could not be delivered. The user may have blocked the bot.',
            { reply_to_message_id: message.message_id }
          );
        }
        return;
      }
    }
  }
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
  const confessionText = normalizeConfessionText(text);
  const minCharacters = controlNumber(controls.telegramConfessionMinCharacters, 5);
  const maxCharacters = controlNumber(controls.telegramConfessionMaxCharacters, 4000);
  if (confessionText.length < minCharacters || confessionText.length > maxCharacters) {
    await sendCommunityMessage(
      slug,
      chatId,
      confessionText.length < minCharacters
        ? `Please write at least ${minCharacters} characters. 💙`
        : `Please keep your confession under ${maxCharacters.toLocaleString()} characters.`
    );
    return;
  }
  const needsSafetyReview =
    controlBoolean(controls.telegramConfessionSafetyScreeningEnabled) &&
    POSSIBLE_IMMEDIATE_RISK.test(confessionText);
  if (needsSafetyReview) {
    await sendCommunityMessage(slug, chatId, controls.telegramConfessionSafetyMessage);
  }
  const id = `CONF-${Date.now().toString(36).toUpperCase()}`;
  await createCommunitySubmission({
    reference: id,
    bot: slug,
    userChatId: stateKey,
    firstName: message.from?.first_name || 'Telegram user',
    lastName: message.from?.last_name || null,
    username: message.from?.username || null,
    category: needsSafetyReview ? 'SAFETY_REVIEW' : null,
    text: confessionText,
    status: 'draft'
  });
  await setCommunityState(slug, stateKey, 'preview', { confessionId: id });
  await sendCommunityMessage(
    slug,
    chatId,
    `📝 *Preview your confession*\n\n━━━━━━━━━━━━━━\n\n${confessionText}\n\n━━━━━━━━━━━━━━\n\n🔒 This will be submitted *anonymously.*`,
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

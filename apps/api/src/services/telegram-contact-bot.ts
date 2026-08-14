import { answerCommunityCallback, sendCommunityMessage } from './telegram-community-bots.client.js';
import {
  clearCommunityState,
  communitySubmissionLimitReached,
  createCommunitySubmission,
  deleteDraftCommunitySubmission,
  findCommunitySubmission,
  getCommunityState,
  latestCommunitySubmission,
  setCommunityState,
  submissionForGroupMessage,
  updateCommunitySubmission
} from './telegram-community-bots.store.js';
import type { CommunityTelegramUpdate, TelegramKeyboard } from './telegram-community-bots.types.js';
import { controlNumber, getTelegramBotControls } from './telegram-bot-controls.js';

const slug = 'contact' as const;
const supportGroupId = () => process.env.TELEGRAM_CONTACT_SUPPORT_GROUP_ID?.trim() || '';

type ContactState = { state: 'writing'; category: string } | { state: 'preview'; ticketId: string };

const categoryLabels: Record<string, string> = {
  cat_suggestion: '💡 Suggestion',
  cat_complaint: '🚨 Complaint',
  cat_enquiry: '🙋 General Enquiry',
  cat_partnership: '🤝 Partnership / Collaboration',
  cat_bug: '🐛 Bug Report'
};
const mainKeyboard: TelegramKeyboard = {
  inline_keyboard: [
    [
      { text: '💡 Suggestion', callback_data: 'cat_suggestion' },
      { text: '🚨 Complaint', callback_data: 'cat_complaint' }
    ],
    [
      { text: '🙋 General Enquiry', callback_data: 'cat_enquiry' },
      { text: '🐛 Report a Bug', callback_data: 'cat_bug' }
    ],
    [{ text: '🤝 Partnership', callback_data: 'cat_partnership' }],
    [
      { text: '🩷 Confession Bot', url: 'https://t.me/Hopehubconfessionbot' },
      { text: '💙 HopeHub', url: 'https://hopehub.in' }
    ]
  ]
};
const cancelKeyboard: TelegramKeyboard = {
  inline_keyboard: [[{ text: '🚫 Cancel', callback_data: 'cancel' }]]
};
const keyOf = (value: string | number) => String(value);
const isCommand = (text: string, command: string) =>
  new RegExp(`^/${command}(?:@[A-Za-z0-9_]+)?(?:\\s|$)`, 'i').test(text.trim());

async function showStart(chatId: string | number) {
  await clearCommunityState(slug, keyOf(chatId));
  const controls = await getTelegramBotControls();
  await sendCommunityMessage(
    slug,
    chatId,
    `${controls.telegramContactWelcomeText}\n\nChoose what you would like to contact us about.`,
    { reply_markup: mainKeyboard }
  );
}

export async function handleContactBotUpdate(update: CommunityTelegramUpdate) {
  const callback = update.callback_query;
  if (callback?.message && callback.data) {
    const chatId = callback.message.chat.id;
    const stateKey = keyOf(chatId);
    const data = callback.data;
    await answerCommunityCallback(slug, callback.id);
    if (data === 'cancel') {
      await clearCommunityState(slug, stateKey);
      await sendCommunityMessage(
        slug,
        chatId,
        '🚫 Cancelled. Tap a category below to start again.',
        {
          reply_markup: mainKeyboard
        }
      );
      return;
    }
    if (data.startsWith('cat_')) {
      await setCommunityState(slug, stateKey, 'writing', { category: data });
      await sendCommunityMessage(
        slug,
        chatId,
        `${categoryLabels[data] || 'Message'}\n\n✍️ *Please type your message below.*\n\nBe as detailed as possible.\n\n_Use /cancel to go back._`,
        { parse_mode: 'Markdown', reply_markup: cancelKeyboard }
      );
      return;
    }
    if (data.startsWith('confirm_')) {
      const ticketId = data.slice('confirm_'.length);
      const ticket = await findCommunitySubmission(ticketId);
      if (
        !ticket ||
        ticket.bot !== slug ||
        ticket.userChatId !== stateKey ||
        ticket.status !== 'draft'
      ) {
        await sendCommunityMessage(slug, chatId, '⚠️ Message expired. Please start again.', {
          reply_markup: mainKeyboard
        });
        return;
      }
      const controls = await getTelegramBotControls();
      const dailyLimit = controlNumber(controls.telegramContactDailyLimit, 10);
      if (
        await communitySubmissionLimitReached({
          bot: slug,
          userChatId: stateKey,
          limit: dailyLimit
        })
      ) {
        await deleteDraftCommunitySubmission(ticket.reference, stateKey);
        await clearCommunityState(slug, stateKey);
        await sendCommunityMessage(
          slug,
          chatId,
          `You have reached today’s contact limit (${dailyLimit}). Please try again after 24 hours.`,
          { reply_markup: mainKeyboard }
        );
        return;
      }
      const groupId = supportGroupId();
      if (!groupId) throw new Error('TELEGRAM_CONTACT_SUPPORT_GROUP_ID is not configured.');
      await clearCommunityState(slug, stateKey);
      const sent = await sendCommunityMessage(
        slug,
        groupId,
        `📬 *New Message — ${categoryLabels[ticket.category || ''] || ticket.category}*\n\n🆔 ${ticket.reference}\n👤 From: ${ticket.firstName || 'Telegram user'}${ticket.username ? ` (${ticket.username})` : ''}\n🕐 ${ticket.createdAt.toLocaleString()}\n━━━━━━━━━━━━━━\n\n${ticket.text}\n\n━━━━━━━━━━━━━━\n_Reply to this message in the group to respond to the user._`,
        { parse_mode: 'Markdown' }
      );
      await updateCommunitySubmission(ticketId, {
        status: 'open',
        groupChatId: keyOf(groupId),
        groupMessageId: sent.message_id
      });
      await sendCommunityMessage(
        slug,
        chatId,
        `✅ *Message sent successfully!*\n\n🆔 Reference: *${ticket.reference}*\n\nOur team will get back to you as soon as possible. 💙\n\nUse /status to check anytime.`,
        { parse_mode: 'Markdown', reply_markup: mainKeyboard }
      );
      return;
    }
    if (data.startsWith('cancelsubmit_')) {
      const ticketId = data.slice('cancelsubmit_'.length);
      await deleteDraftCommunitySubmission(ticketId, stateKey);
      await clearCommunityState(slug, stateKey);
      await sendCommunityMessage(
        slug,
        chatId,
        '🚫 Message cancelled. Tap a category to start again.',
        {
          reply_markup: mainKeyboard
        }
      );
    }
    return;
  }

  const message = update.message;
  if (!message?.text) return;
  const chatId = message.chat.id;
  const text = message.text.trim();
  const stateKey = keyOf(chatId);

  if (keyOf(chatId) === supportGroupId() && message.reply_to_message) {
    const ticket = await submissionForGroupMessage(
      slug,
      stateKey,
      message.reply_to_message.message_id
    );
    if (!ticket || !text || text.startsWith('/')) return;
    try {
      await sendCommunityMessage(
        slug,
        ticket.userChatId,
        `💙 *Response from HopeHub Team*\n\n📂 Re: ${categoryLabels[ticket.category || ''] || ticket.category} (${ticket.reference})\n\n━━━━━━━━━━━━━━\n\n${text}\n\n━━━━━━━━━━━━━━\n\n_Use a category below if you need a follow-up._`,
        { parse_mode: 'Markdown', reply_markup: mainKeyboard }
      );
      await updateCommunitySubmission(ticket.reference, { status: 'replied' });
      await sendCommunityMessage(
        slug,
        chatId,
        `✅ Reply delivered to user for ${ticket.reference}.`,
        {
          reply_to_message_id: message.message_id
        }
      );
    } catch {
      await sendCommunityMessage(
        slug,
        chatId,
        '⚠️ Could not deliver reply; the user may have blocked the bot.',
        {
          reply_to_message_id: message.message_id
        }
      );
    }
    return;
  }
  if (message.chat.type !== 'private') return;
  if (isCommand(text, 'start')) return showStart(chatId);
  if (isCommand(text, 'help')) {
    await sendCommunityMessage(
      slug,
      chatId,
      `*HopeHub Contact Bot — Help*\n\n/start — Main menu\n/cancel — Cancel current message\n/status — Check your last message`,
      {
        parse_mode: 'Markdown',
        reply_markup: mainKeyboard
      }
    );
    return;
  }
  if (isCommand(text, 'cancel')) {
    await clearCommunityState(slug, stateKey);
    await sendCommunityMessage(slug, chatId, '🚫 Cancelled. Tap a category to start again.', {
      reply_markup: mainKeyboard
    });
    return;
  }
  if (isCommand(text, 'status')) {
    const latest = await latestCommunitySubmission(slug, stateKey);
    await sendCommunityMessage(
      slug,
      chatId,
      latest
        ? `*Your latest message*\n\n🆔 ${latest.reference}\n📂 ${categoryLabels[latest.category || ''] || latest.category}\nStatus: ${latest.status}\n\n_${latest.text.slice(0, 100)}${latest.text.length > 100 ? '…' : ''}_`
        : `You haven't submitted any messages yet.`,
      { parse_mode: 'Markdown', reply_markup: mainKeyboard }
    );
    return;
  }
  if (text.startsWith('/')) return;
  const storedState = await getCommunityState<{ category?: string }>(slug, stateKey);
  const state: ContactState | null =
    storedState?.state === 'writing' && storedState.payload?.category
      ? { state: 'writing', category: storedState.payload.category }
      : null;
  if (!state) {
    await sendCommunityMessage(slug, chatId, '💙 Tap a category below to send us a message.', {
      reply_markup: mainKeyboard
    });
    return;
  }
  const controls = await getTelegramBotControls();
  const minCharacters = controlNumber(controls.telegramContactMinCharacters, 5);
  const maxCharacters = controlNumber(controls.telegramContactMaxCharacters, 4000);
  if (text.length < minCharacters || text.length > maxCharacters) {
    await sendCommunityMessage(
      slug,
      chatId,
      text.length < minCharacters
        ? `Please write at least ${minCharacters} characters so we can help properly. 💙`
        : `Please keep your message under ${maxCharacters.toLocaleString()} characters.`
    );
    return;
  }
  const ticketId = `TKT-${Date.now().toString(36).toUpperCase()}`;
  await createCommunitySubmission({
    reference: ticketId,
    bot: slug,
    userChatId: stateKey,
    firstName: message.from?.first_name || 'Telegram user',
    username: message.from?.username ? `@${message.from.username}` : null,
    category: state.category,
    text,
    status: 'draft'
  });
  await setCommunityState(slug, stateKey, 'preview', { ticketId });
  await sendCommunityMessage(
    slug,
    chatId,
    `📋 *Preview your message*\n\n📂 Category: ${categoryLabels[state.category]}\n━━━━━━━━━━━━━━\n\n${text}\n\n━━━━━━━━━━━━━━\n\nReady to send?`,
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '✅ Send Message', callback_data: `confirm_${ticketId}` }],
          [{ text: '🚫 Cancel', callback_data: `cancelsubmit_${ticketId}` }]
        ]
      }
    }
  );
}

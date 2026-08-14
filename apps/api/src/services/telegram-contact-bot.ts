import { answerCommunityCallback, sendCommunityMessage } from './telegram-community-bots.client.js';
import type { CommunityTelegramUpdate, TelegramKeyboard } from './telegram-community-bots.types.js';

const slug = 'contact' as const;
const supportGroupId = () => process.env.TELEGRAM_CONTACT_SUPPORT_GROUP_ID?.trim() || '';

type ContactState = { state: 'writing'; category: string } | { state: 'preview'; ticketId: string };
type ContactTicket = {
  id: string;
  userId: string | number;
  firstName: string;
  username: string | null;
  category: string;
  text: string;
  status: 'draft' | 'open' | 'replied';
  createdAt: number;
  groupMessageId?: number;
};

const userStates = new Map<string, ContactState>();
const tickets = new Map<string, ContactTicket>();
const groupMessageToTicket = new Map<number, string>();
let ticketCounter = 1000;

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
  userStates.delete(keyOf(chatId));
  await sendCommunityMessage(
    slug,
    chatId,
    `👋 *Welcome to HopeHub Support*\n\nWe're here to help. Choose a category below and our team will respond as soon as possible.\n\n🌐 *Website:* [hopehub.in](https://hopehub.in)\n🩷 *Confession Bot:* [t.me/Hopehubconfessionbot](https://t.me/Hopehubconfessionbot)\n\n💙 *What would you like to contact us about?*`,
    { parse_mode: 'Markdown', reply_markup: mainKeyboard }
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
      userStates.delete(stateKey);
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
      userStates.set(stateKey, { state: 'writing', category: data });
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
      const ticket = tickets.get(ticketId);
      if (!ticket) {
        await sendCommunityMessage(slug, chatId, '⚠️ Message expired. Please start again.', {
          reply_markup: mainKeyboard
        });
        return;
      }
      const groupId = supportGroupId();
      if (!groupId) throw new Error('TELEGRAM_CONTACT_SUPPORT_GROUP_ID is not configured.');
      userStates.delete(stateKey);
      ticket.status = 'open';
      const sent = await sendCommunityMessage(
        slug,
        groupId,
        `📬 *New Message — ${categoryLabels[ticket.category] || ticket.category}*\n\n🆔 ${ticket.id}\n👤 From: ${ticket.firstName}${ticket.username ? ` (${ticket.username})` : ''}\n🕐 ${new Date(ticket.createdAt).toLocaleString()}\n━━━━━━━━━━━━━━\n\n${ticket.text}\n\n━━━━━━━━━━━━━━\n_Reply to this message in the group to respond to the user._`,
        { parse_mode: 'Markdown' }
      );
      ticket.groupMessageId = sent.message_id;
      groupMessageToTicket.set(sent.message_id, ticketId);
      await sendCommunityMessage(
        slug,
        chatId,
        `✅ *Message sent successfully!*\n\n🆔 Reference: *${ticket.id}*\n\nOur team will get back to you as soon as possible. 💙\n\nUse /status to check anytime.`,
        { parse_mode: 'Markdown', reply_markup: mainKeyboard }
      );
      return;
    }
    if (data.startsWith('cancelsubmit_')) {
      const ticketId = data.slice('cancelsubmit_'.length);
      tickets.delete(ticketId);
      userStates.delete(stateKey);
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
    const ticketId = groupMessageToTicket.get(message.reply_to_message.message_id);
    const ticket = ticketId ? tickets.get(ticketId) : undefined;
    if (!ticket || !text || text.startsWith('/')) return;
    try {
      await sendCommunityMessage(
        slug,
        ticket.userId,
        `💙 *Response from HopeHub Team*\n\n📂 Re: ${categoryLabels[ticket.category] || ticket.category} (${ticket.id})\n\n━━━━━━━━━━━━━━\n\n${text}\n\n━━━━━━━━━━━━━━\n\n_Use a category below if you need a follow-up._`,
        { parse_mode: 'Markdown', reply_markup: mainKeyboard }
      );
      ticket.status = 'replied';
      await sendCommunityMessage(slug, chatId, `✅ Reply delivered to user for ${ticket.id}.`, {
        reply_to_message_id: message.message_id
      });
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
    userStates.delete(stateKey);
    await sendCommunityMessage(slug, chatId, '🚫 Cancelled. Tap a category to start again.', {
      reply_markup: mainKeyboard
    });
    return;
  }
  if (isCommand(text, 'status')) {
    const latest = [...tickets.values()]
      .filter((ticket) => keyOf(ticket.userId) === stateKey)
      .sort((a, b) => b.createdAt - a.createdAt)[0];
    await sendCommunityMessage(
      slug,
      chatId,
      latest
        ? `*Your latest message*\n\n🆔 ${latest.id}\n📂 ${categoryLabels[latest.category]}\nStatus: ${latest.status}\n\n_${latest.text.slice(0, 100)}${latest.text.length > 100 ? '…' : ''}_`
        : `You haven't submitted any messages yet.`,
      { parse_mode: 'Markdown', reply_markup: mainKeyboard }
    );
    return;
  }
  if (text.startsWith('/')) return;
  const state = userStates.get(stateKey);
  if (!state || state.state !== 'writing') {
    await sendCommunityMessage(slug, chatId, '💙 Tap a category below to send us a message.', {
      reply_markup: mainKeyboard
    });
    return;
  }
  if (text.length < 5 || text.length > 4000) {
    await sendCommunityMessage(
      slug,
      chatId,
      text.length < 5
        ? 'Please write a little more so we can help properly. 💙'
        : 'Please keep your message under 4,000 characters.'
    );
    return;
  }
  const ticketId = `TKT-${++ticketCounter}`;
  const ticket: ContactTicket = {
    id: ticketId,
    userId: chatId,
    firstName: message.from?.first_name || 'Telegram user',
    username: message.from?.username ? `@${message.from.username}` : null,
    category: state.category,
    text,
    status: 'draft',
    createdAt: Date.now()
  };
  tickets.set(ticketId, ticket);
  userStates.set(stateKey, { state: 'preview', ticketId });
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

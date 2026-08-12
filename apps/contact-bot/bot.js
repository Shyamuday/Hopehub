import 'dotenv/config';
import TelegramBot from 'node-telegram-bot-api';

// ─── Config ───────────────────────────────────────────────────────────────────

const token = process.env.BOT_TOKEN;
const adminChatId = process.env.ADMIN_CHAT_ID;
const supportGroupId = process.env.SUPPORT_GROUP_ID;

if (!token) throw new Error('BOT_TOKEN is missing in .env');
if (!adminChatId) throw new Error('ADMIN_CHAT_ID is missing in .env');
if (!supportGroupId) throw new Error('SUPPORT_GROUP_ID is missing in .env');

const bot = new TelegramBot(token, {
  polling: {
    interval: 1000,
    autoStart: true,
    params: {
      timeout: 10,
      allowed_updates: JSON.stringify(['message', 'callback_query', 'my_chat_member'])
    }
  }
});

// ─── State ────────────────────────────────────────────────────────────────────

// Map<userId, { state, category }>
const userStates = new Map();

// Map<ticketId, { userId, username, firstName, category, text, status, createdAt }>
const tickets = new Map();

// Map<groupMessageId, ticketId> — to match replies in group back to user
const groupMsgToTicket = new Map();

let ticketCounter = 1000;

// ─── Keyboards ────────────────────────────────────────────────────────────────

const mainKeyboard = {
  reply_markup: {
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
  }
};

const cancelKeyboard = {
  reply_markup: {
    inline_keyboard: [[{ text: '🚫 Cancel', callback_data: 'cancel' }]]
  }
};

const categoryLabels = {
  cat_suggestion: '💡 Suggestion',
  cat_complaint: '🚨 Complaint',
  cat_enquiry: '🙋 General Enquiry',
  cat_partnership: '🤝 Partnership / Collaboration',
  cat_bug: '🐛 Bug Report'
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeTicketId() {
  return `TKT-${++ticketCounter}`;
}

// ─── /start ───────────────────────────────────────────────────────────────────

bot.onText(/^\/start$/, async (msg) => {
  const chatId = msg.chat.id;
  userStates.delete(chatId);

  await bot.sendMessage(
    chatId,
    `👋 *Welcome to HopeHub Support*\n\n` +
      `We're here to help! Choose a category below and we'll get back to you as soon as possible.\n\n` +
      `🌐 *Website:* [hopehub.in](https://hopehub.in)\n` +
      `🩷 *Confession Bot:* [t.me/Hopehubconfessionbot](https://t.me/Hopehubconfessionbot)\n\n` +
      `💙 *What would you like to contact us about?*`,
    { parse_mode: 'Markdown', ...mainKeyboard }
  );
});

// ─── /help ────────────────────────────────────────────────────────────────────

bot.onText(/^\/help$/, async (msg) => {
  const chatId = msg.chat.id;
  await bot.sendMessage(
    chatId,
    `*HopeHub Contact Bot — Help*\n\n` +
      `/start — Show the main menu\n` +
      `/cancel — Cancel current message\n` +
      `/status — Check status of your last message\n\n` +
      `Select a category and type your message. Our team will respond as soon as possible. 💙`,
    { parse_mode: 'Markdown', ...mainKeyboard }
  );
});

// ─── /cancel ──────────────────────────────────────────────────────────────────

bot.onText(/^\/cancel$/, async (msg) => {
  const chatId = msg.chat.id;
  userStates.delete(chatId);
  await bot.sendMessage(
    chatId,
    '🚫 Cancelled.\n\nTap a category below to start again.',
    mainKeyboard
  );
});

// ─── /status ──────────────────────────────────────────────────────────────────

bot.onText(/^\/status$/, async (msg) => {
  const chatId = msg.chat.id;
  // Find latest ticket for this user
  const userTickets = [...tickets.values()]
    .filter((t) => t.userId === chatId)
    .sort((a, b) => b.createdAt - a.createdAt);

  if (!userTickets.length) {
    await bot.sendMessage(
      chatId,
      `You haven't submitted any messages yet.\n\nTap below to contact us. 💙`,
      mainKeyboard
    );
    return;
  }

  const latest = userTickets[0];
  const statusEmoji = latest.status === 'open' ? '🟡' : latest.status === 'replied' ? '✅' : '⚪';

  await bot.sendMessage(
    chatId,
    `*Your latest message*\n\n` +
      `🆔 ${latest.id}\n` +
      `📂 ${categoryLabels[latest.category] || latest.category}\n` +
      `${statusEmoji} Status: ${latest.status}\n` +
      `🕐 Sent: ${new Date(latest.createdAt).toLocaleString()}\n\n` +
      `_"${latest.text.substring(0, 100)}${latest.text.length > 100 ? '...' : ''}"_`,
    { parse_mode: 'Markdown', ...mainKeyboard }
  );
});

// ─── Callback queries ─────────────────────────────────────────────────────────

bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;

  await bot.answerCallbackQuery(query.id);

  // ── Cancel ────────────────────────────────────────────────────────────────

  if (data === 'cancel') {
    userStates.delete(chatId);
    await bot.sendMessage(
      chatId,
      '🚫 Cancelled. Tap a category below to start again.',
      mainKeyboard
    );
    return;
  }

  // ── Category selected ─────────────────────────────────────────────────────

  if (data.startsWith('cat_')) {
    const label = categoryLabels[data] || 'Message';
    userStates.set(chatId, { state: 'writing', category: data });

    await bot.sendMessage(
      chatId,
      `${label}\n\n` +
        `✍️ *Please type your message below.*\n\n` +
        `Be as detailed as possible — our team will review and respond.\n\n` +
        `_Use /cancel to go back._`,
      { parse_mode: 'Markdown', ...cancelKeyboard }
    );
    return;
  }

  // ── Confirm submit ────────────────────────────────────────────────────────

  if (data.startsWith('confirm_')) {
    const ticketId = data.replace('confirm_', '');
    const ticket = tickets.get(ticketId);

    if (!ticket) {
      await bot.sendMessage(chatId, '⚠️ Message expired. Please start again.', mainKeyboard);
      return;
    }

    userStates.delete(chatId);
    ticket.status = 'open';

    // Forward to support group
    const groupMsg =
      `📬 *New Message — ${categoryLabels[ticket.category] || ticket.category}*\n\n` +
      `🆔 ${ticket.id}\n` +
      `👤 From: ${ticket.firstName}${ticket.username ? ` (${ticket.username})` : ''}\n` +
      `🕐 ${new Date(ticket.createdAt).toLocaleString()}\n` +
      `━━━━━━━━━━━━━━\n\n` +
      `${ticket.text}\n\n` +
      `━━━━━━━━━━━━━━\n` +
      `_Reply to this message in the group to respond to the user._`;

    try {
      const sent = await bot.sendMessage(supportGroupId, groupMsg, {
        parse_mode: 'Markdown'
      });
      groupMsgToTicket.set(sent.message_id, ticketId);
      ticket.groupMessageId = sent.message_id;
    } catch (err) {
      console.error('[group_forward_error]', err.message);
    }

    await bot.sendMessage(
      chatId,
      `✅ *Message sent successfully!*\n\n` +
        `🆔 Reference: *${ticket.id}*\n\n` +
        `Our team will get back to you as soon as possible. 💙\n\n` +
        `Use /status to check on your message anytime.`,
      { parse_mode: 'Markdown', ...mainKeyboard }
    );
    return;
  }

  // ── Cancel submit ─────────────────────────────────────────────────────────

  if (data.startsWith('cancelsubmit_')) {
    const ticketId = data.replace('cancelsubmit_', '');
    tickets.delete(ticketId);
    userStates.delete(chatId);
    await bot.sendMessage(
      chatId,
      '🚫 Message cancelled. Tap a category below to start again.',
      mainKeyboard
    );
    return;
  }
});

// ─── Incoming messages ────────────────────────────────────────────────────────

bot.on('message', async (msg) => {
  if (!msg.text) return;
  const chatId = msg.chat.id;

  // ── Handle replies in support group → forward to user ────────────────────

  if (String(msg.chat.id) === String(supportGroupId) && msg.reply_to_message) {
    const ticketId = groupMsgToTicket.get(msg.reply_to_message.message_id);
    if (!ticketId) return;

    const ticket = tickets.get(ticketId);
    if (!ticket) return;

    const replyText = msg.text.trim();
    if (!replyText || replyText.startsWith('/')) return;

    // Deliver reply to user
    try {
      await bot.sendMessage(
        ticket.userId,
        `💙 *Response from HopeHub Team*\n\n` +
          `📂 Re: ${categoryLabels[ticket.category] || ticket.category} (${ticket.id})\n\n` +
          `━━━━━━━━━━━━━━\n\n` +
          `${replyText}\n\n` +
          `━━━━━━━━━━━━━━\n\n` +
          `_If you have a follow-up, tap below to send another message._`,
        { parse_mode: 'Markdown', ...mainKeyboard }
      );

      ticket.status = 'replied';

      // Confirm in group
      await bot.sendMessage(supportGroupId, `✅ Reply delivered to user for ${ticket.id}.`, {
        reply_to_message_id: msg.message_id
      });
    } catch (err) {
      console.error('[reply_delivery_error]', err.message);
      await bot.sendMessage(
        supportGroupId,
        `⚠️ Could not deliver reply — user may have blocked the bot.`,
        { reply_to_message_id: msg.message_id }
      );
    }
    return;
  }

  // ── Ignore group messages that aren't replies ─────────────────────────────

  if (msg.chat.type !== 'private') return;

  // ── Ignore commands (handled by onText) ───────────────────────────────────

  if (msg.text.startsWith('/')) return;

  // ── User is writing a message ─────────────────────────────────────────────

  const state = userStates.get(chatId);

  if (!state || state.state !== 'writing') {
    await bot.sendMessage(chatId, `💙 Tap a category below to send us a message.`, mainKeyboard);
    return;
  }

  const text = msg.text.trim();

  if (text.length < 5) {
    await bot.sendMessage(chatId, 'Please write a bit more so we can help you properly. 💙');
    return;
  }

  if (text.length > 4000) {
    await bot.sendMessage(
      chatId,
      `Your message is too long (${text.length} chars). Please keep it under 4,000 characters.`
    );
    return;
  }

  // Create ticket
  const ticketId = makeTicketId();
  tickets.set(ticketId, {
    id: ticketId,
    userId: chatId,
    firstName: msg.from.first_name,
    username: msg.from.username ? `@${msg.from.username}` : null,
    category: state.category,
    text,
    status: 'draft',
    createdAt: Date.now()
  });

  userStates.set(chatId, { state: 'preview', ticketId });

  const confirmKeyboard = {
    reply_markup: {
      inline_keyboard: [
        [{ text: '✅ Send Message', callback_data: `confirm_${ticketId}` }],
        [{ text: '🚫 Cancel', callback_data: `cancelsubmit_${ticketId}` }]
      ]
    }
  };

  await bot.sendMessage(
    chatId,
    `📋 *Preview your message*\n\n` +
      `📂 Category: ${categoryLabels[state.category]}\n` +
      `━━━━━━━━━━━━━━\n\n` +
      `${text}\n\n` +
      `━━━━━━━━━━━━━━\n\n` +
      `Ready to send?`,
    { parse_mode: 'Markdown', ...confirmKeyboard }
  );
});

// ─── Error handling ───────────────────────────────────────────────────────────

bot.on('polling_error', (error) => {
  if (error.code === 'ETELEGRAM' && error.response?.body?.error_code === 429) {
    const retryAfter = error.response.body.parameters?.retry_after || 5;
    console.warn(`[polling] Rate limited — retrying after ${retryAfter}s`);
    return;
  }
  console.error('[polling_error]', error.code, error.message);
});

bot.on('error', (error) => {
  console.error('[bot_error]', error.message);
});

process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason);
});

// ─── Startup ──────────────────────────────────────────────────────────────────

console.log('💙 HopeHub Contact Bot is running...');
console.log(`   Admin: ${adminChatId}`);
console.log(`   Support Group: ${supportGroupId}`);

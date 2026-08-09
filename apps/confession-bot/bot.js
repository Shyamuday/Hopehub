import 'dotenv/config';
import TelegramBot from 'node-telegram-bot-api';

// ─── Config ───────────────────────────────────────────────────────────────────

const token = process.env.BOT_TOKEN;
const adminChatId = process.env.ADMIN_CHAT_ID;
const confessionChannelId = process.env.CONFESSION_CHANNEL_ID;
const confessionStartNumber = parseInt(process.env.CONFESSION_START_NUMBER || '1000', 10);

if (!token) throw new Error('BOT_TOKEN is missing in .env');
if (!adminChatId) throw new Error('ADMIN_CHAT_ID is missing in .env');
if (!confessionChannelId) throw new Error('CONFESSION_CHANNEL_ID is missing in .env');

const bot = new TelegramBot(token, {
  polling: {
    interval: 1000,
    autoStart: true,
    params: { timeout: 10 }
  }
});

// ─── State ────────────────────────────────────────────────────────────────────

// Map<chatId, { state: "writing" | "preview", confessionId?: string }>
const userStates = new Map();

// Map<confessionId, ConfessionRecord>
const pendingConfessions = new Map();

let confessionCounter = confessionStartNumber;

// ─── Keyboards ────────────────────────────────────────────────────────────────

const mainKeyboard = {
  reply_markup: {
    inline_keyboard: [
      [{ text: '🩷 Send Confession', callback_data: 'send_confession' }],
      [
        { text: '💙 HopeHub', url: 'https://hopehub.in' },
        { text: '🆘 Get Help', url: 'https://hopehub.in/contact' }
      ]
    ]
  }
};

const cancelKeyboard = {
  reply_markup: {
    inline_keyboard: [[{ text: '🚫 Cancel', callback_data: 'cancel_confession' }]]
  }
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeConfessionId() {
  return `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

function isAdmin(chatId) {
  return String(chatId) === String(adminChatId);
}

// ─── /start ───────────────────────────────────────────────────────────────────

bot.onText(/^\/start$/, async (msg) => {
  const chatId = msg.chat.id;
  userStates.delete(chatId);

  const welcomeMessage =
    `💙 *Welcome to the Anonymous Confession Bot*\n\n` +
    `This is your space to say what you can't say anywhere else.\n\n` +
    `Share your thoughts, feelings, secrets, regrets, experiences, or anything you've been keeping inside — *anonymously and without judgment.*\n\n` +
    `You don't have to use your name or explain everything. Just write what's on your mind. 🫂\n\n` +
    `🔒 *Your confession is completely anonymous.*\n` +
    `We won't publicly display your Telegram name, username, or profile.\n\n` +
    `⚠️ *Please remember:*\n` +
    `This bot is for anonymous confessions and emotional support. It is not a substitute for professional medical advice or emergency help.\n\n` +
    `👇 When you're ready, tap *Send Confession* below.`;

  await bot.sendMessage(chatId, welcomeMessage, {
    parse_mode: 'Markdown',
    ...mainKeyboard
  });
});

// ─── /cancel command ──────────────────────────────────────────────────────────

bot.onText(/^\/cancel$/, async (msg) => {
  const chatId = msg.chat.id;
  userStates.delete(chatId);
  await bot.sendMessage(
    chatId,
    "❌ Confession cancelled.\n\nYou can start again whenever you're ready. 💙",
    mainKeyboard
  );
});

// ─── /help command ────────────────────────────────────────────────────────────

bot.onText(/^\/help$/, async (msg) => {
  const chatId = msg.chat.id;
  await bot.sendMessage(
    chatId,
    `*HopeHub Confession Bot — Help*\n\n` +
      `/start — Show the welcome message\n` +
      `/cancel — Cancel your current confession\n` +
      `/help — Show this help message\n\n` +
      `💙 Tap *Send Confession* to share something anonymously.`,
    { parse_mode: 'Markdown', ...mainKeyboard }
  );
});

// ─── Callback queries ─────────────────────────────────────────────────────────

bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;

  await bot.answerCallbackQuery(query.id);

  // ── Send confession ────────────────────────────────────────────────────────

  if (data === 'send_confession') {
    userStates.set(chatId, { state: 'writing' });

    await bot.sendMessage(
      chatId,
      `📝 *Write your confession*\n\n` +
        `You can share anything that's on your mind.\n\n` +
        `🔒 Your confession will be submitted *anonymously.*\n\n` +
        `Type your confession as a message below, then press Send.\n\n` +
        `_You can use /cancel anytime to go back._`,
      { parse_mode: 'Markdown', ...cancelKeyboard }
    );
    return;
  }

  // ── Cancel (from writing state) ────────────────────────────────────────────

  if (data === 'cancel_confession') {
    userStates.delete(chatId);
    await bot.sendMessage(
      chatId,
      "❌ Confession cancelled.\n\nYou can start again whenever you're ready. 💙",
      mainKeyboard
    );
    return;
  }

  // ── Cancel (from preview state) ───────────────────────────────────────────

  if (data.startsWith('cancel_preview_')) {
    const confessionId = data.replace('cancel_preview_', '');
    pendingConfessions.delete(confessionId);
    userStates.delete(chatId);
    await bot.sendMessage(
      chatId,
      "❌ Your confession was cancelled.\n\nNothing was submitted. You can start again whenever you're ready. 💙",
      mainKeyboard
    );
    return;
  }

  // ── Submit (user confirmed preview) — direct publish, no review ──────────

  if (data.startsWith('submit_')) {
    const confessionId = data.replace('submit_', '');
    const confession = pendingConfessions.get(confessionId);

    if (!confession) {
      await bot.sendMessage(
        chatId,
        '⚠️ This confession has expired. Please tap *Send Confession* to submit again.',
        { parse_mode: 'Markdown', ...mainKeyboard }
      );
      return;
    }

    userStates.delete(chatId);

    // Publish directly to channel — no review
    const publicPost =
      `🕊 *Anonymous Confession #${confession.number}*\n\n` +
      `${confession.text}\n\n` +
      `━━━━━━━━━━━━━━\n` +
      `💙 *HopeHub Anonymous Confessions*\n` +
      `_t.me/Hopehubconfessionbot_`;

    try {
      await bot.sendMessage(confessionChannelId, publicPost, {
        parse_mode: 'Markdown'
      });
    } catch (err) {
      console.error('[channel_post_error]', err.message);
    }

    pendingConfessions.delete(confessionId);

    await bot.sendMessage(
      chatId,
      `💙 *Your confession has been published anonymously.*\n\n` +
        `Thank you for trusting us with something personal. 🫂\n\n` +
        `You can send another confession anytime.`,
      { parse_mode: 'Markdown', ...mainKeyboard }
    );
    return;
  }

  // ── Admin: Approve ─────────────────────────────────────────────────────────

  if (data.startsWith('approve_')) {
    if (!isAdmin(chatId)) return;

    const confessionId = data.replace('approve_', '');
    const confession = pendingConfessions.get(confessionId);

    if (!confession) {
      await bot.sendMessage(chatId, '⚠️ Confession not found or already processed.');
      return;
    }

    if (confession.status === 'approved') return;

    confession.status = 'approved';

    const publicPost =
      `🕊 *Anonymous Confession #${confession.number}*\n\n` +
      `${confession.text}\n\n` +
      `━━━━━━━━━━━━━━\n` +
      `💙 *HopeHub Anonymous Confessions*\n` +
      `_t.me/Hopehubconfessionbot_`;

    await bot.sendMessage(confessionChannelId, publicPost, {
      parse_mode: 'Markdown'
    });

    // Update admin message button to show it's done
    await bot.editMessageReplyMarkup(
      {
        inline_keyboard: [[{ text: '✅ Approved & Published', callback_data: 'already_processed' }]]
      },
      { chat_id: chatId, message_id: query.message.message_id }
    );

    // Notify the user
    try {
      await bot.sendMessage(
        confession.userId,
        `💙 *Your confession has been approved.*\n\n` +
          `Your anonymous confession has been published in the HopeHub community.\n\n` +
          `Thank you for sharing your words. 🫂`,
        { parse_mode: 'Markdown', ...mainKeyboard }
      );
    } catch {
      console.log(
        `[info] Could not notify user ${confession.userId} — they may have blocked the bot.`
      );
    }

    // Clean up
    pendingConfessions.delete(confessionId);
    return;
  }

  // ── Admin: Reject ──────────────────────────────────────────────────────────

  if (data.startsWith('reject_')) {
    if (!isAdmin(chatId)) return;

    const confessionId = data.replace('reject_', '');
    const confession = pendingConfessions.get(confessionId);

    if (!confession) {
      await bot.sendMessage(chatId, '⚠️ Confession not found or already processed.');
      return;
    }

    if (confession.status === 'rejected') return;

    confession.status = 'rejected';

    await bot.editMessageReplyMarkup(
      {
        inline_keyboard: [[{ text: '❌ Rejected', callback_data: 'already_processed' }]]
      },
      { chat_id: chatId, message_id: query.message.message_id }
    );

    // Notify the user
    try {
      await bot.sendMessage(
        confession.userId,
        `Your confession wasn't approved for publication at this time.\n\n` +
          `Please feel free to submit another confession whenever you're ready. 💙`,
        mainKeyboard
      );
    } catch {
      console.log(`[info] Could not notify user ${confession.userId}.`);
    }

    pendingConfessions.delete(confessionId);
    return;
  }

  // ── Guard: already processed ───────────────────────────────────────────────

  if (data === 'already_processed') {
    await bot.answerCallbackQuery(query.id, {
      text: 'This confession has already been processed.',
      show_alert: false
    });
  }
});

// ─── Incoming messages (confession writing) ───────────────────────────────────

bot.on('message', async (msg) => {
  if (!msg.text) return;

  const chatId = msg.chat.id;

  // Ignore all slash commands (handled above)
  if (msg.text.startsWith('/')) return;

  const state = userStates.get(chatId);

  if (!state || state.state !== 'writing') {
    // User sent a message but isn't in writing mode — nudge them
    await bot.sendMessage(
      chatId,
      `💙 Tap *Send Confession* below to share something anonymously.`,
      { parse_mode: 'Markdown', ...mainKeyboard }
    );
    return;
  }

  const confessionText = msg.text.trim();

  if (confessionText.length < 5) {
    await bot.sendMessage(
      chatId,
      'Please write a little more so we can receive your confession. 💙'
    );
    return;
  }

  if (confessionText.length > 4000) {
    await bot.sendMessage(
      chatId,
      `Your confession is too long (${confessionText.length} characters). Please keep it under 4,000 characters.`
    );
    return;
  }

  // Save confession draft
  const confessionId = makeConfessionId();
  confessionCounter++;

  pendingConfessions.set(confessionId, {
    id: confessionId,
    number: confessionCounter,
    userId: chatId,
    text: confessionText,
    status: 'draft',
    createdAt: new Date()
  });

  userStates.set(chatId, { state: 'preview', confessionId });

  const previewKeyboard = {
    reply_markup: {
      inline_keyboard: [
        [{ text: '✅ Submit Anonymously', callback_data: `submit_${confessionId}` }],
        [{ text: '🚫 Cancel', callback_data: `cancel_preview_${confessionId}` }]
      ]
    }
  };

  await bot.sendMessage(
    chatId,
    `📝 *Preview your confession*\n\n` +
      `━━━━━━━━━━━━━━\n\n` +
      `${confessionText}\n\n` +
      `━━━━━━━━━━━━━━\n\n` +
      `🔒 This will be submitted *anonymously.*\n\n` +
      `Are you sure you want to submit it?`,
    { parse_mode: 'Markdown', ...previewKeyboard }
  );
});

// ─── Error handling ───────────────────────────────────────────────────────────

bot.on('polling_error', (error) => {
  // ETELEGRAM 429 = rate limited, just wait it out
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

// Prevent unhandled promise rejections from crashing the process
process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason);
});

// ─── Startup ──────────────────────────────────────────────────────────────────

console.log('💙 HopeHub Anonymous Confession Bot is running...');
console.log(`   Admin: ${adminChatId}`);
console.log(`   Channel: ${confessionChannelId}`);

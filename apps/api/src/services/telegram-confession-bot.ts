import {
  answerCommunityCallback,
  editCommunityReplyMarkup,
  sendCommunityMessage
} from './telegram-community-bots.client.js';
import {
  clearCommunityState,
  createCommunitySubmission,
  deleteDraftCommunitySubmission,
  findCommunitySubmission,
  getCommunityState,
  setCommunityState,
  updateCommunitySubmission
} from './telegram-community-bots.store.js';
import type { CommunityTelegramUpdate, TelegramKeyboard } from './telegram-community-bots.types.js';

const slug = 'confession' as const;
const adminChatId = () => process.env.TELEGRAM_CONFESSION_ADMIN_CHAT_ID?.trim() || '';
const channelId = () => process.env.TELEGRAM_CONFESSION_CHANNEL_ID?.trim() || '';
const approvalGroupId = () => process.env.TELEGRAM_CONFESSION_APPROVAL_GROUP_ID?.trim() || '';
const keyOf = (value: string | number) => String(value);
const isCommand = (text: string, command: string) =>
  new RegExp(`^/${command}(?:@[A-Za-z0-9_]+)?(?:\\s|$)`, 'i').test(text.trim());

const confessionNumber = (serial: bigint) =>
  Number(serial) + Number.parseInt(process.env.TELEGRAM_CONFESSION_START_NUMBER || '1000', 10);

const mainKeyboard: TelegramKeyboard = {
  inline_keyboard: [
    [{ text: '🩷 Send Confession', callback_data: 'send_confession' }],
    [
      { text: '💙 HopeHub', url: 'https://hopehub.in' },
      { text: '🆘 Get Help', url: 'https://hopehub.in/contact' }
    ]
  ]
};
const cancelKeyboard: TelegramKeyboard = {
  inline_keyboard: [[{ text: '🚫 Cancel', callback_data: 'cancel_confession' }]]
};

async function showStart(chatId: string | number) {
  await clearCommunityState(slug, keyOf(chatId));
  await sendCommunityMessage(
    slug,
    chatId,
    `💙 *Welcome to the Anonymous Confession Bot*\n\nThis is your space to say what you can't say anywhere else—anonymously and without judgment.\n\n🔒 *Your confession is anonymous.* We do not publish your Telegram name, username, or profile.\n\n⚠️ This bot is not a substitute for professional medical advice or emergency help.\n\n👇 When you're ready, tap *Send Confession*.`,
    { parse_mode: 'Markdown', reply_markup: mainKeyboard }
  );
}

function isAdmin(chatId: string | number) {
  return keyOf(chatId) === adminChatId() || keyOf(chatId) === approvalGroupId();
}

export async function handleConfessionBotUpdate(update: CommunityTelegramUpdate) {
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
        reply_markup: mainKeyboard
      });
      return;
    }
    if (data.startsWith('submit_')) {
      const confession = await findCommunitySubmission(data.slice('submit_'.length));
      if (!confession || confession.bot !== slug || confession.userChatId !== stateKey) {
        await sendCommunityMessage(
          slug,
          chatId,
          '⚠️ This confession expired. Please start again.',
          { reply_markup: mainKeyboard }
        );
        return;
      }
      const approvalTarget = approvalGroupId() || adminChatId();
      if (!approvalTarget) throw new Error('TELEGRAM_CONFESSION_ADMIN_CHAT_ID is not configured.');
      await updateCommunitySubmission(confession.reference, { status: 'pending' });
      await clearCommunityState(slug, stateKey);
      await sendCommunityMessage(
        slug,
        approvalTarget,
        `🔔 *NEW ANONYMOUS CONFESSION*\n\n🆔 Confession #${confessionNumber(confession.serial)}\n━━━━━━━━━━━━━━\n\n${confession.text}\n\n━━━━━━━━━━━━━━`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '✅ Approve & Publish', callback_data: `approve_${confession.reference}` },
                { text: '❌ Reject', callback_data: `reject_${confession.reference}` }
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
          reply_markup: mainKeyboard
        }
      );
      return;
    }
    if (data.startsWith('approve_') || data.startsWith('reject_')) {
      if (!isAdmin(chatId)) return;
      const approved = data.startsWith('approve_');
      const id = data.slice(approved ? 'approve_'.length : 'reject_'.length);
      const confession = await findCommunitySubmission(id);
      if (!confession || confession.bot !== slug || confession.status !== 'pending') {
        await sendCommunityMessage(slug, chatId, '⚠️ Confession not found or already processed.');
        return;
      }
      if (approved) {
        const target = channelId();
        if (!target) throw new Error('TELEGRAM_CONFESSION_CHANNEL_ID is not configured.');
        await sendCommunityMessage(
          slug,
          target,
          `🕊 *Anonymous Confession #${confessionNumber(confession.serial)}*\n\n${confession.text}\n\n━━━━━━━━━━━━━━\n💙 *HopeHub Anonymous Confessions*\n_t.me/Hopehubconfessionbot_`,
          { parse_mode: 'Markdown' }
        );
      }
      await updateCommunitySubmission(confession.reference, {
        status: approved ? 'approved' : 'rejected'
      });
      await editCommunityReplyMarkup(slug, chatId, callback.message.message_id, {
        inline_keyboard: [
          [
            {
              text: approved ? '✅ Approved & Published' : '❌ Rejected',
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
            ? `💙 *Your confession has been approved and published anonymously.*`
            : `Your confession wasn't approved for publication at this time.`,
          {
            parse_mode: 'Markdown',
            reply_markup: mainKeyboard
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
      reply_markup: mainKeyboard
    });
    return;
  }
  if (isCommand(text, 'help')) {
    await sendCommunityMessage(
      slug,
      chatId,
      `*HopeHub Confession Bot — Help*\n\n/start — Welcome\n/cancel — Cancel current confession\n/help — Help`,
      { parse_mode: 'Markdown', reply_markup: mainKeyboard }
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
      { parse_mode: 'Markdown', reply_markup: mainKeyboard }
    );
    return;
  }
  if (text.length < 5 || text.length > 4000) {
    await sendCommunityMessage(
      slug,
      chatId,
      text.length < 5
        ? 'Please write a little more. 💙'
        : 'Please keep your confession under 4,000 characters.'
    );
    return;
  }
  const id = `CONF-${Date.now().toString(36).toUpperCase()}`;
  await createCommunitySubmission({
    reference: id,
    bot: slug,
    userChatId: stateKey,
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
          [{ text: '✅ Submit Anonymously', callback_data: `submit_${id}` }],
          [{ text: '🚫 Cancel', callback_data: `cancel_preview_${id}` }]
        ]
      }
    }
  );
}

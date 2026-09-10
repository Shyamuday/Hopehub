// Run from apps/api with: node --import tsx scripts/refresh-telegram-off-topic-links.mjs --apply
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { TelegramClient } from 'teleproto';
import { StringSession } from 'teleproto/sessions';
import { prisma } from '../src/db.ts';
import {
  communityBotStatus,
  callCommunityTelegramApi
} from '../src/services/telegram-community-bots.client.ts';

const apply = process.argv.includes('--apply');
const replace = (text) =>
  text
    .replace(/hopehubtalks/gi, 'AnxietyDepressionlonelyindia')
    .replace(/HopeHub Chit-Chat|Hopehub Talks/gi, 'chatfrendshiplovevc');
const secret = (name) => readFileSync(`/etc/${name}`, 'utf8').trim();
const client = new TelegramClient(
  new StringSession(secret('hopehub-telegram-user-session')),
  Number(secret('hopehub-telegram-user-api-id')),
  secret('hopehub-telegram-user-api-hash'),
  { connectionRetries: 1, floodSleepThreshold: 45 }
);
client.setLogLevel('none');

function entitiesFor(message) {
  const original = message.message || '';
  const types = {
    Bold: 'bold',
    Italic: 'italic',
    Underline: 'underline',
    Strike: 'strikethrough',
    Spoiler: 'spoiler',
    Code: 'code',
    Pre: 'pre',
    TextUrl: 'text_link',
    Url: 'url',
    Mention: 'mention',
    Hashtag: 'hashtag',
    Cashtag: 'cashtag',
    BotCommand: 'bot_command',
    Email: 'email',
    Phone: 'phone_number',
    CustomEmoji: 'custom_emoji',
    Blockquote: 'blockquote'
  };
  return (message.entities || []).map((entity) => {
    const type = types[entity.className.replace('MessageEntity', '')];
    if (!type) throw new Error(`Unsupported entity: ${entity.className}`);
    const start = replace(original.slice(0, entity.offset)).length;
    const end = replace(original.slice(0, entity.offset + entity.length)).length;
    return {
      type,
      offset: start,
      length: end - start,
      ...(entity.url ? { url: replace(entity.url) } : {}),
      ...(entity.language ? { language: entity.language } : {}),
      ...(entity.documentId ? { custom_emoji_id: String(entity.documentId) } : {})
    };
  });
}

function keyboardFor(markup) {
  if (!markup) return undefined;
  if (markup.className !== 'ReplyInlineMarkup') throw new Error('Unsupported keyboard');
  return {
    inline_keyboard: markup.rows.map((row) =>
      row.buttons.map((button) => {
        const text = replace(button.text);
        if (button.className === 'KeyboardButtonUrl') return { text, url: replace(button.url) };
        if (button.className === 'KeyboardButtonCallback')
          return { text, callback_data: Buffer.from(button.data).toString('utf8') };
        throw new Error(`Unsupported button: ${button.className}`);
      })
    )
  };
}

try {
  await client.connect();
  const me = await client.getMe();
  const bots = new Map();
  for (const bot of communityBotStatus().filter((bot) => bot.configured)) {
    const identity = await callCommunityTelegramApi(bot.slug, 'getMe', {});
    bots.set(String(identity.id), bot.slug);
  }
  const rows = await prisma.siteConfig.findMany({
    where: {
      key: { in: ['telegramGroupHelpGroupChatId', 'telegramGroupHelpOffTopicGroupChatId'] }
    },
    select: { value: true }
  });
  const dialogs = await client.getDialogs({ limit: 200 });
  for (const { value: chatId } of rows) {
    const dialog = dialogs.find((dialog) => String(dialog.id) === chatId);
    if (!dialog?.entity) throw new Error(`Configured group unavailable: ${chatId}`);
    const counts = { scanned: 0, matched: 0, edited: 0, skipped: 0, failed: 0 };
    for await (const message of client.iterMessages(dialog.entity, { waitTime: 2 })) {
      counts.scanned++;
      if (counts.scanned % 1000 === 0)
        console.log(JSON.stringify({ chatId, ...counts, progress: true }));
      const original = message.message || '';
      const markup =
        JSON.stringify(message.replyMarkup, (_, value) =>
          typeof value === 'bigint' ? String(value) : value
        ) || '';
      const entityText = (message.entities || []).map((entity) => entity.url || '').join(' ');
      if (!/hopehubtalks|HopeHub Chit-Chat|Hopehub Talks/i.test(original + markup + entityText))
        continue;
      counts.matched++;
      const sender = String(message.senderId);
      const slug = bots.get(sender);
      if (!slug && sender !== String(me.id)) {
        counts.skipped++;
        continue;
      }
      if (!apply) continue;
      try {
        // Leave forwarded copies untouched; update only messages controlled by our identities.
        if (message.fwdFrom) {
          counts.skipped++;
          continue;
        }
        const text = replace(original);
        const entities = entitiesFor(message);
        if (slug) {
          const reply_markup = keyboardFor(message.replyMarkup);
          const hasMedia = message.media && message.media.className !== 'MessageMediaWebPage';
          const method = hasMedia ? 'editMessageCaption' : 'editMessageText';
          await callCommunityTelegramApi(slug, method, {
            chat_id: chatId,
            message_id: message.id,
            ...(hasMedia ? { caption: text, caption_entities: entities } : { text, entities }),
            ...(reply_markup ? { reply_markup } : {})
          });
        } else {
          // User-authored announcements: preserve Telegram formatting and any existing buttons.
          if (message.replyMarkup || message.media) {
            counts.skipped++;
            continue;
          }
          const formattingEntities = (message.entities || []).map((entity, index) =>
            Object.assign(
              Object.create(Object.getPrototypeOf(entity)),
              entity,
              { offset: entities[index].offset, length: entities[index].length },
              entity.url ? { url: replace(entity.url) } : {}
            )
          );
          await client.editMessage(dialog.entity, {
            message: message.id,
            text,
            formattingEntities,
            parseMode: undefined
          });
        }
        const [verified] = await client.getMessages(dialog.entity, { ids: [message.id] });
        const current =
          (verified?.message || '') +
          JSON.stringify(verified?.replyMarkup, (_, value) =>
            typeof value === 'bigint' ? String(value) : value
          ) +
          (verified?.entities || []).map((entity) => entity.url || '').join(' ');
        if (/hopehubtalks|HopeHub Chit-Chat|Hopehub Talks/i.test(current))
          throw new Error('Verification still contains old branding');
        counts.edited++;
      } catch (error) {
        counts.failed++;
        console.log(
          JSON.stringify({
            chatId,
            messageId: message.id,
            error: error.errorMessage || error.message
          })
        );
        if (/FLOOD|retry after/i.test(error.errorMessage || error.message)) throw error;
      }
    }
    console.log(JSON.stringify({ chatId, ...counts, complete: true, apply }));
  }
} finally {
  await client.disconnect();
  await prisma.$disconnect();
}

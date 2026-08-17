import { answerCommunityCallback, sendCommunityMessage } from './telegram-community-bots.client.js';
import type { CommunityTelegramUpdate, TelegramKeyboard } from './telegram-community-bots.types.js';
import { getTelegramBotControls } from './telegram-bot-controls.js';
import {
  handleTelegramCommunityEventCallback,
  recordTelegramCampaignPollUpdate,
  recordTelegramCommunityReaction
} from './telegram-community-campaigns.js';

const slug = 'rules' as const;
const mainMenu: TelegramKeyboard = {
  inline_keyboard: [
    [
      { text: '📖 About Us', callback_data: 'about' },
      { text: '📋 Community Rules', callback_data: 'rules' }
    ],
    [
      { text: '⚠️ Disclaimer', callback_data: 'disclaimer' },
      { text: '🔒 Privacy Guide', callback_data: 'privacy' }
    ],
    [
      { text: '🚨 How to Report', callback_data: 'report' },
      { text: '📞 Helplines', callback_data: 'helpline' }
    ],
    [
      { text: '🩷 Confession Bot', url: 'https://t.me/Hopehubconfessionbot' },
      { text: '📬 Contact Us', url: 'https://t.me/Contacthopehubbot' }
    ],
    [{ text: '💙 HopeHub Website', url: 'https://hopehub.in' }]
  ]
};
const backMenu: TelegramKeyboard = {
  inline_keyboard: [[{ text: '« Back to Menu', callback_data: 'menu' }]]
};

const CONTENT: Record<string, string> = {
  about: `🌐 *About HopeHub Community*\n\nHopeHub is a safe, non-judgmental space to share mental-health struggles and connect with people who understand. We encourage professional help, a listening ear, kindness, and anonymous participation.\n\n💙 *You are not alone.*`,
  rules: `📋 *HopeHub Community Rules*\n\n*1. Be kind and respectful.* No hate, discrimination, bullying, or harassment.\n\n*2. No unsolicited professional advice.* Share experience, but do not diagnose or prescribe.\n\n*3. Keep it anonymous.* Do not request or share identifying information.\n\n*4. No promotion or spam* without admin approval.\n\n*5. Media and links require approval.*\n\n*6. No DMs without consent.*\n\n*7. Handle sensitive topics with care* and recommend professional or emergency help where appropriate.\n\n*8. Report violations; do not argue.*\n\n*9. Seek approval before sharing resources.*\n\n*10. Respect admin decisions.*`,
  disclaimer: `⚠️ *HopeHub Disclaimer*\n\nHopeHub is a wellbeing support community, not a medical, psychiatric, legal, or emergency service. Community content is not diagnosis or treatment. Always consult a qualified professional for medical concerns and contact emergency services in a crisis.\n\nHopeHub cannot guarantee confidentiality in group chats and does not moderate private conversations between members. External resources are independent of HopeHub.`,
  privacy: `🔒 *Privacy Guide — Stay Safe on Telegram*\n\nSet your phone number and calls to “My Contacts” or “Nobody”; restrict who can add you to groups; review active sessions; enable two-step verification and a passcode; and avoid sharing personal details.\n\nBlock unwanted private messages and report concerns through @Contacthopehubbot.`,
  report: `🚨 *How to Report a Rule Violation*\n\nSend @Contacthopehubbot a screenshot, message link, and short description. Wait for admins to investigate. Do not confront the person, publish accusations, or privately message admins.`,
  helpline: `📞 *Mental Health Helplines*\n\nIf you are in immediate danger, contact local emergency services.\n\n*India:*\n• iCall: 9152987821\n• Vandrevala Foundation: 1860-2662-345\n• NIMHANS: 080-46110007\n\n*International:*\n• Samaritans (UK): 116 123\n• Lifeline (Australia): 13 11 14\n• Find local crisis support: https://www.iasp.info/resources/Crisis_Centres/\n\nThese services are independent of HopeHub.`
};
const command = (text: string) =>
  text
    .trim()
    .match(/^\/([a-z]+)(?:@[A-Za-z0-9_]+)?(?:\s|$)/i)?.[1]
    ?.toLowerCase();

async function showMenu(chatId: string | number) {
  const controls = await getTelegramBotControls();
  await sendCommunityMessage(slug, chatId, controls.telegramRulesWelcomeText, {
    reply_markup: mainMenu
  });
}
async function showSection(chatId: string | number, section: string) {
  if (CONTENT[section])
    await sendCommunityMessage(slug, chatId, CONTENT[section], {
      parse_mode: 'Markdown',
      reply_markup: backMenu
    });
}

export async function handleRulesBotUpdate(update: CommunityTelegramUpdate) {
  if (update.message_reaction) {
    await recordTelegramCommunityReaction(update);
    return;
  }
  if (update.poll || update.poll_answer) {
    await recordTelegramCampaignPollUpdate(update);
    return;
  }
  const callback = update.callback_query;
  if (callback?.message && callback.data) {
    if (await handleTelegramCommunityEventCallback(update)) {
      await answerCommunityCallback(slug, callback.id, 'You’re on the list 💙');
      return;
    }
    await answerCommunityCallback(slug, callback.id);
    if (callback.data === 'menu') await showMenu(callback.message.chat.id);
    else await showSection(callback.message.chat.id, callback.data);
    return;
  }
  const message = update.message;
  if (message && message.chat.type !== 'private') return;
  if (!message?.text || message.chat.type !== 'private') return;
  const requested = command(message.text);
  if (!requested) return;
  if (requested === 'start') return showMenu(message.chat.id);
  if (requested === 'help') {
    await sendCommunityMessage(
      slug,
      message.chat.id,
      `*HopeHub Rules Bot — Commands*\n\n/start — Main menu\n/rules — Community rules\n/about — About HopeHub\n/disclaimer — Disclaimer\n/privacy — Privacy guide\n/report — How to report\n/helpline — Mental health helplines`,
      { parse_mode: 'Markdown', reply_markup: mainMenu }
    );
    return;
  }
  await showSection(message.chat.id, requested);
}

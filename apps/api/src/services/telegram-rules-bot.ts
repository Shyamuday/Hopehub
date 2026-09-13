import { answerCommunityCallback, sendCommunityMessage } from './telegram-community-bots.client.js';
import type { CommunityTelegramUpdate, TelegramKeyboard } from './telegram-community-bots.types.js';
import { getTelegramBotControls, type TelegramBotControls } from './telegram-bot-controls.js';
import { configuredUrlButtons } from './telegram-keyboard-config.js';
import {
  handleTelegramCommunityEventCallback,
  recordTelegramCampaignPollUpdate,
  recordTelegramCommunityReaction
} from './telegram-community-campaigns.js';
import { COMMUNITY_BOT_SLUGS } from '../constants/telegram-community-bot.constants.js';
import { withPublicCommunityLinks } from './telegram-public-community-links.js';

const slug = COMMUNITY_BOT_SLUGS.RULES;
function mainMenu(controls: TelegramBotControls): TelegramKeyboard {
  const linkButtons = configuredUrlButtons(controls.telegramRulesMenuLinks, 8);
  const linkRows: TelegramKeyboard['inline_keyboard'] = [];
  for (let index = 0; index < linkButtons.length; index += 2) {
    linkRows.push(linkButtons.slice(index, index + 2));
  }
  return withPublicCommunityLinks(
    {
      inline_keyboard: [
        [
          { text: 'About us', callback_data: 'about' },
          { text: 'Community rules', callback_data: 'rules' }
        ],
        [
          { text: 'Disclaimer', callback_data: 'disclaimer' },
          { text: 'Privacy guide', callback_data: 'privacy' }
        ],
        [
          { text: 'How to report', callback_data: 'report' },
          { text: 'Helplines', callback_data: 'helpline' }
        ],
        ...linkRows
      ]
    },
    controls
  )!;
}

const content = (controls: TelegramBotControls): Record<string, string> => ({
  about: controls.telegramRulesAboutText,
  rules: controls.telegramRulesRulesText,
  disclaimer: controls.telegramRulesDisclaimerText,
  privacy: controls.telegramRulesPrivacyText,
  report: controls.telegramRulesReportText,
  helpline: controls.telegramRulesHelplineText
});
const command = (text: string) =>
  text
    .trim()
    .match(/^\/([a-z]+)(?:@[A-Za-z0-9_]+)?(?:\s|$)/i)?.[1]
    ?.toLowerCase();

async function showMenu(chatId: string | number, controls: TelegramBotControls) {
  await sendCommunityMessage(slug, chatId, controls.telegramRulesWelcomeText, {
    reply_markup: mainMenu(controls)
  });
}
async function showSection(
  chatId: string | number,
  section: string,
  controls: TelegramBotControls
) {
  const sectionContent = content(controls)[section];
  if (sectionContent)
    await sendCommunityMessage(slug, chatId, sectionContent, {
      parse_mode: 'Markdown',
      reply_markup: withPublicCommunityLinks(
        { inline_keyboard: [[{ text: '« Back to Menu', callback_data: 'menu' }]] },
        controls
      )
    });
}

export async function handleRulesBotUpdate(update: CommunityTelegramUpdate) {
  const controls = await getTelegramBotControls();
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
    if (callback.data === 'menu') await showMenu(callback.message.chat.id, controls);
    else await showSection(callback.message.chat.id, callback.data, controls);
    return;
  }
  const message = update.message;
  if (message && message.chat.type !== 'private') return;
  if (!message?.text || message.chat.type !== 'private') return;
  const requested = command(message.text);
  if (!requested) return;
  if (requested === 'start') return showMenu(message.chat.id, controls);
  if (requested === 'help') {
    await sendCommunityMessage(
      slug,
      message.chat.id,
      `*HopeHub Rules Bot — Commands*\n\n/start — Main menu\n/rules — Community rules\n/about — About HopeHub\n/disclaimer — Disclaimer\n/privacy — Privacy guide\n/report — How to report\n/helpline — Mental health helplines`,
      { parse_mode: 'Markdown', reply_markup: mainMenu(controls) }
    );
    return;
  }
  await showSection(message.chat.id, requested, controls);
}

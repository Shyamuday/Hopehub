import { InlineKeyboard } from 'grammy';
import { config } from './config.js';

export function mainKeyboard() {
  const keyboard = new InlineKeyboard()
    .url('🌐 Website', config.websiteUrl)
    .url('🧠 Book support', config.servicesUrl)
    .row()
    .url('📝 Take a test', config.assessmentsUrl)
    .url('💙 Private care bot', config.userBotUrl)
    .row()
    .url('🤝 Volunteer / care team', config.careersUrl)
    .url('🩺 Care team bot', config.providerBotUrl)
    .row()
    .url('📣 Telegram hub', config.telegramCommunityUrl)
    .url('💬 Feedback', config.feedbackUrl);

  if (config.whatsappUrl) {
    keyboard.row().url('🟢 WhatsApp group', config.whatsappUrl);
  }

  return keyboard;
}

export function privateStartText() {
  return [
    '<b>Hope Hub Community Bot 💙</b>',
    '',
    'I help keep Hope Hub Telegram groups welcoming, safe, and useful.',
    '',
    '<b>What I do</b>',
    '• Welcome new members',
    '• Share official Hope Hub links',
    '• Show community rules',
    '• Help admins clean spam or unsafe messages',
    '',
    '<b>Hope Hub</b>',
    'Private mental wellness support with self-checks, guided resources, community support, and bookable care sessions.',
    '',
    `Website: ${config.websiteUrl}`,
    `Private help: ${config.userBotUrl}`,
    '',
    commandsText()
  ].join('\n');
}

export function groupStartText() {
  return [
    '<b>Hope Hub Community Bot is active 💙</b>',
    '',
    'This group is for gentle community support, updates, learning, and safe next steps.',
    '',
    'Use /rules for group guidelines.',
    'Use /links for official Hope Hub links.',
    'Use /report as a reply to flag a message for admins.',
    '',
    'For private emotional support or bookings, please use the private care bot — not the group chat.'
  ].join('\n');
}

export function welcomeText(names: string[]) {
  const people = names.length ? names.join(', ') : 'friend';
  return [
    `<b>Welcome, ${people} 👋</b>`,
    '',
    config.welcomeMessage,
    '',
    '<b>Quick start</b>',
    '• Read /rules',
    '• Open /links',
    '• Use the private care bot for personal support',
    '',
    'We’re glad you’re here — gently, one step at a time.'
  ].join('\n');
}

export function rulesText() {
  return [
    '<b>Hope Hub community rules</b>',
    '',
    ...config.rules.map((rule, index) => `${index + 1}. ${rule}`),
    '',
    '<b>Private support</b>',
    `Use the Care Bot: ${config.userBotUrl}`,
    `Book from website: ${config.servicesUrl}`
  ].join('\n');
}

export function linksText() {
  return [
    '<b>Official Hope Hub links</b>',
    '',
    `🌐 Website: ${config.websiteUrl}`,
    `🧠 Services / book support: ${config.servicesUrl}`,
    `📝 Mental health tests: ${config.assessmentsUrl}`,
    `🎁 Care packages: ${config.packagesUrl}`,
    `💙 Private care bot: ${config.userBotUrl}`,
    `🤝 Volunteer / care team application: ${config.careersUrl}`,
    `🩺 Care team bot: ${config.providerBotUrl}`,
    `📣 Telegram community: ${config.telegramCommunityUrl}`,
    config.whatsappUrl ? `🟢 WhatsApp: ${config.whatsappUrl}` : '',
    `💬 Feedback: ${config.feedbackUrl}`,
    `✉️ Support email: ${config.supportEmail}`
  ]
    .filter(Boolean)
    .join('\n');
}

export function commandsText() {
  return [
    '<b>Commands</b>',
    '/start - intro',
    '/help - help',
    '/rules - group rules',
    '/links - official Hope Hub links',
    '/report - reply to a message to flag it for admins',
    '/clean - admin only, reply to delete spam/unsafe message',
    '/pinrules - admin only, send and pin group rules'
  ].join('\n');
}

export function reportText(reporter: string) {
  return [
    'Thanks — report received.',
    `${reporter} flagged the replied message for group admins.`,
    'Admins can review and use /clean if needed. If this is urgent or unsafe, please contact local emergency services or a trusted person now.'
  ].join('\n');
}

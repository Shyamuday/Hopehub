import 'dotenv/config';
import TelegramBot from 'node-telegram-bot-api';

const token = process.env.BOT_TOKEN;
if (!token) throw new Error('BOT_TOKEN is missing in .env');

const bot = new TelegramBot(token, {
  polling: {
    interval: 1000,
    autoStart: true,
    params: {
      timeout: 10,
      allowed_updates: JSON.stringify(['message', 'callback_query'])
    }
  }
});

// ─── Links ────────────────────────────────────────────────────────────────────

const LINKS = {
  website: 'https://hopehub.in',
  confessionBot: 'https://t.me/Hopehubconfessionbot',
  contactBot: 'https://t.me/Contacthopehubbot',
  channel: 'https://t.me/HHConfession'
};

// ─── Main Menu ────────────────────────────────────────────────────────────────

const mainMenu = {
  reply_markup: {
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
        { text: '🩷 Confession Bot', url: LINKS.confessionBot },
        { text: '📬 Contact Us', url: LINKS.contactBot }
      ],
      [{ text: '💙 HopeHub Website', url: LINKS.website }]
    ]
  }
};

const backButton = {
  reply_markup: {
    inline_keyboard: [[{ text: '« Back to Menu', callback_data: 'menu' }]]
  }
};

// ─── Content ──────────────────────────────────────────────────────────────────

const CONTENT = {
  about: `🌐 *About HopeHub Community*

HopeHub is a safe, non-judgmental space where you can share your mental health struggles and connect with people who truly understand what you're going through.

⚜️ We understand that mental health is a sensitive subject that deserves far more attention than it gets — and that many of us can't share our struggles with those around us.

⚜️ HopeHub provides a platform where everyone can share their concerns anonymously and comfortably, in a way they might not be able to elsewhere.

⚜️ We are here to support one another on the road to recovery — to encourage professional help, offer a listening ear, and provide a space for general suggestions that could help others.

⚜️ Above all divisions, we are all humans — very much deserving of kindness and support.

💙 *You are not alone.*

_"The greatness of a community is most accurately measured by the compassionate actions of its members."_
— Coretta Scott King

Please read all the Rules and Disclaimer before participating.`,

  rules: `📋 *HopeHub Community Rules*

Please follow these rules to keep HopeHub a safe space for everyone.

*1. Be Kind & Respectful* 🤝
Treat every member with empathy and respect. No hate speech, discrimination, or bullying of any kind.

*2. No Unsolicited Advice* 💬
Do not give professional medical, psychiatric or legal advice. You can share your personal experience but do not prescribe.

*3. Keep It Anonymous* 🔒
Do not share or ask for personal identifying information — real names, phone numbers, locations, or social media handles.

*4. No Promotion or Spam* 🚫
Do not promote any products, services, channels, groups or bots without prior approval from the admin team via @Contacthopehubbot.

*5. No Media Without Approval* 📎
Links, images, videos, polls and voice messages require prior admin approval. Text only in community chat.

*6. No DMs Without Consent* 📵
Do not privately message other members without their explicit permission. Respect everyone's privacy.

*7. Sensitive Topics — Handle With Care* 🌿
Discussions about self-harm, suicidal thoughts, or crisis situations are allowed — but must be handled sensitively. Always recommend professional help and helplines.

*8. No Arguments — Report & Wait* ✋
If you witness a rule violation, report it via @Contacthopehubbot and wait for admins to act. Do NOT engage in arguments — you will also be warned regardless of who started it.

*9. Seek Approval Before Sharing* ✅
Any mental health resources, articles, links, or promotions require admin approval before being shared in the community.

*10. Respect Admin Decisions* 👮
Admin decisions are final. Do not argue with or publicly challenge admin actions in the community chat.`,

  disclaimer: `⚠️ *HopeHub Disclaimer*

*🏥 Medical Disclaimer*
HopeHub is a wellbeing support community — not a medical or psychiatric service. Nothing shared here constitutes professional medical advice, diagnosis or treatment.

Always consult a qualified mental health professional for medical concerns. In a crisis, contact emergency services or a helpline immediately.

*👥 Community Members*
All members are volunteers sharing personal experiences. Admins are not mental health professionals. Content shared by members reflects personal opinion only.

*🔒 Privacy & Confidentiality*
While we encourage anonymous sharing, HopeHub cannot guarantee the confidentiality of information shared in group chats. Share personal details at your own discretion.

*🌐 External Links*
Helplines and resources shared in this community are independent and not affiliated with HopeHub. We are not responsible for content on external platforms.

*📵 Direct Messages*
HopeHub does not moderate private conversations between members. We strongly advise against sharing personal information in DMs with strangers.

*⚖️ Jurisdiction*
We moderate group activity — chat and voice chats only. Private conversations are beyond our jurisdiction.

By participating in HopeHub, you acknowledge and accept this disclaimer.`,

  privacy: `🔒 *Privacy Guide — Stay Safe on Telegram*

Take a moment to review your settings for a safer experience.

*📱 Recommended Telegram Settings:*

➡️ *Phone number:* Set to "My Contacts" or "Nobody"
➡️ *Calls:* Set to "My Contacts" or "Nobody"
➡️ *Who can add you to groups:* "My Contacts"
➡️ *Active sessions:* Review & terminate unknown devices
➡️ *Two-step verification:* Turn ON
➡️ *Passcode lock:* Turn ON
➡️ *Auto media download:* Turn OFF (Settings → Data & Storage)
➡️ *Archive chats from strangers:* Enable if getting unwanted DMs

*Go to:* Telegram Settings → Privacy & Security

*⚠️ Why this matters:*
HopeHub discourages direct messages between members without consent. We do not moderate private conversations — so protecting yourself starts with your own settings.

If someone invades your DMs without permission — block them immediately. You do not need to engage.

📬 Report privacy concerns: @Contacthopehubbot`,

  report: `🚨 *How to Report a Rule Violation*

If you witness a rule violation in the HopeHub community, here's what to do:

*✅ DO:*
☑️ Report via @Contacthopehubbot with:
   • A screenshot of the violation
   • The message link (tap message → Copy Link)
   • Your description of the violation
☑️ Wait for the admin team to investigate and act
☑️ Use /report or @admin commands in group chat to alert admins

*❌ DO NOT:*
❎ DM admins privately — use @Contacthopehubbot only
❎ Tag specific admins in the chat
❎ Call out the violation publicly in the main chat
❎ Engage in arguments with the person you're reporting

⚠️ *Important:* If you argue with the violator, you will also be warned — regardless of who started it. Report and wait.

*📬 All reports go to:* @Contacthopehubbot
The admin team will investigate and take appropriate action as soon as possible.`,

  helpline: `📞 *Mental Health Helplines*

If you are in immediate crisis, please reach out to a trained professional right away.

*🇮🇳 India:*
• iCall: 9152987821
• Vandrevala Foundation: 1860-2662-345 *(24/7)*
• NIMHANS: 080-46110007
• Snehi: 044-24640050
• iCall (TISS): 9152987821

*🌐 International:*
• Crisis Text Line: Text HOME to 741741 *(US)*
• Samaritans: 116 123 *(UK)*
• Lifeline: 13 11 14 *(Australia)*
• International Association for Suicide Prevention: https://www.iasp.info/resources/Crisis_Centres/

⚠️ *Disclaimer:* These helplines are independent organisations not affiliated with HopeHub. We are not responsible for their services.

💙 You are not alone. Help is available.

📬 Non-emergency support: @Contacthopehubbot
🩷 Share anonymously: @Hopehubconfessionbot`
};

// ─── /start ───────────────────────────────────────────────────────────────────

bot.onText(/^\/start$/, async (msg) => {
  const chatId = msg.chat.id;
  await bot.sendMessage(
    chatId,
    `💙 *Welcome to HopeHub Rules & Guidelines*\n\n` +
      `This bot contains everything you need to know about our community — rules, disclaimer, privacy guide, helplines and more.\n\n` +
      `🌐 [hopehub.in](${LINKS.website}) · 🩷 [Confession Bot](${LINKS.confessionBot}) · 📬 [Contact Us](${LINKS.contactBot})\n\n` +
      `👇 *Select a topic below:*`,
    { parse_mode: 'Markdown', ...mainMenu }
  );
});

// ─── /rules, /about, /disclaimer, /privacy, /report, /helpline ───────────────

bot.onText(/^\/rules$/, async (msg) => sendSection(msg.chat.id, 'rules'));
bot.onText(/^\/about$/, async (msg) => sendSection(msg.chat.id, 'about'));
bot.onText(/^\/disclaimer$/, async (msg) => sendSection(msg.chat.id, 'disclaimer'));
bot.onText(/^\/privacy$/, async (msg) => sendSection(msg.chat.id, 'privacy'));
bot.onText(/^\/report$/, async (msg) => sendSection(msg.chat.id, 'report'));
bot.onText(/^\/helpline$/, async (msg) => sendSection(msg.chat.id, 'helpline'));

bot.onText(/^\/help$/, async (msg) => {
  await bot.sendMessage(
    msg.chat.id,
    `*HopeHub Rules Bot — Commands*\n\n` +
      `/start — Main menu\n` +
      `/rules — Community rules\n` +
      `/about — About HopeHub\n` +
      `/disclaimer — Disclaimer\n` +
      `/privacy — Privacy guide\n` +
      `/report — How to report\n` +
      `/helpline — Mental health helplines`,
    { parse_mode: 'Markdown', ...mainMenu }
  );
});

// ─── Helper ───────────────────────────────────────────────────────────────────

async function sendSection(chatId, key) {
  const text = CONTENT[key];
  if (!text) return;
  await bot.sendMessage(chatId, text, { parse_mode: 'Markdown', ...backButton });
}

// ─── Callback queries ─────────────────────────────────────────────────────────

bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;

  await bot.answerCallbackQuery(query.id);

  if (data === 'menu') {
    await bot.sendMessage(chatId, `💙 *HopeHub Rules & Guidelines*\n\n👇 Select a topic:`, {
      parse_mode: 'Markdown',
      ...mainMenu
    });
    return;
  }

  if (CONTENT[data]) {
    await sendSection(chatId, data);
  }
});

// ─── Error handling ───────────────────────────────────────────────────────────

bot.on('polling_error', (error) => {
  if (error.code === 'ETELEGRAM' && error.response?.body?.error_code === 429) {
    console.warn(
      `[polling] Rate limited — retrying after ${error.response.body.parameters?.retry_after || 5}s`
    );
    return;
  }
  console.error('[polling_error]', error.code, error.message);
});

bot.on('error', (error) => console.error('[bot_error]', error.message));

process.on('unhandledRejection', (reason) => console.error('[unhandledRejection]', reason));

// ─── Startup ──────────────────────────────────────────────────────────────────

console.log('💙 HopeHub Rules Bot is running...');

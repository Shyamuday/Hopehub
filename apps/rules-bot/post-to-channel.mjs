/* eslint-disable no-undef */
import 'dotenv/config';

const token = process.env.BOT_TOKEN;
const channel = '@HHrules';

async function pin(messageId) {
  const res = await fetch(`https://api.telegram.org/bot${token}/pinChatMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: channel, message_id: messageId, disable_notification: true })
  });
  const data = await res.json();
  console.log(`📌 Pinned: ${data.ok}`);
}

const messages = [
  // 1 — Index
  `📌 *HopeHub Rules & Guidelines*

Welcome to the official HopeHub rules channel.
Here you will find everything you need to know before participating in our community.

━━━━━━━━━━━━━━━━
📋 *INDEX*
━━━━━━━━━━━━━━━━

1️⃣ About HopeHub
2️⃣ Community Rules
3️⃣ Disclaimer
4️⃣ Privacy Guide
5️⃣ How to Report
6️⃣ Mental Health Helplines

━━━━━━━━━━━━━━━━
🌐 [hopehub.in](https://hopehub.in)
🩷 [Confession Bot](https://t.me/Hopehubconfessionbot)
📬 [Contact Us](https://t.me/Contacthopehubbot)
📖 [Rules Bot](https://t.me/Hopehubrulesbot)`,

  // 2 — About
  `1️⃣ *About HopeHub*

🌐 HopeHub is a global mental health support community.

We provide a safe, non-judgmental space where you can share your mental health struggles and connect with people who truly understand what you are going through.

⚜️ We understand that mental health is a sensitive subject that deserves far more attention than it gets — and that many of us cannot share our struggles with those around us.

⚜️ HopeHub provides a platform where everyone can share their concerns anonymously and comfortably, in a way they might not be able to elsewhere.

⚜️ We are here to support one another on the road to recovery — to encourage professional help, offer a listening ear, and provide a space for general suggestions that could help others.

⚜️ Above all divisions, we are all humans — very much deserving of kindness and support.

💙 *You are not alone.*

_"The greatness of a community is most accurately measured by the compassionate actions of its members."_
— Coretta Scott King

Please read all the Rules and Disclaimer before participating in the community.`,

  // 3 — Rules
  `2️⃣ *Community Rules*

Please follow these rules to keep HopeHub a safe space for everyone.

*1. Be Kind & Respectful* 🤝
Treat every member with empathy and respect. No hate speech, discrimination, or bullying of any kind.

*2. No Unsolicited Advice* 💬
Do not give professional medical, psychiatric or legal advice. You may share personal experience but do not prescribe.

*3. Keep It Anonymous* 🔒
Do not share or ask for personal identifying information — real names, phone numbers, locations, or social media handles.

*4. No Promotion or Spam* 🚫
Do not promote any products, services, channels, groups or bots without prior admin approval via @Contacthopehubbot.

*5. No Media Without Approval* 📎
Links, images, videos, polls and voice messages require prior admin approval. Text only in community chat.

*6. No DMs Without Consent* 📵
Do not privately message other members without their explicit permission. Respect everyone's privacy.

*7. Handle Sensitive Topics With Care* 🌿
Discussions about self-harm or crisis situations are allowed but must be handled sensitively. Always recommend professional help and helplines.

*8. Do Not Argue — Report & Wait* ✋
If you witness a rule violation, report it via @Contacthopehubbot and wait for admins to act. Do NOT engage in arguments — you will also be warned regardless of who started it.

*9. Seek Approval Before Sharing* ✅
Any mental health resources, articles or links require admin approval before being shared.

*10. Respect Admin Decisions* 👮
Admin decisions are final. Do not argue with or publicly challenge admin actions in the community chat.`,

  // 4 — Disclaimer
  `3️⃣ *Disclaimer* ⚠️

*Medical Disclaimer* 🏥
HopeHub is a wellbeing support community — not a medical or psychiatric service. Nothing shared here constitutes professional medical advice, diagnosis or treatment.

Always consult a qualified mental health professional for medical concerns. In a crisis, contact emergency services or a helpline immediately.

*Community Members* 👥
All members are volunteers sharing personal experiences. Admins are not professionals. Content shared by members reflects personal opinion only.

*Privacy & Confidentiality* 🔒
While we encourage anonymous sharing, HopeHub cannot guarantee the confidentiality of information shared in group chats. Share personal details at your own discretion.

*External Links* 🌐
Helplines and resources shared in this community are independent and not affiliated with HopeHub. We are not responsible for content on external platforms.

*Direct Messages* 📵
HopeHub does not moderate private conversations between members. We strongly advise against sharing personal information in DMs with strangers.

*Jurisdiction* ⚖️
We moderate group activity — chat and voice chats only. Private conversations are beyond our jurisdiction.

By participating in HopeHub, you acknowledge and accept this disclaimer.`,

  // 5 — Privacy Guide
  `4️⃣ *Privacy Guide* 🔒

Take a moment to review your settings for a safer Telegram experience.

*Recommended Settings:*

➡️ Phone number — Set to "My Contacts" or "Nobody"
➡️ Calls — Set to "My Contacts" or "Nobody"
➡️ Who can add you to groups — "My Contacts"
➡️ Active sessions — Review and terminate unknown devices
➡️ Two-step verification — Turn ON
➡️ Passcode lock — Turn ON
➡️ Auto media download — Turn OFF (Settings > Data & Storage)
➡️ Archive chats from strangers — Enable if getting unwanted DMs

*Go to:* Telegram Settings > Privacy & Security

*Why this matters:*
HopeHub discourages direct messages between members without consent. We do not moderate private conversations — so protecting yourself starts with your own settings.

If someone invades your DMs without permission — block them immediately. You do not need to engage.

📬 Report privacy concerns: @Contacthopehubbot`,

  // 6 — How to Report
  `5️⃣ *How to Report a Rule Violation* 🚨

If you witness a rule violation, here is what to do:

*DO:* ✅
• Report via @Contacthopehubbot with a screenshot or message link
• Tap a message > Copy Link to get the message link
• Describe the violation clearly
• Wait for the admin team to investigate and act

*DO NOT:* ❌
• DM admins privately — use @Contacthopehubbot only
• Tag specific admins in the chat
• Call out the violation publicly in the main chat
• Engage in arguments with the person you are reporting

⚠️ If you argue with the violator, you will also be warned regardless of who started it. Report and wait for admins to act.

📬 All reports: @Contacthopehubbot`,

  // 7 — Helplines
  `6️⃣ *Mental Health Helplines* 📞

If you are in immediate crisis, please reach out to a trained professional right away.

*India* 🇮🇳
• iCall (TISS): 9152987821
• Vandrevala Foundation: 1860-2662-345 _(24/7)_
• NIMHANS: 080-46110007
• Snehi: 044-24640050
• iCall: 9152987821

*International* 🌐
• Crisis Text Line: Text HOME to 741741 _(US)_
• Samaritans: 116 123 _(UK/Ireland)_
• Lifeline: 13 11 14 _(Australia)_
• International resources: iasp.info/resources/Crisis_Centres

⚠️ These helplines are independent organisations not affiliated with HopeHub.

💙 You are not alone. Help is available.

🩷 Share anonymously: @Hopehubconfessionbot
📬 Contact us: @Contacthopehubbot
🌐 Visit us: https://hopehub.in`
];

(async () => {
  console.log(`Posting ${messages.length} messages to ${channel}...`);
  let firstMsgId = null;
  for (let i = 0; i < messages.length; i++) {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: channel,
        text: messages[i],
        parse_mode: 'Markdown',
        disable_web_page_preview: true
      })
    });
    const data = await res.json();
    if (data.ok) {
      console.log(`✅ [${i + 1}/${messages.length}] msg_id: ${data.result.message_id}`);
      if (i === 0) firstMsgId = data.result.message_id;
    } else {
      console.error(`❌ [${i + 1}] ${data.description}`);
    }
    await new Promise((r) => setTimeout(r, 1500));
  }

  // Pin the index message
  if (firstMsgId) {
    await pin(firstMsgId);
  }

  console.log('\nDone! All rules posted to channel.');
})();

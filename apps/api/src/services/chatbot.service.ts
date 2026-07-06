/**
 * Rule-based chatbot scripted as "Dr. Priya", a warm and empathetic
 * care advisor at Vitalis. Guides visitors through understanding their
 * concern and booking a consultation. Flags for operator when visitor
 * declines or leaves contact details for follow-up.
 */

export type BotReply = {
  message: string;
  nextStage: number;
  needsOperator: boolean;
  capturedName?: string;
  capturedPhone?: string;
  showBookButton?: boolean;
  showWhatsAppButton?: boolean;
};

const BOT_NAME = 'Dr. Priya';

const GREETING =
  `Hi there! 👋 I'm ${BOT_NAME}, your care advisor at Vitalis. I'm here to help you understand your concern and find the right care for you.\n\nWhat brings you here today? Feel free to describe your symptoms or health concern.`;

const YES_RE = /\byes\b|\bsure\b|\bokay\b|\byes please\b|\byep\b|\byeah\b|\bplease\b|\bi would\b|\bbook\b|\bwant to\b|\bwilling\b/i;
const NO_RE  = /\bno\b|\bnot\b|\bdon'?t\b|\bnope\b|\bnah\b|\bnot now\b|\bmaybe later\b|\blater\b|\bnot interested\b|\bno thanks?\b/i;

function hasPhone(text: string): boolean {
  return /(\+?\d[\d\s\-]{8,14}\d)/.test(text);
}

function extractPhone(text: string): string | undefined {
  const m = text.match(/(\+?\d[\d\s\-]{8,14}\d)/);
  return m?.[1]?.replace(/\s/g, '');
}

function isNo(text: string): boolean {
  return NO_RE.test(text) && !YES_RE.test(text);
}

function isYes(text: string): boolean {
  return YES_RE.test(text);
}

/**
 * Returns the bot's next message and updated state based on
 * the current stage and user's latest message.
 */
export function getBotReply(stage: number, userMessage: string): BotReply {
  const msg = userMessage.trim();

  switch (stage) {
    // Stage 0: user just sent their concern — acknowledge and ask duration
    case 0:
      return {
        message:
          `Thank you for sharing that with me. 🙏 I want to make sure you get the right help.\n\nHow long have you been experiencing this? (A few days, weeks, months…)`,
        nextStage: 1,
        needsOperator: false
      };

    // Stage 1: user described duration — ask about prior treatment
    case 1:
      return {
        message:
          `I see. Have you tried any treatments for this before, or is this the first time you are seeking help for it?`,
        nextStage: 2,
        needsOperator: false
      };

    // Stage 2: treatment history captured — suggest consultation
    case 2:
      return {
        message:
          `Thank you. Based on what you have shared, I believe a personalised consultation with one of our qualified homeopathic doctors would be very beneficial for you.\n\nWe offer detailed, confidential consultations from the comfort of your home. Would you like to book a consultation today?`,
        nextStage: 3,
        needsOperator: false,
        showBookButton: true
      };

    // Stage 3: asked about booking — handle yes/no
    case 3:
      if (isNo(msg)) {
        return {
          message:
            `No worries at all! 😊 I completely understand — it can take time to feel ready.\n\nWould you like me to have one of our care coordinators call or WhatsApp you when you are ready? Just share your name and phone number and we will reach out at a time that suits you.`,
          nextStage: 5,
          needsOperator: false
        };
      }
      return {
        message:
          `Wonderful! 🌟 You can book your consultation directly on our website. Our doctors review every case carefully and will guide you through the next steps.\n\nIs there anything you would like to know about the process, cost, or our doctors before you book?`,
        nextStage: 4,
        needsOperator: false,
        showBookButton: true
      };

    // Stage 4: post-yes — answering follow-up questions after booking offer
    case 4:
      if (isNo(msg)) {
        return {
          message: `Of course! You can go ahead and book whenever you are ready. We are here if you need anything. 💚`,
          nextStage: 4,
          needsOperator: false,
          showBookButton: true
        };
      }
      return {
        message:
          `Great question! Our consultations are conducted via private chat and are fully confidential. After booking, our team will assign the right doctor based on your concern.\n\nIs there anything else I can help clarify?`,
        nextStage: 4,
        needsOperator: false,
        showBookButton: true
      };

    // Stage 5: asked for contact details — check for phone
    case 5: {
      if (isNo(msg)) {
        return {
          message:
            `That is perfectly fine! 💚 We are always here whenever you are ready. You can also reach us directly on WhatsApp at any time. Wishing you good health!`,
          nextStage: 7,
          needsOperator: false,
          showWhatsAppButton: true
        };
      }

      const phone = extractPhone(msg);
      if (phone || hasPhone(msg)) {
        return {
          message:
            `Thank you so much! 🙏 Our care coordinator will reach out to you very soon on ${phone ?? 'the number you shared'}. You are in good hands — we will make sure you get the right care.\n\nWishing you good health! 💚`,
          nextStage: 6,
          needsOperator: true,
          capturedPhone: phone
        };
      }

      // Might have given a name only — ask for phone
      return {
        message: `Thank you! Could you also share your phone number or WhatsApp number so our coordinator can reach you?`,
        nextStage: 5,
        needsOperator: false,
        capturedName: msg.length < 60 ? msg : undefined
      };
    }

    // Stage 6: contact captured, escalated
    case 6:
      return {
        message: `You're welcome! Our team will be in touch with you very soon. Take care! 💚`,
        nextStage: 6,
        needsOperator: false,
        showWhatsAppButton: true
      };

    // Stage 7: closed gracefully
    default:
      return {
        message: `Is there anything else I can help you with today?`,
        nextStage: stage,
        needsOperator: false
      };
  }
}

export { GREETING, BOT_NAME };

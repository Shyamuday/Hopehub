/**
 * Guided menu chatbot as "Dr. Priya".
 * Flow: greeting → main intent → branch-specific follow-up questions.
 */

export type BotReply = {
  message: string;
  nextStage: number;
  needsOperator: boolean;
  options?: string[];
  capturedName?: string;
  capturedPhone?: string;
  capturedIntent?: string;
  capturedCallbackTime?: string;
  showBookButton?: boolean;
  showWhatsAppButton?: boolean;
  allowFreeText?: boolean;
};

const BOT_NAME = 'Dr. Priya';

// ─── Main menu ───────────────────────────────────────────────────────────────

const MAIN_INTENT_OPTIONS = [
  'Book a consultation',
  'Request a callback',
  'How consultations work',
  'Fees & payment',
  'Something else'
] as const;

// ─── Book consultation branch (stages 10–19) ───────────────────────────────

const CONCERN_OPTIONS = [
  'Skin, hair or allergy issues',
  'Chronic or long-term condition',
  'Digestive or lifestyle concern',
  'Child or family health',
  'Stress, sleep or mental wellness',
  'General consultation',
  'Something else'
] as const;

const DURATION_OPTIONS = ['A few days', '1–2 weeks', '1–3 months', 'More than 3 months'] as const;

const TREATMENT_OPTIONS = [
  'First time seeking help',
  'Tried homeopathy before',
  'Tried other treatments',
  'Not sure / mixed'
] as const;

const BOOK_OPTIONS = ['Yes, book now', 'Tell me more first', 'Not right now'] as const;

const BOOK_FOLLOWUP_OPTIONS = [
  'Book consultation now',
  'I have another question',
  'No, I am good'
] as const;

// ─── Callback branch (stages 20–29) ──────────────────────────────────────────

const CALLBACK_CHANNEL_OPTIONS = [
  'Call on my phone',
  'WhatsApp message',
  'Either is fine'
] as const;

const CALLBACK_TIME_OPTIONS = [
  'Morning (9am–12pm)',
  'Afternoon (12–5pm)',
  'Evening (5–8pm)',
  'Anytime'
] as const;

// ─── Info branch (stages 30–39) ────────────────────────────────────────────

const INFO_TOPIC_OPTIONS = [
  'How online consultation works',
  'How doctors are assigned',
  'Prescriptions & follow-up',
  'Fees & payment',
  'Back to main menu'
] as const;

const INFO_FOLLOWUP_OPTIONS = [
  'Book a consultation',
  'Request a callback',
  'Back to main menu',
  'No, I am good'
] as const;

// ─── General / other branch (stages 40–49) ─────────────────────────────────

const OTHER_FOLLOWUP_OPTIONS = [
  'Request a callback',
  'Book a consultation',
  'Chat on WhatsApp',
  'Back to main menu'
] as const;

// ─── Closing (stage 90+) ───────────────────────────────────────────────────

const CLOSING_OPTIONS = ['Start a new question', 'Close chat'] as const;

const GREETING = `Hi there! 👋 I'm ${BOT_NAME}, your care advisor at HopeHub.\n\nHow may I help you today?`;

const YES_RE =
  /\byes\b|\bsure\b|\bokay\b|\byes please\b|\byep\b|\byeah\b|\bbook\b|\bwant to\b|\bwilling\b|want to book|book consultation|book now/i;
const NO_RE =
  /\bno\b|\bnot\b|\bdon'?t\b|\bnope\b|\bnah\b|\bnot now\b|\bmaybe later\b|\blater\b|\bnot interested\b|\bno thanks?\b|not right now|no, i am good|close chat/i;

function hasPhone(text: string): boolean {
  return /(\+?\d[\d\s-]{8,14}\d)/.test(text);
}

function extractPhone(text: string): string | undefined {
  const m = text.match(/(\+?\d[\d\s-]{8,14}\d)/);
  return m?.[1]?.replace(/\s/g, '');
}

function extractName(text: string): string | undefined {
  const withoutPhone = text.replace(/(\+?\d[\d\s-]{8,14}\d)/g, '').trim();
  if (withoutPhone.length >= 2 && withoutPhone.length < 60) {
    return withoutPhone;
  }
  return undefined;
}

function isNo(text: string): boolean {
  return NO_RE.test(text) && !YES_RE.test(text);
}

function isYes(text: string): boolean {
  return YES_RE.test(text);
}

function matchesAny(text: string, options: readonly string[]): boolean {
  const t = text.trim().toLowerCase();
  return options.some((o) => {
    const opt = o.toLowerCase();
    return t === opt || t.includes(opt.slice(0, 14));
  });
}

function matchesIntent(text: string, intent: string): boolean {
  return (
    matchesAny(text, [intent]) ||
    text.trim().toLowerCase().includes(intent.toLowerCase().slice(0, 12))
  );
}

function infoAnswer(topic: string): string {
  if (matchesAny(topic, ['How online consultation works', 'How consultations work'])) {
    return (
      `Our consultations are fully online — private chat with a qualified homeopathic doctor, from your phone or laptop.\n\n` +
      `You share your concern through a short intake, we assign the right doctor from our panel, and you receive guidance on medicine and follow-up.`
    );
  }
  if (matchesAny(topic, ['How doctors are assigned'])) {
    return (
      `You do not browse or pick a doctor yourself. Our clinical team matches you based on your concern, case complexity, and doctor availability.\n\n` +
      `This ensures you see someone with the right expertise for your condition.`
    );
  }
  if (matchesAny(topic, ['Prescriptions & follow-up'])) {
    return (
      `After your consultation, the doctor may share a prescription and follow-up plan if appropriate.\n\n` +
      `You can track medicines, adherence, and follow-up visits through your HopeHub account.`
    );
  }
  if (matchesAny(topic, ['Fees & payment'])) {
    return (
      `Consultation fees depend on the type of case and plan (one-time or follow-up package).\n\n` +
      `You see the amount before you pay. Payment is online and secure — no hidden charges.`
    );
  }
  return (
    `HopeHub offers doctor-led homeopathic care online — intake, consultation, prescription, and follow-up in one place.\n\n` +
    `Tap a topic below if you would like more detail.`
  );
}

function closingReply(restart = false): BotReply {
  if (restart) {
    return {
      message: `Of course! How may I help you today?`,
      nextStage: 0,
      needsOperator: false,
      options: [...MAIN_INTENT_OPTIONS],
      allowFreeText: true
    };
  }
  return {
    message: `Thank you for visiting HopeHub. We are here whenever you need us. 💚`,
    nextStage: 91,
    needsOperator: false,
    options: ['Start a new question'],
    allowFreeText: true
  };
}

function bookDeclinedReply(): BotReply {
  return {
    message: `No worries at all! 😊 Would you like our care team to call or WhatsApp you when you are ready?`,
    nextStage: 20,
    needsOperator: false,
    options: [...CALLBACK_CHANNEL_OPTIONS],
    capturedIntent: 'Request a callback',
    allowFreeText: true
  };
}

// ─── Public API ──────────────────────────────────────────────────────────────

/** Options for the question the bot is currently waiting on. */
export function getPendingOptions(stage: number): string[] | undefined {
  switch (stage) {
    case 0:
      return [...MAIN_INTENT_OPTIONS];
    case 10:
      return [...CONCERN_OPTIONS];
    case 11:
      return [...DURATION_OPTIONS];
    case 12:
      return [...TREATMENT_OPTIONS];
    case 13:
      return [...BOOK_OPTIONS];
    case 14:
      return [...BOOK_FOLLOWUP_OPTIONS];
    case 20:
      return [...CALLBACK_CHANNEL_OPTIONS];
    case 22:
      return [...CALLBACK_TIME_OPTIONS];
    case 30:
    case 35:
      return [...INFO_TOPIC_OPTIONS];
    case 31:
    case 36:
      return [...INFO_FOLLOWUP_OPTIONS];
    case 41:
      return [...OTHER_FOLLOWUP_OPTIONS];
    case 90:
      return [...CLOSING_OPTIONS];
    default:
      return undefined;
  }
}

export function getGreetingReply(): BotReply {
  return {
    message: GREETING,
    nextStage: 0,
    needsOperator: false,
    options: [...MAIN_INTENT_OPTIONS],
    allowFreeText: true
  };
}

export function getBotReply(stage: number, userMessage: string): BotReply {
  const msg = userMessage.trim();

  // ── Main menu ──────────────────────────────────────────────────────────────
  if (stage === 0) {
    if (matchesIntent(msg, 'Book a consultation')) {
      return {
        message: `Great choice! 🌿\n\nTo guide you to the right doctor, what best describes your health concern?`,
        nextStage: 10,
        needsOperator: false,
        options: [...CONCERN_OPTIONS],
        capturedIntent: 'Book a consultation',
        allowFreeText: true
      };
    }
    if (matchesIntent(msg, 'Request a callback')) {
      return {
        message: `We would be happy to reach out. 📞\n\nHow would you prefer us to contact you?`,
        nextStage: 20,
        needsOperator: false,
        options: [...CALLBACK_CHANNEL_OPTIONS],
        capturedIntent: 'Request a callback',
        allowFreeText: true
      };
    }
    if (matchesIntent(msg, 'How consultations work')) {
      return {
        message:
          infoAnswer('How online consultation works') + `\n\nWhat else would you like to know?`,
        nextStage: 30,
        needsOperator: false,
        options: [...INFO_TOPIC_OPTIONS],
        capturedIntent: 'How consultations work',
        allowFreeText: true
      };
    }
    if (matchesIntent(msg, 'Fees & payment')) {
      return {
        message: infoAnswer('Fees & payment') + `\n\nWould you like to take a next step?`,
        nextStage: 36,
        needsOperator: false,
        options: [...INFO_FOLLOWUP_OPTIONS],
        capturedIntent: 'Fees & payment',
        allowFreeText: true
      };
    }
    if (matchesIntent(msg, 'Something else') || matchesAny(msg, ['Back to main menu'])) {
      return {
        message: `No problem — please tell me briefly what you need help with.`,
        nextStage: 40,
        needsOperator: false,
        capturedIntent: 'Something else',
        allowFreeText: true
      };
    }
    // Free-text at main menu — treat as "something else"
    return {
      message: `Thanks for sharing. Let me help you with that.\n\nCould you tell me a bit more about what you need?`,
      nextStage: 40,
      needsOperator: false,
      capturedIntent: msg.slice(0, 120),
      allowFreeText: true
    };
  }

  // ── Book consultation (10–19) ──────────────────────────────────────────────
  if (stage === 10) {
    return {
      message: `Thank you for sharing. 🙏\n\nHow long have you been experiencing this?`,
      nextStage: 11,
      needsOperator: false,
      options: [...DURATION_OPTIONS],
      allowFreeText: true
    };
  }

  if (stage === 11) {
    return {
      message: `Got it. Have you tried any treatment for this before?`,
      nextStage: 12,
      needsOperator: false,
      options: [...TREATMENT_OPTIONS],
      allowFreeText: true
    };
  }

  if (stage === 12) {
    return {
      message: `Thank you. Based on what you shared, a personalised online consultation with our homeopathic doctors would be a good next step.\n\nWould you like to book a consultation?`,
      nextStage: 13,
      needsOperator: false,
      options: [...BOOK_OPTIONS],
      allowFreeText: true
    };
  }

  if (stage === 13) {
    if (matchesAny(msg, ['Tell me more first']) || /more|cost|process|how|what|doctor/i.test(msg)) {
      return {
        message: `Of course! Our consultations are private, doctor-led, and done from your phone or laptop. A doctor reviews your case and guides you on medicine and follow-up.\n\nMost patients find it convenient compared to repeated clinic visits.`,
        nextStage: 14,
        needsOperator: false,
        options: [...BOOK_FOLLOWUP_OPTIONS],
        showBookButton: true,
        allowFreeText: true
      };
    }
    if (isNo(msg) || matchesAny(msg, ['Not right now'])) {
      return bookDeclinedReply();
    }
    return {
      message: `Wonderful! 🌟 Tap below to book, or ask me anything before you go.`,
      nextStage: 14,
      needsOperator: false,
      options: [...BOOK_FOLLOWUP_OPTIONS],
      showBookButton: true,
      allowFreeText: true
    };
  }

  if (stage === 14) {
    if (isNo(msg) || matchesAny(msg, ['No, I am good'])) {
      return {
        message: `Thank you for chatting with me today. Wishing you good health! 💚`,
        nextStage: 90,
        needsOperator: false,
        options: [...CLOSING_OPTIONS],
        allowFreeText: true
      };
    }
    if (matchesAny(msg, ['Book consultation now', 'Book a consultation']) || isYes(msg)) {
      return {
        message: `Great — use the button below to book. Our team will take it from there!`,
        nextStage: 14,
        needsOperator: false,
        showBookButton: true,
        options: ['I have another question', 'No, I am good'],
        allowFreeText: true
      };
    }
    if (matchesAny(msg, ['I have another question', 'Back to main menu'])) {
      return closingReply(true);
    }
    return {
      message: `Happy to help! Consultations are confidential, online, and tailored to your concern.\n\nAnything else you'd like to know?`,
      nextStage: 14,
      needsOperator: false,
      options: [...BOOK_FOLLOWUP_OPTIONS],
      showBookButton: true,
      allowFreeText: true
    };
  }

  // ── Callback (20–29) ───────────────────────────────────────────────────────
  if (stage === 20) {
    if (matchesAny(msg, ['Back to main menu'])) {
      return closingReply(true);
    }
    return {
      message: `Please type your name and mobile / WhatsApp number (e.g. Rahul 9876543210).`,
      nextStage: 21,
      needsOperator: false,
      allowFreeText: true
    };
  }

  if (stage === 21) {
    const phone = extractPhone(msg);
    if (!phone && !hasPhone(msg)) {
      return {
        message: `Please share a valid phone or WhatsApp number so our coordinator can reach you.`,
        nextStage: 21,
        needsOperator: false,
        allowFreeText: true
      };
    }
    return {
      message: `Thank you! 🙏 When is a good time for us to reach you?`,
      nextStage: 22,
      needsOperator: false,
      options: [...CALLBACK_TIME_OPTIONS],
      capturedPhone: phone,
      capturedName: extractName(msg),
      allowFreeText: true
    };
  }

  if (stage === 22) {
    return {
      message: `Perfect. Our care coordinator will reach out soon at your preferred time. You are in good hands! 💚`,
      nextStage: 23,
      needsOperator: true,
      options: [...CLOSING_OPTIONS],
      capturedCallbackTime: msg.slice(0, 120),
      allowFreeText: true
    };
  }

  if (stage === 23) {
    return {
      message: `You're welcome! Our team will be in touch very soon. Take care! 💚`,
      nextStage: 90,
      needsOperator: false,
      showWhatsAppButton: true,
      options: [...CLOSING_OPTIONS],
      allowFreeText: true
    };
  }

  // ── Info / learn (30–39) ───────────────────────────────────────────────────
  if (stage === 30 || stage === 35) {
    if (matchesAny(msg, ['Back to main menu'])) {
      return closingReply(true);
    }
    const answer = infoAnswer(msg);
    return {
      message: answer + `\n\nWould you like to take a next step?`,
      nextStage: 31,
      needsOperator: false,
      options: [...INFO_FOLLOWUP_OPTIONS],
      showBookButton: true,
      allowFreeText: true
    };
  }

  if (stage === 31 || stage === 36) {
    if (matchesAny(msg, ['Book a consultation', 'Book consultation now']) || isYes(msg)) {
      return {
        message: `Great — tap below to book your consultation.`,
        nextStage: 14,
        needsOperator: false,
        showBookButton: true,
        options: [...BOOK_FOLLOWUP_OPTIONS],
        allowFreeText: true
      };
    }
    if (matchesAny(msg, ['Request a callback'])) {
      return {
        message: `We would be happy to reach out. 📞\n\nHow would you prefer us to contact you?`,
        nextStage: 20,
        needsOperator: false,
        options: [...CALLBACK_CHANNEL_OPTIONS],
        allowFreeText: true
      };
    }
    if (matchesAny(msg, ['Back to main menu'])) {
      return closingReply(true);
    }
    if (isNo(msg) || matchesAny(msg, ['No, I am good'])) {
      return {
        message: `Thank you for chatting with me today. Wishing you good health! 💚`,
        nextStage: 90,
        needsOperator: false,
        options: [...CLOSING_OPTIONS],
        allowFreeText: true
      };
    }
    return {
      message: infoAnswer(msg) + `\n\nAnything else I can help with?`,
      nextStage: 31,
      needsOperator: false,
      options: [...INFO_FOLLOWUP_OPTIONS],
      showBookButton: true,
      allowFreeText: true
    };
  }

  // ── Something else (40–49) ─────────────────────────────────────────────────
  if (stage === 40) {
    return {
      message: `Thank you for explaining. Our care team can help with specific questions like yours.\n\nWhat would you like to do next?`,
      nextStage: 41,
      needsOperator: false,
      options: [...OTHER_FOLLOWUP_OPTIONS],
      allowFreeText: true
    };
  }

  if (stage === 41) {
    if (matchesAny(msg, ['Request a callback'])) {
      return {
        message: `We would be happy to reach out. 📞\n\nHow would you prefer us to contact you?`,
        nextStage: 20,
        needsOperator: false,
        options: [...CALLBACK_CHANNEL_OPTIONS],
        allowFreeText: true
      };
    }
    if (matchesAny(msg, ['Book a consultation'])) {
      return {
        message: `Great choice! 🌿\n\nWhat best describes your health concern?`,
        nextStage: 10,
        needsOperator: false,
        options: [...CONCERN_OPTIONS],
        allowFreeText: true
      };
    }
    if (matchesAny(msg, ['Chat on WhatsApp'])) {
      return {
        message: `Sure — tap below to open WhatsApp and our team will assist you.`,
        nextStage: 90,
        needsOperator: false,
        showWhatsAppButton: true,
        options: [...CLOSING_OPTIONS],
        allowFreeText: true
      };
    }
    if (matchesAny(msg, ['Back to main menu'])) {
      return closingReply(true);
    }
    return {
      message: `I am here to help. Choose an option below or type your question.`,
      nextStage: 41,
      needsOperator: false,
      options: [...OTHER_FOLLOWUP_OPTIONS],
      allowFreeText: true
    };
  }

  // ── Closing (90+) ──────────────────────────────────────────────────────────
  if (stage === 90) {
    if (matchesAny(msg, ['Start a new question'])) {
      return closingReply(true);
    }
    return closingReply(false);
  }

  if (stage === 91) {
    if (matchesAny(msg, ['Start a new question'])) {
      return closingReply(true);
    }
    return closingReply(false);
  }

  // Fallback — return to main menu
  return closingReply(true);
}

export { GREETING, BOT_NAME, MAIN_INTENT_OPTIONS };

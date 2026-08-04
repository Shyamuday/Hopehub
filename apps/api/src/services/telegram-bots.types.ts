import type { Role } from '@prisma/client';

export type TelegramBotSlug = 'user' | 'doctor' | 'admin';

export type TelegramUser = {
  id: number;
  is_bot?: boolean;
  first_name?: string;
  last_name?: string;
  username?: string;
};

export type TelegramChat = {
  id: number | string;
  type?: string;
};

export type TelegramMessage = {
  message_id: number;
  text?: string;
  chat: TelegramChat;
  from?: TelegramUser;
};

export type TelegramCallbackQuery = {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  data?: string;
};

export type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
};

export type InlineButton = {
  text: string;
  callback_data?: string;
  url?: string;
};

export type SendMessagePayload = {
  chat_id: string;
  text: string;
  parse_mode?: 'HTML';
  reply_markup?: {
    inline_keyboard: InlineButton[][];
  };
};

export type SessionMetadata = {
  pendingLink?: {
    email: string;
    otpKey: string;
    role: Role;
    requestedAt: string;
  };
  pendingLead?: {
    kind: 'BOOKING' | 'VOLUNTEER' | 'SUPPORT';
    concern?: string;
    channel?: string;
    time?: string;
  };
  pendingAssessment?: {
    assessmentId: string;
    answers: number[];
  };
  pendingTaskId?: string;
};

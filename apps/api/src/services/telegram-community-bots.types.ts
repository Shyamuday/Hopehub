export type CommunityBotSlug = 'contact' | 'confession' | 'rules';

export type CommunityTelegramUser = {
  id: number;
  first_name?: string;
  username?: string;
};

export type CommunityTelegramMessage = {
  message_id: number;
  text?: string;
  chat: { id: number | string; type?: string };
  from?: CommunityTelegramUser;
  reply_to_message?: { message_id: number };
};

export type CommunityTelegramUpdate = {
  update_id: number;
  message?: CommunityTelegramMessage;
  callback_query?: {
    id: string;
    data?: string;
    message?: CommunityTelegramMessage;
  };
};

export type TelegramKeyboard = {
  inline_keyboard: Array<Array<{ text: string; callback_data?: string; url?: string }>>;
};

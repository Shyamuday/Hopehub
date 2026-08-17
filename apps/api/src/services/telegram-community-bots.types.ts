export type CommunityBotSlug = 'contact' | 'confession' | 'rules' | 'hopehubai';

export type CommunityTelegramUser = {
  id: number;
  is_bot?: boolean;
  first_name?: string;
  last_name?: string;
  username?: string;
};

export type CommunityTelegramMessage = {
  message_id: number;
  date?: number;
  text?: string;
  caption?: string;
  chat: { id: number | string; type?: string };
  from?: CommunityTelegramUser;
  message_thread_id?: number;
  new_chat_members?: CommunityTelegramUser[];
  left_chat_member?: CommunityTelegramUser;
  reply_to_message?: { message_id: number };
  forward_origin?: unknown;
  forward_from?: CommunityTelegramUser;
  forward_from_chat?: { id: number | string };
  photo?: unknown[];
  video?: unknown;
  animation?: unknown;
  document?: unknown;
  audio?: unknown;
  voice?: unknown;
  sticker?: unknown;
};

export type CommunityTelegramUpdate = {
  update_id: number;
  message?: CommunityTelegramMessage;
  poll?: {
    id: string;
    question: string;
    options: Array<{ text: string; voter_count: number }>;
    total_voter_count: number;
    is_closed: boolean;
    is_anonymous: boolean;
    type: 'regular' | 'quiz';
    allows_multiple_answers: boolean;
  };
  poll_answer?: {
    poll_id: string;
    user?: CommunityTelegramUser;
    option_ids: number[];
  };
  message_reaction?: {
    chat: { id: number | string; type?: string };
    message_id: number;
    date: number;
    user?: CommunityTelegramUser;
    actor_chat?: { id: number | string; title?: string };
    old_reaction: Array<{ type: string; emoji?: string; custom_emoji_id?: string }>;
    new_reaction: Array<{ type: string; emoji?: string; custom_emoji_id?: string }>;
  };
  callback_query?: {
    id: string;
    from: CommunityTelegramUser;
    data?: string;
    message?: CommunityTelegramMessage;
  };
};

export type TelegramKeyboard = {
  inline_keyboard: Array<
    Array<{
      text: string;
      callback_data?: string;
      url?: string;
      style?: 'primary' | 'success' | 'danger';
    }>
  >;
};

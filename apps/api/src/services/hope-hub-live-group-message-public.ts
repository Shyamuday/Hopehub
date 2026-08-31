export const PUBLIC_TELEGRAM_MEMBER_ID = 'telegram-member';
export const PUBLIC_TELEGRAM_MEMBER_NAME = 'Telegram member';

export type InternalHopeHubLiveGroupMessage = {
  id: string;
  groupId: string;
  senderId: string;
  senderName: string;
  senderRole: string | null;
  body: string;
  isDeleted?: boolean;
  deletedAt?: Date | null;
  deletedByUserId?: string | null;
  createdAt: Date;
};

/**
 * Builds the only message shape that may be returned to Healing Hub clients.
 * Telegram identity is intentionally retained only in the database for private
 * moderation and never included in a public HTTP or Socket.IO payload.
 */
export function serializePublicHopeHubLiveGroupMessage(message: InternalHopeHubLiveGroupMessage) {
  const isTelegramMember = message.senderRole === 'TELEGRAM_MEMBER';

  return {
    id: message.id,
    groupId: message.groupId,
    senderId: isTelegramMember ? PUBLIC_TELEGRAM_MEMBER_ID : message.senderId,
    senderName: isTelegramMember ? PUBLIC_TELEGRAM_MEMBER_NAME : message.senderName,
    senderRole: message.senderRole,
    body: message.isDeleted ? 'Message removed by moderator.' : message.body,
    isDeleted: Boolean(message.isDeleted),
    deletedAt: message.deletedAt?.toISOString() ?? null,
    // Never expose the internal account ID of the moderator to public clients.
    deletedByUserId: null,
    createdAt: message.createdAt.toISOString()
  };
}

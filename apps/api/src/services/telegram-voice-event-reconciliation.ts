const TERMINAL_EVENT_STATUSES = new Set(['COMPLETED', 'MISSED', 'CANCELLED']);

export function isManagedTelegramVoiceChat(chatId: string, managedChatId?: string | null) {
  const normalizedManagedChatId = managedChatId?.trim();
  return Boolean(normalizedManagedChatId && chatId.trim() === normalizedManagedChatId);
}

/**
 * Selects the scheduled event that may safely adopt an unassociated live
 * Telegram call. A tracked event always wins. Without a usable tracked event,
 * only the latest overdue event in that chat may adopt the call; this prevents
 * one call from being attached to every old missed slot.
 */
export function shouldAdoptLiveVoiceCall(input: {
  eventId: string;
  latestOverdueEventId: string;
  trackedEventId?: string;
  trackedEventStatus?: string;
}) {
  if (input.trackedEventId === input.eventId) return true;
  if (input.eventId !== input.latestOverdueEventId) return false;
  if (!input.trackedEventId) return true;
  if (!input.trackedEventStatus) return true;
  // Unknown statuses fail closed so a future event lifecycle state cannot be
  // silently stolen by this recovery path.
  return TERMINAL_EVENT_STATUSES.has(input.trackedEventStatus);
}

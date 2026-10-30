import { telegramPersonName, type TelegramPersonForLog } from './telegram-group-help.people.js';
import type { CommunityTelegramMessageEntity } from './telegram-community-bots.types.js';

export function groupHelpModerationMemberLabel(member: TelegramPersonForLog) {
  const name = telegramPersonName(member).replace(/\s+/g, ' ').slice(0, 256);
  const username = member.username?.trim().replace(/^@/, '') || '';
  const id = member.id ?? member.telegramUserId;
  return /^[a-zA-Z0-9_]{1,32}$/.test(username)
    ? `${name} (@${username})`
    : `${name}${id == null ? '' : ` [${id}]`}`;
}

/** Telegram entity offsets use UTF-16, matching JavaScript string indices. */
export function groupHelpModerationMemberEntities(
  text: string,
  member: TelegramPersonForLog
): CommunityTelegramMessageEntity[] {
  const id = Number(member.id ?? member.telegramUserId);
  const label = groupHelpModerationMemberLabel(member);
  const start = text.indexOf(`Member: ${label}`);
  const entities: CommunityTelegramMessageEntity[] = [];
  if (Number.isSafeInteger(id) && id > 0 && start >= 0) {
    entities.push({
      type: 'text_mention',
      offset: start + 'Member: '.length,
      length: label.length,
      user: { id, is_bot: false, first_name: telegramPersonName(member).slice(0, 64) }
    });
  }
  // Explicit entities must also preserve the editable Contact Bot link and
  // other normal username mentions outside the linked member label.
  for (const match of text.matchAll(/(^|[^\w@])(@[a-zA-Z0-9_]{1,32})(?![a-zA-Z0-9_])/g)) {
    const offset = match.index! + match[1].length;
    const length = match[2].length;
    if (
      !entities.some(
        (entity) => offset < entity.offset + entity.length && offset + length > entity.offset
      )
    ) {
      entities.push({ type: 'mention', offset, length });
    }
  }
  return entities.sort((a, b) => a.offset - b.offset);
}

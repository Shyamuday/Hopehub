/**
 * Operational messages identify people by the name Telegram presents to the
 * group, not by a mutable public username. The numeric ID remains for staff
 * to identify the account unambiguously.
 */
export type TelegramPersonForLog = {
  id?: string | number | null;
  telegramUserId?: string | number | null;
  first_name?: string | null;
  last_name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
};

export function telegramPersonName(
  person: TelegramPersonForLog | null | undefined,
  fallback = 'Telegram member'
) {
  const name = [person?.first_name ?? person?.firstName, person?.last_name ?? person?.lastName]
    .filter((value): value is string => Boolean(value?.trim()))
    .map((value) => value.trim())
    .join(' ');
  return name || fallback;
}

export function telegramPersonLogLabel(
  person: TelegramPersonForLog | null | undefined,
  fallback = 'Telegram member'
) {
  const id = person?.id ?? person?.telegramUserId;
  return id == null
    ? telegramPersonName(person, fallback)
    : `${telegramPersonName(person, fallback)} [${id}]`;
}

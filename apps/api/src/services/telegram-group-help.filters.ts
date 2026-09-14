import type { CommunityTelegramMessage } from './telegram-community-bots.types.js';

export type GroupHelpFilterMatchMode = 'contains' | 'prefix' | 'exact';
export type GroupHelpFilterTrigger = { value: string; mode: GroupHelpFilterMatchMode };
export type GroupHelpFilterMedia = {
  type: 'sticker' | 'photo' | 'animation' | 'video' | 'video_note' | 'document' | 'audio' | 'voice';
  fileId: string;
};

export type GroupHelpFilter = {
  triggers: GroupHelpFilterTrigger[];
  text?: string;
  media?: GroupHelpFilterMedia;
  button?: { text: string; url: string };
  audience: 'all' | 'users' | 'admins';
  allowBots: boolean;
  commandDescription?: string;
};

const STORAGE_PREFIX = 'rose-filter:';

function unquote(value: string) {
  const trimmed = value.trim();
  return trimmed.length >= 2 && trimmed[0] === '"' && trimmed.at(-1) === '"'
    ? trimmed.slice(1, -1).replace(/\\"/g, '"')
    : trimmed;
}

export function parseGroupHelpFilterTrigger(value: string): GroupHelpFilterTrigger | undefined {
  let trigger = unquote(value).trim();
  let mode: GroupHelpFilterMatchMode = 'contains';
  if (/^prefix:/i.test(trigger)) {
    mode = 'prefix';
    trigger = trigger.replace(/^prefix:/i, '').trim();
  } else if (/^exact:/i.test(trigger)) {
    mode = 'exact';
    trigger = trigger.replace(/^exact:/i, '').trim();
  }
  if (!trigger || trigger.length > 200) return undefined;
  return { value: trigger, mode };
}

function splitCommaList(value: string) {
  const entries: string[] = [];
  let current = '';
  let quoted = false;
  for (const character of value) {
    if (character === '"') quoted = !quoted;
    if (character === ',' && !quoted) {
      entries.push(current);
      current = '';
    } else {
      current += character;
    }
  }
  if (current.trim()) entries.push(current);
  return entries;
}

export function parseGroupHelpFilterCommand(text: string) {
  let remaining = text.trim().replace(/^\/filter(?:@\w+)?\s*/i, '');
  if (!remaining) return undefined;
  let rawTriggers = '';

  if (remaining.startsWith('(')) {
    let quoted = false;
    let end = -1;
    for (let index = 1; index < remaining.length; index += 1) {
      if (remaining[index] === '"') quoted = !quoted;
      if (remaining[index] === ')' && !quoted) {
        end = index;
        break;
      }
    }
    if (end < 0) return undefined;
    rawTriggers = remaining.slice(1, end);
    remaining = remaining.slice(end + 1).trim();
  } else if (remaining.startsWith('"')) {
    let end = -1;
    for (let index = 1; index < remaining.length; index += 1) {
      if (remaining[index] === '"' && remaining[index - 1] !== '\\') {
        end = index;
        break;
      }
    }
    if (end < 0) return undefined;
    rawTriggers = remaining.slice(0, end + 1);
    remaining = remaining.slice(end + 1).trim();
  } else {
    const space = remaining.search(/\s/);
    rawTriggers = space < 0 ? remaining : remaining.slice(0, space);
    remaining = space < 0 ? '' : remaining.slice(space).trim();
  }

  const triggers = (rawTriggers.includes(',') ? splitCommaList(rawTriggers) : [rawTriggers])
    .map(parseGroupHelpFilterTrigger)
    .filter((trigger): trigger is GroupHelpFilterTrigger => Boolean(trigger));
  if (!triggers.length) return undefined;
  return { triggers, response: remaining };
}

export function filterControlOptions(response: string) {
  const userOnly = /\{user\}/i.test(response);
  const adminOnly = /\{admin\}/i.test(response);
  const command = /\{command(?:\s+([^}]+))?\}/i.exec(response);
  return {
    text: response
      .replace(/\{(?:user|admin|allow_bot)\}/gi, '')
      .replace(/\{command(?:\s+[^}]+)?\}/gi, '')
      .trim(),
    audience: (adminOnly ? 'admins' : userOnly ? 'users' : 'all') as GroupHelpFilter['audience'],
    allowBots: /\{allow_bot\}/i.test(response),
    commandDescription:
      command?.[1]?.trim().slice(0, 256) || (command ? 'Custom command' : undefined)
  };
}

function validFilter(value: unknown): value is GroupHelpFilter {
  if (!value || typeof value !== 'object') return false;
  const filter = value as GroupHelpFilter;
  return (
    Array.isArray(filter.triggers) &&
    filter.triggers.length > 0 &&
    filter.triggers.every(
      (trigger) =>
        trigger &&
        typeof trigger.value === 'string' &&
        ['contains', 'prefix', 'exact'].includes(trigger.mode)
    ) &&
    ['all', 'users', 'admins'].includes(filter.audience) &&
    typeof filter.allowBots === 'boolean' &&
    (!filter.button ||
      (typeof filter.button.text === 'string' &&
        filter.button.text.length > 0 &&
        typeof filter.button.url === 'string' &&
        /^https:\/\//i.test(filter.button.url)))
  );
}

export function parseGroupHelpFilters(definitions: string) {
  const filters: GroupHelpFilter[] = [];
  const passthrough: string[] = [];
  for (const rawLine of definitions.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.startsWith(STORAGE_PREFIX)) {
      try {
        const parsed = JSON.parse(line.slice(STORAGE_PREFIX.length));
        if (validFilter(parsed)) filters.push(parsed);
        else passthrough.push(rawLine);
      } catch {
        passthrough.push(rawLine);
      }
      continue;
    }
    const [rawTrigger, rawText, rawButtonText, rawButtonUrl, ...extra] = line.split('=>');
    const trigger = parseGroupHelpFilterTrigger(rawTrigger || '');
    const text = rawText?.trim();
    if (!trigger || !text || extra.length) {
      passthrough.push(rawLine);
      continue;
    }
    // Preserve the established Hope Hub inline-button syntax.
    const buttonText = rawButtonText?.trim();
    const buttonUrl = rawButtonUrl?.trim();
    filters.push({
      triggers: [trigger],
      text,
      ...(buttonText && buttonUrl && /^https:\/\//i.test(buttonUrl)
        ? { button: { text: buttonText, url: buttonUrl } }
        : {}),
      audience: 'all',
      allowBots: false
    });
  }
  return { filters, passthrough };
}

export function serializeGroupHelpFilters(filters: GroupHelpFilter[], passthrough: string[] = []) {
  return [
    ...passthrough,
    ...filters.map((filter) => `${STORAGE_PREFIX}${JSON.stringify(filter)}`)
  ].join('\n');
}

function normalized(value: string) {
  return value.normalize('NFKC').toLocaleLowerCase().replace(/\s+/g, ' ').trim();
}

function triggerMatches(text: string, trigger: GroupHelpFilterTrigger) {
  const haystack = normalized(text);
  const needle = normalized(trigger.value);
  if (trigger.mode === 'exact') return haystack === needle;
  if (trigger.mode === 'prefix') return haystack.startsWith(needle);
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^\\p{L}\\p{N}_])${escaped}(?=$|[^\\p{L}\\p{N}_])`, 'iu').test(haystack);
}

export function matchingGroupHelpFilter(input: {
  text: string;
  definitions: string;
  senderIsBot: boolean;
  senderIsAdmin: boolean;
}) {
  return parseGroupHelpFilters(input.definitions).filters.find((filter) => {
    if (input.senderIsBot && !filter.allowBots) return false;
    if (filter.audience === 'users' && input.senderIsAdmin) return false;
    if (filter.audience === 'admins' && !input.senderIsAdmin) return false;
    return filter.triggers.some((trigger) => triggerMatches(input.text, trigger));
  });
}

function escapeMarkdown(value: string) {
  return value.replace(/([_*`[\]])/g, '\\$1');
}

function mention(user: CommunityTelegramMessage['from']) {
  if (!user) return 'Telegram member';
  const label = escapeMarkdown(user.first_name || user.username || 'Telegram member');
  return `[${label}](tg://user?id=${user.id})`;
}

export function renderGroupHelpFilterText(
  filter: GroupHelpFilter,
  message: CommunityTelegramMessage
) {
  const sender = message.from;
  const replied = message.reply_to_message?.from;
  const fullName = sender
    ? [sender.first_name, sender.last_name].filter(Boolean).join(' ') || 'Telegram member'
    : 'Telegram member';
  return (filter.text || '')
    .replace(/\{first\}/gi, escapeMarkdown(sender?.first_name || 'Telegram member'))
    .replace(/\{last\}/gi, escapeMarkdown(sender?.last_name || ''))
    .replace(/\{fullname\}/gi, escapeMarkdown(fullName))
    .replace(/\{username\}/gi, escapeMarkdown(sender?.username ? `@${sender.username}` : ''))
    .replace(/\{id\}/gi, String(sender?.id || ''))
    .replace(/\{chatname\}/gi, escapeMarkdown(message.chat.title || 'this group'))
    .replace(/\{mention\}/gi, mention(sender))
    .replace(/\{replytag\}/gi, mention(replied || sender));
}

export function groupHelpFilterMediaFromMessage(
  message: CommunityTelegramMessage | undefined
): GroupHelpFilterMedia | undefined {
  if (!message) return undefined;
  const candidates: Array<[GroupHelpFilterMedia['type'], string | undefined]> = [
    ['sticker', message.sticker?.file_id],
    ['photo', message.photo?.at(-1)?.file_id],
    ['animation', message.animation?.file_id],
    ['video', message.video?.file_id],
    ['video_note', message.video_note?.file_id],
    ['document', message.document?.file_id],
    ['audio', message.audio?.file_id],
    ['voice', message.voice?.file_id]
  ];
  const found = candidates.find(([, fileId]) => Boolean(fileId));
  return found?.[1] ? { type: found[0], fileId: found[1] } : undefined;
}

export function groupHelpFilterCommandSuggestions(definitions: string) {
  return parseGroupHelpFilters(definitions).filters.flatMap((filter) => {
    if (!filter.commandDescription) return [];
    return filter.triggers
      .filter((trigger) => trigger.value.startsWith('/'))
      .map((trigger) => trigger.value.slice(1).toLowerCase())
      .filter((command) => /^[a-z0-9_]{1,32}$/.test(command))
      .map((command) => ({ command, description: filter.commandDescription! }));
  });
}

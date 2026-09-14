import type { TelegramKeyboard } from './telegram-community-bots.types.js';

type FormatButton = TelegramKeyboard['inline_keyboard'][number][number];

export type GroupHelpFormattedMessage = {
  text: string;
  replyMarkup?: TelegramKeyboard;
  disableNotification: boolean;
  protectContent: boolean;
  showLinkPreview: boolean;
  mediaSpoiler: boolean;
};

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttribute(value: string) {
  return escapeHtml(value).replace(/"/g, '&quot;');
}

function externalUrl(value: string) {
  const candidate = /^[a-z][a-z\d+.-]*:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const parsed = new URL(candidate);
    return ['http:', 'https:', 'tg:'].includes(parsed.protocol) ? parsed.toString() : undefined;
  } catch {
    return undefined;
  }
}

export function selectGroupHelpRandomContent(source: string, random = Math.random) {
  const choices = source
    .split(/^%%%\s*$/m)
    .map((choice) => choice.trim())
    .filter(Boolean);
  if (choices.length <= 1) return choices[0] || '';
  return choices[Math.min(choices.length - 1, Math.floor(random() * choices.length))];
}

function markdownToTelegramHtml(source: string) {
  const protectedContent: string[] = [];
  const protect = (html: string) => {
    const token = `\uE000${protectedContent.length}\uE001`;
    protectedContent.push(html);
    return token;
  };
  let text = source.replace(/\\([_*~|`[\]()])/g, (_, character: string) =>
    protect(escapeHtml(character))
  );
  text = text.replace(/`([^`\n]+)`/g, (_, code: string) =>
    protect(`<code>${escapeHtml(code)}</code>`)
  );
  text = text.replace(/\[([^\]\n]+)\]\(([^)\s]+)\)/g, (match, label: string, rawUrl: string) => {
    const url = externalUrl(rawUrl);
    return url ? protect(`<a href="${escapeAttribute(url)}">${escapeHtml(label)}</a>`) : match;
  });
  text = escapeHtml(text)
    .replace(/\|\|(.+?)\|\|/g, '<tg-spoiler>$1</tg-spoiler>')
    .replace(/__(.+?)__/g, '<u>$1</u>')
    .replace(/\*([^*\n]+)\*/g, '<b>$1</b>')
    .replace(/_([^_\n]+)_/g, '<i>$1</i>')
    .replace(/~([^~\n]+)~/g, '<s>$1</s>');

  const lines = text.split('\n');
  const output: string[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (!lines[index].startsWith('&gt;')) {
      output.push(lines[index]);
      continue;
    }
    const quote: string[] = [];
    while (index < lines.length && lines[index].startsWith('&gt;')) {
      quote.push(lines[index].slice(4));
      index += 1;
    }
    index -= 1;
    const expandable = quote.at(-1)?.endsWith('||') || false;
    if (expandable) quote[quote.length - 1] = quote.at(-1)!.slice(0, -2);
    output.push(`<blockquote${expandable ? ' expandable' : ''}>${quote.join('\n')}</blockquote>`);
  }
  return output
    .join('\n')
    .replace(/\uE000(\d+)\uE001/g, (_, index: string) => protectedContent[Number(index)] || '');
}

export function formatGroupHelpMessage(
  source: string,
  random = Math.random
): GroupHelpFormattedMessage {
  let selected = selectGroupHelpRandomContent(source, random);
  const disableNotification = /\{nonotif\}/i.test(selected);
  const protectContent = /\{protect\}/i.test(selected);
  const showLinkPreview = /\{preview\}/i.test(selected);
  const mediaSpoiler = /\{mediaspoiler\}/i.test(selected);
  const addRulesButton = /\{rules\}/i.test(selected);
  selected = selected.replace(/\{(?:nonotif|protect|preview|mediaspoiler|rules)\}/gi, '').trim();

  const rows: FormatButton[][] = [];
  selected = selected.replace(
    /\[([^\]\n]+)\]\(buttonurl:\/\/([^)]+)\)/gi,
    (_match, label: string, rawTarget: string) => {
      const sameRow = rawTarget.endsWith(':same');
      const target = sameRow ? rawTarget.slice(0, -5) : rawTarget;
      const button: FormatButton | undefined = target.startsWith('#')
        ? target.slice(1)
          ? { text: label, callback_data: `hh_note:${target.slice(1, 45)}` }
          : undefined
        : externalUrl(target)
          ? { text: label, url: externalUrl(target)! }
          : undefined;
      if (button) {
        if (sameRow && rows.length) rows[rows.length - 1].push(button);
        else rows.push([button]);
      }
      return '';
    }
  );
  if (addRulesButton) rows.push([{ text: 'Rules', callback_data: 'hh_menu_rules' }]);
  return {
    text: markdownToTelegramHtml(selected.trim()),
    ...(rows.length ? { replyMarkup: { inline_keyboard: rows } } : {}),
    disableNotification,
    protectContent,
    showLinkPreview,
    mediaSpoiler
  };
}

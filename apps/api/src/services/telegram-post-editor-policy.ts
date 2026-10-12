import type { CommunityTelegramMessage } from './telegram-community-bots.types.js';

export function postContent(message: CommunityTelegramMessage) {
  const text = message.text ?? message.caption ?? '';
  const video = message.video?.file_id;
  const photo = message.photo?.at(-1)?.file_id;
  const imageUrl = video ? `video:${video}` : photo ? `photo:${photo}` : null;
  if (!text.trim() && !imageUrl)
    throw new Error('Send text, a photo, or a video with an optional caption.');
  if (text.length > (imageUrl ? 1024 : 4096))
    throw new Error(
      imageUrl
        ? 'Caption must be at most 1024 characters.'
        : 'Text must be at most 4096 characters.'
    );
  return { text, imageUrl, kind: 'MESSAGE' };
}

export function postSchedule(value: string, now = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(value))
    throw new Error('Use YYYY-MM-DD HH:mm in IST.');
  const date = new Date(value.replace(' ', 'T') + ':00+05:30');
  if (!Number.isFinite(date.getTime()))
    throw new Error('Choose a valid future date and time in IST.');
  const roundTrip = new Date(date.getTime() + 330 * 60000)
    .toISOString()
    .slice(0, 16)
    .replace('T', ' ');
  if (roundTrip !== value || date <= now)
    throw new Error('Choose a valid future date and time in IST.');
  return date;
}

export function postInteger(value: string, minimum: number, maximum: number) {
  if (!/^\d+$/.test(value)) throw new Error('Send a whole number.');
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < minimum || number > maximum)
    throw new Error(`Choose a number from ${minimum} to ${maximum}.`);
  return number;
}

export function postButtons(value: string) {
  if (value === '-') return [];
  const rows = value.split('\n').filter((line) => line.trim());
  if (rows.length > 8) throw new Error('Use at most 8 buttons.');
  return rows.map((line) => {
    const separator = line.indexOf('|');
    const text = line.slice(0, separator).trim();
    const url = line.slice(separator + 1).trim();
    if (separator < 1 || !text || text.length > 64 || !/^https:\/\//i.test(url))
      throw new Error('Use Label | https://example.com, one button per line.');
    try {
      new URL(url);
    } catch {
      throw new Error('Button URL is invalid.');
    }
    return { text, url };
  });
}

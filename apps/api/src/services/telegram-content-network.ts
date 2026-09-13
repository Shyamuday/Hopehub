import { createHash } from 'node:crypto';
import { prisma } from '../db.js';
import { callCommunityTelegramApi } from './telegram-community-bots.client.js';
import type { CommunityBotSlug } from './telegram-community-bots.types.js';

const FETCH_TIMEOUT_MS = 12_000;
const MAX_FEED_CHARS = 1_500_000;
const MAX_FEED_ITEMS = 25;
const MAX_SOURCE_REFRESHES_PER_SWEEP = 3;
const MAX_POSTS_PER_SWEEP = 5;

type FeedEntry = {
  title: string;
  summary: string;
  url: string;
  imageUrl?: string;
  publishedAt?: Date;
};

function decodeXml(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)));
}

function plainText(value: string | undefined, maximum = 700) {
  const text = decodeXml(value || '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > maximum ? `${text.slice(0, Math.max(0, maximum - 1)).trimEnd()}…` : text;
}

function tag(block: string, names: string[]) {
  for (const name of names) {
    const match = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, 'i').exec(block);
    if (match?.[1]) return match[1];
  }
  return '';
}

function atomLink(block: string) {
  const match = /<link\b[^>]*\bhref=["']([^"']+)["'][^>]*>/i.exec(block);
  return match?.[1] || '';
}

function mediaUrl(block: string) {
  const match =
    /<(?:media:content|media:thumbnail|enclosure)\b[^>]*\burl=["']([^"']+)["'][^>]*>/i.exec(block);
  return match?.[1] || undefined;
}

function validPublicHttpsUrl(value: string | undefined) {
  if (!value) return '';
  try {
    const url = new URL(decodeXml(value).trim());
    const host = url.hostname.toLowerCase();
    const isPrivateIpv4 =
      /^(?:0|10|127)\./.test(host) ||
      /^169\.254\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^172\.(?:1[6-9]|2\d|3[01])\./.test(host);
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      host === 'localhost' ||
      host.endsWith('.localhost') ||
      isPrivateIpv4 ||
      host === '::1' ||
      host === '0.0.0.0' ||
      /^(?:fc|fd)[0-9a-f]{2}:/i.test(host) ||
      /^fe[89ab][0-9a-f]:/i.test(host)
    ) {
      return '';
    }
    return url.toString();
  } catch {
    return '';
  }
}

export function parseSyndicationFeed(xml: string): FeedEntry[] {
  const blocks = [...xml.matchAll(/<(?:item|entry)(?:\s[^>]*)?>([\s\S]*?)<\/(?:item|entry)>/gi)]
    .map((match) => match[1])
    .slice(0, MAX_FEED_ITEMS);
  const seen = new Set<string>();
  return blocks.flatMap((block) => {
    const title = plainText(tag(block, ['title']), 160);
    const url = validPublicHttpsUrl(tag(block, ['link', 'guid']) || atomLink(block));
    if (!title || !url || seen.has(url)) return [];
    seen.add(url);
    const rawDate = plainText(tag(block, ['pubDate', 'published', 'updated']), 80);
    const parsedDate = rawDate ? new Date(rawDate) : undefined;
    return [
      {
        title,
        url,
        summary: plainText(
          tag(block, ['description', 'summary', 'content:encoded', 'content']),
          700
        ),
        imageUrl: validPublicHttpsUrl(mediaUrl(block)) || undefined,
        publishedAt: parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : undefined
      }
    ];
  });
}

function contentKey(sourceId: string, url: string) {
  return createHash('sha256').update(`${sourceId}\n${url}`).digest('hex');
}

function postText(entry: FeedEntry, attribution: string) {
  return [entry.title, entry.summary, `Source: ${attribution}`, `Read more: ${entry.url}`]
    .filter(Boolean)
    .join('\n\n')
    .slice(0, 4000);
}

export async function refreshTelegramContentSource(sourceId: string, now = new Date()) {
  const source = await prisma.telegramContentSource.findUnique({
    where: { id: sourceId },
    include: { channel: true }
  });
  if (!source) throw new Error('Content source not found.');
  const feedUrl = validPublicHttpsUrl(source.feedUrl);
  if (!feedUrl) throw new Error('A source feed must use a public HTTPS URL.');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(feedUrl, {
      signal: controller.signal,
      headers: {
        Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9',
        'User-Agent': 'HopeHubContentNetwork/1.0 (+https://hopehub.in)'
      }
    });
    if (!response.ok) throw new Error(`Feed returned HTTP ${response.status}.`);
    const xml = (await response.text()).slice(0, MAX_FEED_CHARS);
    const entries = parseSyndicationFeed(xml);
    if (!entries.length) throw new Error('No usable RSS or Atom items were found in this feed.');
    let created = 0;
    for (const entry of entries) {
      const result = await prisma.telegramContentItem.createMany({
        data: [
          {
            channelId: source.channelId,
            sourceId: source.id,
            contentKey: contentKey(source.id, entry.url),
            title: entry.title,
            summary: entry.summary || null,
            postText: postText(entry, source.attribution),
            sourceUrl: entry.url,
            imageUrl: entry.imageUrl || null,
            publishedSourceAt: entry.publishedAt || null,
            status: source.autoApprove && !source.channel.requireApproval ? 'APPROVED' : 'PENDING',
            scheduledFor: source.autoApprove && !source.channel.requireApproval ? now : null
          }
        ],
        skipDuplicates: true
      });
      created += result.count;
    }
    await prisma.telegramContentSource.update({
      where: { id: source.id },
      data: {
        lastFetchedAt: now,
        nextFetchAt: new Date(now.getTime() + source.fetchIntervalMinutes * 60_000),
        lastError: null
      }
    });
    return { sourceId: source.id, found: entries.length, created };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    await prisma.telegramContentSource.update({
      where: { id: source.id },
      data: {
        lastFetchedAt: now,
        nextFetchAt: new Date(now.getTime() + 60 * 60_000),
        lastError: detail.slice(0, 1000)
      }
    });
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export async function reviewTelegramContentItem(input: {
  itemId: string;
  status: 'APPROVED' | 'REJECTED';
  reviewerId: string;
  scheduledFor?: Date;
}) {
  return prisma.telegramContentItem.update({
    where: { id: input.itemId },
    data: {
      status: input.status,
      reviewedAt: new Date(),
      reviewedById: input.reviewerId,
      scheduledFor: input.status === 'APPROVED' ? input.scheduledFor || new Date() : null,
      error: null
    }
  });
}

async function publishTelegramContentItem(itemId: string, now = new Date()) {
  const item = await prisma.telegramContentItem.findUnique({
    where: { id: itemId },
    include: { channel: true }
  });
  if (!item || item.status !== 'APPROVED' || !item.channel.isActive) return null;
  const sent = item.imageUrl
    ? await callCommunityTelegramApi<{ message_id: number }>(
        item.channel.bot as CommunityBotSlug,
        'sendPhoto',
        {
          chat_id: item.channel.chatId,
          photo: item.imageUrl,
          caption: item.postText.slice(0, 1024)
        }
      )
    : await callCommunityTelegramApi<{ message_id: number }>(
        item.channel.bot as CommunityBotSlug,
        'sendMessage',
        { chat_id: item.channel.chatId, text: item.postText, disable_web_page_preview: true }
      );
  return prisma.telegramContentItem.update({
    where: { id: item.id },
    data: { status: 'PUBLISHED', publishedAt: now, telegramMessageId: sent.message_id, error: null }
  });
}

export async function runTelegramContentNetworkScheduler(now = new Date()) {
  const dueSources = await prisma.telegramContentSource.findMany({
    where: { isActive: true, OR: [{ nextFetchAt: null }, { nextFetchAt: { lte: now } }] },
    orderBy: { nextFetchAt: 'asc' },
    take: MAX_SOURCE_REFRESHES_PER_SWEEP
  });
  const refreshes = await Promise.allSettled(
    dueSources.map((source) => refreshTelegramContentSource(source.id, now))
  );

  const dueItems = await prisma.telegramContentItem.findMany({
    where: {
      status: 'APPROVED',
      scheduledFor: { lte: now },
      channel: { isActive: true }
    },
    include: { channel: true },
    orderBy: [{ scheduledFor: 'asc' }, { createdAt: 'asc' }],
    take: MAX_POSTS_PER_SWEEP
  });
  const published: string[] = [];
  for (const item of dueItems) {
    const last = await prisma.telegramContentItem.findFirst({
      where: { channelId: item.channelId, status: 'PUBLISHED', publishedAt: { not: null } },
      select: { publishedAt: true },
      orderBy: { publishedAt: 'desc' }
    });
    if (
      last?.publishedAt &&
      last.publishedAt.getTime() + item.channel.minimumPostGapMinutes * 60_000 > now.getTime()
    ) {
      continue;
    }
    try {
      if (await publishTelegramContentItem(item.id, now)) published.push(item.id);
    } catch (error) {
      await prisma.telegramContentItem.update({
        where: { id: item.id },
        data: {
          status: 'FAILED',
          error: (error instanceof Error ? error.message : String(error)).slice(0, 1000)
        }
      });
    }
  }
  return {
    refreshed: refreshes.filter((result) => result.status === 'fulfilled').length,
    published: published.length
  };
}

export { validPublicHttpsUrl };

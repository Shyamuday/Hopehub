import { prisma as defaultPrisma } from '../db.js';
import { campaignReference, resolveCampaignReference } from './telegram-post-references.js';
import type { TelegramKeyboard } from './telegram-community-bots.types.js';

const PREFIX = 'hh_cfg_posts';
const stamp = (value: Date | null) =>
  value ? value.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST' : 'Not recorded';

// Called only after the private settings session and group admin check.
export async function scheduledPostSettings(
  action: string,
  chatId: string,
  prisma = defaultPrisma
): Promise<{ text: string; keyboard: TelegramKeyboard }> {
  const parts = action.split(':');
  const operation = parts[1];
  let id: string | undefined = parts[2];
  if (id?.startsWith('~')) {
    const ids = await prisma.telegramCampaign.findMany({ where: { chatId }, select: { id: true } });
    id = resolveCampaignReference(
      id,
      ids.map((row) => row.id)
    );
  }
  if (operation === 'item' && id) {
    const item = await prisma.telegramCampaignItem.findFirst({
      where: { id, campaign: { chatId } },
      include: { campaign: true }
    });
    if (!item) throw new Error('Post no longer exists in this group.');
    return {
      text: `${item.campaign.name}\nPost ${item.sortOrder + 1} · ${item.kind}\n\n${(item.text || item.pollQuestion || '(Media without caption)').slice(0, 2800)}\n\nSchedule: ${item.campaign.isActive ? 'Enabled' : 'Paused'} · Next due: ${stamp(item.campaign.nextRunAt)}`,
      keyboard: {
        inline_keyboard: [
          ...['content', 'topic', 'delete', 'buttons'].map((field) => [
            { text: `Edit ${field}`, callback_data: `${PREFIX}:edit:${id}:${field}` }
          ]),
          [
            {
              text: 'Schedule settings',
              callback_data: `${PREFIX}:view:${campaignReference(item.campaignId)}`
            }
          ],
          [{ text: 'Browse all posts', callback_data: `${PREFIX}:items:0` }]
        ]
      }
    };
  }
  if (operation === 'items') id = undefined;
  if (id && operation) {
    const campaign = await prisma.telegramCampaign.findFirst({ where: { id, chatId } });
    if (!campaign) throw new Error('Scheduled post no longer exists in this group.');
    if (operation === 'cancel') {
      return {
        text: `Cancel the schedule for ${campaign.name}? Content and delivery history will be kept.`,
        keyboard: {
          inline_keyboard: [
            [
              {
                text: 'Yes, cancel schedule',
                callback_data: `${PREFIX}:cancelok:${campaignReference(id)}`
              }
            ],
            [{ text: 'Keep schedule', callback_data: `${PREFIX}:view:${campaignReference(id)}` }]
          ]
        }
      };
    }
    if (operation === 'cancelok') {
      await prisma.telegramCampaign.updateMany({
        where: { id, chatId },
        data: { isActive: false, nextRunAt: null }
      });
    }
    if (operation === 'toggle') {
      await prisma.telegramCampaign.updateMany({
        where: { id, chatId },
        data: {
          isActive: !campaign.isActive,
          nextRunAt: !campaign.isActive
            ? campaign.nextRunAt && campaign.nextRunAt > new Date()
              ? campaign.nextRunAt
              : new Date()
            : campaign.nextRunAt
        }
      });
    } else if (operation === 'r') {
      await prisma.telegramCampaign.updateMany({
        where: { id, chatId },
        data: { repeat: !campaign.repeat }
      });
    } else if (operation === 'i') {
      const minutes = Number(parts[3]);
      if (![30, 60, 120, 180, 480, 1440, 10080].includes(minutes))
        throw new Error('Choose an available interval.');
      await prisma.telegramCampaign.updateMany({
        where: { id, chatId },
        data: {
          intervalMinutes: minutes,
          nextRunAt: new Date((campaign.lastRunAt?.getTime() || Date.now()) + minutes * 60_000)
        }
      });
    }
  }
  const campaigns = await prisma.telegramCampaign.findMany({
    where: { chatId },
    orderBy: { name: 'asc' },
    include: {
      items: { orderBy: { sortOrder: 'asc' } },
      deliveries: { orderBy: { createdAt: 'desc' }, take: 1 }
    }
  });
  const selected = id ? campaigns.find((post) => post.id === id) : null;
  const allItems = campaigns.flatMap((post) => post.items.map((item) => ({ item, post })));
  if (operation === 'items') {
    const page = Math.max(
      0,
      Math.min(Math.max(0, Math.ceil(allItems.length / 10) - 1), Math.floor(Number(parts[2]) || 0))
    );
    return {
      text: `All posts: ${allItems.length} across ${campaigns.length} schedules, including paused schedules. Page ${page + 1} of ${Math.max(1, Math.ceil(allItems.length / 10))}. Choose a post to edit its content or schedule.`,
      keyboard: {
        inline_keyboard: [
          [{ text: 'Add new post', callback_data: `${PREFIX}:new` }],
          ...allItems.slice(page * 10, page * 10 + 10).map(({ item, post }) => [
            {
              text: `${post.isActive ? 'Active' : 'Paused'} · ${(item.text || item.pollQuestion || post.name).replace(/\s+/g, ' ').slice(0, 50)}`,
              callback_data: `${PREFIX}:item:${item.id}`
            }
          ]),
          ...(allItems.length > 10
            ? [
                [
                  ...(page > 0
                    ? [{ text: 'Previous', callback_data: `${PREFIX}:items:${page - 1}` }]
                    : []),
                  ...(page * 10 + 10 < allItems.length
                    ? [{ text: 'Next', callback_data: `${PREFIX}:items:${page + 1}` }]
                    : [])
                ]
              ]
            : []),
          [{ text: 'Manage schedules', callback_data: PREFIX }]
        ]
      }
    };
  }
  if (selected) {
    const ref = campaignReference(selected.id);
    const page =
      operation === 'page'
        ? Math.max(0, Math.min(Math.ceil(selected.items.length / 5) - 1, Number(parts[3]) || 0))
        : 0;
    const delivery = selected.deliveries[0];
    const sent = await prisma.telegramCampaignDelivery.aggregate({
      where: { campaignId: selected.id },
      _max: { sentAt: true }
    });
    return {
      text: [
        selected.name,
        `State: ${selected.isActive ? 'Enabled' : 'Paused'}`,
        `Repeat: ${selected.repeat ? 'Yes' : 'No'} ? Interval: ${selected.intervalMinutes} minutes`,
        `Last attempted: ${stamp(selected.lastRunAt)}`,
        `Last sent: ${stamp(sent._max.sentAt)}`,
        `Next due: ${stamp(selected.nextRunAt)}`,
        `Items: ${selected.items.length}. Edits affect future deliveries.`,
        ...selected.items
          .slice(page * 5, page * 5 + 5)
          .map(
            (item, index) =>
              `Item ${page * 5 + index + 1}: ${item.imageUrl?.startsWith('video:') ? 'Video' : item.imageUrl ? 'Media' : item.kind}\n${(item.text || item.pollQuestion || '(No text)').slice(0, 180)}`
          ),
        `Delivery: ${delivery?.status || 'No delivery'}`,
        delivery?.error ? `Failure: ${delivery.error}` : '',
        'Due posts wait in group order. Actual send time depends on the shared gap.'
      ]
        .filter(Boolean)
        .join('\n'),
      keyboard: {
        inline_keyboard: [
          ...['name', 'schedule', 'interval'].map((field) => [
            { text: `Edit ${field}`, callback_data: `${PREFIX}:edit:${ref}:${field}` }
          ]),
          ...selected.items.slice(page * 5, page * 5 + 5).flatMap((item, index) =>
            ['content', 'topic', 'delete', 'buttons'].map((field) => [
              {
                text: `Item ${page * 5 + index + 1}: edit ${field}`,
                callback_data: `${PREFIX}:edit:${item.id}:${field}`
              }
            ])
          ),
          ...(selected.items.length > 5
            ? [
                [
                  ...(page > 0
                    ? [
                        {
                          text: 'Previous items',
                          callback_data: `${PREFIX}:page:${ref}:${page - 1}`
                        }
                      ]
                    : []),
                  ...(page * 5 + 5 < selected.items.length
                    ? [{ text: 'Next items', callback_data: `${PREFIX}:page:${ref}:${page + 1}` }]
                    : [])
                ]
              ]
            : []),
          [
            {
              text: selected.repeat ? 'Repeat: on' : 'Repeat: off',
              callback_data: `${PREFIX}:r:${ref}`
            }
          ],
          [
            {
              text: selected.isActive ? 'Pause' : 'Enable',
              callback_data: `${PREFIX}:toggle:${ref}`
            }
          ],
          ...[30, 60, 120, 180, 480, 1440, 10080].map((minutes) => [
            { text: `Every ${minutes} min`, callback_data: `${PREFIX}:i:${ref}:${minutes}` }
          ]),
          [{ text: 'Cancel schedule', callback_data: `${PREFIX}:cancel:${ref}` }],
          [{ text: 'Back to scheduled posts', callback_data: PREFIX }]
        ]
      }
    };
  }
  return {
    text: `This group's schedules: ${campaigns.length} · Post items: ${allItems.length}\n\nBrowse all posts to see individual posts, including those inside rotating schedules. Or choose a schedule below to manage its settings. Posts in another group remain separate; use /schedule in that group to manage them.\n\nEach post offers: edit content/name, schedule date and time (IST), custom or preset interval, repeat, pause/resume, topic, link buttons, auto-deletion and cancel schedule.`,
    keyboard: {
      inline_keyboard: [
        [{ text: 'Add new post', callback_data: `${PREFIX}:new` }],
        [{ text: `Browse all ${allItems.length} posts`, callback_data: `${PREFIX}:items:0` }],
        ...campaigns.map((post) => [
          {
            text: `${post.isActive ? 'Active' : 'Paused'}: ${post.name}`.slice(0, 60),
            callback_data: `${PREFIX}:view:${campaignReference(post.id)}`
          }
        ]),
        [{ text: '? Settings home', callback_data: 'hh_cfg_home' }]
      ]
    }
  };
}

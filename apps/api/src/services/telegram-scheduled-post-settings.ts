import { prisma } from '../db.js';
import type { TelegramKeyboard } from './telegram-community-bots.types.js';

const PREFIX = 'hh_cfg_posts';
const stamp = (value: Date | null) =>
  value ? value.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST' : 'Not recorded';

// Called only after the private settings session and group admin check.
export async function scheduledPostSettings(
  action: string,
  chatId: string
): Promise<{ text: string; keyboard: TelegramKeyboard }> {
  const parts = action.split(':');
  const operation = parts[1];
  const id = parts[2];
  if (id && operation) {
    const campaign = await prisma.telegramCampaign.findFirst({ where: { id, chatId } });
    if (!campaign) throw new Error('Scheduled post no longer exists in this group.');
    if (operation === 'toggle') {
      await prisma.telegramCampaign.updateMany({
        where: { id, chatId },
        data: {
          isActive: !campaign.isActive,
          nextRunAt: !campaign.isActive ? new Date() : campaign.nextRunAt
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
    include: { deliveries: { orderBy: { createdAt: 'desc' }, take: 1 } }
  });
  const selected = id ? campaigns.find((post) => post.id === id) : null;
  if (selected) {
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
        `Delivery: ${delivery?.status || 'No delivery'}`,
        delivery?.error ? `Failure: ${delivery.error}` : '',
        'Due posts wait in group order. Actual send time depends on the shared gap.'
      ]
        .filter(Boolean)
        .join('\n'),
      keyboard: {
        inline_keyboard: [
          [
            {
              text: selected.repeat ? 'Repeat: on' : 'Repeat: off',
              callback_data: `${PREFIX}:r:${id}`
            }
          ],
          [
            {
              text: selected.isActive ? 'Pause' : 'Enable',
              callback_data: `${PREFIX}:toggle:${id}`
            }
          ],
          ...[30, 60, 120, 180, 480, 1440, 10080].map((minutes) => [
            { text: `Every ${minutes} min`, callback_data: `${PREFIX}:i:${id}:${minutes}` }
          ]),
          [{ text: '? Scheduled posts', callback_data: PREFIX }]
        ]
      }
    };
  }
  return {
    text: `${campaigns.length} scheduled posts. Choose a post to inspect or change its interval. Group spacing is under Content ? Minimum automated post gap.`,
    keyboard: {
      inline_keyboard: [
        ...campaigns.map((post) => [
          {
            text: `${post.isActive ? '?' : '?'} ${post.name}`.slice(0, 60),
            callback_data: `${PREFIX}:view:${post.id}`
          }
        ]),
        [{ text: '? Settings home', callback_data: 'hh_cfg_home' }]
      ]
    }
  };
}

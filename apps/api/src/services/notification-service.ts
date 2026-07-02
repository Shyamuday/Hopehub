import { createNotificationService, type NotificationChannel } from '../notifications.js';

export const enabledNotificationChannels = (process.env.NOTIFICATION_CHANNELS || 'IN_APP')
  .split(',')
  .map((v) => v.trim().toUpperCase())
  .filter(Boolean) as NotificationChannel[];

export const notificationService = createNotificationService(enabledNotificationChannels);

export type InAppNotificationItem = {
  id: string;
  eventType: string;
  title: string;
  body: string;
  metadata?: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
};

export type NotificationBellConfig = {
  apiBase: string;
  tokenKey: string;
  /** `/notifications` for platform users, `/store/notifications` for store staff */
  apiPath: string;
  pollMs?: number;
};

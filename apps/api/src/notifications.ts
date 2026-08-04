import { PrismaInAppNotificationProvider } from './services/in-app-notifications.js';
import { sendEmail } from './services/mail.js';

export type NotificationChannel = 'IN_APP' | 'SMS' | 'WHATSAPP' | 'EMAIL' | 'PUSH';
export type NotificationEventType =
  | 'DOSE_REMINDER'
  | 'DOSE_MISSED'
  | 'BOOKING_CONFIRMED'
  | 'BOOKING_REMINDER'
  | 'BOOKING_CANCELLED'
  | 'BOOKING_UNASSIGNED_ALERT'
  | 'PROVIDER_BOOKING_ASSIGNED'
  | 'SESSION_MISSED'
  | 'DOCTOR_ASSIGNED'
  | 'PRESCRIPTION_READY'
  | 'PLATFORM_BROADCAST'
  | 'VISITOR_LEAD_NEW';

export type NotificationMessage = {
  eventType: NotificationEventType;
  channel: NotificationChannel;
  recipientId?: string;
  recipientStoreStaffId?: string;
  recipientName?: string | null;
  recipientMobile?: string | null;
  recipientEmail?: string | null;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
};

export interface NotificationProvider {
  send(message: NotificationMessage): Promise<void>;
}

export class ConsoleNotificationProvider implements NotificationProvider {
  constructor(private readonly label = 'notification') {}

  async send(message: NotificationMessage) {
    console.info(`[${this.label}]`, {
      at: new Date().toISOString(),
      ...message
    });
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function bodyToHtml(body: string) {
  return escapeHtml(body)
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => `<p>${line}</p>`)
    .join('');
}

export class EmailNotificationProvider implements NotificationProvider {
  async send(message: NotificationMessage) {
    if (!message.recipientEmail) {
      console.warn('[notification-email] skipped: recipient email missing', {
        eventType: message.eventType,
        recipientId: message.recipientId
      });
      return;
    }

    await sendEmail({
      to: message.recipientEmail,
      subject: message.title,
      text: message.body,
      html: bodyToHtml(message.body)
    });
  }
}

export class ChannelRouterNotificationProvider implements NotificationProvider {
  constructor(
    private readonly providers: Partial<Record<NotificationChannel, NotificationProvider>>,
    private readonly fallbackProvider: NotificationProvider
  ) {}

  async send(message: NotificationMessage) {
    const provider = this.providers[message.channel] || this.fallbackProvider;
    await provider.send(message);
  }
}

export class NotificationService {
  constructor(private readonly provider: NotificationProvider) {}

  async sendBatch(messages: NotificationMessage[]) {
    if (!messages.length) {
      return;
    }

    await Promise.all(messages.map((message) => this.provider.send(message)));
  }
}

export function createNotificationService(enabledChannels: NotificationChannel[]) {
  const fallback = new ConsoleNotificationProvider('notification-fallback');
  const providers: Partial<Record<NotificationChannel, NotificationProvider>> = {
    IN_APP: new PrismaInAppNotificationProvider(),
    SMS: new ConsoleNotificationProvider('notification-sms'),
    WHATSAPP: new ConsoleNotificationProvider('notification-whatsapp'),
    EMAIL: new EmailNotificationProvider(),
    PUSH: new ConsoleNotificationProvider('notification-push')
  };

  const activeProviders = enabledChannels.reduce<
    Partial<Record<NotificationChannel, NotificationProvider>>
  >((acc, ch) => {
    if (providers[ch]) {
      acc[ch] = providers[ch];
    }
    return acc;
  }, {});

  return new NotificationService(new ChannelRouterNotificationProvider(activeProviders, fallback));
}

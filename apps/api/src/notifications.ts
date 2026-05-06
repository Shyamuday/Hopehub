export type NotificationChannel = 'IN_APP' | 'SMS' | 'WHATSAPP' | 'EMAIL' | 'PUSH';
export type NotificationEventType = 'DOSE_REMINDER' | 'DOSE_MISSED';

export type NotificationMessage = {
  eventType: NotificationEventType;
  channel: NotificationChannel;
  recipientId: string;
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
    IN_APP: new ConsoleNotificationProvider('notification-in-app'),
    SMS: new ConsoleNotificationProvider('notification-sms'),
    WHATSAPP: new ConsoleNotificationProvider('notification-whatsapp'),
    EMAIL: new ConsoleNotificationProvider('notification-email'),
    PUSH: new ConsoleNotificationProvider('notification-push')
  };

  const activeProviders = enabledChannels.reduce<Partial<Record<NotificationChannel, NotificationProvider>>>((acc, ch) => {
    if (providers[ch]) {
      acc[ch] = providers[ch];
    }
    return acc;
  }, {});

  return new NotificationService(new ChannelRouterNotificationProvider(activeProviders, fallback));
}

import twilio from 'twilio';

export type NotificationChannel = 'IN_APP' | 'SMS' | 'WHATSAPP' | 'EMAIL' | 'PUSH';
export type NotificationEventType = 'DOSE_REMINDER' | 'DOSE_MISSED' | 'BOOKING_CONFIRMED';

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

type TwilioConfig = {
  accountSid: string;
  authToken: string;
  smsFrom: string;
  whatsappFrom: string;
};

export class TwilioNotificationProvider implements NotificationProvider {
  private readonly client;

  constructor(private readonly config: TwilioConfig) {
    this.client = twilio(config.accountSid, config.authToken);
  }

  async send(message: NotificationMessage) {
    if (!message.recipientMobile) {
      return;
    }

    const to = this.normalizeMobile(message.recipientMobile);
    if (!to) {
      return;
    }

    if (message.channel === 'SMS' && this.config.smsFrom) {
      await this.client.messages.create({
        to,
        from: this.normalizeMobile(this.config.smsFrom) || this.config.smsFrom,
        body: `${message.title}\n${message.body}`
      });
      return;
    }

    if (message.channel === 'WHATSAPP' && this.config.whatsappFrom) {
      await this.client.messages.create({
        to: `whatsapp:${to}`,
        from: this.config.whatsappFrom.startsWith('whatsapp:')
          ? this.config.whatsappFrom
          : `whatsapp:${this.config.whatsappFrom}`,
        body: `${message.title}\n${message.body}`
      });
    }
  }

  private normalizeMobile(value: string) {
    const cleaned = value.replace(/[^\d+]/g, '');
    if (!cleaned) {
      return '';
    }

    if (cleaned.startsWith('+')) {
      return cleaned;
    }

    return `+${cleaned}`;
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
  const twilioProvider = createTwilioProviderOrNull();
  const providers: Partial<Record<NotificationChannel, NotificationProvider>> = {
    IN_APP: new ConsoleNotificationProvider('notification-in-app'),
    SMS: twilioProvider || new ConsoleNotificationProvider('notification-sms'),
    WHATSAPP: twilioProvider || new ConsoleNotificationProvider('notification-whatsapp'),
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

function createTwilioProviderOrNull() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID || '';
  const authToken = process.env.TWILIO_AUTH_TOKEN || '';
  const smsFrom = process.env.TWILIO_SMS_FROM || '';
  const whatsappFrom = process.env.TWILIO_WHATSAPP_FROM || '';
  if (!accountSid || !authToken || (!smsFrom && !whatsappFrom)) {
    return null;
  }

  return new TwilioNotificationProvider({
    accountSid,
    authToken,
    smsFrom,
    whatsappFrom
  });
}

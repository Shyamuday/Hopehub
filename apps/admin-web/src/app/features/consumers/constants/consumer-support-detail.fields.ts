import type { DetailFieldDef } from '@hopehub/platform-ui';

export type ConsumerAdherenceSummary = {
  percent: number;
  taken: number;
  total: number;
  skipped: number;
  missed: number;
};

export const CONSUMER_ADHERENCE_FIELDS: DetailFieldDef<ConsumerAdherenceSummary>[] = [
  {
    label: 'Adherence',
    getValue: (a) => `${a.percent}% (Taken ${a.taken} / ${a.total})`
  },
  {
    label: 'Skipped',
    getValue: (a) => `${a.skipped} | Missed: ${a.missed}`
  }
];

export type ReminderPreferences = {
  inApp: boolean;
  sms: boolean;
  whatsapp: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
};

export const REMINDER_PREFERENCE_FIELDS: DetailFieldDef<ReminderPreferences>[] = [
  {
    label: 'Channels',
    getValue: (p) =>
      `In-app ${p.inApp ? 'on' : 'off'} · SMS ${p.sms ? 'on' : 'off'} · WhatsApp ${p.whatsapp ? 'on' : 'off'}`
  },
  {
    label: 'Quiet hours',
    getValue: (p) => `${p.quietHoursStart} – ${p.quietHoursEnd}`
  }
];

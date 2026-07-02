export type ReminderPreference = {
  inApp: boolean;
  sms: boolean;
  whatsapp: boolean;
  push: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
};

export const DEFAULT_REMINDER_PREFERENCE: ReminderPreference = {
  inApp: true,
  sms: true,
  whatsapp: false,
  push: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00'
};

export type PatientReminderChannelsLive = {
  inApp: boolean;
  sms: boolean;
  whatsapp: boolean;
  push: boolean;
};

export type PatientExperienceConfig = {
  whatsappE164: string;
  whatsappMessage: string;
  reminderChannelsLive: PatientReminderChannelsLive;
};

export const defaultPatientExperience = (): PatientExperienceConfig => ({
  whatsappE164: '919876543210',
  whatsappMessage: 'Hi Vitalis Care and Research Centre, I need help with my consultation.',
  reminderChannelsLive: {
    inApp: true,
    sms: false,
    whatsapp: false,
    push: false
  }
});

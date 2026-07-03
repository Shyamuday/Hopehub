export type DevFillCredentials = {
  email?: string;
  identifier?: string;
  password?: string;
  mobile?: string;
  otp?: string;
  name?: string;
  staffCode?: string;
  pin?: string;
};

export type DevPersona = {
  id: string;
  label: string;
  app: string;
  description: string;
  loginLabel: string;
  credentials: DevFillCredentials;
};

export type DevAppGuide = {
  enabled: boolean;
  password: string;
  otp?: string;
  patientMobile?: string;
  personas: DevPersona[];
};

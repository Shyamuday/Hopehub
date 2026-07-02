export type DevFillCredentials = {
  email?: string;
  password?: string;
};

export type DevPersona = {
  id: string;
  label: string;
  loginLabel: string;
  credentials: DevFillCredentials;
};

export type DevAppGuide = {
  enabled: boolean;
  password: string;
  personas: DevPersona[];
};

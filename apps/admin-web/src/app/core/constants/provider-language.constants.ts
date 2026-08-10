import type { AdminFocusedWorkspace } from '../admin-permissions';

export type ProviderLanguage = {
  workspace: AdminFocusedWorkspace;
  provider: {
    singular: string;
    plural: string;
    singularLower: string;
    pluralLower: string;
    short: string;
    directory: string;
    portal: string;
  };
  consumer: {
    singular: string;
    plural: string;
    singularLower: string;
    pluralLower: string;
  };
  session: {
    singular: string;
    plural: string;
    singularLower: string;
    pluralLower: string;
  };
};

export const PROVIDER_LANGUAGE_BY_WORKSPACE: Record<AdminFocusedWorkspace, ProviderLanguage> = {
  'hope-hub': {
    workspace: 'hope-hub',
    provider: {
      singular: 'Hope Hub Provider',
      plural: 'Hope Hub Providers',
      singularLower: 'Hope Hub provider',
      pluralLower: 'Hope Hub providers',
      short: 'Provider',
      directory: 'Hope Hub provider directory',
      portal: 'Professional Help portal',
    },
    consumer: {
      singular: 'User',
      plural: 'Users',
      singularLower: 'user',
      pluralLower: 'users',
    },
    session: {
      singular: 'Session',
      plural: 'Sessions',
      singularLower: 'session',
      pluralLower: 'sessions',
    },
  },
  homeopathy: {
    workspace: 'homeopathy',
    provider: {
      singular: 'Homeopathy Provider',
      plural: 'Homeopathy Providers',
      singularLower: 'homeopathy provider',
      pluralLower: 'homeopathy providers',
      short: 'Provider',
      directory: 'Homeopathy provider directory',
      portal: 'Provider portal',
    },
    consumer: {
      singular: 'Patient',
      plural: 'Patients',
      singularLower: 'patient',
      pluralLower: 'patients',
    },
    session: {
      singular: 'Consultation',
      plural: 'Consultations',
      singularLower: 'consultation',
      pluralLower: 'consultations',
    },
  },
};

export function providerLanguageForWorkspace(
  workspace?: AdminFocusedWorkspace | null,
): ProviderLanguage {
  return PROVIDER_LANGUAGE_BY_WORKSPACE[workspace || 'hope-hub'];
}

export function providerTypeNoun(workspace?: AdminFocusedWorkspace | null): string {
  return providerLanguageForWorkspace(workspace).provider.singularLower;
}

export function providerTypePluralNoun(workspace?: AdminFocusedWorkspace | null): string {
  return providerLanguageForWorkspace(workspace).provider.pluralLower;
}

export function consumerNoun(workspace?: AdminFocusedWorkspace | null): string {
  return providerLanguageForWorkspace(workspace).consumer.singularLower;
}

export function consumerPluralNoun(workspace?: AdminFocusedWorkspace | null): string {
  return providerLanguageForWorkspace(workspace).consumer.pluralLower;
}

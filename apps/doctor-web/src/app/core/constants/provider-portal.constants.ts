import {
  HOMEOPATHY_PROVIDER_LANGUAGE,
  PH_PROVIDER_LANGUAGE,
  type ProviderAppLanguage,
} from './provider-language.constants';

export type ProviderPortalId = 'HOPE_HUB' | 'HOMEOPATHY';

export type ProviderPortalConfig = {
  id: ProviderPortalId;
  language: ProviderAppLanguage;
  pageTitle: string;
  loginDescription: string;
  signupTitle: string;
  signupDescription: string;
  defaultSpecialty: string;
  requiresCredentialApproval: boolean;
};

const HOPE_HUB_PORTAL: ProviderPortalConfig = {
  id: 'HOPE_HUB',
  language: PH_PROVIDER_LANGUAGE,
  pageTitle: 'Hope Hub Professional Help',
  loginDescription:
    'Sign in to your Professional Help workspace for emotional support, counselling, coaching, and mental-wellness sessions.',
  signupTitle: 'Start your provider account',
  signupDescription: 'Choose your support path after creating your account.',
  defaultSpecialty: 'Hope Hub Support',
  requiresCredentialApproval: false,
};

const HOMEOPATHY_PORTAL: ProviderPortalConfig = {
  id: 'HOMEOPATHY',
  language: HOMEOPATHY_PROVIDER_LANGUAGE,
  pageTitle: 'Hope Hub Doctor Portal',
  loginDescription:
    'Sign in to manage homeopathy consultations, patients, availability, and prescriptions.',
  signupTitle: 'Apply as a homeopathy doctor',
  signupDescription:
    'Create your account first. Then complete identity, credentials, and your public profile one step at a time.',
  defaultSpecialty: 'General Homeopathy',
  requiresCredentialApproval: true,
};

function normalizedPortalOverride(value: string | null | undefined): ProviderPortalId | null {
  const normalized = value?.trim().toLowerCase();
  if (normalized === 'homeopathy' || normalized === 'doctor') return 'HOMEOPATHY';
  if (normalized === 'hope-hub' || normalized === 'hopehub' || normalized === 'earn') {
    return 'HOPE_HUB';
  }
  return null;
}

/**
 * One Doctor Web build serves both provider products. Production selects the
 * experience by hostname; the query override is intentionally limited to
 * localhost so each flow can be tested without DNS changes.
 */
export function providerPortalForHost(
  hostname: string | null | undefined,
  localOverride?: string | null,
): ProviderPortalConfig {
  const normalizedHost = hostname?.trim().toLowerCase().replace(/:\d+$/, '') || '';
  const isLocal =
    normalizedHost === 'localhost' ||
    normalizedHost === '127.0.0.1' ||
    normalizedHost === '::1' ||
    normalizedHost === '';
  const override = isLocal ? normalizedPortalOverride(localOverride) : null;

  if (override === 'HOMEOPATHY' || normalizedHost === 'doctor.hopehub.in') {
    return HOMEOPATHY_PORTAL;
  }
  return HOPE_HUB_PORTAL;
}

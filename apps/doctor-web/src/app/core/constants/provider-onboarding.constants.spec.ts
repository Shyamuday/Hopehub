import { describe, expect, it } from 'vitest';
import { PROVIDER_ROLE_DEFINITIONS } from '@hopehub/contracts';
import type { DoctorProfileSummary } from './doctor-types.constants';
import {
  buildProviderOnboardingStatus,
  needsProviderPathSelection,
} from './provider-onboarding.constants';

function readyProfile(careTeamTypes: string[]): DoctorProfileSummary {
  return {
    doctorType: 'PSYCHOLOGIST',
    specialty: 'Professional Help provider',
    isAvailable: true,
    bio: 'A warm and sufficiently detailed public provider bio that safely explains how support is offered.',
    mentalHealthProfile: {
      careTeamType: careTeamTypes[0],
      careTeamTypes,
      qualifications: ['Relevant training'],
      qualifiedFrom: 'Hope Hub Training Institute',
      licenseCouncil: 'Professional Council',
      licenseNumber: 'REG-100',
      languages: ['English'],
      modalities: [],
      sessionTypes: ['Chat'],
      ageGroups: ['Adults'],
      concernsHandled: ['Stress'],
      safetyEscalationNote:
        'I pause the session and follow Hope Hub emergency escalation guidance.',
      listenerSafetyAcknowledgedAt: '2026-08-13T00:00:00.000Z',
      listenerScreening: { passed: true },
      acceptsHighRiskCases: false,
      acceptingNewUsers: true,
      services: [{ title: 'Support session', priceInPaise: 9900, durationMinutes: 30 }],
    },
  };
}

const readySnapshot = { ready: true, blockers: [] };

describe('provider onboarding role flows', () => {
  it('asks a new psychologist to choose a support path', () => {
    const profile = readyProfile(['PEER_SUPPORT_VOLUNTEER']);
    profile.roleAssignments = [];
    profile.mentalHealthProfile!.onboardingPathSelectedAt = null;
    expect(needsProviderPathSelection(profile)).toBe(true);
  });

  it('does not trap an existing psychologist whose active role predates path tracking', () => {
    const profile = readyProfile(['MENTAL_WELLNESS_PROFESSIONAL']);
    profile.mentalHealthProfile!.onboardingPathSelectedAt = null;
    profile.roleAssignments = [
      {
        roleCode: 'MENTAL_WELLNESS_PROFESSIONAL',
        isPrimary: true,
        status: 'ACTIVE',
        credentialStatus: 'PENDING',
        role: {
          ...PROVIDER_ROLE_DEFINITIONS.MENTAL_WELLNESS_PROFESSIONAL,
          supportedModes: ['CHAT', 'VOICE', 'VIDEO'],
        },
      },
    ];
    expect(needsProviderPathSelection(profile)).toBe(false);
  });

  it('renders backend-authored onboarding steps without recalculating requirements', () => {
    const backendStep = {
      id: 'care',
      title: 'Support details',
      description: 'Configured by the readiness API.',
      actionLabel: 'Continue',
      route: '/profile',
      queryParams: { step: 'care' },
      complete: false,
      required: true,
      missing: ['Choose an active provider role.'],
    };
    const status = buildProviderOnboardingStatus(null, null, {
      ready: false,
      title: 'Peer listener onboarding',
      subtitle: 'Complete one step at a time.',
      percent: 40,
      blockers: [],
      steps: [backendStep],
    });
    expect(status.title).toBe('Peer listener onboarding');
    expect(status.percent).toBe(40);
    expect(status.steps).toEqual([backendStep]);
  });

  it('completes a psychologist when backend readiness is ready', () => {
    const status = buildProviderOnboardingStatus(
      readyProfile(['MENTAL_WELLNESS_PROFESSIONAL']),
      'https://assets.example/profile.webp',
      readySnapshot,
    );
    expect(status.complete).toBe(true);
  });

  it('completes a life coach without requiring listener screening', () => {
    const profile = readyProfile(['LIFE_COACH']);
    profile.mentalHealthProfile!.listenerScreening = null;
    const status = buildProviderOnboardingStatus(
      profile,
      'https://assets.example/profile.webp',
      readySnapshot,
    );
    expect(status.steps.find((step) => step.id === 'screening')?.required).toBe(false);
    expect(status.complete).toBe(true);
  });

  it('keeps a listener in screening when backend reports it missing', () => {
    const profile = readyProfile(['PEER_SUPPORT_VOLUNTEER']);
    profile.mentalHealthProfile!.listenerScreening = { passed: false };
    const status = buildProviderOnboardingStatus(profile, 'https://assets.example/profile.webp', {
      ready: false,
      blockers: [{ code: 'LISTENER_SCREENING_REQUIRED', label: 'Screening test is not passed.' }],
    });
    const screening = status.steps.find((step) => step.id === 'screening');
    expect(status.complete).toBe(false);
    expect(screening?.complete).toBe(false);
    expect(screening?.route).toBe('/listener-screening');
  });

  it('keeps screening required when listener is one of several selected roles', () => {
    const profile = readyProfile(['LIFE_COACH', 'PEER_SUPPORT_VOLUNTEER']);
    profile.mentalHealthProfile!.listenerScreening = { passed: false };
    const status = buildProviderOnboardingStatus(profile, 'https://assets.example/profile.webp', {
      ready: false,
      blockers: [{ code: 'LISTENER_SCREENING_REQUIRED', label: 'Screening test is not passed.' }],
    });
    expect(status.steps.find((step) => step.id === 'screening')?.required).toBe(true);
    expect(status.complete).toBe(false);
  });

  it('uses backend readiness as the final completion authority', () => {
    const status = buildProviderOnboardingStatus(
      readyProfile(['MENTAL_WELLNESS_PROFESSIONAL']),
      'https://assets.example/profile.webp',
      {
        ready: false,
        blockers: [{ code: 'LICENSE_NUMBER_REQUIRED', label: 'Registration number is missing.' }],
      },
    );
    expect(status.complete).toBe(false);
    expect(status.steps.find((step) => step.id === 'bio')?.complete).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import { providerProfileSetupStepIds, resolveProviderServiceRole } from './profile-page';

describe('provider profile setup steps', () => {
  it('gives homeopathy providers a dedicated credentials step', () => {
    expect(providerProfileSetupStepIds(false, true)).toEqual(['identity', 'credentials', 'public']);
  });

  it('keeps the earn provider flow unchanged', () => {
    expect(providerProfileSetupStepIds(true, false)).toEqual([
      'identity',
      'public',
      'care',
      'safety',
      'services',
    ]);
  });
});

describe('provider service role reconciliation', () => {
  it('keeps a service role that is still selected', () => {
    expect(
      resolveProviderServiceRole(
        'LIFE_COACH',
        'LIFE_COACH',
        ['LIFE_COACH', 'PEER_SUPPORT_VOLUNTEER'],
        'PEER_SUPPORT_VOLUNTEER',
      ),
    ).toBe('LIFE_COACH');
  });

  it('moves a stale service to the current primary role', () => {
    expect(
      resolveProviderServiceRole(
        'MENTAL_WELLNESS_PROFESSIONAL',
        'MENTAL_WELLNESS_PROFESSIONAL',
        ['PEER_SUPPORT_VOLUNTEER'],
        'PEER_SUPPORT_VOLUNTEER',
      ),
    ).toBe('PEER_SUPPORT_VOLUNTEER');
  });

  it('prefers a valid visible role when an older role code is stale', () => {
    expect(
      resolveProviderServiceRole(
        'LIFE_COACH',
        'MENTAL_WELLNESS_PROFESSIONAL',
        ['LIFE_COACH'],
        'LIFE_COACH',
      ),
    ).toBe('LIFE_COACH');
  });
});

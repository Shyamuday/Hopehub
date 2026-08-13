import { TestBed } from '@angular/core/testing';
import { ProviderOnboardingDraftService } from './provider-onboarding-draft.service';

describe('ProviderOnboardingDraftService', () => {
  let service: ProviderOnboardingDraftService;

  beforeEach(() => {
    localStorage.clear();
    service = TestBed.inject(ProviderOnboardingDraftService);
  });

  afterEach(() => localStorage.clear());

  it('restores a draft for the same provider email', () => {
    service.save('provider@example.com', {
      step: 'public',
      model: { bio: 'unfinished bio' },
      services: [],
    });
    expect(service.load<{ bio: string }, never>('PROVIDER@example.com')).toMatchObject({
      step: 'public',
      model: { bio: 'unfinished bio' },
    });
  });

  it('clears all provider drafts on logout', () => {
    service.save('one@example.com', { step: 'identity', model: {}, services: [] });
    service.save('two@example.com', { step: 'care', model: {}, services: [] });
    localStorage.setItem('unrelated-setting', 'keep');
    service.clearAll();
    expect(service.load('one@example.com')).toBeNull();
    expect(service.load('two@example.com')).toBeNull();
    expect(localStorage.getItem('unrelated-setting')).toBe('keep');
  });
});

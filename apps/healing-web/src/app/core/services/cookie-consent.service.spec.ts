import { CookieConsentService } from './cookie-consent.service';

describe('CookieConsentService', () => {
  beforeEach(() => localStorage.clear());

  it('starts undecided and stores acceptance', () => {
    const service = new CookieConsentService('browser' as unknown as object);

    expect(service.choice()).toBe('unknown');
    expect(service.showBanner()).toBe(true);

    service.acceptAll();

    expect(service.hasAdvertisingConsent()).toBe(true);
    expect(service.showBanner()).toBe(false);
    expect(localStorage.getItem('hopehub:cookie-consent:v1')).toBe('all');
  });

  it('restores an essential-only choice without showing the banner', () => {
    localStorage.setItem('hopehub:cookie-consent:v1', 'essential');

    const service = new CookieConsentService('browser' as unknown as object);

    expect(service.choice()).toBe('essential');
    expect(service.hasAdvertisingConsent()).toBe(false);
    expect(service.showBanner()).toBe(false);
  });
});

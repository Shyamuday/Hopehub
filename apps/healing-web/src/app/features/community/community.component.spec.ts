import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { APP_CONSTANTS } from '../../core';
import { CommunityComponent } from './community.component';

describe('CommunityComponent', () => {
  let fixture: ComponentFixture<CommunityComponent>;
  const originalTelegram = {
    groupUrl: APP_CONSTANTS.TELEGRAM.GROUP_URL,
    handle: APP_CONSTANTS.TELEGRAM.SUPPORT_HANDLE,
    qrCode: APP_CONSTANTS.TELEGRAM.QR_CODE,
  };
  const originalWhatsApp = {
    groupUrl: APP_CONSTANTS.WHATSAPP.GROUP_URL,
    qrCode: APP_CONSTANTS.WHATSAPP.QR_CODE,
  };

  beforeEach(async () => {
    Object.assign(APP_CONSTANTS.TELEGRAM, {
      GROUP_URL: 'https://t.me/hopehub-test',
      SUPPORT_HANDLE: '@hopehub-test',
      QR_CODE: '/images/test-telegram-qr.png',
    });
    Object.assign(APP_CONSTANTS.WHATSAPP, {
      GROUP_URL: 'https://chat.whatsapp.com/test',
      QR_CODE: '/images/test-whatsapp-qr.png',
    });

    await TestBed.configureTestingModule({
      imports: [CommunityComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(CommunityComponent);
    fixture.detectChanges();
  });

  afterAll(() => {
    Object.assign(APP_CONSTANTS.TELEGRAM, {
      GROUP_URL: originalTelegram.groupUrl,
      SUPPORT_HANDLE: originalTelegram.handle,
      QR_CODE: originalTelegram.qrCode,
    });
    Object.assign(APP_CONSTANTS.WHATSAPP, {
      GROUP_URL: originalWhatsApp.groupUrl,
      QR_CODE: originalWhatsApp.qrCode,
    });
  });

  it('shows both QR codes immediately without a disclosure click', () => {
    const telegramPanel = fixture.nativeElement.querySelector(
      '[data-testid="telegram-qr-panel"]',
    ) as HTMLElement;
    const whatsappPanel = fixture.nativeElement.querySelector(
      '[data-testid="whatsapp-qr-panel"]',
    ) as HTMLElement;

    expect(telegramPanel).toBeTruthy();
    expect(whatsappPanel).toBeTruthy();
    expect(fixture.nativeElement.textContent).not.toContain('Show QR code');
    expect(telegramPanel.querySelector('img')?.getAttribute('width')).toBe('160');
    expect(whatsappPanel.querySelector('img')?.getAttribute('width')).toBe('160');
  });

  it('keeps one-tap links next to the scan option', () => {
    expect(
      fixture.nativeElement
        .querySelector('a[aria-label="Join the Hope Hub Telegram community"]')
        ?.getAttribute('href'),
    ).toBe('https://t.me/hopehub-test');
    expect(
      fixture.nativeElement
        .querySelector('a[aria-label="Join the Hope Hub WhatsApp updates group"]')
        ?.getAttribute('href'),
    ).toBe('https://chat.whatsapp.com/test');
  });
});

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { APP_CONSTANTS } from '../constants/app.constants';

type PublicConfigResponse = {
  config: Partial<Record<string, string>>;
};

function telegramUrl(username: string) {
  return `https://t.me/${username.replace(/^@/, '')}`;
}

function telegramHandle(username: string) {
  return `@${username.replace(/^@/, '')}`;
}

@Injectable({ providedIn: 'root' })
export class PublicCommunicationConfigService {
  constructor(private readonly http: HttpClient) {}

  async load(): Promise<void> {
    try {
      const { config } = await firstValueFrom(
        this.http.get<PublicConfigResponse>(`${environment.apiUrl}/public-config`),
      );
      this.apply(config || {});
    } catch {
      // Keep checked-in fallback constants when public config is unavailable.
    }
  }

  private apply(config: Partial<Record<string, string>>) {
    const telegramUsername = config['telegramUsername']?.trim();
    const userBot = config['telegramUserBotUsername']?.trim();
    const doctorBot = config['telegramDoctorBotUsername']?.trim();
    const adminBot = config['telegramAdminBotUsername']?.trim();
    const telegramQr = config['telegramQrCodePath']?.trim();
    const whatsappUrl = config['whatsappGroupUrl']?.trim();
    const whatsappQr = config['whatsappQrCodePath']?.trim();

    if (telegramUsername) {
      (APP_CONSTANTS.TELEGRAM as any).USERNAME = telegramUsername.replace(/^@/, '');
      (APP_CONSTANTS.TELEGRAM as any).GROUP_URL = telegramUrl(telegramUsername);
      (APP_CONSTANTS.TELEGRAM as any).SUPPORT_HANDLE = telegramHandle(telegramUsername);
      (APP_CONSTANTS.TELEGRAM.GROUPS[0] as any).handle = telegramHandle(telegramUsername);
      (APP_CONSTANTS.TELEGRAM.GROUPS[0] as any).url = telegramUrl(telegramUsername);
    }

    if (userBot && APP_CONSTANTS.TELEGRAM.BOTS[0]) {
      (APP_CONSTANTS.TELEGRAM.BOTS[0] as any).handle = telegramHandle(userBot);
      (APP_CONSTANTS.TELEGRAM.BOTS[0] as any).url = telegramUrl(userBot);
    }

    if (doctorBot && APP_CONSTANTS.TELEGRAM.BOTS[1]) {
      (APP_CONSTANTS.TELEGRAM.BOTS[1] as any).handle = telegramHandle(doctorBot);
      (APP_CONSTANTS.TELEGRAM.BOTS[1] as any).url = telegramUrl(doctorBot);
    }

    if (adminBot) {
      (APP_CONSTANTS.TELEGRAM as any).ADMIN_BOT_HANDLE = telegramHandle(adminBot);
      (APP_CONSTANTS.TELEGRAM as any).ADMIN_BOT_URL = telegramUrl(adminBot);
    }

    if (telegramQr) (APP_CONSTANTS.TELEGRAM as any).QR_CODE = telegramQr;
    if (whatsappUrl) (APP_CONSTANTS.WHATSAPP as any).GROUP_URL = whatsappUrl;
    if (whatsappQr) (APP_CONSTANTS.WHATSAPP as any).QR_CODE = whatsappQr;
  }
}

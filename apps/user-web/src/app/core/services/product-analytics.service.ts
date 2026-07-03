import { Service } from '@angular/core';
import { API_PATHS } from '../constants/api-paths.constants';
import { ClinicApiClient } from '../../clinic-api/clinic-api.client';

@Service()
export class ProductAnalyticsService {
  private readonly client = new ClinicApiClient();

  track(name: string, properties?: Record<string, unknown>) {
    if (!this.client.backendToken) {
      return;
    }

    void this.client
      .apiFetch(API_PATHS.ANALYTICS.EVENTS, {
        method: 'POST',
        body: JSON.stringify({
          name,
          category: 'ENGAGEMENT',
          properties
        })
      })
      .catch(() => {
        // Analytics should never block UX.
      });
  }
}

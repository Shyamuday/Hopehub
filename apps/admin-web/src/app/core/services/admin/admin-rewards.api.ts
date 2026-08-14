import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API_PATHS } from '../../constants/api-paths.constants';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AdminRewardsApi {
  private readonly http = inject(HttpClient);
  private readonly apiBase = environment.apiUrl;

  listRewardRules() {
    return firstValueFrom(
      this.http.get<{ rules: unknown[] }>(`${this.apiBase}${API_PATHS.ADMIN.REWARD_RULES}`),
    );
  }

  createRewardRule(payload: unknown) {
    return firstValueFrom(
      this.http.post<{ rule: unknown }>(`${this.apiBase}${API_PATHS.ADMIN.REWARD_RULES}`, payload),
    );
  }

  updateRewardRule(id: string, payload: unknown) {
    return firstValueFrom(
      this.http.patch<{ rule: unknown }>(
        `${this.apiBase}${API_PATHS.ADMIN.REWARD_RULE_BY_ID(id)}`,
        payload,
      ),
    );
  }

  deleteRewardRule(id: string) {
    return firstValueFrom(
      this.http.delete(`${this.apiBase}${API_PATHS.ADMIN.REWARD_RULE_BY_ID(id)}`),
    );
  }

  listReferrals(limit = 50) {
    return firstValueFrom(
      this.http.get<{ referrals: unknown[]; freeCallRewards: unknown[] }>(
        `${this.apiBase}${API_PATHS.ADMIN.REWARD_REFERRALS}?limit=${limit}`,
      ),
    );
  }
}

import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CLINIC_API_BASE_URL } from '@vitalis/clinic-api';
import { AdminAuth } from '../admin-auth';

@Injectable()
export abstract class AdminApiBase {
  protected readonly apiBase = inject(CLINIC_API_BASE_URL);
  protected readonly http = inject(HttpClient);
  protected readonly auth = inject(AdminAuth);
}

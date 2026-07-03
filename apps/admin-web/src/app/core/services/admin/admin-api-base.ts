import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AdminAuth } from '../admin-auth';
import { environment } from '../../../../environments/environment';

@Injectable()
export abstract class AdminApiBase {
  protected readonly apiBase = environment.apiUrl;
  protected readonly http = inject(HttpClient);
  protected readonly auth = inject(AdminAuth);
}

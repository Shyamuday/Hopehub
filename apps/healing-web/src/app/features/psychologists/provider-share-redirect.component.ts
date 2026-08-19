import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-provider-share-redirect',
  standalone: true,
  imports: [RouterLink],
  template: `
    <main class="mx-auto max-w-xl px-5 py-20 text-center">
      @if (!error()) {
        <h1 class="text-2xl font-semibold text-gray-950">
          Opening your Hope Hub support option...
        </h1>
        <p class="mt-3 text-gray-600">
          We are checking the provider's current service and availability.
        </p>
      } @else {
        <h1 class="text-2xl font-semibold text-gray-950">This link is no longer available</h1>
        <p class="mt-3 text-gray-600">{{ error() }}</p>
        <a
          routerLink="/care-team"
          class="mt-6 inline-flex rounded-md bg-primary-700 px-5 py-3 font-semibold text-white"
          >See the care team</a
        >
      }
    </main>
  `,
})
export class ProviderShareRedirectComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  readonly error = signal('');

  async ngOnInit() {
    const code = this.route.snapshot.paramMap.get('code');
    if (!code) {
      this.error.set('The share link is incomplete.');
      return;
    }
    try {
      const response = await firstValueFrom(
        this.http.get<{ target: string }>(
          `${environment.apiUrl}/hope-hub/share/${encodeURIComponent(code)}`,
        ),
      );
      await this.router.navigateByUrl(response.target, { replaceUrl: true });
    } catch {
      this.error.set('Ask the provider for a new link, or choose them from the care team.');
    }
  }
}

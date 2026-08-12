import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AppButtonComponent } from '../../shared/components';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterModule, AppButtonComponent],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div class="max-w-md w-full text-center">
        <div class="mb-8">
          <h1 class="text-9xl font-bold text-primary-600">404</h1>
          <h2 class="text-3xl font-semibold text-gray-900 mt-4">Page Not Found</h2>
          <p class="text-gray-600 mt-4">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        <div class="space-y-4">
          <app-button routerLink="/" block> Go to Home </app-button>

          <app-button routerLink="/services" variant="outline" block> Browse Services </app-button>
        </div>

        <div class="mt-8">
          <p class="text-sm text-gray-500">
            Need help?
            <a routerLink="/contact" class="text-primary-600 hover:text-primary-700 font-medium"
              >Contact us</a
            >
          </p>
        </div>
      </div>
    </div>
  `,
  styles: [],
})
export class NotFoundComponent {}

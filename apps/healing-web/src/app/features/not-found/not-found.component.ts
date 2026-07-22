import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
    selector: 'app-not-found',
    standalone: true,
    imports: [RouterModule],
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
          <a 
            routerLink="/" 
            class="inline-block w-full bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors duration-200 font-medium">
            Go to Home
          </a>
          
          <a 
            routerLink="/services" 
            class="inline-block w-full bg-white text-primary-600 px-6 py-3 rounded-lg border-2 border-primary-600 hover:bg-primary-50 transition-colors duration-200 font-medium">
            Browse Services
          </a>
        </div>
        
        <div class="mt-8">
          <p class="text-sm text-gray-500">
            Need help? <a routerLink="/contact" class="text-primary-600 hover:text-primary-700 font-medium">Contact us</a>
          </p>
        </div>
      </div>
    </div>
  `,
    styles: []
})
export class NotFoundComponent { }

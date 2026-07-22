import { Component, inject } from '@angular/core';
import { LoadingService } from '../../../core/services';
import { LoadingSpinnerComponent } from '../loading-spinner/loading-spinner.component';

@Component({
    selector: 'app-global-loading',
    standalone: true,
    imports: [LoadingSpinnerComponent],
    template: `
    @if (loadingService.isLoading()) {
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-lg p-6 shadow-xl">
          <app-loading-spinner 
            message="Loading..." 
            size="lg"
            containerClass="py-4">
          </app-loading-spinner>
        </div>
      </div>
    }
  `,
    styles: []
})
export class GlobalLoadingComponent {
    protected loadingService = inject(LoadingService);
}
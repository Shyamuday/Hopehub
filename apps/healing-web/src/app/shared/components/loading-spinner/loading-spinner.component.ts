import { Component, input, computed } from '@angular/core';

@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  imports: [],
  templateUrl: './loading-spinner.component.html',
  styleUrl: './loading-spinner.component.scss'
})
export class LoadingSpinnerComponent {
  message = input<string>('');
  size = input<'sm' | 'md' | 'lg'>('md');
  containerClass = input<string>('py-8');

  spinnerClass = computed(() => {
    const currentSize = this.size();
    switch (currentSize) {
      case 'sm':
        return 'h-6 w-6';
      case 'md':
        return 'h-8 w-8';
      case 'lg':
        return 'h-12 w-12';
      default:
        return 'h-8 w-8'; // fallback to md
    }
  });
}
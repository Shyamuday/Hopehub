import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { APP_CONSTANTS } from '../../core';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterModule],
  template: `
    <footer class="bg-gray-900 text-white">
      <div class="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          <!-- Brand Section -->
          <div class="col-span-1 sm:col-span-2 lg:col-span-2">
            <div class="flex items-center space-x-2 mb-3 sm:mb-4">
              <div class="w-6 h-6 sm:w-8 sm:h-8 bg-primary-600 rounded-full flex items-center justify-center">
                <span class="text-white font-bold text-xs sm:text-sm">HH</span>
              </div>
              <span class="text-lg sm:text-xl font-bold">Healing Hub</span>
            </div>
            <p class="text-gray-300 mb-3 sm:mb-4 max-w-md text-sm sm:text-base">
              Professional mental health services providing support, guidance, and healing 
              for individuals seeking to improve their emotional well-being and life satisfaction.
            </p>
            <div class="flex space-x-4">
              <a href="{{ APP_CONSTANTS.TELEGRAM.GROUP_URL }}" 
                 target="_blank" 
                 rel="noopener noreferrer"
                 class="text-gray-300 hover:text-white transition-colors duration-200 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center">
                <span class="sr-only">Telegram</span>
                <svg class="h-5 w-5 sm:h-6 sm:w-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.374 0 0 5.373 0 12s5.374 12 12 12 12-5.373 12-12S18.626 0 12 0zm5.568 8.16l-1.61 7.59c-.12.54-.44.67-.89.42l-2.46-1.81-1.19 1.14c-.13.13-.24.24-.49.24l.17-2.43 4.47-4.03c.19-.17-.04-.27-.3-.1L9.28 13.47l-2.38-.75c-.52-.16-.53-.52.11-.77l9.28-3.58c.43-.16.81.11.67.77z"/>
                </svg>
              </a>
            </div>
          </div>

          <!-- Quick Links -->
          <div class="col-span-1">
            <h3 class="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Quick Links</h3>
            <ul class="space-y-1 sm:space-y-2">
              <li><a routerLink="/" class="text-gray-300 hover:text-white transition-colors duration-200 text-sm sm:text-base py-1 block">Home</a></li>
              <li><a routerLink="/services" class="text-gray-300 hover:text-white transition-colors duration-200 text-sm sm:text-base py-1 block">Services</a></li>
              <li><a routerLink="/community" class="text-gray-300 hover:text-white transition-colors duration-200 text-sm sm:text-base py-1 block">Community</a></li>
              <li><a routerLink="/contact" class="text-gray-300 hover:text-white transition-colors duration-200 text-sm sm:text-base py-1 block">Contact</a></li>
            </ul>
          </div>

          <!-- Contact Info -->
          <div class="col-span-1">
            <h3 class="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Contact</h3>
            <ul class="space-y-1 sm:space-y-2 text-gray-300 text-sm sm:text-base">
              <li>
                <span class="block font-medium">Email:</span>
                <a href="mailto:info@healinghub.com" class="hover:text-white transition-colors duration-200 break-all">
                  info@healinghub.com
                </a>
              </li>
              <li>
                <span class="block font-medium">Phone:</span>
                <a href="tel:+1234567890" class="hover:text-white transition-colors duration-200">
                  (123) 456-7890
                </a>
              </li>
              <li>
                <span class="block font-medium">Telegram:</span>
                <a href="{{ APP_CONSTANTS.TELEGRAM.GROUP_URL }}" 
                   target="_blank" 
                   rel="noopener noreferrer"
                   class="hover:text-white transition-colors duration-200">
                  {{ APP_CONSTANTS.TELEGRAM.SUPPORT_HANDLE }}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <!-- Bottom Section -->
        <div class="border-t border-gray-800 mt-6 sm:mt-8 pt-6 sm:pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p class="text-gray-300 text-xs sm:text-sm text-center md:text-left">
            © {{ currentYear }} Healing Hub. All rights reserved.
          </p>
          <div class="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-6">
            <a href="#" class="text-gray-300 hover:text-white text-xs sm:text-sm transition-colors duration-200 text-center">Privacy Policy</a>
            <a href="#" class="text-gray-300 hover:text-white text-xs sm:text-sm transition-colors duration-200 text-center">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  `,
  styles: []
})
export class FooterComponent {
  currentYear = new Date().getFullYear();
  APP_CONSTANTS = APP_CONSTANTS;
}
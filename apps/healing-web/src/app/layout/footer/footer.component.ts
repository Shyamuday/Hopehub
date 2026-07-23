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
              <div
                class="w-6 h-6 sm:w-8 sm:h-8 bg-primary-600 rounded-full flex items-center justify-center"
              >
                <span class="text-white font-bold text-xs sm:text-sm">HH</span>
              </div>
              <span class="text-lg sm:text-xl font-bold">Hope Hub</span>
            </div>
            <p class="text-gray-300 mb-3 sm:mb-4 max-w-md text-sm sm:text-base">
              Professional mental health services providing support, guidance, and healing for
              individuals seeking to improve their emotional well-being and life satisfaction.
            </p>
            <div class="flex space-x-4">
              <a
                href="{{ APP_CONSTANTS.TELEGRAM.GROUP_URL }}"
                target="_blank"
                rel="noopener noreferrer"
                class="text-gray-300 hover:text-white transition-colors duration-200 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                <span class="sr-only">Telegram</span>
                <svg class="h-5 w-5 sm:h-6 sm:w-6" fill="currentColor" viewBox="0 0 24 24">
                  <path
                    d="M12 0C5.374 0 0 5.373 0 12s5.374 12 12 12 12-5.373 12-12S18.626 0 12 0zm5.568 8.16l-1.61 7.59c-.12.54-.44.67-.89.42l-2.46-1.81-1.19 1.14c-.13.13-.24.24-.49.24l.17-2.43 4.47-4.03c.19-.17-.04-.27-.3-.1L9.28 13.47l-2.38-.75c-.52-.16-.53-.52.11-.77l9.28-3.58c.43-.16.81.11.67.77z"
                  />
                </svg>
              </a>
              <a
                href="{{ APP_CONSTANTS.WHATSAPP.GROUP_URL }}"
                target="_blank"
                rel="noopener noreferrer"
                class="text-gray-300 hover:text-white transition-colors duration-200 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                <span class="sr-only">WhatsApp</span>
                <svg class="h-5 w-5 sm:h-6 sm:w-6" fill="currentColor" viewBox="0 0 24 24">
                  <path
                    d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"
                  />
                </svg>
              </a>
            </div>
          </div>

          <!-- Quick Links -->
          <div class="col-span-1">
            <h3 class="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Quick Links</h3>
            <ul class="space-y-1 sm:space-y-2">
              <li>
                <a
                  routerLink="/"
                  class="text-gray-300 hover:text-white transition-colors duration-200 text-sm sm:text-base py-1 block"
                  >Home</a
                >
              </li>
              <li>
                <a
                  routerLink="/services"
                  class="text-gray-300 hover:text-white transition-colors duration-200 text-sm sm:text-base py-1 block"
                  >Services</a
                >
              </li>
              <li>
                <a
                  routerLink="/community"
                  class="text-gray-300 hover:text-white transition-colors duration-200 text-sm sm:text-base py-1 block"
                  >Community</a
                >
              </li>
              <li>
                <a
                  routerLink="/contact"
                  class="text-gray-300 hover:text-white transition-colors duration-200 text-sm sm:text-base py-1 block"
                  >Contact</a
                >
              </li>
              <li>
                <a
                  routerLink="/careers"
                  class="text-gray-300 hover:text-white transition-colors duration-200 text-sm sm:text-base py-1 block"
                  >Careers</a
                >
              </li>
              <li>
                <a
                  routerLink="/donate"
                  class="text-green-400 hover:text-green-300 transition-colors duration-200 text-sm sm:text-base py-1 block font-medium inline-flex items-center gap-1"
                >
                  💚 Support Us
                </a>
              </li>
            </ul>
          </div>

          <!-- Contact Info -->
          <div class="col-span-1">
            <h3 class="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Contact</h3>
            <ul class="space-y-1 sm:space-y-2 text-gray-300 text-sm sm:text-base">
              <li>
                <span class="block font-medium">Email:</span>
                <a
                  href="mailto:{{ APP_CONSTANTS.CONTACT.EMAIL }}"
                  class="hover:text-white transition-colors duration-200 break-all"
                >
                  {{ APP_CONSTANTS.CONTACT.EMAIL }}
                </a>
              </li>
              <li>
                <span class="block font-medium">Contact:</span>
                <span>{{ APP_CONSTANTS.CONTACT.PHONE }}</span>
              </li>
              <li>
                <span class="block font-medium">Telegram:</span>
                <a
                  href="{{ APP_CONSTANTS.TELEGRAM.GROUP_URL }}"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="hover:text-white transition-colors duration-200"
                >
                  Anonymous-friendly group
                </a>
              </li>
              <li>
                <span class="block font-medium">WhatsApp:</span>
                <a
                  href="{{ APP_CONSTANTS.WHATSAPP.GROUP_URL }}"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="hover:text-white transition-colors duration-200"
                >
                  Join our group
                </a>
              </li>
            </ul>
          </div>
        </div>

        <!-- Bottom Section -->
        <div
          class="border-t border-gray-800 mt-6 sm:mt-8 pt-6 sm:pt-8 flex flex-col md:flex-row justify-between items-center gap-4"
        >
          <p class="text-gray-300 text-xs sm:text-sm text-center md:text-left">
            © {{ currentYear }} Hope Hub. All rights reserved.
          </p>
          <div class="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-6">
            <a
              routerLink="/privacy"
              class="text-gray-300 hover:text-white text-xs sm:text-sm transition-colors duration-200 text-center"
              >Privacy Policy</a
            >
            <a
              routerLink="/terms"
              class="text-gray-300 hover:text-white text-xs sm:text-sm transition-colors duration-200 text-center"
              >Terms of Service</a
            >
          </div>
        </div>
      </div>
    </footer>
  `,
  styles: [],
})
export class FooterComponent {
  currentYear = new Date().getFullYear();
  APP_CONSTANTS = APP_CONSTANTS;
}

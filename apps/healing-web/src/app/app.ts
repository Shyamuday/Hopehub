import { Component, signal, OnInit, PLATFORM_ID, Inject, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { HeaderComponent, FooterComponent } from './layout';
import { BreadcrumbComponent, GlobalLoadingComponent, QuickAccessComponent, AuthModalComponent } from './shared/components';
import { NavigationService, SEOService } from './core/services';
import { FontLoader } from './core/utils/font-loader.util';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HeaderComponent, FooterComponent, BreadcrumbComponent, GlobalLoadingComponent, QuickAccessComponent, AuthModalComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  protected readonly title = signal('healing-hub-website');

  private seoService = inject(SEOService);
  private platformId = inject(PLATFORM_ID);

  constructor(
    private navigationService: NavigationService
  ) { }

  ngOnInit(): void {
    // Navigation service is automatically initialized through dependency injection
    
    // Initialize font loading detection in browser only
    if (isPlatformBrowser(this.platformId)) {
      FontLoader.init();
      
      // Add organization structured data for SEO
      this.seoService.addOrganizationStructuredData();
    }
  }
}

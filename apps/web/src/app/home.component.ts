import { Component } from '@angular/core';
import { WHATSAPP_CONTACT_URL } from './core/constants/branding.constants';
import { AppFooterComponent } from './app-footer.component';
import { AppHeaderComponent } from './app-header.component';
import { HomeFinalCtaSectionComponent } from './home-final-cta-section.component';
import { HomeHeroSectionComponent } from './home-hero-section.component';
import { HomeHowItWorksSectionComponent } from './home-how-it-works-section.component';
import { HomeSafetyFaqSectionComponent } from './home-safety-faq-section.component';
import { HomeTreatmentsSectionComponent } from './home-treatments-section.component';

@Component({
  selector: 'app-home',
  imports: [
    AppHeaderComponent,
    AppFooterComponent,
    HomeHeroSectionComponent,
    HomeTreatmentsSectionComponent,
    HomeHowItWorksSectionComponent,
    HomeSafetyFaqSectionComponent,
    HomeFinalCtaSectionComponent
  ],
  templateUrl: './home.component.html'
})
export class HomeComponent {
  readonly whatsappLink = WHATSAPP_CONTACT_URL;
}

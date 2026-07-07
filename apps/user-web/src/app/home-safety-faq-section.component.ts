import { Component } from '@angular/core';
import { HOME_CONTENT } from './core/constants/public-site-content.constants';

@Component({
  selector: 'app-home-safety-faq-section',
  templateUrl: './home-safety-faq-section.component.html',
})
export class HomeSafetyFaqSectionComponent {
  readonly copy = HOME_CONTENT;
}

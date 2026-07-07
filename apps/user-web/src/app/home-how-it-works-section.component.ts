import { Component } from '@angular/core';
import { HOME_CONTENT } from './core/constants/public-site-content.constants';

@Component({
  selector: 'app-home-how-it-works-section',
  templateUrl: './home-how-it-works-section.component.html',
})
export class HomeHowItWorksSectionComponent {
  readonly copy = HOME_CONTENT;
}

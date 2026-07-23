import { Component } from '@angular/core';
import {
  FeedbackSectionComponent,
  ServicesCarouselComponent,
  StatsSectionComponent,
} from '../../shared/components';
import { APP_CONSTANTS } from '../../core';
import { HomeCommunityComponent } from './components/home-community/home-community.component';
import { HomeHeroComponent } from './components/home-hero/home-hero.component';
import { HomeToolsComponent } from './components/home-tools/home-tools.component';
import { HowItWorksComponent } from './components/how-it-works/how-it-works.component';
import { ServicesOverviewComponent } from './components/services-overview/services-overview.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    FeedbackSectionComponent,
    HomeCommunityComponent,
    HomeHeroComponent,
    HomeToolsComponent,
    HowItWorksComponent,
    ServicesCarouselComponent,
    ServicesOverviewComponent,
    StatsSectionComponent,
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {
  readonly APP_CONSTANTS = APP_CONSTANTS;
}

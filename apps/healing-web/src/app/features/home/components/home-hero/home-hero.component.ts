import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { IMAGE_ASSETS } from '../../../../core/constants/image-assets.constants';
import { CONSUMER_ROUTES } from '../../../../core/constants/consumer-routes.constants';
import { AppButtonComponent } from '../../../../shared/components';

@Component({
  selector: 'app-home-hero',
  standalone: true,
  imports: [RouterModule, AppButtonComponent],
  templateUrl: './home-hero.component.html',
  styleUrl: './home-hero.component.scss',
})
export class HomeHeroComponent {
  readonly ROUTES = CONSUMER_ROUTES;
  readonly heroSlides = [
    {
      src: IMAGE_ASSETS.HEALING_HUB.PHOTOS.EXPERT_SUPPORT,
      alt: 'Hope Hub expert offering calm emotional support during a private session',
    },
    {
      src: IMAGE_ASSETS.HEALING_HUB.PHOTOS.PHONE_SESSION,
      alt: 'Private phone support session for someone who needs to talk now',
    },
    {
      src: IMAGE_ASSETS.HEALING_HUB.PHOTOS.OPEN_AIR_RESET,
      alt: 'Person taking a quiet open-air reset moment',
    },
  ];
}

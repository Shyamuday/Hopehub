import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { IMAGE_ASSETS } from '../../../../core/constants/image-assets.constants';
import { CONSUMER_UX_COPY } from '../../../../core/constants/consumer-ux-copy.constants';

@Component({
  selector: 'app-home-tools',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './home-tools.component.html',
  styles: [
    `
      .hope-card > .hope-icon-box {
        display: none;
      }
    `,
  ],
})
export class HomeToolsComponent {
  readonly UX = CONSUMER_UX_COPY;
  readonly images = {
    assessment: IMAGE_ASSETS.HEALING_HUB.PHOTOS.FEELING_WORDS,
    exercises: IMAGE_ASSETS.HEALING_HUB.PHOTOS.HOME_MOVEMENT,
    lifestyle: IMAGE_ASSETS.HEALING_HUB.PHOTOS.OPEN_AIR_RESET,
    articles: IMAGE_ASSETS.HEALING_HUB.PHOTOS.BROKEN_HEART,
  };
}

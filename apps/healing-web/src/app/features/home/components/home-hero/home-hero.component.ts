import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { IMAGE_ASSETS } from '../../../../core/constants/image-assets.constants';

@Component({
  selector: 'app-home-hero',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './home-hero.component.html',
  styleUrl: './home-hero.component.scss',
})
export class HomeHeroComponent {
  readonly heroImage = IMAGE_ASSETS.SERVICES.MEDITATION;
}

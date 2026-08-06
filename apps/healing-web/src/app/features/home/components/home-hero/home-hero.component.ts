import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-home-hero',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './home-hero.component.html',
  styleUrl: './home-hero.component.scss',
})
export class HomeHeroComponent {}

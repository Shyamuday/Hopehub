import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SeoService } from './seo.service';
import { ScrollToTopComponent } from './scroll-to-top.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ScrollToTopComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  constructor(private readonly seo: SeoService) {
    this.seo.init();
  }
}

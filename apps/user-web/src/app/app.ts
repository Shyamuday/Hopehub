import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SeoService } from './seo.service';
import { ChatbotWidgetComponent } from './chatbot-widget/chatbot-widget.component';
import { PromoPopupHostComponent } from './promo/promo-popup-host.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ChatbotWidgetComponent, PromoPopupHostComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  constructor(private readonly seo: SeoService) {
    this.seo.init();
  }
}

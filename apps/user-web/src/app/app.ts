import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SeoService } from './seo.service';
import { ChatbotWidgetComponent } from './chatbot-widget/chatbot-widget.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ChatbotWidgetComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  constructor(private readonly seo: SeoService) {
    this.seo.init();
  }
}

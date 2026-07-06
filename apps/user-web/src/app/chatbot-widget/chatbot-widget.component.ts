import {
  Component, ElementRef, ViewChild, AfterViewChecked,
  inject, signal, OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatbotService } from '../core/services/chatbot.service';
import { PublicConfigService } from '../core/services/public-config.service';

@Component({
  selector: 'app-chatbot-widget',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chatbot-widget.component.html',
  styleUrl: './chatbot-widget.component.scss'
})
export class ChatbotWidgetComponent implements OnInit, AfterViewChecked {
  @ViewChild('messagesEnd') private messagesEnd!: ElementRef<HTMLDivElement>;

  readonly chat = inject(ChatbotService);
  private readonly publicConfig = inject(PublicConfigService);
  inputText = '';
  private shouldScroll = false;
  readonly showBadge = signal(false);
  readonly whatsappUrl = signal('https://wa.me/');

  ngOnInit() {
    void this.publicConfig.get().then(cfg => this.whatsappUrl.set(this.publicConfig.whatsappUrl(cfg)));
    // Show pulsing badge on the button after 5 s if not already opened
    setTimeout(() => {
      if (!this.chat.isOpen()) this.showBadge.set(true);
    }, 5000);
  }

  ngAfterViewChecked() {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  openChat() {
    this.showBadge.set(false);
    this.chat.open();
    this.shouldScroll = true;
  }

  toggleChat() {
    if (!this.chat.isOpen()) {
      this.showBadge.set(false);
    }
    this.chat.toggle();
    this.shouldScroll = true;
  }

  send() {
    const text = this.inputText.trim();
    if (!text || this.chat.isLoading()) return;
    this.inputText = '';
    this.shouldScroll = true;
    this.chat.sendMessage(text);
  }

  onEnter(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.send();
    }
  }

  private scrollToBottom() {
    try {
      this.messagesEnd?.nativeElement?.scrollIntoView({ behavior: 'smooth' });
    } catch {
      // no-op
    }
  }

  formatMessage(text: string): string {
    return text.replace(/\n/g, '<br>');
  }
}

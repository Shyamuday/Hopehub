import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import type { FaqAccordionItem } from '../constants/faq-fallback.constants';

@Component({
  selector: 'app-faq-accordion',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './faq-accordion.component.html',
  styleUrl: './faq-accordion.component.scss'
})
export class FaqAccordionComponent {
  @Input({ required: true }) items: FaqAccordionItem[] = [];

  trackItem(_index: number, item: FaqAccordionItem): string {
    return item.id ?? item.question;
  }
}

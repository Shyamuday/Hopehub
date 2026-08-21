import { Component, Input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AppButtonComponent, PageHeaderComponent } from '../../../../shared/components';
import { CONSUMER_ROUTES } from '../../../../core/constants/consumer-routes.constants';

export type HomeFaq = {
  question: string;
  answer: string;
  category: 'Getting started' | 'Support options' | 'Privacy & safety' | 'Bookings & payments';
};

export const HOME_FAQS: HomeFaq[] = [
  {
    category: 'Getting started',
    question: 'What is Hope Hub?',
    answer:
      'Hope Hub is a space to find human support in the way that feels right for you. You can explore a self-check, talk privately, join community spaces, book a session, or simply read and take a pause. It is not a replacement for emergency or medical care.',
  },
  {
    category: 'Getting started',
    question: 'Do I need to know exactly what I am feeling before I begin?',
    answer:
      'No. You can begin with a simple concern such as stress, loneliness, sleep, relationships, anxiety, or “I just need to talk.” You do not need the perfect words or a diagnosis to take a first step.',
  },
  {
    category: 'Support options',
    question: 'Who can I talk to on Hope Hub?',
    answer:
      'Depending on availability and the support you choose, you may connect with a peer supporter, trained listener, coach, counsellor, psychologist, or therapist. Their role, availability, session format, and price are shown before you confirm a booking.',
  },
  {
    category: 'Support options',
    question: 'What is the difference between peer support and professional support?',
    answer:
      'Peer support and trained listeners offer a caring, non-judgmental space to talk through everyday feelings. Professional providers offer clinical or therapeutic support within their qualifications. If you need diagnosis, treatment, medication advice, or urgent help, choose an appropriately qualified professional or local emergency service.',
  },
  {
    category: 'Support options',
    question: 'Can I choose chat, voice, or video?',
    answer:
      'Yes, when the selected provider and session support that mode. You will see the available options before joining. You can start with the format that feels most comfortable and change your preference for a future booking.',
  },
  {
    category: 'Bookings & payments',
    question: 'How do bookings and prices work?',
    answer:
      'Open a provider profile to review session length, price, any first-session or package offer, and available times. The final amount is shown before confirmation. If a Hope Hub coupon or a provider offer applies, the checkout shows the best eligible saving clearly.',
  },
  {
    category: 'Bookings & payments',
    question: 'Can I book for later or reschedule?',
    answer:
      'Yes. Choose an available time when booking. If your plans change, open your support plan or booking details to see the available reschedule or cancellation options for that provider and session type.',
  },
  {
    category: 'Privacy & safety',
    question: 'Do I have to use my real name or share personal details?',
    answer:
      'Share only what is needed for the support you choose. You never need to post private details in a community space. Avoid sharing passwords, OTPs, payment details, address, or identifying information with other members in direct messages.',
  },
  {
    category: 'Privacy & safety',
    question: 'What should I do if someone makes me uncomfortable?',
    answer:
      'Stop the conversation, block the person if needed, and report the concern to Hope Hub. If it is safe, keep a screenshot so the team can review what happened. Only use verified Hope Hub support and booking routes; no one should pressure you to move platforms, send money, or share personal information.',
  },
  {
    category: 'Privacy & safety',
    question: 'What if I am in immediate danger or thinking about harming myself?',
    answer:
      'Please contact local emergency services, go to the nearest emergency department, or reach a trusted person who can stay with you now. Hope Hub is not an emergency-response service and cannot provide immediate crisis intervention.',
  },
];

@Component({
  selector: 'app-home-faq',
  standalone: true,
  imports: [AppButtonComponent, PageHeaderComponent, RouterModule],
  templateUrl: './home-faq.component.html',
  styleUrl: './home-faq.component.scss',
})
export class HomeFaqComponent {
  @Input() limit: number | null = null;
  @Input() showAllLink = false;

  readonly routes = CONSUMER_ROUTES;
  readonly faqs = HOME_FAQS;

  get visibleFaqs() {
    return this.limit && this.limit > 0 ? this.faqs.slice(0, this.limit) : this.faqs;
  }
}

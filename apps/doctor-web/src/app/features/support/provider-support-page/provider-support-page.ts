import { Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

type SupportArticle = {
  title: string;
  description: string;
  topic: string;
  route?: string;
  externalUrl?: string;
};

type SupportTopic = {
  title: string;
  description: string;
  icon: string;
  articles: SupportArticle[];
};

const PROVIDER_SUPPORT_TOPICS: SupportTopic[] = [
  {
    title: 'Getting started',
    description: 'Set up your provider account and public profile.',
    icon: '✨',
    articles: [
      {
        title: 'Finish your setup',
        description: 'Complete the next required profile step and unlock your workspace.',
        topic: 'Getting started',
        route: '/dashboard',
      },
      {
        title: 'Update your public profile',
        description: 'Edit your photo, bio, languages, support scope, and services.',
        topic: 'Getting started',
        route: '/profile',
      },
    ],
  },
  {
    title: 'Sessions & availability',
    description: 'Control when users can book or connect live.',
    icon: '🗓️',
    articles: [
      {
        title: 'Set your available times',
        description: 'Add bookable slots so users know when they can reach you.',
        topic: 'Sessions & availability',
        route: '/slots',
      },
      {
        title: 'Go live or pause',
        description: 'Turn chat, voice, or video availability on only when you are ready.',
        topic: 'Sessions & availability',
        route: '/online-doctor',
      },
      {
        title: 'Manage your sessions',
        description: 'Open assigned sessions, follow-ups, and active conversations.',
        topic: 'Sessions & availability',
        route: '/worklist',
      },
    ],
  },
  {
    title: 'Safety & boundaries',
    description: 'Keep emotional support safe, clear, and within your role.',
    icon: '🛡️',
    articles: [
      {
        title: 'Listener guidelines',
        description: 'Know the boundaries for non-clinical emotional support and escalation.',
        topic: 'Safety & boundaries',
        externalUrl: 'https://hopehub.in/listener-guidelines',
      },
      {
        title: 'When a user may be at risk',
        description:
          'Pause normal support, follow the escalation process, and document the concern.',
        topic: 'Safety & boundaries',
        externalUrl: 'https://hopehub.in/listener-training',
      },
    ],
  },
  {
    title: 'Services & earnings',
    description: 'Keep your offerings clear and understand payments.',
    icon: '💳',
    articles: [
      {
        title: 'Create or edit a service',
        description: 'Choose what you offer, duration, pricing, and whether it is active.',
        topic: 'Services & earnings',
        route: '/profile',
      },
      {
        title: 'View earnings',
        description: 'See completed payments, pending earnings, and payout details.',
        topic: 'Services & earnings',
        route: '/earnings',
      },
    ],
  },
];

@Component({
  selector: 'app-provider-support-page',
  imports: [RouterLink],
  templateUrl: './provider-support-page.html',
  styleUrl: './provider-support-page.scss',
})
export class ProviderSupportPage {
  readonly query = signal('');
  readonly topics = PROVIDER_SUPPORT_TOPICS;
  readonly filteredTopics = computed(() => {
    const search = this.query().trim().toLowerCase();
    if (!search) return this.topics;
    return this.topics
      .map((topic) => ({
        ...topic,
        articles: topic.articles.filter((article) =>
          `${topic.title} ${topic.description} ${article.title} ${article.description}`
            .toLowerCase()
            .includes(search),
        ),
      }))
      .filter((topic) => topic.articles.length > 0);
  });

  onSearch(event: Event) {
    this.query.set((event.target as HTMLInputElement).value);
  }
}

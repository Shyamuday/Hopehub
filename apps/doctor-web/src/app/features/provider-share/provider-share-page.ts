import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AppButtonComponent } from '../../shared/ui/app-button.component';
import {
  ProviderShareLink,
  ProviderShareOverview,
  ProviderShareService,
} from '../../core/services/provider-share.service';

@Component({
  selector: 'app-provider-share-page',
  standalone: true,
  imports: [CommonModule, FormsModule, AppButtonComponent],
  templateUrl: './provider-share-page.html',
  styleUrl: './provider-share-page.scss',
})
export class ProviderSharePage implements OnInit {
  private readonly shareService = inject(ProviderShareService);
  readonly data = signal<ProviderShareOverview | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly message = signal('');
  readonly error = signal('');
  kind: 'PROFILE' | 'BOOK' | 'TALK' = 'BOOK';
  mode: 'chat' | 'voice' | 'video' = 'chat';
  serviceId = '';
  label = '';
  readonly permanentOptions: Array<{
    key: 'profile' | 'book' | 'chat' | 'voice' | 'video';
    title: string;
    note: string;
  }> = [
    {
      key: 'profile',
      title: 'View my profile',
      note: 'See your profile, services, reviews and availability.',
    },
    { key: 'book', title: 'Book a session', note: 'Choose an available time and pay securely.' },
    {
      key: 'chat',
      title: 'Talk by chat',
      note: 'Starts live chat when you are online; otherwise offers booking.',
    },
    {
      key: 'voice',
      title: 'Talk by voice',
      note: 'Starts a private voice request when available.',
    },
    {
      key: 'video',
      title: 'Talk by video',
      note: 'Starts a private video request when available.',
    },
  ];

  ngOnInit(): void {
    void this.load();
  }

  async load() {
    this.loading.set(true);
    this.error.set('');
    try {
      this.data.set(await this.shareService.load());
    } catch {
      this.error.set('Could not load your sharing links. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }

  async copy(url: string) {
    await navigator.clipboard.writeText(url);
    this.message.set('Link copied.');
  }

  async share(url: string, title: string) {
    if (navigator.share) {
      await navigator.share({
        title,
        text: `Connect with ${this.data()?.provider.name} on Hope Hub`,
        url,
      });
      return;
    }
    await this.copy(url);
  }

  async createLink() {
    this.saving.set(true);
    this.error.set('');
    this.message.set('');
    try {
      const result = await this.shareService.create({
        kind: this.kind,
        mode: this.kind === 'TALK' ? this.mode : undefined,
        careTeamServiceId: this.serviceId || undefined,
        label: this.label.trim() || undefined,
      });
      this.data.update((value) =>
        value ? { ...value, links: [result.link, ...value.links] } : value,
      );
      this.label = '';
      this.message.set('Share link created.');
    } catch {
      this.error.set('Could not create this link. Check the service and try again.');
    } finally {
      this.saving.set(false);
    }
  }

  async toggle(link: ProviderShareLink) {
    try {
      const result = await this.shareService.update(link.id, { isActive: !link.isActive });
      this.data.update((value) =>
        value
          ? {
              ...value,
              links: value.links.map((item) => (item.id === link.id ? result.link : item)),
            }
          : value,
      );
    } catch {
      this.error.set('Could not update this link.');
    }
  }
}

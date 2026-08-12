import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { environment } from '../../../../environments/environment';
import {
  CONSUMER_AVAILABILITY_COPY,
  consumerProviderAvailabilityClass,
  consumerProviderAvailabilityLabel,
} from '../../../core/constants/consumer-availability.constants';
import { consumerProviderRoleBadgeClass } from '../../../core/constants/consumer-provider-presentation.constants';
import { HopeHubProvider } from '../../../core/services/booking.service';
import {
  ConnectOptionMode,
  ConnectOptionsComponent,
} from '../connect-options/connect-options.component';
import { AppButtonComponent } from '../app-button/app-button.component';
import { StatusChipComponent } from '../status-chip/status-chip.component';

export type ProviderCardVariant = 'compact' | 'standard' | 'result';

@Component({
  selector: 'app-provider-card',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    AppButtonComponent,
    ConnectOptionsComponent,
    StatusChipComponent,
  ],
  templateUrl: './provider-card.component.html',
})
export class ProviderCardComponent {
  @Input({ required: true }) provider!: HopeHubProvider;
  @Input() variant: ProviderCardVariant = 'standard';
  @Input() profileLink: string[] | null = null;
  @Input() showProfileLink = true;
  @Input() showConnectOptions = true;
  @Input() singleAction = true;
  @Input() showAvailability = true;
  @Input() showBestMatch = '';
  @Input() showBook = true;
  @Input() bookLabel = 'Slot';
  @Input() connectTitle = 'Choose how to start';
  @Input() connectSubtitle = 'Start by chat, voice, video, or book a slot.';
  @Input() bestForLimit = 2;
  @Input() bestForSeparator = ' · ';

  @Output() connectSelected = new EventEmitter<ConnectOptionMode>();

  imageUrl(): string | null {
    const image = this.provider?.profileImageUrl;
    if (!image) return null;
    return image.startsWith('http') ? image : `${environment.apiUrl}${image}`;
  }

  initial(): string {
    return this.provider?.name?.slice(0, 1) || 'H';
  }

  roleLabel(): string {
    return (
      this.provider?.supportRoleLabel ||
      this.provider?.designation ||
      this.provider?.specialty ||
      'Hope Hub provider'
    );
  }

  tierLabel(): string {
    return (
      this.provider?.supportTierLabel ||
      (this.provider?.isClinicalCare ? 'Professional care' : 'Support')
    );
  }

  roleBadgeClass(): string {
    return consumerProviderRoleBadgeClass(this.provider);
  }

  availabilityLabel(): string {
    return consumerProviderAvailabilityLabel(this.provider);
  }

  availabilityClass(): string {
    return consumerProviderAvailabilityClass(this.provider);
  }

  languagesLabel(): string {
    const languages = this.provider?.languages?.filter(Boolean).slice(0, 3) || [];
    return languages.length ? languages.join(', ') : '';
  }

  genderLabel(): string {
    const labels: Record<string, string> = {
      FEMALE: 'Female',
      MALE: 'Male',
      OTHER: 'Other',
      PREFER_NOT_TO_SAY: 'Prefer not to say',
    };
    return this.provider?.gender ? labels[this.provider.gender] || this.provider.gender : '';
  }

  metaLabel(): string {
    return [this.genderLabel(), this.languagesLabel()].filter(Boolean).join(' · ');
  }

  bestFor(): string[] {
    const provider = this.provider;
    return (
      provider?.supportBestFor?.length
        ? provider.supportBestFor
        : provider?.concernsHandled?.length
          ? provider.concernsHandled
          : provider?.focusAreas || []
    )
      .filter(Boolean)
      .slice(0, this.bestForLimit);
  }

  bestForLabel(): string {
    return this.bestFor().join(this.bestForSeparator) || 'Emotional support';
  }

  screenedListenerLabel(): string {
    return this.provider?.listenerTrustLabel || 'Screened listener';
  }

  compact(): boolean {
    return this.variant === 'compact';
  }

  result(): boolean {
    return this.variant === 'result';
  }

  languageFallback(): string {
    return CONSUMER_AVAILABILITY_COPY.languageFlexible;
  }

  canTalkNow(): boolean {
    return Boolean(this.provider?.quickTalkAvailable || this.provider?.liveStatus === 'ONLINE');
  }

  primaryActionLabel(): string {
    return this.canTalkNow() ? 'Talk now' : 'Book a time';
  }

  primaryActionMode(): ConnectOptionMode {
    if (!this.canTalkNow()) return 'book';
    if (this.provider?.acceptsChat !== false) return 'chat';
    if (this.provider?.acceptsVoiceCall !== false) return 'voice';
    if (this.provider?.acceptsVideoCall !== false) return 'video';
    return 'book';
  }
}

import {
  Component,
  DestroyRef,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { Socket } from 'socket.io-client';
import { Room, RoomEvent, Track } from 'livekit-client';
import {
  AuthModalService,
  AuthService,
  BookingService,
  HopeHubRealtimeService,
  NotificationService,
} from '../../core/services';
import { User } from '../../core/models/auth.model';
import {
  HopeHubLiveGroup,
  HopeHubLiveGroupMessage,
  HopeHubLiveGroupModeration,
} from '../../core/services/booking.service';

const GROUP_MESSAGE_EVENT = 'hopehub-group:message:new';

@Component({
  selector: 'app-live-groups',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './live-groups.component.html',
  styleUrl: './live-groups.component.scss',
})
export class LiveGroupsComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly bookingService = inject(BookingService);
  private readonly authService = inject(AuthService);
  private readonly authModalService = inject(AuthModalService);
  private readonly notificationService = inject(NotificationService);
  private readonly realtime = inject(HopeHubRealtimeService);
  private readonly destroyRef = inject(DestroyRef);

  readonly currentUser = signal<User | null>(null);
  readonly group = signal<HopeHubLiveGroup | null>(null);
  readonly messages = signal<HopeHubLiveGroupMessage[]>([]);
  readonly loading = signal(true);
  readonly sending = signal(false);
  readonly error = signal('');
  readonly draft = signal('');
  readonly requiresLoginToSpeak = signal(false);
  readonly moderation = signal<HopeHubLiveGroupModeration | null>(null);
  readonly joiningCall = signal(false);
  readonly callConnected = signal(false);
  readonly callError = signal('');
  readonly callStatus = signal('');
  readonly callParticipantCount = signal(0);
  readonly listenOnly = signal(false);
  readonly canPublishInCall = signal(false);
  readonly speaking = signal(false);
  readonly shareMessage = signal('');
  readonly roomSettingsOpen = signal(false);
  readonly savingRoomSettings = signal(false);
  readonly settingsTitle = signal('');
  readonly settingsDescription = signal('');
  readonly settingsCallTitle = signal('');
  readonly settingsCallAgenda = signal('');
  readonly settingsSlowModeSeconds = signal(0);
  readonly canSend = computed(
    () => !!this.currentUser() && !!this.draft().trim() && !this.sending(),
  );

  @ViewChild('localMedia', { static: false }) localMedia?: ElementRef<HTMLElement>;
  @ViewChild('remoteMedia', { static: false }) remoteMedia?: ElementRef<HTMLElement>;

  private groupId = '';
  private socket: Socket | null = null;
  private liveKitRoom: Room | null = null;

  private readonly handleIncomingMessage = (raw: unknown) => {
    const message = raw as HopeHubLiveGroupMessage;
    if (!message?.id || message.groupId !== this.group()?.id) return;
    this.mergeMessage(message);
  };

  ngOnInit(): void {
    this.authService.user$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((user) => {
      const wasAnonymousPreview = !this.currentUser() && !!user && this.requiresLoginToSpeak();
      this.currentUser.set(user);
      if (wasAnonymousPreview && this.groupId) {
        this.loadGroup();
      }
    });

    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.groupId = params.get('groupId') || '';
      if (this.groupId) this.loadGroup();
    });
  }

  ngOnDestroy(): void {
    this.socket?.off?.(GROUP_MESSAGE_EVENT, this.handleIncomingMessage);
    this.leaveCall();
  }

  isOwnMessage(message: HopeHubLiveGroupMessage): boolean {
    return message.senderId === this.currentUser()?.id;
  }

  roleLabel(message: HopeHubLiveGroupMessage): string {
    const role = String(message.senderRole || '')
      .replace(/_/g, ' ')
      .toLowerCase();
    if (!role) return 'member';
    return role.replace(/\b\w/g, (char) => char.toUpperCase());
  }

  canHostGroups(): boolean {
    const role = this.currentUser()?.role;
    return role === 'DOCTOR' || role === 'ADMIN' || role === 'HR';
  }

  isCallRoom(): boolean {
    const mode = this.group()?.mode;
    return mode === 'VOICE' || mode === 'VIDEO';
  }

  callTitle(): string {
    const room = this.group();
    return room?.callTitle || room?.title || 'Live group call';
  }

  callButtonLabel(): string {
    const mode = this.group()?.mode;
    if (this.joiningCall()) return 'Joining...';
    if (this.callConnected()) return 'Connected';
    if (!this.currentUser()) return mode === 'VIDEO' ? 'Watch live' : 'Listen live';
    return mode === 'VIDEO' ? 'Join video call' : 'Join voice call';
  }

  signUpForFreeChat(): void {
    this.notificationService.info(
      'Create a free account to speak in the group or start a free chat.',
    );
    this.authModalService.openRegister();
  }

  async shareRoom(): Promise<void> {
    const room = this.group();
    const url = typeof window === 'undefined' ? '' : window.location.href;
    const title = room?.callTitle || room?.title || 'Hope Hub live group';
    const browserNavigator: any = typeof window === 'undefined' ? null : window.navigator;
    try {
      if (browserNavigator && 'share' in browserNavigator) {
        await browserNavigator.share({ title, text: 'Join this Hope Hub live room.', url });
      } else if (browserNavigator?.clipboard && url) {
        await browserNavigator.clipboard.writeText(url);
        this.shareMessage.set('Room link copied.');
      }
    } catch {
      this.shareMessage.set('');
    }
  }

  openRoomSettings(): void {
    const room = this.group();
    if (!room) return;
    this.settingsTitle.set(room.title || '');
    this.settingsDescription.set(room.description || '');
    this.settingsCallTitle.set(room.callTitle || room.title || '');
    this.settingsCallAgenda.set(room.callAgenda || '');
    this.settingsSlowModeSeconds.set(Number(room.slowModeSeconds || 0));
    this.roomSettingsOpen.set(true);
  }

  saveRoomSettings(): void {
    if (!this.canHostGroups() || this.savingRoomSettings()) return;
    this.savingRoomSettings.set(true);
    this.bookingService
      .updateLiveGroupDetails(this.groupId, {
        title: this.settingsTitle().trim(),
        description: this.settingsDescription().trim(),
        callTitle: this.settingsCallTitle().trim(),
        callAgenda: this.settingsCallAgenda().trim(),
        slowModeSeconds: Number(this.settingsSlowModeSeconds() || 0),
      })
      .subscribe({
        next: (res) => {
          this.group.set(res.group);
          this.savingRoomSettings.set(false);
          this.roomSettingsOpen.set(false);
          this.notificationService.success('Room settings updated.');
        },
        error: (error) => {
          this.savingRoomSettings.set(false);
          this.notificationService.error(this.readErrorMessage(error));
        },
      });
  }

  sendMessage(): void {
    const body = this.draft().trim();
    if (!body || this.sending()) return;
    if (!this.currentUser()) {
      this.signUpForFreeChat();
      return;
    }

    this.sending.set(true);
    this.bookingService.sendLiveGroupMessage(this.groupId, body).subscribe({
      next: (res) => {
        this.mergeMessage(res.message);
        this.draft.set('');
        this.sending.set(false);
      },
      error: (error) => {
        this.sending.set(false);
        const message = this.readErrorMessage(error);
        this.error.set(message);
        this.notificationService.error(message);
      },
    });
  }

  startGroupCall(mode: 'VOICE' | 'VIDEO'): void {
    if (!this.currentUser()) {
      this.signUpForFreeChat();
      return;
    }
    if (!this.canHostGroups()) {
      this.notificationService.warning('Only providers and admins can start group calls.');
      return;
    }

    this.callError.set('');
    this.callStatus.set(mode === 'VIDEO' ? 'Starting video room...' : 'Starting voice room...');
    this.bookingService.updateLiveGroupMode(this.groupId, mode).subscribe({
      next: (res) => {
        this.group.set(res.group);
        this.joinGroupCall();
      },
      error: (error) => {
        const message = this.readErrorMessage(error);
        this.callError.set(message);
        this.callStatus.set('');
        this.notificationService.error(message);
      },
    });
  }

  joinGroupCall(): void {
    if (!this.isCallRoom()) {
      this.callError.set('A provider or admin has not started voice/video for this group yet.');
      return;
    }
    if (this.joiningCall() || this.callConnected()) return;

    this.joiningCall.set(true);
    this.callError.set('');
    this.callStatus.set('Connecting to secure group room...');
    this.bookingService.liveGroupCallToken(this.groupId).subscribe({
      next: (res) => {
        this.group.set(res.group);
        this.moderation.set(res.moderation || null);
        void this.connectLiveKit(res.url, res.token, res.mode === 'VIDEO', res.canPublish);
      },
      error: (error) => {
        const message = this.readErrorMessage(error);
        this.callError.set(message);
        this.callStatus.set('');
        this.joiningCall.set(false);
        this.notificationService.error(message);
      },
    });
  }

  leaveCall(): void {
    this.liveKitRoom?.disconnect();
    this.liveKitRoom = null;
    this.clearMedia();
    this.callConnected.set(false);
    this.joiningCall.set(false);
    this.callParticipantCount.set(0);
    this.listenOnly.set(false);
    this.canPublishInCall.set(false);
    this.speaking.set(false);
    this.callStatus.set('');
  }

  private loadGroup(): void {
    this.loading.set(true);
    this.error.set('');
    this.bookingService.liveGroup(this.groupId).subscribe({
      next: (res) => {
        this.group.set(res.group);
        this.requiresLoginToSpeak.set(Boolean(res.requiresLoginToSpeak));
        this.moderation.set(res.moderation || null);
        this.messages.set(res.messages || []);
        this.loading.set(false);
        this.bindRealtime(res.group.id);
      },
      error: (error) => {
        this.loading.set(false);
        const message = this.readErrorMessage(error);
        this.error.set(message);
      },
    });
  }

  private bindRealtime(groupId: string): void {
    this.socket?.off?.(GROUP_MESSAGE_EVENT, this.handleIncomingMessage);
    if (!this.currentUser()) return;
    this.realtime.subscribeLiveGroup(groupId);
    this.socket = this.realtime.getSocket();
    this.socket?.off?.(GROUP_MESSAGE_EVENT, this.handleIncomingMessage);
    this.socket?.on?.(GROUP_MESSAGE_EVENT, this.handleIncomingMessage);
  }

  tryToSpeak(): void {
    if (!this.currentUser()) {
      this.signUpForFreeChat();
      return;
    }
    if (this.moderation()?.isMuted) {
      this.callError.set('You are muted by a moderator in this room.');
      return;
    }
    if (!this.callConnected()) {
      this.joinGroupCall();
      return;
    }
    void this.enableSpeaking();
  }

  private async enableSpeaking(): Promise<void> {
    const room = this.liveKitRoom;
    if (!room) return;
    if (!this.canPublishInCall()) {
      this.signUpForFreeChat();
      return;
    }
    try {
      await room.localParticipant.setMicrophoneEnabled(true);
      if (this.group()?.mode === 'VIDEO') {
        await room.localParticipant.setCameraEnabled(true);
      }
      this.attachLocalTracks(room);
      this.speaking.set(true);
      this.listenOnly.set(false);
      this.callError.set('');
      this.callStatus.set('You can speak now.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not enable microphone.';
      this.callError.set(message);
      this.notificationService.error(message);
    }
  }

  moderateMessageSender(
    message: HopeHubLiveGroupMessage,
    action: 'MUTE' | 'BAN' | 'REMOVE' | 'UNMUTE' | 'UNBAN',
  ): void {
    if (!this.canModerateMessage(message)) return;
    this.bookingService
      .moderateLiveGroupMember(this.groupId, {
        userId: message.senderId,
        displayName: message.senderName,
        role: message.senderRole || '',
        action,
        mutedMinutes: action === 'MUTE' ? 60 : undefined,
        reason: `Moderated from Hope Hub group room by ${this.currentUser()?.name || 'moderator'}`,
      })
      .subscribe({
        next: () => this.notificationService.success(`Member ${action.toLowerCase()} applied.`),
        error: (error) => this.notificationService.error(this.readErrorMessage(error)),
      });
  }

  removeMessage(message: HopeHubLiveGroupMessage): void {
    if (!this.canHostGroups() || message.isDeleted) return;
    this.bookingService.removeLiveGroupMessage(this.groupId, message.id).subscribe({
      next: (res) => this.mergeMessage(res.message, true),
      error: (error) => this.notificationService.error(this.readErrorMessage(error)),
    });
  }

  canModerateMessage(message: HopeHubLiveGroupMessage): boolean {
    return (
      this.canHostGroups() && message.senderId !== this.currentUser()?.id && !message.isDeleted
    );
  }

  private async connectLiveKit(
    url: string,
    token: string,
    withVideo: boolean,
    canPublish: boolean,
  ): Promise<void> {
    try {
      this.leaveCall();
      this.joiningCall.set(true);
      this.callStatus.set('Joining media room...');

      const room = new Room({ adaptiveStream: true, dynacast: true });
      this.liveKitRoom = room;

      room
        .on(
          RoomEvent.TrackSubscribed,
          (track: unknown, _publication: unknown, participant: any) => {
            this.attachTrack(track, participant?.name || participant?.identity || 'Guest', false);
            this.updateCallParticipantCount();
          },
        )
        .on(RoomEvent.TrackUnsubscribed, (track: any) => {
          track?.detach?.().forEach((element: HTMLElement) => element.remove());
          this.updateCallParticipantCount();
        })
        .on(RoomEvent.ParticipantConnected, () => this.updateCallParticipantCount())
        .on(RoomEvent.ParticipantDisconnected, () => this.updateCallParticipantCount())
        .on(RoomEvent.Disconnected, () => {
          this.clearMedia();
          this.callConnected.set(false);
          this.joiningCall.set(false);
          this.callParticipantCount.set(0);
          this.callStatus.set('Call ended.');
        });

      await room.connect(url, token);
      this.attachLocalTracks(room);
      this.attachExistingRemoteTracks(room);
      this.updateCallParticipantCount();
      this.callConnected.set(true);
      this.joiningCall.set(false);
      this.canPublishInCall.set(canPublish);
      this.listenOnly.set(true);
      this.speaking.set(false);
      this.callStatus.set(
        canPublish
          ? 'You are listening. Tap speak when you are ready.'
          : 'You are listening only. Sign up free to speak.',
      );
    } catch (error) {
      this.leaveCall();
      const message = error instanceof Error ? error.message : 'Could not join group call.';
      this.callError.set(message);
      this.notificationService.error(message);
    }
  }

  private attachLocalTracks(room: Room): void {
    this.localMedia?.nativeElement.replaceChildren();
    room.localParticipant.trackPublications.forEach((publication: any) => {
      const track = publication.track;
      if (track) this.attachTrack(track, 'You', true);
    });
  }

  private attachExistingRemoteTracks(room: Room): void {
    room.remoteParticipants.forEach((participant: any) => {
      participant.trackPublications?.forEach((publication: any) => {
        const track = publication.track;
        if (track)
          this.attachTrack(track, participant.name || participant.identity || 'Guest', false);
      });
    });
  }

  private attachTrack(track: unknown, label: string, local: boolean): void {
    const mediaTrack = track as {
      attach?: () => HTMLElement;
      kind?: string;
    };
    const container = local ? this.localMedia?.nativeElement : this.remoteMedia?.nativeElement;
    if (!container || !mediaTrack.attach) return;
    const element = mediaTrack.attach();
    element.classList.add('lk-media-tile__media');
    if (mediaTrack.kind === Track.Kind.Video) {
      element.setAttribute('playsinline', 'true');
      if (local) element.setAttribute('muted', 'true');
    }
    const tile = document.createElement('div');
    tile.className = 'lk-media-tile';
    const name = document.createElement('span');
    name.className = 'lk-media-tile__name';
    name.textContent = label;
    tile.appendChild(element);
    tile.appendChild(name);
    container.appendChild(tile);
  }

  private clearMedia(): void {
    this.localMedia?.nativeElement.replaceChildren();
    this.remoteMedia?.nativeElement.replaceChildren();
  }

  private updateCallParticipantCount(): void {
    const room = this.liveKitRoom;
    this.callParticipantCount.set(room ? 1 + room.remoteParticipants.size : 0);
  }

  private mergeMessage(message: HopeHubLiveGroupMessage, replace = false): void {
    this.messages.update((messages) => {
      if (replace) {
        return messages.map((item) => (item.id === message.id ? message : item));
      }
      if (messages.some((item) => item.id === message.id)) return messages;
      return [...messages, message].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
    });
  }

  private readErrorMessage(error: unknown): string {
    if (error && typeof error === 'object' && 'error' in error) {
      const inner = (error as { error?: { code?: string; message?: string } }).error;
      if (inner?.message) return inner.message;
    }
    if (error instanceof Error && error.message) return error.message;
    return 'Could not load this live group right now.';
  }
}

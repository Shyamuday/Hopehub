import { Component, HostListener, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter, firstValueFrom } from 'rxjs';
import {
  RoleTaskGuideComponent,
  NotificationBellHostComponent,
  ProfileAvatarDisplayComponent,
  ConsultationCallInviteComponent,
  ConsultationWebrtcCallService,
  type IceServerConfig,
} from '@hopehub/platform-ui';
import { environment } from '../../../environments/environment';
import { AUTH_TOKEN_KEY } from '../../core/constants/auth.constants';
import { ROUTE_PATHS } from '../../core/constants/app-routes.constants';
import { API_PATHS } from '../../core/constants/api-paths.constants';
import {
  profileNavItem,
  type DoctorNavChildLink,
  type DoctorNavItemDef,
  DOCTOR_NAV_ICONS,
} from '../../core/constants/doctor-nav.constants';
import { careTeamTypeLabel } from '../../core/constants/doctor-types.constants';
import { buildProviderOnboardingStatus } from '../../core/constants/provider-onboarding.constants';
import {
  HOMEOPATHY_PROVIDER_LANGUAGE,
  PH_PROVIDER_LANGUAGE,
} from '../../core/constants/provider-language.constants';
import { Auth } from '../../core/services/auth';
import {
  ConsultationNavigationService,
  type LastConsultationWorkspace,
} from '../../core/services/consultation-navigation.service';
import {
  DoctorRealtimeService,
  type ConsultationAssignedPayload,
  type ConsultationUpdatedPayload,
} from '../../core/services/doctor-realtime.service';
import { DoctorSessionService } from '../../core/services/doctor-session';
import {
  OnlineDoctorService,
  type InstantConsultationSummary,
} from '../../core/services/online-doctor.service';

export type DoctorBottomNavItem = {
  id: string;
  label: string;
  path: string;
  queryParams?: Record<string, string>;
  icon: string;
  shortLabel: string;
  enabled: boolean;
};

const EXPANDED_GROUPS_KEY = 'doctor:nav-expanded-groups';

@Component({
  selector: 'app-doctor-shell',
  imports: [
    RouterLink,
    RouterOutlet,
    RoleTaskGuideComponent,
    NotificationBellHostComponent,
    ProfileAvatarDisplayComponent,
    ConsultationCallInviteComponent,
  ],
  templateUrl: './doctor-shell.html',
  styleUrl: './doctor-shell.scss',
})
export class DoctorShell implements OnInit, OnDestroy {
  navItems: DoctorNavItemDef[] = [];
  bottomNavItems: DoctorBottomNavItem[] = [];
  profileItem = profileNavItem();
  private overflowNavCount = 0;
  doctorName = '';
  doctorProfileImageUrl: string | null = null;
  doctorTypeLabel = '';
  providerWorkspaceTitle = 'Provider Console';
  specialtyLabel = '';
  doctorTypeKey: string | null = null;
  loadingSession = true;
  menuOpen = signal(false);
  accountMenuOpen = signal(false);
  focusMode = signal(false);
  assignmentNotice = signal('');
  incomingAssignment = signal<ConsultationAssignedPayload | null>(null);
  decliningIncomingAssignment = signal(false);
  acceptingIncomingAssignment = signal(false);
  incomingSecondsRemaining = signal(60);
  incomingAssignmentError = signal('');
  onboardingComplete = signal(false);
  onboardingPercent = signal(0);
  availabilityLoaded = signal(false);
  availabilitySaving = signal(false);
  availabilityMessage = signal('');
  expandedGroupIds = signal<Set<string>>(new Set());
  lastWorkspace = signal<LastConsultationWorkspace | null>(null);
  currentUrl = signal('');
  readonly callIceServers = signal<IceServerConfig[]>([{ urls: 'stun:stun.l.google.com:19302' }]);

  private readonly realtime = inject(DoctorRealtimeService);
  private readonly router = inject(Router);
  private readonly consultationNav = inject(ConsultationNavigationService);
  private readonly onlineDoctor = inject(OnlineDoctorService);
  private readonly globalCall = inject(ConsultationWebrtcCallService);
  private readonly http = inject(HttpClient);
  private navSubscription?: { unsubscribe: () => void };
  private incomingCountdownTimer: ReturnType<typeof setInterval> | null = null;
  private incomingRecoveryTimer: ReturnType<typeof setInterval> | null = null;
  private incomingBrowserNotification: Notification | null = null;

  readonly bellConfig = {
    apiBase: environment.apiUrl,
    tokenKey: AUTH_TOKEN_KEY,
    apiPath: '/notifications',
    inboxPath: `/${ROUTE_PATHS.NOTIFICATIONS_INBOX}`,
  };
  readonly apiBase = environment.apiUrl;
  readonly authTokenKey = AUTH_TOKEN_KEY;
  readonly routePaths = ROUTE_PATHS;

  constructor(
    private readonly auth: Auth,
    private readonly session: DoctorSessionService,
  ) {}

  async ngOnInit() {
    void this.loadCallIceServers();
    try {
      const profile = await this.session.load();
      this.doctorName = profile.name;
      this.doctorProfileImageUrl = profile.profileImageUrl ?? null;
      this.doctorTypeLabel = profile.doctorProfile?.doctorTypeLabel || 'Provider';
      this.providerWorkspaceTitle =
        profile.doctorProfile?.doctorType === 'PSYCHOLOGIST'
          ? PH_PROVIDER_LANGUAGE.workspaceTitle
          : HOMEOPATHY_PROVIDER_LANGUAGE.workspaceTitle;
      this.specialtyLabel =
        profile.doctorProfile?.doctorType === 'PSYCHOLOGIST'
          ? careTeamTypeLabel(profile.doctorProfile?.mentalHealthProfile?.careTeamType) ||
            profile.doctorProfile?.specialty ||
            ''
          : profile.doctorProfile?.specialty || '';
      this.doctorTypeKey = profile.doctorProfile?.doctorType ?? null;
      const readiness = await this.session.readiness().catch(() => null);
      const onboarding = buildProviderOnboardingStatus(
        profile.doctorProfile,
        profile.profileImageUrl ?? null,
        readiness,
      );
      this.onboardingComplete.set(onboarding.complete);
      this.onboardingPercent.set(onboarding.percent);
      this.navItems = this.buildNav(this.session.navItems());
      void this.restoreLivePresence();
    } catch {
      this.navItems = [];
    } finally {
      this.loadingSession = false;
    }

    this.refreshLastWorkspace();
    this.syncExpandedGroups(this.router.url);

    this.realtime.connect(
      (payload) => {
        const label = payload.patientCode
          ? `${payload.patientName ?? 'Patient'} (${payload.patientCode})`
          : (payload.patientName ?? 'New patient');
        this.assignmentNotice.set(`New case: ${label}`);
        this.showAssignmentNotification(payload, label);
        if (payload.consultationMode === 'INSTANT_ONLINE') {
          this.incomingAssignmentError.set('');
          this.incomingAssignment.set(payload);
          this.startIncomingCountdown(payload);
        } else {
          void this.router.navigate(this.assignmentRoute(payload));
        }
        window.setTimeout(() => this.assignmentNotice.set(''), 5000);
      },
      undefined,
      this.handleIncomingAssignmentUpdate,
    );
    const callSocket = this.realtime.getSocket();
    if (callSocket) this.globalCall.bindSocket(callSocket);
    this.startIncomingRecovery();

    this.syncFocusMode(this.router.url);
    this.currentUrl.set(this.router.url);
    this.navSubscription = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        if (this.menuOpen()) {
          this.closeMenu();
        }
        this.closeAccountMenu();
        const url = event.urlAfterRedirects;
        this.currentUrl.set(url);
        this.syncFocusMode(url);
        this.syncExpandedGroups(url);
        if (!this.onboardingComplete()) void this.refreshOnboardingState();
        if (this.consultationNav.isConsultationWorkspaceUrl(url)) {
          this.consultationNav.rememberWorkspaceFromUrl(url);
          this.refreshLastWorkspace();
        }
      });
  }

  private async loadCallIceServers() {
    try {
      const response = await firstValueFrom(
        this.http.get<{ iceServers: IceServerConfig[] }>(
          `${environment.apiUrl}${API_PATHS.RTC_ICE_SERVERS}`,
        ),
      );
      if (response.iceServers?.length) this.callIceServers.set(response.iceServers);
    } catch {
      // Keep public STUN so calls can still work on straightforward networks.
    }
  }

  openIncomingCall(consultationId: string): void {
    if (!consultationId) return;
    void this.router.navigate(['/', ROUTE_PATHS.SESSIONS, consultationId]);
  }

  private async refreshOnboardingState(): Promise<void> {
    try {
      const profile = await this.session.load(true);
      const readiness = await this.session.readiness();
      const onboarding = buildProviderOnboardingStatus(
        profile.doctorProfile,
        profile.profileImageUrl ?? null,
        readiness,
      );
      this.onboardingComplete.set(onboarding.complete);
      this.onboardingPercent.set(onboarding.percent);
      this.navItems = this.buildNav(this.session.navItems());
    } catch {
      // Keep setup mode active until readiness can be verified safely.
    }
  }

  private showAssignmentNotification(
    payload: {
      consultationId: string;
      consultationMode?: 'CLINIC_QUEUE' | 'INSTANT_ONLINE';
      diseaseName?: string | null;
      sessionMode?: 'chat' | 'voice' | 'video';
    },
    label: string,
  ) {
    if (
      typeof document === 'undefined' ||
      !document.hidden ||
      typeof Notification === 'undefined' ||
      Notification.permission !== 'granted'
    ) {
      return;
    }
    const notification = new Notification(this.incomingAssignmentTitle(payload.sessionMode), {
      body: `${label}${payload.diseaseName ? ` · ${payload.diseaseName}` : ''}`,
      tag: `hopehub-assignment-${payload.consultationId}`,
      requireInteraction: true,
    });
    this.incomingBrowserNotification?.close();
    this.incomingBrowserNotification = notification;
    notification.onclick = () => {
      window.focus();
      notification.close();
      if (payload.consultationMode === 'INSTANT_ONLINE') {
        void this.openIncomingAssignment();
      } else {
        void this.router.navigate(this.assignmentRoute(payload));
      }
    };
    navigator.vibrate?.([180, 80, 180]);
  }

  incomingAssignmentTitle(mode?: string): string {
    if (mode === 'video') return 'Incoming video session';
    if (mode === 'voice') return 'Incoming voice session';
    if (mode === 'chat') return 'Incoming private chat';
    return 'Incoming Hope Hub session';
  }

  incomingAssignmentIcon(mode?: string): string {
    if (mode === 'video') return '🎥';
    if (mode === 'voice') return '🎧';
    return '💬';
  }

  incomingUserLabel(assignment: ConsultationAssignedPayload): string {
    if (assignment.patientCode) {
      return `${assignment.patientName || 'Hope Hub user'} · ${assignment.patientCode}`;
    }
    return assignment.patientName || 'A Hope Hub user';
  }

  async openIncomingAssignment(): Promise<void> {
    const assignment = this.incomingAssignment();
    if (!assignment || this.acceptingIncomingAssignment() || this.decliningIncomingAssignment()) {
      return;
    }
    this.acceptingIncomingAssignment.set(true);
    this.incomingAssignmentError.set('');
    try {
      await this.onlineDoctor.acceptInstantConsultation(assignment.consultationId);
      this.clearIncomingAssignment();
      void this.router.navigate(this.assignmentRoute(assignment));
    } catch (error: any) {
      void this.refreshIncomingAssignment();
      this.incomingAssignmentError.set(
        error?.error?.message || 'This request is no longer available. Check your live inbox.',
      );
    } finally {
      this.acceptingIncomingAssignment.set(false);
    }
  }

  async declineIncomingAssignment(automatic = false): Promise<void> {
    const assignment = this.incomingAssignment();
    if (!assignment || this.decliningIncomingAssignment() || this.acceptingIncomingAssignment()) {
      return;
    }
    this.decliningIncomingAssignment.set(true);
    this.incomingAssignmentError.set('');
    try {
      await this.onlineDoctor.declineInstantConsultation(
        assignment.consultationId,
        automatic
          ? 'Provider did not respond before the incoming request expired'
          : 'Provider unavailable for this incoming live request',
      );
      this.clearIncomingAssignment();
      this.assignmentNotice.set('Request returned for matching with another available provider.');
      window.setTimeout(() => this.assignmentNotice.set(''), 5000);
    } catch (error: any) {
      if ([403, 404, 409].includes(error?.status)) {
        this.clearIncomingAssignment();
        this.assignmentNotice.set('This request is no longer available.');
        window.setTimeout(() => this.assignmentNotice.set(''), 5000);
        return;
      }
      void this.refreshIncomingAssignment();
      this.incomingAssignmentError.set(
        error?.error?.message ||
          'Could not return this request. Open the session and check its status.',
      );
    } finally {
      this.decliningIncomingAssignment.set(false);
    }
  }

  private startIncomingCountdown(assignment: ConsultationAssignedPayload): void {
    this.stopIncomingCountdown();
    const parsedDeadline = assignment.responseDeadlineAt
      ? new Date(assignment.responseDeadlineAt).getTime()
      : Date.now() + 60_000;
    const deadline = Number.isFinite(parsedDeadline) ? parsedDeadline : Date.now() + 60_000;
    const refresh = () => {
      const seconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      this.incomingSecondsRemaining.set(seconds);
      if (seconds === 0) {
        this.stopIncomingCountdown();
        void this.declineIncomingAssignment(true);
      }
    };
    refresh();
    if (this.incomingSecondsRemaining() > 0) {
      this.incomingCountdownTimer = setInterval(refresh, 1000);
    }
  }

  private stopIncomingCountdown(): void {
    if (this.incomingCountdownTimer) clearInterval(this.incomingCountdownTimer);
    this.incomingCountdownTimer = null;
  }

  private startIncomingRecovery(): void {
    if (this.incomingRecoveryTimer || typeof window === 'undefined') return;
    this.incomingRecoveryTimer = setInterval(() => void this.refreshIncomingAssignment(), 20_000);
  }

  private stopIncomingRecovery(): void {
    if (this.incomingRecoveryTimer) clearInterval(this.incomingRecoveryTimer);
    this.incomingRecoveryTimer = null;
  }

  private clearIncomingAssignment(): void {
    this.stopIncomingCountdown();
    this.incomingBrowserNotification?.close();
    this.incomingBrowserNotification = null;
    this.incomingAssignment.set(null);
    this.assignmentNotice.set('');
  }

  dismissUnavailableIncomingAssignment(): void {
    this.clearIncomingAssignment();
    this.incomingAssignmentError.set('');
  }

  private readonly handleIncomingAssignmentUpdate = (payload: ConsultationUpdatedPayload): void => {
    const incoming = this.incomingAssignment();
    if (!incoming || incoming.consultationId !== payload.consultationId) return;
    if (payload.status === 'ASSIGNED') return;

    this.clearIncomingAssignment();
    this.incomingAssignmentError.set('');
    this.assignmentNotice.set('This request is no longer available.');
    window.setTimeout(() => this.assignmentNotice.set(''), 5000);
  };

  private async refreshIncomingAssignment(): Promise<void> {
    try {
      const response = await this.onlineDoctor.loadInstantConsultations();
      const assigned = response.consultations.find((item) => item.status === 'ASSIGNED');
      const current = this.incomingAssignment();
      if (!assigned) {
        if (current) this.clearIncomingAssignment();
        return;
      }
      if (current?.consultationId === assigned.id) return;
      this.incomingAssignment.set(this.assignmentFromInbox(assigned));
      this.incomingAssignmentError.set('');
      this.startIncomingCountdown(this.incomingAssignment()!);
    } catch {
      // Keep the current request visible until a later socket update or retry can verify it.
    }
  }

  private assignmentFromInbox(
    consultation: InstantConsultationSummary,
  ): ConsultationAssignedPayload {
    return {
      consultationId: consultation.id,
      patientCode: consultation.patient.patientCode,
      patientName: consultation.patient.name,
      diseaseName: consultation.disease?.name ?? null,
      consultationMode: 'INSTANT_ONLINE',
      sessionMode: consultation.sessionMode ?? undefined,
      responseDeadlineAt: consultation.responseDeadlineAt ?? undefined,
    };
  }

  private assignmentRoute(payload: {
    consultationId: string;
    consultationMode?: 'CLINIC_QUEUE' | 'INSTANT_ONLINE';
  }): string[] {
    if (payload.consultationMode === 'INSTANT_ONLINE') {
      return ['/', ROUTE_PATHS.SESSIONS, payload.consultationId];
    }
    return ['/', ROUTE_PATHS.CASE_ANALYSIS, payload.consultationId, 'case-analysis'];
  }

  ngOnDestroy(): void {
    this.stopIncomingCountdown();
    this.stopIncomingRecovery();
    this.realtime.disconnect();
    this.onlineDoctor.disconnectRealtime();
    this.navSubscription?.unsubscribe();
  }

  async logout() {
    this.closeAccountMenu();
    if (this.globalCall.hasActiveCall()) {
      await this.globalCall.endCurrentCall('signed_out');
    }
    this.onlineDoctor.disconnectRealtime();
    this.session.clear();
    this.auth.logout();
    void this.router.navigate(['/', ROUTE_PATHS.LOGIN]);
  }

  private async restoreLivePresence(): Promise<void> {
    try {
      const response = await this.onlineDoctor.refreshProfile();
      await this.refreshIncomingAssignment();
      this.availabilityLoaded.set(true);
      if (['ONLINE', 'BUSY', 'ON_CALL'].includes(response.profile.liveStatus)) {
        this.onlineDoctor.connectRealtime();
      }
    } catch {
      // Live presence is optional and must not block the provider workspace.
    }
  }

  availabilityLabel(): string {
    const status = this.onlineDoctor.profile()?.liveStatus ?? 'OFFLINE';
    if (status === 'BUSY') return 'Busy';
    if (status === 'ON_CALL') return 'In session';
    return status === 'ONLINE' ? 'Online' : 'Offline';
  }

  availabilityCanChange(): boolean {
    const status = this.onlineDoctor.profile()?.liveStatus ?? 'OFFLINE';
    return status === 'ONLINE' || status === 'OFFLINE';
  }

  async toggleAvailability(): Promise<void> {
    const profile = this.onlineDoctor.profile();
    if (!profile || this.availabilitySaving() || !this.availabilityCanChange()) return;

    const goingOnline = profile.liveStatus === 'OFFLINE';
    if (
      goingOnline &&
      !profile.acceptsChat &&
      !profile.acceptsVoiceCall &&
      !profile.acceptsVideoCall
    ) {
      this.availabilityMessage.set('Choose chat, voice, or video before going online.');
      void this.router.navigate(['/', ROUTE_PATHS.ONLINE_DOCTOR]);
      return;
    }

    this.availabilitySaving.set(true);
    this.availabilityMessage.set('');
    try {
      const response = await this.onlineDoctor.setLiveStatus({
        liveStatus: goingOnline ? 'ONLINE' : 'OFFLINE',
        ...(goingOnline
          ? {
              acceptsChat: profile.acceptsChat,
              acceptsVoiceCall: profile.acceptsVoiceCall,
              acceptsVideoCall: profile.acceptsVideoCall,
            }
          : {}),
      });
      if (goingOnline) {
        this.onlineDoctor.connectRealtime();
        this.availabilityMessage.set('You are online and can receive new requests.');
      } else {
        this.onlineDoctor.disconnectRealtime();
        this.availabilityMessage.set('You are offline.');
      }
    } catch (error: any) {
      this.availabilityMessage.set(
        error?.error?.message || 'We could not change your availability. Try again.',
      );
    } finally {
      this.availabilitySaving.set(false);
    }
  }

  openMenu() {
    this.closeAccountMenu();
    this.menuOpen.set(true);
  }

  closeMenu() {
    this.menuOpen.set(false);
  }

  toggleAccountMenu(): void {
    this.closeMenu();
    this.accountMenuOpen.update((open) => !open);
  }

  closeAccountMenu(): void {
    this.accountMenuOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  closeAccountMenuOnEscape(): void {
    this.closeAccountMenu();
  }

  hasOverflowNav() {
    return this.overflowNavCount > 0;
  }

  showResumeCase(item: DoctorNavItemDef) {
    return item.action === 'resume-case' && !!this.lastWorkspace();
  }

  resumeCaseLabel() {
    const last = this.lastWorkspace();
    if (!last) return 'Resume case';
    const who = last.patientName ? ` — ${last.patientName}` : '';
    const where =
      last.view === 'prescription'
        ? 'Prescription'
        : last.view === 'online-session'
          ? 'Online session'
          : 'Case analysis';
    return `Resume ${where}${who}`;
  }

  async handleResumeCase() {
    const resumed = await this.consultationNav.resumeLastWorkspace();
    if (!resumed) {
      this.refreshLastWorkspace();
    }
    this.closeMenu();
  }

  toggleGroup(groupId: string) {
    this.expandedGroupIds.update((current) => {
      const next = new Set(current);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      this.persistExpandedGroups(next);
      return next;
    });
  }

  isGroupExpanded(groupId: string) {
    return this.expandedGroupIds().has(groupId);
  }

  isGroupActive(item: DoctorNavItemDef) {
    if (!item.children?.length) return false;
    return item.children.some((child) => child.enabled && this.isChildLinkActive(child));
  }

  isTopLinkActive(item: DoctorNavItemDef) {
    if (!item.path) return false;
    return this.isPathActive(item.path, item.queryParams);
  }

  isChildLinkActive(child: DoctorNavChildLink) {
    return this.isPathActive(child.path, child.queryParams);
  }

  navLinkActive(path: string, queryParams?: Record<string, string>) {
    return this.isPathActive(path, queryParams);
  }

  visibleChildren(item: DoctorNavItemDef) {
    return (item.children || []).filter((child) => child.enabled);
  }

  visibleNavItems() {
    if (this.onboardingComplete()) return this.navItems;
    return this.navItems.filter((item) => item.id === 'dashboard');
  }

  isSetupAllowedPath(path?: string) {
    if (!path) return false;
    return (
      path === `/${ROUTE_PATHS.DASHBOARD}` ||
      path === `/${ROUTE_PATHS.PROFILE}` ||
      path === `/${ROUTE_PATHS.SUPPORT}`
    );
  }

  navItemLocked(item: DoctorNavItemDef) {
    if (this.onboardingComplete()) return false;
    if (item.action === 'resume-case') return true;
    if (item.path) return !this.isSetupAllowedPath(item.path);
    return (item.children || []).some(
      (child) => child.enabled && !this.isSetupAllowedPath(child.path),
    );
  }

  navChildLocked(child: DoctorNavChildLink) {
    return !this.onboardingComplete() && !this.isSetupAllowedPath(child.path);
  }

  onNavChildClick(child: DoctorNavChildLink, event: MouseEvent) {
    event.preventDefault();
    if (this.navChildLocked(child)) {
      void this.router.navigate(['/', ROUTE_PATHS.DASHBOARD], {
        queryParams: { onboarding: 'required' },
      });
      this.closeMenu();
      return;
    }
    void this.router.navigate([child.path], {
      queryParams: child.queryParams ?? { view: null },
    });
    this.closeMenu();
  }

  onNavItemClick(item: DoctorNavItemDef, event: MouseEvent) {
    if (!this.navItemLocked(item)) {
      this.closeMenu();
      return;
    }

    event.preventDefault();
    void this.router.navigate(['/', ROUTE_PATHS.DASHBOARD], {
      queryParams: { onboarding: 'required' },
    });
    this.closeMenu();
  }

  isGroup(item: DoctorNavItemDef) {
    return !!item.children?.length && !item.path;
  }

  private buildNav(items: DoctorNavItemDef[]) {
    const visible = items.filter((item) => {
      if (item.action === 'resume-case') return true;
      if (item.children?.length) {
        return item.enabled && item.children.some((child) => child.enabled);
      }
      return item.enabled;
    });
    this.applyMobileNavSplit(visible);
    return visible;
  }

  private applyMobileNavSplit(items: DoctorNavItemDef[]) {
    const picked: DoctorBottomNavItem[] = [];
    const used = new Set<string>();

    for (const item of items) {
      if (picked.length >= 4) break;
      if (item.enabled && item.path && item.showInBottomNav && !used.has(item.path)) {
        picked.push({
          id: item.id,
          label: item.label,
          path: item.path,
          queryParams: item.queryParams,
          icon: item.icon,
          shortLabel: item.shortLabel,
          enabled: item.enabled,
        });
        used.add(item.path);
      }

      for (const child of item.children || []) {
        if (picked.length >= 4) break;
        if (!child.enabled || !child.showInBottomNav || used.has(child.path)) continue;
        const icons = DOCTOR_NAV_ICONS[child.label] ?? DOCTOR_NAV_ICONS['Clinical'];
        picked.push({
          id: child.id,
          label: child.label,
          path: child.path,
          queryParams: child.queryParams,
          icon: icons.icon,
          shortLabel: icons.shortLabel,
          enabled: child.enabled,
        });
        used.add(child.path);
      }
    }

    this.bottomNavItems = picked.slice(0, 4);
    this.overflowNavCount = Math.max(0, items.length - this.bottomNavItems.length);
  }

  private refreshLastWorkspace() {
    this.lastWorkspace.set(this.consultationNav.getLastWorkspace());
  }

  private syncFocusMode(url: string) {
    this.focusMode.set(this.consultationNav.isConsultationWorkspaceUrl(url));
  }

  private syncExpandedGroups(url: string) {
    const next = new Set(this.readPersistedExpandedGroups());
    for (const item of this.navItems) {
      if (!item.children?.length) continue;
      if (item.defaultExpanded || this.isGroupActiveForUrl(item, url)) {
        next.add(item.id);
      }
    }
    this.expandedGroupIds.set(next);
  }

  private isGroupActiveForUrl(item: DoctorNavItemDef, url: string) {
    return (item.children || []).some(
      (child) => child.enabled && this.isPathActiveForUrl(child.path, child.queryParams, url),
    );
  }

  private isPathActive(path: string, queryParams?: Record<string, string>) {
    return this.isPathActiveForUrl(path, queryParams, this.currentUrl());
  }

  private isPathActiveForUrl(
    path: string,
    queryParams: Record<string, string> | undefined,
    url: string,
  ) {
    const tree = this.router.parseUrl(url);
    const segments = tree.root.children['primary']?.segments.map((segment) => segment.path) || [];
    const currentPath = '/' + segments.join('/');

    if (path === `/${ROUTE_PATHS.WORKLIST}`) {
      if (currentPath !== path) return false;
      const currentView = tree.queryParams['view'] || 'ALL';
      const targetView = queryParams?.['view'] || 'ALL';
      return currentView === targetView;
    }

    if (path === `/${ROUTE_PATHS.REPERTORY_BROWSER}`) {
      if (currentPath !== path) return false;
      const mode = queryParams?.['mode'];
      if (mode === 'materia-medica') {
        return tree.queryParams['mode'] === 'materia-medica';
      }
      return tree.queryParams['mode'] !== 'materia-medica';
    }

    if (path === `/${ROUTE_PATHS.CASE_ANALYSIS_STUDIO}`) {
      if (currentPath === path) return true;
      return (
        currentPath.includes(`/${ROUTE_PATHS.CASE_ANALYSIS}/`) &&
        currentPath.endsWith('/case-analysis')
      );
    }

    if (path === `/${ROUTE_PATHS.PATIENTS}`) {
      return currentPath === path || currentPath.startsWith(`${path}/`);
    }

    if (currentPath !== path && !currentPath.startsWith(`${path}/`)) {
      return false;
    }

    if (!queryParams) return true;
    return Object.entries(queryParams).every(([key, value]) => tree.queryParams[key] === value);
  }

  private readPersistedExpandedGroups() {
    try {
      const raw = sessionStorage.getItem(EXPANDED_GROUPS_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as string[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private persistExpandedGroups(ids: Set<string>) {
    try {
      sessionStorage.setItem(EXPANDED_GROUPS_KEY, JSON.stringify([...ids]));
    } catch {
      // ignore
    }
  }
}

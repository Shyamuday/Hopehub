import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FormDropdownComponent, type FormDropdownOption } from '@hopehub/platform-ui';
import { AdminApi } from '../../core/services/admin-api';
import { AppApplyButtonComponent } from '../../shared/ui/app-apply-button.component';
import { AppMediaUrlFieldComponent } from '../../shared/ui/app-media-url-field.component';

type GroupHelpConfigEntry = {
  key: string;
  label: string;
  description: string;
  section:
    | 'connection'
    | 'messages'
    | 'onboarding'
    | 'moderation'
    | 'content'
    | 'people'
    | 'operations'
    | 'commands';
  type: 'text' | 'textarea' | 'number' | 'select';
  maxLength: number;
  placeholder?: string;
  options?: string[];
  value: string;
};

type CommandItem = {
  id: string;
  title: string;
  helper: string;
  valueKey: string;
  imageUrlKey?: string;
  templateKey: string;
  placeholder: 'message' | 'value' | 'lines';
  applyMode: 'TELEGRAM_ADMIN_CONFIRMATION' | 'DIRECT_PIN';
};

type CampaignItemDraft = {
  kind: 'TEXT' | 'POLL' | 'SUMMARY';
  text: string;
  imageUrl: string;
  buttonsText: string;
  pollQuestion: string;
  pollOptionsText: string;
  pollAnonymous: boolean;
  pollMultiple: boolean;
  pollQuiz: boolean;
  correctOptionId: number | null;
  pollExplanation: string;
  closeAfterMinutes: number | null;
  messageThreadId: number | null;
  followUpOptionIdsText: string;
  followUpMessage: string;
};

type GroupHelpWorkspaceSection =
  | 'overview'
  | 'campaigns'
  | 'events'
  | 'confessions'
  | 'announcements'
  | 'moderation'
  | 'settings'
  | 'activity';

const emptyCampaignItem = (kind: 'TEXT' | 'POLL' | 'SUMMARY'): CampaignItemDraft => ({
  kind,
  text: '',
  imageUrl: '',
  buttonsText: '',
  pollQuestion: '',
  pollOptionsText: '',
  pollAnonymous: true,
  pollMultiple: false,
  pollQuiz: false,
  correctOptionId: null,
  pollExplanation: '',
  closeAfterMinutes: null,
  messageThreadId: null,
  followUpOptionIdsText: '',
  followUpMessage: '',
});

const SECTION_LABELS: Record<GroupHelpConfigEntry['section'], string> = {
  connection: 'Connection',
  messages: 'Messages',
  onboarding: 'Member onboarding',
  moderation: 'Moderation',
  content: 'Content controls',
  people: 'People and staff',
  operations: 'Operations',
  commands: 'Command templates',
};

@Component({
  selector: 'app-group-help-page',
  imports: [
    CommonModule,
    FormsModule,
    FormDropdownComponent,
    AppApplyButtonComponent,
    AppMediaUrlFieldComponent,
  ],
  templateUrl: './group-help-page.html',
  styleUrl: './group-help-page.scss',
})
export class GroupHelpPage {
  readonly activeWorkspaceSection = signal<GroupHelpWorkspaceSection>('overview');
  readonly workspaceSections: ReadonlyArray<{
    id: GroupHelpWorkspaceSection;
    label: string;
    description: string;
  }> = [
    { id: 'overview', label: 'Overview', description: 'Status and recent activity' },
    { id: 'campaigns', label: 'Posts & polls', description: 'Scheduled community content' },
    { id: 'events', label: 'Events', description: 'Voice circles and reminders' },
    { id: 'confessions', label: 'Review', description: 'Anonymous submissions' },
    { id: 'announcements', label: 'Announcements', description: 'Messages and pinned posts' },
    { id: 'moderation', label: 'Moderation', description: 'Member actions' },
    { id: 'settings', label: 'Bot settings', description: 'Messages, rules and behaviour' },
    { id: 'activity', label: 'History', description: 'Configuration activity' },
  ];
  readonly config = signal<GroupHelpConfigEntry[]>([]);
  readonly localValues = signal<Record<string, string>>({});
  readonly hasUnsavedConfigChanges = computed(() => {
    const values = this.localValues();
    return this.config().some((entry) => values[entry.key] !== entry.value);
  });
  readonly tokenConfigured = signal(false);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly savingWelcome = signal(false);
  readonly savingRevision = signal(false);
  readonly revisionBusyId = signal('');
  readonly configDraftName = signal('');
  readonly configRevisions = signal<any[]>([]);
  readonly configRevisionPreview = signal<{
    revision: any;
    changes: any[];
    unchanged: number;
  } | null>(null);
  readonly sending = signal(false);
  readonly testing = signal(false);
  readonly clearingMenu = signal(false);
  readonly applying = signal('');
  readonly copied = signal('');
  readonly telegramApplyUrl = signal('');
  readonly message = signal('');
  readonly error = signal('');
  readonly selectedDirectMessageKey = signal('telegramGroupHelpPinnedMessage');
  readonly pinDirectMessage = signal(false);
  readonly capabilityGroups = signal<Array<{ title: string; options: readonly string[] }>>([]);
  readonly actionHistory = signal<
    Array<{
      id: string;
      action: string;
      targetId: string;
      summary?: string | null;
      createdAt: string;
    }>
  >([]);
  readonly actionStatuses = signal<Record<string, 'applied' | 'confirmation'>>({});
  readonly campaigns = signal<any[]>([]);
  readonly campaignBotConfigured = signal(false);
  readonly campaignSaving = signal(false);
  readonly campaignBusyId = signal('');
  readonly campaignResults = signal<any[]>([]);
  readonly resultsCampaignId = signal('');
  readonly editingCampaignId = signal('');
  readonly campaignName = signal('');
  readonly campaignIntervalMinutes = signal(1440);
  readonly campaignIntervalOptions: FormDropdownOption[] = [
    { value: '30', label: '30 minutes' },
    { value: '60', label: '1 hour' },
    { value: '180', label: '3 hours' },
    { value: '360', label: '6 hours' },
    { value: '720', label: '12 hours' },
    { value: '1440', label: '1 day' },
    { value: '10080', label: '1 week' },
  ];
  readonly campaignTimezone = signal('Asia/Kolkata');
  readonly campaignRepeat = signal(true);
  readonly campaignActive = signal(false);
  readonly campaignItems = signal<CampaignItemDraft[]>([emptyCampaignItem('TEXT')]);
  readonly engagement = signal<any>(null);
  readonly communityEvents = signal<any[]>([]);
  readonly pendingConfessions = signal<any[]>([]);
  readonly eventSaving = signal(false);
  readonly editingEventId = signal('');
  readonly eventTitle = signal('');
  readonly eventDescription = signal('');
  readonly eventJoinUrl = signal('https://t.me/hopehubindia');
  readonly eventStartsAt = signal('');
  readonly eventReminderMinutes = signal(30);
  readonly eventRecurrence = signal<'ONCE' | 'DAILY' | 'WEEKDAYS' | 'WEEKLY'>('ONCE');
  readonly eventOccurrences = signal(7);
  readonly eventRecurrenceOptions: FormDropdownOption[] = [
    { value: 'ONCE', label: 'One voice circle' },
    { value: 'DAILY', label: 'Every day' },
    { value: 'WEEKDAYS', label: 'Weekdays only' },
    { value: 'WEEKLY', label: 'Every week' },
  ];
  readonly eventOccurrencesOptions: FormDropdownOption[] = [
    { value: '3', label: 'Create next 3 sessions' },
    { value: '7', label: 'Create next 7 sessions' },
    { value: '14', label: 'Create next 14 sessions' },
    { value: '30', label: 'Create next 30 sessions' },
    { value: '90', label: 'Create next 90 sessions' },
  ];
  readonly eventReminderOptions: FormDropdownOption[] = [
    { value: '15', label: '15 minutes before' },
    { value: '30', label: '30 minutes before' },
    { value: '60', label: '1 hour before' },
    { value: '1440', label: '1 day before' },
  ];
  readonly connectionDetails = signal<{
    bot?: string;
    group?: string;
    runtime?: string;
    permissions?: string[];
    missingPermissions?: string[];
  }>({});
  readonly moderatorAction = signal('warn');
  readonly moderatorTarget = signal('');
  readonly moderatorReason = signal('');
  readonly memberDirectory = signal<any[]>([]);
  readonly memberDirectoryScope = signal<'main' | 'staff'>('main');
  readonly memberDirectorySearch = signal('');
  readonly memberDirectoryTotal = signal(0);
  readonly memberDirectorySyncedAt = signal('');
  readonly memberDirectoryNextSyncAt = signal('');
  readonly memberDirectoryLoading = signal(false);
  readonly memberIdentityHistory = signal<Record<string, any[]>>({});
  readonly memberIdentityHistoryLoading = signal('');
  readonly roleAssignments = signal<any[]>([]);
  readonly customRoles = signal<any[]>([]);
  readonly staffGroupId = signal('');
  readonly staffMembers = signal<any[]>([]);
  readonly staffPermissionGroups = signal<
    Array<{ key: string; label: string; commands: string[]; defaultEnabled: boolean }>
  >([]);
  readonly staffPermissionSavingId = signal('');
  readonly roleTelegramUserId = signal('');
  readonly roleToAssign = signal('HELPER');
  readonly customRoleName = signal('');
  readonly customRolePermissions = signal('');
  readonly roleSaving = signal(false);
  readonly moderationCases = signal<any[]>([]);
  readonly caseSavingId = signal('');
  readonly roleOptions = computed<FormDropdownOption[]>(() => [
    { value: 'HELPER', label: 'Helper — warnings and message removal' },
    { value: 'MODERATOR', label: 'Moderator — member actions and helper tools' },
    ...this.customRoles().map((role) => ({
      value: `CUSTOM:${role.id}`,
      label: `${role.name} — custom access`,
    })),
  ]);
  readonly moderatorActions = [
    { value: 'warn', label: 'Warn member', needsTarget: true },
    { value: 'mute', label: 'Mute member', needsTarget: true },
    { value: 'kick', label: 'Kick member', needsTarget: true },
    { value: 'ban', label: 'Ban member', needsTarget: true },
    { value: 'unban', label: 'Unban member', needsTarget: true },
    { value: 'info', label: 'Member information', needsTarget: true },
    { value: 'warns', label: 'Review warnings', needsTarget: true },
    { value: 'admin', label: 'Add administrator', needsTarget: true },
    { value: 'unadmin', label: 'Remove administrator', needsTarget: true },
    { value: 'mod', label: 'Add moderator', needsTarget: true },
    { value: 'unmod', label: 'Remove moderator', needsTarget: true },
    { value: 'muter', label: 'Add muter role', needsTarget: true },
    { value: 'unmuter', label: 'Remove muter role', needsTarget: true },
    { value: 'cleaner', label: 'Add cleaner role', needsTarget: true },
    { value: 'uncleaner', label: 'Remove cleaner role', needsTarget: true },
    { value: 'helper', label: 'Add helper role', needsTarget: true },
    { value: 'unhelper', label: 'Remove helper role', needsTarget: true },
    { value: 'silence', label: 'Silence group', needsTarget: false },
    { value: 'unsilence', label: 'Unsilence group', needsTarget: false },
    { value: 'staff', label: 'Show staff', needsTarget: false },
    { value: 'list', label: 'Member activity list', needsTarget: false },
    { value: 'graphic', label: 'Growth chart', needsTarget: false },
    { value: 'trend', label: 'Growth trend', needsTarget: false },
  ] as const;

  readonly sectionOrder: Array<GroupHelpConfigEntry['section']> = [
    'connection',
    'messages',
    'onboarding',
    'moderation',
    'content',
    'people',
    'operations',
    'commands',
  ];
  readonly sectionLabels = SECTION_LABELS;
  readonly essentialDropdownKeys = new Set([
    'telegramLiveChatBridgeEnabled',
    'telegramCommunityWelcomeEnabled',
    'telegramGroupHelpFirstMessageReview',
    'telegramCommunitySmartScheduleEnabled',
    'telegramCommunityConfessionsInGroup',
    'telegramGroupHelpCaptchaMode',
    'telegramGroupHelpWelcomeCleanup',
    'telegramGroupHelpJoinProtection',
    'telegramGroupHelpAntiFloodAction',
    'telegramGroupHelpAntiSpamAction',
    'telegramGroupHelpAntiPornAction',
    'telegramGroupHelpChannelSenderPolicy',
    'telegramGroupHelpReportsMode',
    'telegramGroupHelpStatisticsMode',
  ]);
  readonly savingEssentials = signal(false);
  readonly savingCleanup = signal(false);
  readonly cleanupSettingKeys = new Set([
    'telegramGroupHelpAutoDeleteSeconds',
    'telegramGroupHelpWelcomeCleanup',
    'telegramGroupHelpCaptchaPendingMinutes',
    'telegramGroupHelpCaptchaSuccessCleanupMinutes',
    'telegramGroupHelpIdentityAlertDeleteHours',
    'telegramCommunityVoiceReminderCleanupMinutes',
  ]);

  messageCommands: CommandItem[] = [];
  moderationCommands: CommandItem[] = [];

  constructor(private readonly api: AdminApi) {
    void this.load();
  }

  readonly uploadBotMedia = (file: File) => this.api.uploadTelegramGroupHelpMedia(file);

  openWorkspaceSection(section: GroupHelpWorkspaceSection) {
    this.activeWorkspaceSection.set(section);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  workspaceBadge(section: GroupHelpWorkspaceSection) {
    if (section === 'confessions') return this.pendingConfessions().length;
    if (section === 'campaigns')
      return this.campaigns().filter((campaign) => campaign.isActive).length;
    if (section === 'events') {
      return this.communityEvents().filter((event) => event.status === 'SCHEDULED').length;
    }
    return 0;
  }

  startCampaign() {
    this.resetCampaignForm();
    this.openWorkspaceSection('campaigns');
  }

  async load() {
    this.loading.set(true);
    this.error.set('');
    try {
      const res = await this.api.getTelegramGroupHelpConfig();
      this.config.set(res.config);
      this.tokenConfigured.set(res.tokenConfigured);
      const actions = (res.actions || []).map((action) => ({
        ...action,
        helper: action.description,
      }));
      this.messageCommands = actions.filter((action) => Boolean(action.imageUrlKey));
      this.moderationCommands = actions.filter((action) => !action.imageUrlKey);
      this.capabilityGroups.set(res.capabilityGroups || []);
      this.actionHistory.set(res.actionHistory || []);
      const latestStatuses: Record<string, 'applied' | 'confirmation'> = {};
      for (const entry of res.actionHistory || []) {
        if (latestStatuses[entry.targetId]) continue;
        latestStatuses[entry.targetId] =
          entry.action === 'telegram_group_help.action_apply' ? 'applied' : 'confirmation';
      }
      this.actionStatuses.set(latestStatuses);
      this.localValues.set(Object.fromEntries(res.config.map((entry) => [entry.key, entry.value])));
      await Promise.all([
        this.loadCampaigns(),
        this.loadRoles(),
        this.loadModerationCases(),
        this.loadMemberDirectory(),
        this.loadConfigRevisions(),
      ]);
    } catch {
      this.error.set('Could not load Group Help config.');
    } finally {
      this.loading.set(false);
    }
  }

  async loadRoles() {
    try {
      const response = await this.api.getTelegramGroupHelpRoles();
      this.roleAssignments.set(response.assignments || []);
      this.customRoles.set(response.customRoles || []);
      this.staffGroupId.set(response.staffGroupId || '');
      this.staffMembers.set(response.staffMembers || []);
      this.staffPermissionGroups.set(response.permissionGroups || []);
    } catch {
      this.roleAssignments.set([]);
      this.customRoles.set([]);
      this.staffGroupId.set('');
      this.staffMembers.set([]);
      this.staffPermissionGroups.set([]);
    }
  }

  staffMemberName(member: any) {
    return [member.firstName, member.lastName].filter(Boolean).join(' ') || 'Telegram member';
  }

  async loadMemberDirectory() {
    this.memberDirectoryLoading.set(true);
    try {
      const response = await this.api.getTelegramGroupHelpMembers({
        scope: this.memberDirectoryScope(),
        q: this.memberDirectorySearch().trim(),
        pageSize: 50,
      });
      this.memberDirectory.set(response.members || []);
      this.memberDirectoryTotal.set(response.total || 0);
      this.memberDirectorySyncedAt.set(response.synchronizedAt || '');
      this.memberDirectoryNextSyncAt.set(response.nextSyncAt || '');
    } catch {
      this.memberDirectory.set([]);
      this.memberDirectoryTotal.set(0);
      this.memberDirectorySyncedAt.set('');
      this.memberDirectoryNextSyncAt.set('');
    } finally {
      this.memberDirectoryLoading.set(false);
    }
  }

  setMemberDirectoryScope(scope: 'main' | 'staff') {
    if (this.memberDirectoryScope() === scope) return;
    this.memberDirectoryScope.set(scope);
    void this.loadMemberDirectory();
  }

  memberIdentityKey(member: any) {
    return `${this.memberDirectoryScope()}:${member.telegramUserId}`;
  }

  async toggleMemberIdentityHistory(member: any) {
    const key = this.memberIdentityKey(member);
    const current = this.memberIdentityHistory();
    if (current[key]) {
      const { [key]: _hidden, ...remaining } = current;
      this.memberIdentityHistory.set(remaining);
      return;
    }
    this.memberIdentityHistoryLoading.set(key);
    try {
      const response = await this.api.getTelegramGroupHelpMemberIdentityHistory(
        member.telegramUserId,
        this.memberDirectoryScope(),
      );
      this.memberIdentityHistory.set({
        ...this.memberIdentityHistory(),
        [key]: response.history || [],
      });
    } catch {
      this.error.set('Could not load this member’s name history.');
    } finally {
      this.memberIdentityHistoryLoading.set('');
    }
  }

  useMemberForModeration(member: any) {
    this.moderatorTarget.set(member.commandTarget || member.telegramUserId);
    document.querySelector('.moderator-form')?.scrollIntoView({ behavior: 'smooth' });
  }

  staffHasPermissionGroup(member: any, group: { commands: string[] }) {
    if (member.fullAdmin) return true;
    const permissions = new Set<string>(member.permissions || []);
    return group.commands.every((command) => permissions.has(command));
  }

  async toggleStaffFullAdmin(member: any, enabled: boolean) {
    const dailyPermissions = this.staffPermissionGroups()
      .filter((group) => group.defaultEnabled)
      .flatMap((group) => group.commands);
    await this.saveStaffPermissions(member, enabled ? [] : dailyPermissions, enabled);
  }

  async toggleStaffPermission(member: any, group: { commands: string[] }, enabled: boolean) {
    const permissions = new Set<string>(
      (member.permissions || []).filter((permission: string) => permission !== '*'),
    );
    for (const command of group.commands) {
      if (enabled) permissions.add(command);
      else permissions.delete(command);
    }
    await this.saveStaffPermissions(member, [...permissions], false);
  }

  private async saveStaffPermissions(member: any, permissions: string[], fullAdmin: boolean) {
    this.staffPermissionSavingId.set(member.telegramUserId);
    this.error.set('');
    try {
      await this.api.updateTelegramGroupHelpStaffPermissions({
        telegramUserId: member.telegramUserId,
        permissions,
        fullAdmin,
      });
      this.message.set(
        fullAdmin
          ? `${this.staffMemberName(member)} can now use all Hope Hub bot admin commands.`
          : permissions.length
            ? `${this.staffMemberName(member)}'s bot permissions were updated.`
            : `${this.staffMemberName(member)} no longer has delegated bot permissions.`,
      );
      await this.loadRoles();
    } catch (error: any) {
      this.error.set(error?.error?.message || 'Could not update this staff member’s permissions.');
    } finally {
      this.staffPermissionSavingId.set('');
    }
  }

  async loadModerationCases() {
    try {
      const response = await this.api.getTelegramGroupHelpModerationCases();
      this.moderationCases.set(response.cases || []);
    } catch {
      this.moderationCases.set([]);
    }
  }

  async resolveModerationCase(
    moderationCase: any,
    action: 'APPROVE' | 'NO_ACTION' | 'DELETE' | 'MUTE' | 'KICK' | 'BAN',
  ) {
    this.caseSavingId.set(moderationCase.id);
    this.error.set('');
    try {
      await this.api.resolveTelegramGroupHelpModerationCase(moderationCase.id, action);
      this.message.set(
        action === 'APPROVE'
          ? 'Message review approved. The member will be trusted once the selected review count is reached.'
          : action === 'NO_ACTION'
            ? 'Report closed without an action.'
            : 'Moderation action applied.',
      );
      await this.loadModerationCases();
    } catch (error: any) {
      this.error.set(error?.error?.message || 'Could not resolve this report.');
    } finally {
      this.caseSavingId.set('');
    }
  }

  async assignRole() {
    const telegramUserId = this.roleTelegramUserId().trim();
    if (!/^\d+$/.test(telegramUserId)) {
      this.error.set('Enter the member’s numeric Telegram user ID.');
      return;
    }
    this.roleSaving.set(true);
    this.error.set('');
    try {
      await this.api.assignTelegramGroupHelpRole({
        telegramUserId,
        ...(this.roleToAssign().startsWith('CUSTOM:')
          ? { customRoleId: this.roleToAssign().slice('CUSTOM:'.length) }
          : { role: this.roleToAssign() === 'MODERATOR' ? 'MODERATOR' : 'HELPER' }),
      });
      this.roleTelegramUserId.set('');
      this.message.set('Role assigned. The member can use it immediately in the group.');
      await this.loadRoles();
    } catch (error: any) {
      this.error.set(error?.error?.message || 'Could not assign this role.');
    } finally {
      this.roleSaving.set(false);
    }
  }

  async revokeRole(id: string) {
    this.roleSaving.set(true);
    this.error.set('');
    try {
      await this.api.revokeTelegramGroupHelpRole(id);
      this.message.set('Role removed.');
      await this.loadRoles();
    } catch (error: any) {
      this.error.set(error?.error?.message || 'Could not remove this role.');
    } finally {
      this.roleSaving.set(false);
    }
  }

  async saveCustomRole() {
    const name = this.customRoleName().trim();
    const permissions = this.customRolePermissions()
      .split(/[\n,\s]+/)
      .map((permission) => permission.trim().toLowerCase())
      .filter(Boolean);
    if (
      name.length < 2 ||
      !permissions.length ||
      permissions.some((permission) => !/^\/[a-z]+$/i.test(permission))
    ) {
      this.error.set('Enter a role name and one command per line, for example /warn or /delete.');
      return;
    }
    this.roleSaving.set(true);
    this.error.set('');
    try {
      await this.api.saveTelegramGroupHelpCustomRole({ name, permissions });
      this.customRoleName.set('');
      this.customRolePermissions.set('');
      this.message.set('Custom role saved. You can now assign it to a member.');
      await this.loadRoles();
    } catch (error: any) {
      this.error.set(error?.error?.message || 'Could not save this custom role.');
    } finally {
      this.roleSaving.set(false);
    }
  }

  async deleteCustomRole(id: string) {
    this.roleSaving.set(true);
    this.error.set('');
    try {
      await this.api.deleteTelegramGroupHelpCustomRole(id);
      this.message.set('Custom role and its assignments were removed.');
      await this.loadRoles();
    } catch (error: any) {
      this.error.set(error?.error?.message || 'Could not remove this custom role.');
    } finally {
      this.roleSaving.set(false);
    }
  }

  async loadCampaigns() {
    const [campaignResponse, eventResponse, engagementResponse] = await Promise.all([
      this.api.getTelegramCampaigns(),
      this.api.getTelegramCommunityEvents(),
      this.api.getTelegramCommunityEngagement(),
    ]);
    this.campaigns.set(campaignResponse.campaigns || []);
    this.campaignBotConfigured.set(campaignResponse.botConfigured);
    this.communityEvents.set(eventResponse.events || []);
    this.engagement.set(engagementResponse);
    try {
      const confessionResponse = await this.api.getTelegramPendingConfessions();
      this.pendingConfessions.set(confessionResponse.submissions || []);
    } catch {
      this.pendingConfessions.set([]);
    }
  }

  addCampaignItem(kind: 'TEXT' | 'POLL' | 'SUMMARY') {
    this.campaignItems.update((items) => [...items, emptyCampaignItem(kind)]);
  }

  updateCampaignItem(index: number, patch: Partial<CampaignItemDraft>) {
    this.campaignItems.update((items) =>
      items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    );
  }

  pollOptionCount(optionsText: string) {
    return optionsText.split(/\r?\n/).filter((option) => option.trim()).length || 1;
  }

  removeCampaignItem(index: number) {
    this.campaignItems.update((items) => items.filter((_item, itemIndex) => itemIndex !== index));
  }

  campaignPayload() {
    return {
      name: this.campaignName().trim(),
      timezone: this.campaignTimezone(),
      intervalMinutes: Number(this.campaignIntervalMinutes()),
      repeat: this.campaignRepeat(),
      isActive: this.campaignActive(),
      items: this.campaignItems().map((item) => ({
        kind: item.kind,
        text: item.kind === 'TEXT' || item.kind === 'SUMMARY' ? item.text.trim() : undefined,
        imageUrl: item.kind === 'TEXT' && item.imageUrl.trim() ? item.imageUrl.trim() : undefined,
        buttons:
          item.kind === 'TEXT'
            ? item.buttonsText
                .split(/\r?\n/)
                .map((line) => line.split('|').map((part) => part.trim()))
                .filter(([text, url]) => Boolean(text) && /^https:\/\//i.test(url || ''))
                .slice(0, 8)
                .map(([text, url, style]) => ({
                  text,
                  url,
                  ...(style === 'success' || style === 'danger' || style === 'primary'
                    ? { style }
                    : {}),
                }))
            : undefined,
        pollQuestion: item.kind === 'POLL' ? item.pollQuestion.trim() : undefined,
        pollOptions:
          item.kind === 'POLL'
            ? item.pollOptionsText
                .split('\n')
                .map((option) => option.trim())
                .filter(Boolean)
            : undefined,
        pollAnonymous: item.pollAnonymous,
        pollMultiple: item.pollMultiple,
        pollQuiz: item.pollQuiz,
        correctOptionIds:
          item.kind === 'POLL' && item.pollQuiz && item.correctOptionId != null
            ? [item.correctOptionId - 1]
            : undefined,
        pollExplanation:
          item.kind === 'POLL' && item.pollQuiz && item.pollExplanation.trim()
            ? item.pollExplanation.trim()
            : undefined,
        closeAfterMinutes: item.closeAfterMinutes || undefined,
        messageThreadId: item.messageThreadId || undefined,
        followUpOptionIds:
          item.kind === 'POLL'
            ? item.followUpOptionIdsText
                .split(',')
                .map((value) => Number(value.trim()) - 1)
                .filter((value) => Number.isInteger(value) && value >= 0)
            : undefined,
        followUpMessage:
          item.kind === 'POLL' && item.followUpMessage.trim()
            ? item.followUpMessage.trim()
            : undefined,
      })),
    };
  }

  resetCampaignForm() {
    this.editingCampaignId.set('');
    this.campaignName.set('');
    this.campaignIntervalMinutes.set(1440);
    this.campaignTimezone.set('Asia/Kolkata');
    this.campaignRepeat.set(true);
    this.campaignActive.set(false);
    this.campaignItems.set([emptyCampaignItem('TEXT')]);
  }

  editCampaign(campaign: any) {
    this.activeWorkspaceSection.set('campaigns');
    this.editingCampaignId.set(campaign.id);
    this.campaignName.set(campaign.name);
    this.campaignIntervalMinutes.set(campaign.intervalMinutes);
    this.campaignTimezone.set(campaign.timezone || 'Asia/Kolkata');
    this.campaignRepeat.set(campaign.repeat);
    this.campaignActive.set(campaign.isActive);
    this.campaignItems.set(
      (campaign.items || []).map((item: any) => ({
        kind: item.kind,
        text: item.text || '',
        imageUrl: item.imageUrl || '',
        buttonsText: Array.isArray(item.buttons)
          ? item.buttons
              .map((button: { text?: string; url?: string; style?: string }) =>
                [button.text, button.url, button.style || 'primary'].filter(Boolean).join(' | '),
              )
              .join('\n')
          : '',
        pollQuestion: item.pollQuestion || '',
        pollOptionsText: Array.isArray(item.pollOptions) ? item.pollOptions.join('\n') : '',
        pollAnonymous: item.pollAnonymous,
        pollMultiple: item.pollMultiple,
        pollQuiz: item.pollQuiz,
        correctOptionId: Array.isArray(item.correctOptionIds) ? item.correctOptionIds[0] + 1 : null,
        pollExplanation: item.pollExplanation || '',
        closeAfterMinutes: item.closeAfterMinutes,
        messageThreadId: item.messageThreadId,
        followUpOptionIdsText: Array.isArray(item.followUpOptionIds)
          ? item.followUpOptionIds.map((value: number) => value + 1).join(', ')
          : '',
        followUpMessage: item.followUpMessage || '',
      })),
    );
    document.querySelector('.campaign-editor')?.scrollIntoView({ behavior: 'smooth' });
  }

  async saveCampaign() {
    if (!this.campaignName().trim() || !this.campaignItems().length) {
      this.error.set('Add a campaign name and at least one message or poll.');
      return;
    }
    this.campaignSaving.set(true);
    this.error.set('');
    this.message.set('');
    try {
      const id = this.editingCampaignId();
      if (id) await this.api.updateTelegramCampaign(id, this.campaignPayload());
      else await this.api.createTelegramCampaign(this.campaignPayload());
      await this.loadCampaigns();
      this.resetCampaignForm();
      this.message.set(id ? 'Campaign updated.' : 'Campaign created.');
    } catch (error: any) {
      this.error.set(error?.error?.message || 'Could not save campaign.');
    } finally {
      this.campaignSaving.set(false);
    }
  }

  async toggleCampaign(campaign: any) {
    this.campaignBusyId.set(campaign.id);
    try {
      await this.api.setTelegramCampaignStatus(campaign.id, !campaign.isActive);
      await this.loadCampaigns();
      this.message.set(campaign.isActive ? 'Campaign paused.' : 'Campaign activated.');
    } catch (error: any) {
      this.error.set(error?.error?.message || 'Could not change campaign status.');
    } finally {
      this.campaignBusyId.set('');
    }
  }

  async deleteCampaign(campaign: any) {
    if (!window.confirm(`Delete “${campaign.name}” and its stored results?`)) return;
    this.campaignBusyId.set(campaign.id);
    try {
      await this.api.deleteTelegramCampaign(campaign.id);
      await this.loadCampaigns();
      if (this.editingCampaignId() === campaign.id) this.resetCampaignForm();
      this.message.set('Campaign deleted.');
    } catch (error: any) {
      this.error.set(error?.error?.message || 'Could not delete campaign.');
    } finally {
      this.campaignBusyId.set('');
    }
  }

  async showCampaignResults(campaign: any) {
    this.campaignBusyId.set(campaign.id);
    try {
      const response = await this.api.getTelegramCampaignResults(campaign.id);
      this.resultsCampaignId.set(campaign.id);
      this.campaignResults.set(response.results || []);
    } catch (error: any) {
      this.error.set(error?.error?.message || 'Could not load poll results.');
    } finally {
      this.campaignBusyId.set('');
    }
  }

  async retryCampaignDelivery(delivery: any) {
    this.campaignBusyId.set(delivery.id);
    this.error.set('');
    try {
      const response = await this.api.retryTelegramCampaignDelivery(delivery.id);
      await this.loadCampaigns();
      this.message.set(
        response.delivery?.status === 'SENT'
          ? 'Message delivered successfully.'
          : 'Retry attempted. Telegram is still unavailable.',
      );
    } catch (error: any) {
      this.error.set(error?.error?.message || 'Could not retry this message.');
    } finally {
      this.campaignBusyId.set('');
    }
  }

  resetEventForm() {
    this.editingEventId.set('');
    this.eventTitle.set('');
    this.eventDescription.set('');
    this.eventJoinUrl.set('https://t.me/hopehubindia');
    this.eventStartsAt.set('');
    this.eventReminderMinutes.set(30);
    this.eventRecurrence.set('ONCE');
    this.eventOccurrences.set(7);
  }

  editCommunityEvent(event: any) {
    this.activeWorkspaceSection.set('events');
    this.editingEventId.set(event.id);
    this.eventTitle.set(event.title);
    this.eventDescription.set(event.description || '');
    this.eventJoinUrl.set(event.joinUrl);
    const date = new Date(event.startsAt);
    this.eventStartsAt.set(
      new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16),
    );
    this.eventReminderMinutes.set(event.reminderMinutes);
    this.eventRecurrence.set('ONCE');
  }

  async saveCommunityEvent() {
    if (!this.eventTitle().trim() || !this.eventStartsAt() || !this.eventJoinUrl().trim()) {
      this.error.set('Add the event title, time and join link.');
      return;
    }
    this.eventSaving.set(true);
    this.error.set('');
    try {
      const payload = {
        title: this.eventTitle().trim(),
        description: this.eventDescription().trim() || undefined,
        joinUrl: this.eventJoinUrl().trim(),
        startsAt: new Date(this.eventStartsAt()).toISOString(),
        reminderMinutes: Number(this.eventReminderMinutes()),
        recurrence: this.eventRecurrence(),
        occurrences: Number(this.eventOccurrences()),
      };
      const id = this.editingEventId();
      if (id) await this.api.updateTelegramCommunityEvent(id, payload);
      else await this.api.createTelegramCommunityEvent(payload);
      this.resetEventForm();
      await this.loadCampaigns();
      this.message.set(
        id
          ? 'Voice circle updated.'
          : this.eventRecurrence() === 'ONCE'
            ? 'Voice circle announced.'
            : 'Voice circle schedule created.',
      );
    } catch (error: any) {
      this.error.set(error?.error?.message || 'Could not save voice circle.');
    } finally {
      this.eventSaving.set(false);
    }
  }

  async deleteCommunityEvent(event: any) {
    if (!window.confirm(`Delete “${event.title}”?`)) return;
    await this.api.deleteTelegramCommunityEvent(event.id);
    await this.loadCampaigns();
  }

  async reviewConfession(submission: any, action: 'APPROVE' | 'REJECT') {
    this.campaignBusyId.set(submission.reference);
    try {
      await this.api.reviewTelegramConfession(submission.reference, action);
      await this.loadCampaigns();
      this.message.set(action === 'APPROVE' ? 'Anonymous post published.' : 'Submission rejected.');
    } catch (error: any) {
      this.error.set(error?.error?.message || 'Could not review submission.');
    } finally {
      this.campaignBusyId.set('');
    }
  }

  fieldsFor(section: GroupHelpConfigEntry['section']) {
    return this.config().filter((entry) => entry.section === section);
  }

  essentialSettings() {
    return this.config().filter(
      (entry) => entry.type === 'select' && this.essentialDropdownKeys.has(entry.key),
    );
  }

  cleanupSettings() {
    return this.config().filter((entry) => this.cleanupSettingKeys.has(entry.key));
  }

  dropdownOptions(entry: GroupHelpConfigEntry): FormDropdownOption[] {
    return (entry.options || []).map((option) => ({ value: option, label: option }));
  }

  campaignIntervalValue() {
    return String(this.campaignIntervalMinutes());
  }

  eventReminderValue() {
    return String(this.eventReminderMinutes());
  }

  messageOptions() {
    return this.messageCommands.map((item) => ({
      key: item.valueKey,
      label: item.title,
      imageUrlKey: item.imageUrlKey,
    }));
  }

  moderatorActionOptions(): FormDropdownOption[] {
    return this.moderatorActions.map((action) => ({ value: action.value, label: action.label }));
  }

  directMessageOptions(): FormDropdownOption[] {
    return this.messageOptions().map((option) => ({ value: option.key, label: option.label }));
  }

  value(key: string) {
    return this.localValues()[key] ?? '';
  }

  update(key: string, value: string) {
    this.localValues.update((current) => ({ ...current, [key]: value }));
  }

  async loadConfigRevisions() {
    try {
      const response = await this.api.getTelegramGroupHelpRevisions();
      this.configRevisions.set(response.revisions || []);
    } catch {
      this.configRevisions.set([]);
    }
  }

  async saveConfigDraft() {
    const name = this.configDraftName().trim();
    if (!name) {
      this.error.set('Give this draft a short name before saving it.');
      return;
    }
    this.savingRevision.set(true);
    this.error.set('');
    try {
      await this.api.createTelegramGroupHelpRevision(
        name,
        this.config().map((entry) => ({ key: entry.key, value: this.value(entry.key) })),
      );
      this.configDraftName.set('');
      this.message.set('Draft saved. It will not affect the group until you publish it.');
      await this.loadConfigRevisions();
    } catch (error: any) {
      this.error.set(error?.error?.message || 'Could not save this configuration draft.');
    } finally {
      this.savingRevision.set(false);
    }
  }

  async previewConfigRevision(id: string) {
    this.revisionBusyId.set(id);
    this.error.set('');
    try {
      this.configRevisionPreview.set(await this.api.previewTelegramGroupHelpRevision(id));
    } catch (error: any) {
      this.error.set(error?.error?.message || 'Could not compare this configuration version.');
    } finally {
      this.revisionBusyId.set('');
    }
  }

  async publishConfigRevision(id: string) {
    if (!window.confirm('Publish this configuration version to the live group?')) return;
    this.revisionBusyId.set(id);
    this.error.set('');
    try {
      const response = await this.api.publishTelegramGroupHelpRevision(id);
      this.config.set(response.config as GroupHelpConfigEntry[]);
      this.localValues.set(
        Object.fromEntries(
          (response.config as GroupHelpConfigEntry[]).map((entry) => [entry.key, entry.value]),
        ),
      );
      this.configRevisionPreview.set(null);
      this.message.set('Configuration version published. New bot activity will use it now.');
      await this.loadConfigRevisions();
    } catch (error: any) {
      this.error.set(error?.error?.message || 'Could not publish this configuration version.');
    } finally {
      this.revisionBusyId.set('');
    }
  }

  async restoreConfigRevision(id: string) {
    if (!window.confirm('Restore the values that were in place before this change?')) return;
    this.revisionBusyId.set(id);
    this.error.set('');
    try {
      const response = await this.api.restoreTelegramGroupHelpRevision(id);
      this.config.set(response.config as GroupHelpConfigEntry[]);
      this.localValues.set(
        Object.fromEntries(
          (response.config as GroupHelpConfigEntry[]).map((entry) => [entry.key, entry.value]),
        ),
      );
      this.message.set('Previous values restored. New bot activity will use them now.');
      await this.loadConfigRevisions();
    } catch (error: any) {
      this.error.set(error?.error?.message || 'Could not restore this configuration version.');
    } finally {
      this.revisionBusyId.set('');
    }
  }

  async saveAll() {
    this.saving.set(true);
    this.error.set('');
    this.message.set('');
    try {
      const entries = this.config().map((entry) => ({
        key: entry.key,
        value: this.value(entry.key),
      }));
      const res = await this.api.saveTelegramGroupHelpConfig(entries);
      this.config.set(res.config as GroupHelpConfigEntry[]);
      this.localValues.set(
        Object.fromEntries(
          (res.config as GroupHelpConfigEntry[]).map((entry) => [entry.key, entry.value]),
        ),
      );
      this.message.set('Group Help config saved.');
      return true;
    } catch {
      this.error.set('Could not save Group Help config.');
      return false;
    } finally {
      this.saving.set(false);
    }
  }

  async saveWelcome() {
    this.savingWelcome.set(true);
    this.error.set('');
    this.message.set('');
    try {
      const keys = [
        'telegramGroupHelpWelcomeMessage',
        'telegramGroupHelpWelcomeImageUrl',
        'telegramGroupHelpWelcomeButtons',
      ];
      const res = await this.api.saveTelegramGroupHelpConfig(
        keys.map((key) => ({ key, value: this.value(key) })),
      );
      this.localValues.update((current) => ({
        ...current,
        ...Object.fromEntries(
          (res.config as GroupHelpConfigEntry[]).map((entry) => [entry.key, entry.value]),
        ),
      }));
      this.config.update((entries) =>
        entries.map((entry) => {
          const saved = (res.config as GroupHelpConfigEntry[]).find(
            (savedEntry) => savedEntry.key === entry.key,
          );
          return saved ? { ...entry, value: saved.value } : entry;
        }),
      );
      this.message.set('Welcome saved. New members will receive this version from now on.');
    } catch (error: any) {
      this.error.set(error?.error?.message || 'Could not save the welcome message.');
    } finally {
      this.savingWelcome.set(false);
    }
  }

  async saveEssentials() {
    this.savingEssentials.set(true);
    this.error.set('');
    this.message.set('');
    try {
      const entries = this.essentialSettings().map((entry) => ({
        key: entry.key,
        value: this.value(entry.key),
      }));
      const res = await this.api.saveTelegramGroupHelpConfig(entries);
      this.config.set(res.config as GroupHelpConfigEntry[]);
      this.localValues.update((current) => ({
        ...current,
        ...Object.fromEntries(
          (res.config as GroupHelpConfigEntry[]).map((entry) => [entry.key, entry.value]),
        ),
      }));
      this.message.set('Community essentials saved.');
    } catch {
      this.error.set('Could not save community essentials.');
    } finally {
      this.savingEssentials.set(false);
    }
  }

  async saveCleanup() {
    this.savingCleanup.set(true);
    this.error.set('');
    this.message.set('');
    try {
      const entries = this.cleanupSettings().map((entry) => ({
        key: entry.key,
        value: this.value(entry.key),
      }));
      const res = await this.api.saveTelegramGroupHelpConfig(entries);
      this.config.set(res.config as GroupHelpConfigEntry[]);
      this.localValues.update((current) => ({
        ...current,
        ...Object.fromEntries(
          (res.config as GroupHelpConfigEntry[]).map((entry) => [entry.key, entry.value]),
        ),
      }));
      this.message.set(
        'Message cleanup settings saved. New bot messages will follow these timings.',
      );
    } catch (error: any) {
      this.error.set(error?.error?.message || 'Could not save message cleanup settings.');
    } finally {
      this.savingCleanup.set(false);
    }
  }

  async testConnection() {
    this.testing.set(true);
    this.error.set('');
    this.message.set('');
    try {
      const result = await this.api.testTelegramGroupHelpConnection();
      if (!result.ok) {
        this.error.set(result.message || 'Group Help bot connection failed.');
        return;
      }
      this.tokenConfigured.set(result.tokenConfigured);
      const membership = result.botMembership || {};
      const permissions = [
        membership.can_manage_chat && 'Manage group',
        membership.can_delete_messages && 'Delete messages',
        membership.can_restrict_members && 'Restrict members',
        membership.can_invite_users && 'Invite users',
        membership.can_pin_messages && 'Pin messages',
        membership.can_promote_members && 'Promote members',
        membership.can_manage_video_chats && 'Manage voice chats',
      ].filter(Boolean) as string[];
      const permissionLabels: Record<string, string> = {
        can_delete_messages: 'Delete messages',
        can_restrict_members: 'Restrict members',
        can_promote_members: 'Promote members',
        can_pin_messages: 'Pin messages',
        can_manage_video_chats: 'Manage voice chats',
      };
      const missingPermissions = (result.missingBotPermissions || []).map(
        (permission) => permissionLabels[permission] || permission,
      );
      this.connectionDetails.set({
        bot: result.me?.username ? `@${result.me.username}` : undefined,
        group: result.chat?.title,
        runtime: result.webhook?.url ? 'External webhook' : 'External polling/runtime',
        permissions,
        missingPermissions,
      });
      this.message.set(
        result.chatError
          ? `Bot connected, but the group could not be reached: ${result.chatError}`
          : missingPermissions.length
            ? `Bot connected, but it still needs: ${missingPermissions.join(', ')}.`
            : 'Bot token and configured Telegram group are connected.',
      );
    } catch (error: any) {
      this.error.set(error?.error?.message || 'Could not test Group Help connection.');
    } finally {
      this.testing.set(false);
    }
  }

  async clearWebsiteMenu() {
    this.clearingMenu.set(true);
    this.error.set('');
    this.message.set('');
    try {
      await this.api.clearTelegramGroupHelpMenu();
      this.message.set('Old website menu removed. Telegram now shows the default bot menu.');
    } catch (error: any) {
      this.error.set(error?.error?.message || 'Could not clear the Group Help bot menu.');
    } finally {
      this.clearingMenu.set(false);
    }
  }

  async apply(item: CommandItem) {
    this.applying.set(item.id);
    this.error.set('');
    this.message.set('');
    this.telegramApplyUrl.set('');
    try {
      if (!(await this.saveAll())) return;
      const result = await this.api.applyTelegramGroupHelpAction(item.id);
      if (result.mode === 'APPLIED') {
        this.actionStatuses.update((current) => ({ ...current, [item.id]: 'applied' }));
        this.message.set(`${item.title} applied to the configured Telegram group.`);
        return;
      }
      if (!result.command || !result.botUrl) {
        throw new Error('Group Help did not return an admin command.');
      }
      await navigator.clipboard.writeText(result.command);
      this.telegramApplyUrl.set(result.botUrl);
      this.actionStatuses.update((current) => ({ ...current, [item.id]: 'confirmation' }));
      window.open(result.botUrl, '_blank', 'noopener,noreferrer');
      this.message.set(
        `${item.title} command copied. Telegram opened—send it as a group admin to confirm.`,
      );
    } catch (error: any) {
      this.error.set(error?.error?.message || error?.message || `Could not apply ${item.title}.`);
    } finally {
      this.applying.set('');
    }
  }

  commandFor(item: CommandItem) {
    const template = this.value(item.templateKey) || '{message}';
    const raw = this.value(item.valueKey).trim();
    const imageUrl = item.imageUrlKey ? this.value(item.imageUrlKey).trim() : '';
    const lines = raw
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .join('\n');
    const command = template
      .replaceAll('{message}', raw)
      .replaceAll('{imageUrl}', imageUrl)
      .replaceAll('{value}', raw)
      .replaceAll('{lines}', lines);

    if (imageUrl && !template.includes('{imageUrl}')) {
      return `${command}\n${imageUrl}`;
    }
    return command.trim();
  }

  imageUrlForMessageKey(messageKey: string) {
    const option = this.messageOptions().find((item) => item.key === messageKey);
    return option?.imageUrlKey ? this.value(option.imageUrlKey).trim() : '';
  }

  isVideoMediaUrl(url: string) {
    return /\.(mp4|webm|mov|m4v)(?:[?#]|$)/i.test(url);
  }

  isMediaUrlEntry(entry: GroupHelpConfigEntry) {
    return /(?:image|media)url$/i.test(entry.key);
  }

  async copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      this.copied.set(label);
      window.setTimeout(() => this.copied.set(''), 1600);
    } catch {
      this.error.set('Could not copy. Select the command text manually.');
    }
  }

  async sendDirect() {
    const message = this.value(this.selectedDirectMessageKey()).trim();
    if (!message) {
      this.error.set('Select a message with content first.');
      return;
    }
    this.sending.set(true);
    this.error.set('');
    this.message.set('');
    try {
      await this.api.sendTelegramGroupHelpMessage({
        message,
        imageUrl: this.imageUrlForMessageKey(this.selectedDirectMessageKey()),
        pin: this.pinDirectMessage(),
      });
      this.message.set(
        this.pinDirectMessage() ? 'Message sent and pinned in Telegram.' : 'Message sent.',
      );
    } catch {
      this.error.set(
        'Could not send. Check TELEGRAM_HOPEHUBBOT_TOKEN, group chat ID, and bot admin permissions.',
      );
    } finally {
      this.sending.set(false);
    }
  }

  moderatorCommand() {
    const action = this.moderatorActions.find((item) => item.value === this.moderatorAction());
    if (!action) return '';
    const target = this.moderatorTarget()
      .trim()
      .replace(/[\r\n]/g, ' ');
    const reason = this.moderatorReason()
      .trim()
      .replace(/[\r\n]/g, ' ');
    if (action.needsTarget && !target) return '';
    return [`/${action.value}`, action.needsTarget ? target : '', reason].filter(Boolean).join(' ');
  }

  async prepareModeratorCommand() {
    const command = this.moderatorCommand();
    if (!command) {
      this.error.set(
        'Enter a Telegram username, numeric user ID, or prepare the command as a reply.',
      );
      return;
    }
    await this.copy(command, 'moderator-tool');
    const username = (this.value('telegramGroupHelpBotUsername') || 'Hopehubbot').replace(/^@/, '');
    window.open(`https://t.me/${encodeURIComponent(username)}`, '_blank', 'noopener,noreferrer');
    this.message.set(
      'Moderator command copied. Verify the target carefully before sending it in Telegram.',
    );
  }
}

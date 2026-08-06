import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApi } from '../../core/services/admin-api';

type StatusFilter = 'ALL' | 'NEW' | 'REVIEWING' | 'SHORTLISTED' | 'REJECTED' | 'ONBOARDED';
type ContributorStatus = 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';

interface OnboardingChecks {
  credentialVerified: boolean;
  supervisionVerified: boolean;
  orientationCompleted: boolean;
}

@Component({
  selector: 'app-counsellor-applications-page',
  standalone: true,
  imports: [DatePipe, FormsModule],
  templateUrl: './counsellor-applications-page.html',
  styleUrl: './counsellor-applications-page.scss',
})
export class CounsellorApplicationsPage implements OnInit {
  private readonly api = inject(AdminApi);

  readonly applications = signal<any[]>([]);
  readonly summary = signal({ NEW: 0, REVIEWING: 0, SHORTLISTED: 0, REJECTED: 0, ONBOARDED: 0 });
  readonly loading = signal(true);
  readonly savingId = signal('');
  readonly error = signal('');
  readonly statusFilter = signal<StatusFilter>('ALL');
  readonly expandedId = signal<string | null>(null);
  readonly notes = signal<Record<string, string>>({});
  readonly onboardingChecks = signal<Record<string, OnboardingChecks>>({});
  readonly statuses: StatusFilter[] = [
    'ALL',
    'NEW',
    'REVIEWING',
    'SHORTLISTED',
    'REJECTED',
    'ONBOARDED',
  ];

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const res = await this.api.listCounsellorApplications(
        this.statusFilter() !== 'ALL' ? { status: this.statusFilter() } : undefined,
      );
      this.applications.set(res.applications);
      this.summary.set(res.summary);
      this.notes.set(
        Object.fromEntries(
          res.applications.map((application) => [application.id, application.adminNote || '']),
        ),
      );
      this.onboardingChecks.set(
        Object.fromEntries(
          res.applications.map((application) => [
            application.id,
            { credentialVerified: false, supervisionVerified: false, orientationCompleted: false },
          ]),
        ),
      );
    } catch {
      this.error.set('Could not load care contributor applications.');
    } finally {
      this.loading.set(false);
    }
  }

  setFilter(status: StatusFilter): void {
    this.statusFilter.set(status);
    void this.load();
  }

  toggle(applicationId: string): void {
    this.expandedId.update((current) => (current === applicationId ? null : applicationId));
  }

  setNote(applicationId: string, note: string): void {
    this.notes.update((current) => ({ ...current, [applicationId]: note }));
  }

  setOnboardingCheck(applicationId: string, field: keyof OnboardingChecks, value: boolean): void {
    this.onboardingChecks.update((current) => ({
      ...current,
      [applicationId]: {
        ...(current[applicationId] || {
          credentialVerified: false,
          supervisionVerified: false,
          orientationCompleted: false,
        }),
        [field]: value,
      },
    }));
  }

  async updateStatus(application: any, status: Exclude<StatusFilter, 'ALL'>): Promise<void> {
    this.savingId.set(application.id);
    this.error.set('');
    try {
      await this.api.updateCounsellorApplicationStatus(application.id, {
        status,
        adminNote: this.notes()[application.id] || '',
      });
      await this.load();
    } catch (error: any) {
      this.error.set(error?.error?.message || 'Could not update the application.');
    } finally {
      this.savingId.set('');
    }
  }

  async onboard(application: any): Promise<void> {
    this.savingId.set(application.id);
    this.error.set('');
    try {
      const checks = this.onboardingChecks()[application.id] || {
        credentialVerified: false,
        supervisionVerified: false,
        orientationCompleted: false,
      };
      await this.api.onboardCounsellorApplication(application.id, {
        ...checks,
        onboardingNote: this.notes()[application.id] || '',
      });
      await this.load();
    } catch (error: any) {
      this.error.set(error?.error?.message || 'Could not create the contributor profile.');
    } finally {
      this.savingId.set('');
    }
  }

  async updateContributorStatus(
    application: any,
    status: ContributorStatus,
    completeOrientation = false,
  ): Promise<void> {
    const contributor = application.onboardedContributor;
    if (!contributor) return;

    this.savingId.set(application.id);
    this.error.set('');
    try {
      await this.api.updateCareContributorStatus(contributor.id, {
        status,
        orientationCompleted: completeOrientation,
        onboardingNote: this.notes()[application.id] || '',
      });
      await this.load();
    } catch (error: any) {
      this.error.set(error?.error?.message || 'Could not update the contributor profile.');
    } finally {
      this.savingId.set('');
    }
  }

  statusClass(status: string): string {
    return `status status-${status.toLowerCase()}`;
  }

  trackLabel(track: string): string {
    const labels: Record<string, string> = {
      PROFESSIONAL_PSYCHOLOGIST: 'Professional psychologist',
      PSYCHOLOGY_STUDENT_VOLUNTEER: 'Psychology student emotional support listener',
      PEER_SUPPORT_VOLUNTEER: 'Peer emotional support listener',
    };
    return labels[track] || track;
  }

  careTeamTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      MENTAL_WELLNESS_PROFESSIONAL: 'Mental wellness professional',
      QUALIFIED_COUNSELLOR: 'Qualified counsellor',
      PSYCHOLOGY_STUDENT_VOLUNTEER: 'Psychology student emotional support listener',
      PEER_SUPPORT_VOLUNTEER: 'Peer emotional support listener',
      NLP_COACH: 'NLP coach',
      LIFE_COACH: 'Life coach',
      MEDITATION_BREATHWORK_GUIDE: 'Meditation / breathwork guide',
      CAREER_STUDY_MENTOR: 'Career / study mentor',
    };
    return labels[type] || type || 'Care team member';
  }

  genderLabel(gender: string | null | undefined): string {
    const labels: Record<string, string> = {
      FEMALE: 'Female',
      MALE: 'Male',
      OTHER: 'Other',
      PREFER_NOT_TO_SAY: 'Prefer not to say',
    };
    return gender ? labels[gender] || gender : 'Not provided';
  }

  contributorStatusClass(status: string): string {
    return `status contributor-status-${status.toLowerCase()}`;
  }

  contributorScopeLabel(scope: string): string {
    const labels: Record<string, string> = {
      CLINICAL_PSYCHOLOGY: 'Clinical psychology (account pending)',
      SUPERVISED_STUDENT_SUPPORT: 'Supervised student support',
      NON_CLINICAL_PEER_SUPPORT: 'Non-clinical peer support',
    };
    return labels[scope] || scope;
  }
}

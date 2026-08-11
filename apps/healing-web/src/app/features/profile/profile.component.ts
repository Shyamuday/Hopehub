import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { AuthModalService } from '../../core/services/auth-modal.service';
import { NotificationService } from '../../core/services/notification.service';
import { AppButtonComponent, FormFieldComponent } from '../../shared/components';
import type {
  PatientDailyPlan,
  PatientDailyPlanTask,
  PatientProfile,
  PatientProfileUpdateRequest,
} from '../../core/models/auth.model';

type ProfileSection = 'basic' | 'emergency' | 'wellness' | 'health';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AppButtonComponent, FormFieldComponent],
  templateUrl: './profile.component.html',
})
export class ProfileComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly authModal = inject(AuthModalService);
  private readonly notificationService = inject(NotificationService);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly message = signal('');
  readonly needsLogin = signal(false);
  readonly patientCode = signal<string | null>(null);
  readonly profile = signal<PatientProfile | null>(null);
  readonly editingSection = signal<ProfileSection | null>(null);
  readonly dailyPlans = signal<PatientDailyPlan[]>([]);
  readonly dailyPlansLoading = signal(false);
  readonly dailyPlanSaving = signal(false);
  readonly dailyPlanMessage = signal('');
  readonly dailyPlanError = signal('');
  readonly updatingTaskId = signal<string | null>(null);
  readonly uploadingTarget = signal<string | null>(null);
  readonly selectedPlanId = signal<string | null>(null);

  readonly today = this.formatLocalDate(new Date());

  readonly profileForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.email]],
    alternateMobile: [''],
    dateOfBirth: [''],
    gender: [''],
    occupation: [''],
    maritalStatus: [''],
    preferredLanguage: [''],
    emergencyContactName: [''],
    emergencyContactPhone: [''],
    emergencyContactRelation: [''],
    patientNotes: [''],
    sleepPattern: [''],
    mentalTemperament: [''],
    stressTriggers: [''],
    fearsPhobias: [''],
    concentrationMemory: [''],
    socialBehaviour: [''],
    currentMedications: [''],
    chronicConditions: [''],
    allergies: [''],
  });

  readonly dailyPlanForm = this.fb.group({
    planDate: [this.today, [Validators.required]],
    title: ['Today plan', [Validators.required, Validators.maxLength(160)]],
    focus: [''],
    summary: [''],
    tasks: this.fb.array([
      this.createTaskDraft('One small grounding practice'),
      this.createTaskDraft('Main practical task'),
      this.createTaskDraft('One connection or self-care step'),
    ]),
  });

  readonly newTaskForm = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(160)]],
    notes: [''],
  });

  readonly reviewForm = this.fb.group({
    reviewNote: [''],
  });

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    if (!this.auth.getToken()) {
      this.needsLogin.set(true);
      this.notificationService.info('Sign in to view and update your profile.');
      this.authModal.openLogin();
      return;
    }
    this.needsLogin.set(false);
    this.loading.set(true);
    this.error.set('');
    this.auth.loadPatientProfile().subscribe({
      next: ({ profile }) => {
        this.patientCode.set(profile.patientCode);
        this.profile.set(profile);
        this.profileForm.reset(this.toFormValue(profile));
        this.loading.set(false);
        this.loadDailyPlans();
      },
      error: () => {
        const message = 'Could not load your profile.';
        this.error.set(message);
        this.notificationService.error(message);
        this.loading.set(false);
      },
    });
  }

  beginProfileEdit(section: ProfileSection): void {
    this.message.set('');
    this.error.set('');
    this.editingSection.set(section);
  }

  cancelProfileEdit(): void {
    const profile = this.profile();
    if (profile) {
      this.profileForm.reset(this.toFormValue(profile));
    }
    this.editingSection.set(null);
  }

  get taskDrafts(): FormArray {
    return this.dailyPlanForm.get('tasks') as FormArray;
  }

  selectedPlan(): PatientDailyPlan | null {
    const plans = this.dailyPlans();
    const selected = this.selectedPlanId();
    if (selected) return plans.find((plan) => plan.id === selected) || null;
    return plans.find((plan) => plan.planDate === this.today) || plans[0] || null;
  }

  loadDailyPlans(): void {
    this.dailyPlansLoading.set(true);
    this.dailyPlanError.set('');
    this.auth.loadPatientDailyPlans().subscribe({
      next: ({ plans }) => {
        this.dailyPlans.set(plans);
        const selected = this.selectedPlan();
        this.selectedPlanId.set(selected?.id ?? null);
        this.reviewForm.patchValue({ reviewNote: selected?.reviewNote || '' });
        this.dailyPlansLoading.set(false);
      },
      error: () => {
        this.dailyPlanError.set('Could not load your daily plans.');
        this.dailyPlansLoading.set(false);
      },
    });
  }

  selectPlan(plan: PatientDailyPlan): void {
    this.selectedPlanId.set(plan.id);
    this.reviewForm.patchValue({ reviewNote: plan.reviewNote || '' });
  }

  addTaskDraft(): void {
    this.taskDrafts.push(this.createTaskDraft(''));
  }

  removeTaskDraft(index: number): void {
    if (this.taskDrafts.length <= 1) {
      this.taskDrafts.at(0).reset({ title: '', notes: '' });
      return;
    }
    this.taskDrafts.removeAt(index);
  }

  async createDailyPlan(): Promise<void> {
    if (this.dailyPlanForm.invalid || this.dailyPlanSaving()) {
      this.dailyPlanForm.markAllAsTouched();
      this.notificationService.warning('Please add a title and at least one plan item.');
      return;
    }

    const value = this.dailyPlanForm.getRawValue();
    const tasks = (value.tasks || [])
      .map((task, index) => ({
        title: task.title?.trim() || '',
        notes: task.notes?.trim() || null,
        sortOrder: index,
      }))
      .filter((task) => task.title);

    if (!tasks.length) {
      this.notificationService.warning('Add at least one daily task.');
      return;
    }

    this.dailyPlanSaving.set(true);
    this.dailyPlanMessage.set('');
    this.dailyPlanError.set('');
    try {
      const response = await this.auth.createPatientDailyPlan({
        planDate: value.planDate || this.today,
        title: value.title?.trim() || 'Daily plan',
        focus: value.focus?.trim() || null,
        summary: value.summary?.trim() || null,
        tasks,
      });
      this.upsertDailyPlan(response.plan);
      this.selectedPlanId.set(response.plan.id);
      this.dailyPlanMessage.set('Daily plan created.');
      this.notificationService.success('Daily plan created.');
    } catch {
      const message = 'Could not create this plan. You may already have a plan for this date.';
      this.dailyPlanError.set(message);
      this.notificationService.error(message);
    } finally {
      this.dailyPlanSaving.set(false);
    }
  }

  async addTaskToSelectedPlan(): Promise<void> {
    const plan = this.selectedPlan();
    if (!plan || this.newTaskForm.invalid || this.dailyPlanSaving()) {
      this.newTaskForm.markAllAsTouched();
      return;
    }

    const value = this.newTaskForm.getRawValue();
    this.dailyPlanSaving.set(true);
    try {
      const response = await this.auth.addPatientDailyPlanTask(plan.id, {
        title: value.title?.trim() || '',
        notes: value.notes?.trim() || null,
      });
      this.upsertDailyPlan(response.plan);
      this.newTaskForm.reset({ title: '', notes: '' });
    } catch {
      this.notificationService.error('Could not add task.');
    } finally {
      this.dailyPlanSaving.set(false);
    }
  }

  async toggleTask(
    plan: PatientDailyPlan,
    task: PatientDailyPlanTask,
    field: 'completed' | 'reviewTick',
  ): Promise<void> {
    if (this.updatingTaskId()) return;
    this.updatingTaskId.set(task.id);
    try {
      const response = await this.auth.updatePatientDailyPlanTask(plan.id, task.id, {
        [field]: !task[field],
      });
      this.upsertDailyPlan(response.plan);
    } catch {
      this.notificationService.error('Could not update task.');
    } finally {
      this.updatingTaskId.set(null);
    }
  }

  async updateTaskReview(
    plan: PatientDailyPlan,
    task: PatientDailyPlanTask,
    value: string,
  ): Promise<void> {
    if (this.updatingTaskId()) return;
    this.updatingTaskId.set(task.id);
    try {
      const response = await this.auth.updatePatientDailyPlanTask(plan.id, task.id, {
        reviewNote: value.trim() || null,
      });
      this.upsertDailyPlan(response.plan);
    } catch {
      this.notificationService.error('Could not save task review.');
    } finally {
      this.updatingTaskId.set(null);
    }
  }

  async deleteTask(plan: PatientDailyPlan, task: PatientDailyPlanTask): Promise<void> {
    if (this.updatingTaskId()) return;
    this.updatingTaskId.set(task.id);
    try {
      const response = await this.auth.deletePatientDailyPlanTask(plan.id, task.id);
      this.upsertDailyPlan(response.plan);
    } catch {
      this.notificationService.error('Could not remove task.');
    } finally {
      this.updatingTaskId.set(null);
    }
  }

  async savePlanReview(plan: PatientDailyPlan): Promise<void> {
    if (this.dailyPlanSaving()) return;
    this.dailyPlanSaving.set(true);
    const reviewNote = this.reviewForm.getRawValue().reviewNote?.trim() || null;
    try {
      const response = await this.auth.updatePatientDailyPlan(plan.id, {
        reviewNote,
        reviewed: Boolean(reviewNote || plan.tasks.some((task) => task.reviewTick)),
      });
      this.upsertDailyPlan(response.plan);
      this.notificationService.success('Review saved.');
    } catch {
      this.notificationService.error('Could not save review.');
    } finally {
      this.dailyPlanSaving.set(false);
    }
  }

  async uploadPlanImage(
    event: Event,
    plan: PatientDailyPlan,
    task?: PatientDailyPlanTask,
  ): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      this.notificationService.warning('Please upload JPEG, PNG, or WebP images.');
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      this.notificationService.warning('Image must be 4 MB or smaller.');
      return;
    }

    const target = task?.id || plan.id;
    this.uploadingTarget.set(target);
    try {
      const response = await this.auth.uploadPatientDailyPlanImage(plan.id, {
        taskId: task?.id || null,
        file,
        fileName: file.name,
        caption: task ? `Task proof: ${task.title}` : 'Plan image',
      });
      this.upsertDailyPlan(response.plan);
      this.notificationService.success('Image uploaded.');
    } catch {
      this.notificationService.error('Could not upload image.');
    } finally {
      this.uploadingTarget.set(null);
    }
  }

  async saveProfile(): Promise<void> {
    if (this.profileForm.invalid || this.saving()) {
      this.profileForm.markAllAsTouched();
      this.notificationService.warning('Please check the highlighted profile fields.');
      return;
    }

    this.saving.set(true);
    this.error.set('');
    this.message.set('');
    try {
      const response = await this.auth.savePatientProfile(this.toPayload());
      this.patientCode.set(response.profile.patientCode);
      this.profile.set(response.profile);
      this.profileForm.reset(this.toFormValue(response.profile));
      this.editingSection.set(null);
      this.message.set('Profile saved.');
      this.notificationService.success('Profile saved.');
    } catch {
      const message = 'Could not save your profile.';
      this.error.set(message);
      this.notificationService.error(message);
    } finally {
      this.saving.set(false);
    }
  }

  text(value: string | null | undefined, fallback = 'Not added yet'): string {
    return value?.trim() || fallback;
  }

  genderLabel(value: PatientProfile['gender']): string {
    switch (value) {
      case 'FEMALE':
        return 'Female';
      case 'MALE':
        return 'Male';
      case 'OTHER':
        return 'Other';
      case 'PREFER_NOT_TO_SAY':
        return 'Prefer not to say';
      default:
        return 'Not added yet';
    }
  }

  maritalStatusLabel(value: PatientProfile['maritalStatus']): string {
    switch (value) {
      case 'SINGLE':
        return 'Single';
      case 'MARRIED':
        return 'Married';
      case 'DIVORCED':
        return 'Divorced';
      case 'WIDOWED':
        return 'Widowed';
      case 'PREFER_NOT_TO_SAY':
        return 'Prefer not to say';
      default:
        return 'Not added yet';
    }
  }

  completedTaskCount(plan: PatientDailyPlan): number {
    return plan.tasks.filter((task) => task.completed).length;
  }

  private toFormValue(profile: PatientProfile) {
    return {
      name: profile.name || '',
      email: profile.email || '',
      alternateMobile: profile.alternateMobile || '',
      dateOfBirth: profile.dateOfBirth || '',
      gender: profile.gender || '',
      occupation: profile.occupation || '',
      maritalStatus: profile.maritalStatus || '',
      preferredLanguage: profile.preferredLanguage || '',
      emergencyContactName: profile.emergencyContactName || '',
      emergencyContactPhone: profile.emergencyContactPhone || '',
      emergencyContactRelation: profile.emergencyContactRelation || '',
      patientNotes: profile.patientNotes || '',
      sleepPattern: profile.sleepPattern || '',
      mentalTemperament: profile.mentalTemperament || '',
      stressTriggers: profile.stressTriggers || '',
      fearsPhobias: profile.fearsPhobias || '',
      concentrationMemory: profile.concentrationMemory || '',
      socialBehaviour: profile.socialBehaviour || '',
      currentMedications: profile.currentMedications || '',
      chronicConditions: profile.chronicConditions || '',
      allergies: profile.allergies || '',
    };
  }

  private toPayload(): PatientProfileUpdateRequest {
    const value = this.profileForm.getRawValue();
    const text = (input: string | null | undefined) => input?.trim() || null;
    return {
      name: text(value.name) || '',
      email: text(value.email),
      alternateMobile: text(value.alternateMobile),
      dateOfBirth: text(value.dateOfBirth),
      gender: (text(value.gender) as PatientProfileUpdateRequest['gender']) || null,
      occupation: text(value.occupation),
      maritalStatus:
        (text(value.maritalStatus) as PatientProfileUpdateRequest['maritalStatus']) || null,
      preferredLanguage: text(value.preferredLanguage),
      emergencyContactName: text(value.emergencyContactName),
      emergencyContactPhone: text(value.emergencyContactPhone),
      emergencyContactRelation: text(value.emergencyContactRelation),
      patientNotes: text(value.patientNotes),
      sleepPattern: text(value.sleepPattern),
      mentalTemperament: text(value.mentalTemperament),
      stressTriggers: text(value.stressTriggers),
      fearsPhobias: text(value.fearsPhobias),
      concentrationMemory: text(value.concentrationMemory),
      socialBehaviour: text(value.socialBehaviour),
      currentMedications: text(value.currentMedications),
      chronicConditions: text(value.chronicConditions),
      allergies: text(value.allergies),
    };
  }

  private createTaskDraft(title: string) {
    return this.fb.group({
      title: [title, [Validators.maxLength(160)]],
      notes: [''],
    });
  }

  private upsertDailyPlan(plan: PatientDailyPlan): void {
    const plans = this.dailyPlans();
    const next = [plan, ...plans.filter((item) => item.id !== plan.id)].sort((a, b) =>
      b.planDate.localeCompare(a.planDate),
    );
    this.dailyPlans.set(next);
    this.reviewForm.patchValue({ reviewNote: plan.reviewNote || '' });
  }

  private formatLocalDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

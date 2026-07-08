import { Component, inject, OnInit, signal } from '@angular/core';
import { ConsultationNavigationService } from '../../../../core/services/consultation-navigation.service';
import { WorklistApiService, type WorklistItem } from '../../../worklist/worklist-api.service';

@Component({
  selector: 'app-prescription-consultation-picker',
  standalone: true,
  templateUrl: './prescription-consultation-picker.html',
  styleUrl: './prescription-consultation-picker.scss',
})
export class PrescriptionConsultationPickerComponent implements OnInit {
  private readonly worklistApi = inject(WorklistApiService);
  private readonly consultationNav = inject(ConsultationNavigationService);

  readonly loading = signal(true);
  readonly error = signal('');
  readonly items = signal<WorklistItem[]>([]);

  ngOnInit() {
    void this.load();
  }

  async load() {
    this.loading.set(true);
    this.error.set('');
    try {
      const [assigned, inProgress, followUp] = await Promise.all([
        this.worklistApi.loadWorklist('ASSIGNED'),
        this.worklistApi.loadWorklist('IN_PROGRESS'),
        this.worklistApi.loadWorklist('FOLLOW_UP_DUE'),
      ]);
      const merged = new Map<string, WorklistItem>();
      for (const item of [
        ...assigned.sections.inProgress,
        ...inProgress.sections.inProgress,
        ...followUp.sections.followUpDue,
        ...assigned.sections.assigned,
      ]) {
        merged.set(item.id, item);
      }
      this.items.set([...merged.values()].slice(0, 12));
    } catch {
      this.error.set('Could not load active consultations.');
    } finally {
      this.loading.set(false);
    }
  }

  openCase(item: WorklistItem) {
    void this.consultationNav.openCaseAnalysis(item.id, { patientName: item.patient?.name });
  }

  openPrescription(item: WorklistItem) {
    void this.consultationNav.openPrescription(item.id, { patientName: item.patient?.name });
  }

  sectionLabel(item: WorklistItem) {
    if (item.sections.includes('FOLLOW_UP_DUE')) return 'Follow-up due';
    if (item.sections.includes('IN_PROGRESS')) return 'In progress';
    return 'Assigned';
  }
}

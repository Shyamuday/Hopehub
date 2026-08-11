import { Component, inject, signal, OnInit } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { API_PATHS } from '../../../core/constants/api-paths.constants';
import { TOAST_DURATION_MS } from '../../../core/constants/timing.constants';
import { Auth } from '../../../core/services/auth';
import {
  DoctorSessionService,
  type ProviderReadiness,
} from '../../../core/services/doctor-session';
import { SLOT_TEMPLATES, WEEKDAY_SHORT_LABELS } from '../constants/slot-templates.constants';

interface Slot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  isBooked: boolean;
  isBlocked: boolean;
  careTeamService?: { id: string; title: string; durationMinutes: number } | null;
}
interface CareService {
  id: string;
  title: string;
  durationMinutes: number;
  pricingMode: string;
}
interface AvailabilityRule {
  id: string;
  label: string;
  weekday: number;
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
  bufferMinutes: number;
  maxSessionsPerDay?: number | null;
  startsOn: string;
  endsOn?: string | null;
  isActive: boolean;
  careTeamService?: { id: string; title: string; durationMinutes: number } | null;
}

function addMinutes(time: string, mins: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + mins;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function generateSlots(
  start: string,
  end: string,
  stepMins: number,
): { startTime: string; endTime: string }[] {
  const result: { startTime: string; endTime: string }[] = [];
  let cur = start;
  while (cur < end) {
    const next = addMinutes(cur, stepMins);
    if (next > end) break;
    result.push({ startTime: cur, endTime: next });
    cur = next;
  }
  return result;
}

@Component({
  selector: 'app-slots-page',
  imports: [FormField],
  templateUrl: './slots-page.html',
  styleUrl: './slots-page.scss',
})
export class SlotsPage implements OnInit {
  private http = inject(HttpClient);
  private auth = inject(Auth);
  private session = inject(DoctorSessionService);
  private base = environment.apiUrl;

  slots = signal<Slot[]>([]);
  rules = signal<AvailabilityRule[]>([]);
  services = signal<CareService[]>([]);
  loading = signal(true);
  isHopeHub = signal(false);
  readiness = signal<ProviderReadiness | null>(null);
  readinessLoading = signal(false);
  toast = signal('');
  selectedDate = signal(this.today());
  weekStart = signal(this.mondayOf(new Date()));
  weekDates = signal(this.buildWeek(this.mondayOf(new Date())));

  readonly slotDraftModel = signal({ newStart: '09:00', newEnd: '09:30' });
  readonly slotDraftForm = form(this.slotDraftModel);
  readonly ruleModel = signal({
    label: 'Evening availability',
    weekday: String(new Date().getDay()),
    startTime: '18:00',
    endTime: '21:00',
    slotDurationMinutes: 30,
    bufferMinutes: 0,
    maxSessionsPerDay: 4,
    startsOn: this.today(),
    endsOn: '',
    careTeamServiceId: '',
  });
  readonly ruleForm = form(this.ruleModel);
  templates = SLOT_TEMPLATES;
  weekdayOptions = [
    { label: 'Sun', value: '0' },
    { label: 'Mon', value: '1' },
    { label: 'Tue', value: '2' },
    { label: 'Wed', value: '3' },
    { label: 'Thu', value: '4' },
    { label: 'Fri', value: '5' },
    { label: 'Sat', value: '6' },
  ];

  ngOnInit(): void {
    void this.loadRoleLanguage();
    void this.loadReadiness();
    this.load();
  }

  private async loadRoleLanguage(): Promise<void> {
    try {
      const session = await this.session.load();
      this.isHopeHub.set(session.doctorProfile?.doctorType === 'PSYCHOLOGIST');
    } catch {
      this.isHopeHub.set(false);
    }
  }

  pageTitle() {
    return this.isHopeHub() ? '📅 Availability' : '📅 Availability & Slots';
  }

  pageSubtitle() {
    return this.isHopeHub()
      ? 'Manage your available times — users can book open support sessions.'
      : 'Manage your time slots — patients can see open slots when booking.';
  }

  addButtonLabel() {
    return this.isHopeHub() ? '+ Add time' : '+ Add Slot';
  }

  emptyText() {
    return this.isHopeHub()
      ? `No available times for ${this.selectedDate()}. Use "Quick add" above or add manually.`
      : `No slots for ${this.selectedDate()}. Use "Quick add" above or add manually.`;
  }

  readinessBlocksActions(): boolean {
    return this.readiness()?.ready === false;
  }

  readinessMessage(): string {
    const readiness = this.readiness();
    if (!readiness) return '';
    return readiness.ready
      ? 'Your availability can be shown to users when you are online and accepting sessions.'
      : readiness.message ||
          'Complete the required provider setup before opening new availability.';
  }

  async loadReadiness(): Promise<void> {
    this.readinessLoading.set(true);
    try {
      this.readiness.set(await this.session.readiness());
    } catch {
      this.readiness.set(null);
    } finally {
      this.readinessLoading.set(false);
    }
  }

  private stopIfNotReady(): boolean {
    if (!this.readinessBlocksActions()) return false;
    this.showToast(this.readinessMessage());
    return true;
  }

  today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  mondayOf(d: Date): Date {
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  }

  buildWeek(monday: Date): { iso: string; day: string; num: string }[] {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return {
        iso: d.toISOString().slice(0, 10),
        day: WEEKDAY_SHORT_LABELS[i],
        num: String(d.getDate()),
      };
    });
  }

  prevWeek(): void {
    const d = new Date(this.weekStart());
    d.setDate(d.getDate() - 7);
    this.weekStart.set(d);
    this.weekDates.set(this.buildWeek(d));
  }

  nextWeek(): void {
    const d = new Date(this.weekStart());
    d.setDate(d.getDate() + 7);
    this.weekStart.set(d);
    this.weekDates.set(this.buildWeek(d));
  }

  selectDate(iso: string): void {
    this.selectedDate.set(iso);
    this.load();
  }

  load(): void {
    this.loading.set(true);
    const token = this.auth.token();
    firstValueFrom(
      this.http.get<{ slots: Slot[] }>(`${this.base}${API_PATHS.DOCTOR.SLOTS}`, {
        params: { date: this.selectedDate() },
        headers: { Authorization: `Bearer ${token}` },
      }),
    )
      .then((r) => {
        this.slots.set(r.slots);
        this.rules.set((r as any).rules ?? this.rules());
        this.services.set((r as any).services ?? this.services());
        this.loading.set(false);
      })
      .catch(() => this.loading.set(false));
  }

  async addSlot(): Promise<void> {
    if (this.stopIfNotReady()) return;
    const { newStart, newEnd } = this.slotDraftModel();
    if (!newStart || !newEnd || newEnd <= newStart) {
      this.showToast('Invalid time range');
      return;
    }
    const token = this.auth.token();
    try {
      await firstValueFrom(
        this.http.post<{ slot: Slot }>(
          `${this.base}${API_PATHS.DOCTOR.SLOTS}`,
          {
            date: this.selectedDate(),
            startTime: newStart,
            endTime: newEnd,
          },
          { headers: { Authorization: `Bearer ${token}` } },
        ),
      );
      this.load();
    } catch (e: any) {
      this.showToast(e?.error?.message ?? 'Failed to add slot');
    }
  }

  async addRule(): Promise<void> {
    if (this.stopIfNotReady()) return;
    const body = this.ruleModel();
    if (!body.label || !body.startTime || !body.endTime || body.endTime <= body.startTime) {
      this.showToast('Invalid availability rule');
      return;
    }
    const token = this.auth.token();
    try {
      const result = await firstValueFrom(
        this.http.post<{ generated: { generated: number } }>(
          `${this.base}${API_PATHS.DOCTOR.AVAILABILITY_RULES}`,
          {
            ...body,
            weekday: Number(body.weekday),
            slotDurationMinutes: Number(body.slotDurationMinutes),
            bufferMinutes: Number(body.bufferMinutes),
            maxSessionsPerDay: body.maxSessionsPerDay ? Number(body.maxSessionsPerDay) : null,
            careTeamServiceId: body.careTeamServiceId || null,
            endsOn: body.endsOn || null,
            generateNow: true,
          },
          { headers: { Authorization: `Bearer ${token}` } },
        ),
      );
      this.showToast(`Rule saved · ${result.generated.generated} slots generated`);
      this.load();
    } catch (e: any) {
      this.showToast(e?.error?.message ?? 'Failed to save availability rule');
    }
  }

  async generateRule(rule: AvailabilityRule): Promise<void> {
    if (this.stopIfNotReady()) return;
    const token = this.auth.token();
    const result = await firstValueFrom(
      this.http.post<{ generated: { generated: number } }>(
        `${this.base}${API_PATHS.DOCTOR.AVAILABILITY_RULE_GENERATE(rule.id)}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      ),
    );
    this.showToast(`Generated ${result.generated.generated} slots`);
    this.load();
  }

  async deleteRule(rule: AvailabilityRule): Promise<void> {
    const token = this.auth.token();
    await firstValueFrom(
      this.http.delete(`${this.base}${API_PATHS.DOCTOR.AVAILABILITY_RULE(rule.id)}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    );
    this.showToast('Availability rule disabled');
    this.load();
  }

  weekdayLabel(value: number): string {
    return (
      this.weekdayOptions.find((option) => option.value === String(value))?.label ?? String(value)
    );
  }

  async addTemplate(t: { start: string; end: string; step: number }): Promise<void> {
    if (this.stopIfNotReady()) return;
    const slotsToCreate = generateSlots(t.start, t.end, t.step);
    const token = this.auth.token();
    let added = 0;
    for (const s of slotsToCreate) {
      try {
        await firstValueFrom(
          this.http.post(
            `${this.base}${API_PATHS.DOCTOR.SLOTS}`,
            {
              date: this.selectedDate(),
              startTime: s.startTime,
              endTime: s.endTime,
            },
            { headers: { Authorization: `Bearer ${token}` } },
          ),
        );
        added++;
      } catch {
        /* skip existing */
      }
    }
    this.showToast(`Added ${added} slot${added !== 1 ? 's' : ''} ✓`);
    this.load();
  }

  async clearDay(): Promise<void> {
    const openSlots = this.slots().filter((s) => !s.isBooked);
    const token = this.auth.token();
    for (const s of openSlots) {
      await firstValueFrom(
        this.http.delete(`${this.base}${API_PATHS.DOCTOR.SLOTS}/${s.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ).catch(() => {});
    }
    this.showToast('Day cleared');
    this.load();
  }

  async toggleBlock(s: Slot): Promise<void> {
    if (s.isBlocked && this.stopIfNotReady()) return;
    const token = this.auth.token();
    await firstValueFrom(
      this.http.patch(
        `${this.base}${API_PATHS.DOCTOR.SLOTS}/${s.id}`,
        { isBlocked: !s.isBlocked },
        { headers: { Authorization: `Bearer ${token}` } },
      ),
    );
    this.load();
  }

  async deleteSlot(id: string): Promise<void> {
    const token = this.auth.token();
    await firstValueFrom(
      this.http.delete(`${this.base}${API_PATHS.DOCTOR.SLOTS}/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    );
    this.slots.update((list) => list.filter((s) => s.id !== id));
  }

  private showToast(msg: string): void {
    this.toast.set(msg);
    setTimeout(() => this.toast.set(''), TOAST_DURATION_MS);
  }
}

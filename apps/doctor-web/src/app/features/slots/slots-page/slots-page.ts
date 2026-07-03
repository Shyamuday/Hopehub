import { Component, inject, signal, OnInit } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { API_PATHS } from '../../../core/constants/api-paths.constants';
import { TOAST_DURATION_MS } from '../../../core/constants/timing.constants';
import { Auth } from '../../../core/services/auth';
import { SLOT_TEMPLATES, WEEKDAY_SHORT_LABELS } from '../constants/slot-templates.constants';

interface Slot { id: string; date: string; startTime: string; endTime: string; isBooked: boolean; isBlocked: boolean; }

function addMinutes(time: string, mins: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + mins;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function generateSlots(start: string, end: string, stepMins: number): { startTime: string; endTime: string }[] {
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
  styleUrl: './slots-page.scss'
})
export class SlotsPage implements OnInit {
  private http = inject(HttpClient);
  private auth = inject(Auth);
  private base = environment.apiUrl;

  slots = signal<Slot[]>([]);
  loading = signal(true);
  toast = signal('');
  selectedDate = signal(this.today());
  weekStart = signal(this.mondayOf(new Date()));
  weekDates = signal(this.buildWeek(this.mondayOf(new Date())));

  readonly slotDraftModel = signal({ newStart: '09:00', newEnd: '09:30' });
  readonly slotDraftForm = form(this.slotDraftModel);
  templates = SLOT_TEMPLATES;

  ngOnInit(): void { this.load(); }

  today(): string { return new Date().toISOString().slice(0, 10); }

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
        num: String(d.getDate())
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

  selectDate(iso: string): void { this.selectedDate.set(iso); this.load(); }

  load(): void {
    this.loading.set(true);
    const token = this.auth.token();
    firstValueFrom(
      this.http.get<{ slots: Slot[] }>(`${this.base}${API_PATHS.DOCTOR.SLOTS}`, {
        params: { date: this.selectedDate() },
        headers: { Authorization: `Bearer ${token}` }
      })
    ).then(r => { this.slots.set(r.slots); this.loading.set(false); })
     .catch(() => this.loading.set(false));
  }

  async addSlot(): Promise<void> {
    const { newStart, newEnd } = this.slotDraftModel();
    if (!newStart || !newEnd || newEnd <= newStart) {
      this.showToast('Invalid time range'); return;
    }
    const token = this.auth.token();
    try {
      await firstValueFrom(
        this.http.post<{ slot: Slot }>(`${this.base}${API_PATHS.DOCTOR.SLOTS}`, {
          date: this.selectedDate(), startTime: newStart, endTime: newEnd
        }, { headers: { Authorization: `Bearer ${token}` } })
      );
      this.load();
    } catch (e: any) {
      this.showToast(e?.error?.message ?? 'Failed to add slot');
    }
  }

  async addTemplate(t: { start: string; end: string; step: number }): Promise<void> {
    const slotsToCreate = generateSlots(t.start, t.end, t.step);
    const token = this.auth.token();
    let added = 0;
    for (const s of slotsToCreate) {
      try {
        await firstValueFrom(
          this.http.post(`${this.base}${API_PATHS.DOCTOR.SLOTS}`, {
            date: this.selectedDate(), startTime: s.startTime, endTime: s.endTime
          }, { headers: { Authorization: `Bearer ${token}` } })
        );
        added++;
      } catch { /* skip existing */ }
    }
    this.showToast(`Added ${added} slot${added !== 1 ? 's' : ''} ✓`);
    this.load();
  }

  async clearDay(): Promise<void> {
    const openSlots = this.slots().filter(s => !s.isBooked);
    const token = this.auth.token();
    for (const s of openSlots) {
      await firstValueFrom(
        this.http.delete(`${this.base}${API_PATHS.DOCTOR.SLOTS}/${s.id}`, { headers: { Authorization: `Bearer ${token}` } })
      ).catch(() => {});
    }
    this.showToast('Day cleared');
    this.load();
  }

  async toggleBlock(s: Slot): Promise<void> {
    const token = this.auth.token();
    await firstValueFrom(
      this.http.patch(`${this.base}${API_PATHS.DOCTOR.SLOTS}/${s.id}`, { isBlocked: !s.isBlocked }, { headers: { Authorization: `Bearer ${token}` } })
    );
    this.load();
  }

  async deleteSlot(id: string): Promise<void> {
    const token = this.auth.token();
    await firstValueFrom(
      this.http.delete(`${this.base}${API_PATHS.DOCTOR.SLOTS}/${id}`, { headers: { Authorization: `Bearer ${token}` } })
    );
    this.slots.update(list => list.filter(s => s.id !== id));
  }

  private showToast(msg: string): void {
    this.toast.set(msg);
    setTimeout(() => this.toast.set(''), TOAST_DURATION_MS);
  }
}

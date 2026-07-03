import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CallCenterApiService } from '../../services/callcenter-api.service';

@Component({
  selector: 'app-patient-search',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './patient-search.component.html',
  styleUrl: './patient-search.component.scss'
})
export class PatientSearchComponent {
  private api = inject(CallCenterApiService);

  query = '';
  loading = signal(false);
  error = signal('');
  patients = signal<any[]>([]);

  search(): void {
    if (this.query.trim().length < 2) {
      this.patients.set([]);
      return;
    }
    this.loading.set(true);
    this.error.set('');
    this.api.searchPatients(this.query.trim())
      .then((res) => {
        this.patients.set(res.patients ?? []);
        this.loading.set(false);
      })
      .catch(() => {
        this.error.set('Search failed.');
        this.loading.set(false);
      });
  }
}

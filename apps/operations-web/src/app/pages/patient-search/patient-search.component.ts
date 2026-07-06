import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { form, FormField } from '@angular/forms/signals';
import { CallCenterApiService } from '../../services/callcenter-api.service';

@Component({
  selector: 'app-patient-search',
  standalone: true,
  imports: [FormField],
  templateUrl: './patient-search.component.html',
  styleUrl: './patient-search.component.scss'
})
export class PatientSearchComponent implements OnInit {
  private api = inject(CallCenterApiService);
  private route = inject(ActivatedRoute);

  readonly searchModel = signal({ q: '' });
  readonly searchForm = form(this.searchModel);
  loading = signal(false);
  error = signal('');
  patients = signal<any[]>([]);

  ngOnInit(): void {
    const q = this.route.snapshot.queryParamMap.get('q') ?? this.route.snapshot.queryParamMap.get('patientCode');
    if (q) {
      this.searchModel.set({ q });
      this.search();
    }
  }

  search(): void {
    const query = this.searchModel().q.trim();
    if (query.length < 2) {
      this.patients.set([]);
      return;
    }
    this.loading.set(true);
    this.error.set('');
    this.api.searchPatients(query)
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

import { Component, inject, signal, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { CallCenterApiService } from '../../services/callcenter-api.service';

@Component({
  selector: 'app-consultations',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './consultations.component.html',
  styleUrl: './consultations.component.scss'
})
export class ConsultationsComponent implements OnInit {
  private api = inject(CallCenterApiService);

  loading = signal(true);
  error = signal('');
  consultations = signal<any[]>([]);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.api.getRecentConsultations()
      .then((res) => {
        this.consultations.set(res.consultations ?? []);
        this.loading.set(false);
      })
      .catch(() => {
        this.error.set('Could not load consultations.');
        this.loading.set(false);
      });
  }
}

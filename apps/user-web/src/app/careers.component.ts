import { Component, OnInit, signal } from '@angular/core';
import { AppFooterComponent } from './app-footer.component';
import { AppHeaderComponent } from './app-header.component';
import { ClinicApiClient } from './clinic-api/clinic-api.client';
import { API_PATHS } from './core/constants/api-paths.constants';
import { WHATSAPP_CONTACT_URL } from './core/constants/branding.constants';
import { CAREERS_PAGE_CONTENT } from './core/constants/public-site-content.constants';

export interface JobVacancy {
  id: string;
  title: string;
  department: string;
  jobType: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERNSHIP';
  locationType: 'REMOTE' | 'ON_SITE' | 'HYBRID';
  location: string | null;
  description: string;
  requirements: string[];
  responsibilities: string[];
  isUrgent: boolean;
  deadline: string | null;
  salaryRange: string | null;
  createdAt: string;
}

@Component({
  selector: 'app-careers',
  imports: [AppHeaderComponent, AppFooterComponent],
  templateUrl: './careers.component.html',
})
export class CareersComponent implements OnInit {
  readonly whatsappLink = WHATSAPP_CONTACT_URL;
  readonly copy = CAREERS_PAGE_CONTENT;

  readonly applyLink =
    'https://wa.me/919876543210?text=Hi%20Vitalis%20Care%2C%20I%20would%20like%20to%20apply%20for%20a%20position.';

  readonly vacancies = signal<JobVacancy[]>([]);
  readonly loading = signal(false);

  readonly departments = signal<string[]>([]);
  readonly selectedDept = signal('All');
  readonly expandedId = signal<string | null>(null);

  private readonly client = new ClinicApiClient();

  async ngOnInit() {
    this.loading.set(true);
    try {
      const res = await this.client.apiFetch<{ vacancies: JobVacancy[] }>(API_PATHS.VACANCIES);
      const list = res.vacancies ?? [];
      this.vacancies.set(list);
      if (list.length) {
        const depts = ['All', ...Array.from(new Set(list.map((v) => v.department)))];
        this.departments.set(depts);
      }
    } catch {
      /* silently show empty state — no open vacancies or API unavailable */
    } finally {
      this.loading.set(false);
    }
  }

  get filteredVacancies(): JobVacancy[] {
    const dept = this.selectedDept();
    return dept === 'All' ? this.vacancies() : this.vacancies().filter((v) => v.department === dept);
  }

  selectDept(dept: string) {
    this.selectedDept.set(dept);
  }

  toggleExpand(id: string) {
    this.expandedId.update((cur) => (cur === id ? null : id));
  }

  applyForRole(title: string): string {
    return `https://wa.me/919876543210?text=Hi%20Vitalis%20Care%2C%20I%20would%20like%20to%20apply%20for%20the%20${encodeURIComponent(title)}%20position.`;
  }

  jobTypeLabel(t: string): string {
    return (
      { FULL_TIME: 'Full-time', PART_TIME: 'Part-time', CONTRACT: 'Contract', INTERNSHIP: 'Internship' }[t] ?? t
    );
  }

  locationLabel(t: string): string {
    return ({ REMOTE: 'Remote', ON_SITE: 'On-site', HYBRID: 'Hybrid' }[t] ?? t);
  }

  deadlineLabel(dl: string | null): string {
    if (!dl) return '';
    return new Date(dl).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }
}

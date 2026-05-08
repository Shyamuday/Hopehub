import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { filter, map, switchMap, tap } from 'rxjs';
import { forkJoin } from 'rxjs';
import { AppFooterComponent } from '../app-footer.component';
import { AppHeaderComponent } from '../app-header.component';
import { AuthService } from '../auth/auth.service';
import { ClinicApiService } from '../clinic-api/clinic-api.service';
import { environment } from '../../environments/environment';
import { buildPatientWhatsAppLink } from '../patient/patient-whatsapp';
import {
  clearWorksheetBookingDraft,
  persistWorksheetBookingDraft,
  worksheetAnswersToSummaryText
} from '../patient/patient-worksheet-booking-bridge';
import { selfDiagnosisToolByKey } from './self-diagnosis.constants';
import { SelfDiagnosisFieldRowsComponent } from './self-diagnosis-field-rows/self-diagnosis-field-rows.component';
import {
  type MethodIntakeAddonFile,
  type MethodIntakeFlatRow,
  flattenMethodIntakeFields,
  methodIntakeRowsWithSectionHeaders,
  migrateLegacyMiasmTenNonRanked,
  migrateLegacyRankedFieldsForGroup
} from './self-diagnosis-intake';

@Component({
  selector: 'app-self-diagnosis-tool',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    TranslatePipe,
    AppHeaderComponent,
    AppFooterComponent,
    SelfDiagnosisFieldRowsComponent
  ],
  templateUrl: './self-diagnosis-tool.component.html',
  styleUrl: './self-diagnosis-tool.component.scss'
})
export class SelfDiagnosisToolComponent {
  readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  private readonly api = inject(ClinicApiService);
  private readonly translate = inject(TranslateService);
  readonly auth = inject(AuthService);

  readonly pageTitle = signal('Worksheet');
  readonly idPrefix = signal('');
  readonly title = signal('');
  readonly description = signal('');
  readonly rows = signal<Array<MethodIntakeFlatRow & { showSectionHeader: boolean }>>([]);
  readonly loading = signal(true);
  readonly loadError = signal('');
  readonly saveNotice = signal('');
  readonly saveError = signal('');
  readonly saving = signal(false);

  readonly formValues: Record<string, string> = {};

  readonly patientXp = environment.patientExperience;
  readonly whatsappLink = buildPatientWhatsAppLink(
    this.patientXp.whatsappE164,
    this.patientXp.whatsappMessage
  );

  private flatKeys: string[] = [];

  constructor() {
    this.route.paramMap
      .pipe(
        map((pm) => pm.get('toolKey') ?? ''),
        tap((key) => {
          if (!selfDiagnosisToolByKey(key)) {
            void this.router.navigate(['/patient/self-diagnosis']);
          }
        }),
        filter((key) => Boolean(selfDiagnosisToolByKey(key))),
        tap(() => {
          this.loading.set(true);
          this.loadError.set('');
          this.saveNotice.set('');
          this.saveError.set('');
        }),
        switchMap((key) => {
          const def = selfDiagnosisToolByKey(key)!;
          this.pageTitle.set(def.label);
          this.idPrefix.set(def.key);
          return forkJoin({
            file: this.http.get<MethodIntakeAddonFile>(def.dataUrl),
            list: this.api.patientSelfDiagnosisList()
          }).pipe(map((bundle) => ({ def, ...bundle })));
        }),
        takeUntilDestroyed()
      )
      .subscribe({
        next: ({ def, file, list }) => {
          const group = file.group;
          if (!group || group.type !== 'structured_group') {
            this.loadError.set('Invalid worksheet configuration.');
            this.loading.set(false);
            return;
          }
          this.title.set(file.title?.trim() || def.label);
          this.description.set(file.description?.trim() || def.description);
          const flat = flattenMethodIntakeFields([group]);
          this.flatKeys = flat.map((r) => r.storageKey);
          this.rows.set(methodIntakeRowsWithSectionHeaders(flat));

          const saved = list.results.find((r) => r.toolKey === def.key)?.answers ?? {};
          for (const k of Object.keys(this.formValues)) {
            delete this.formValues[k];
          }
          const merged: Record<string, string> = { ...saved };
          for (const k of this.flatKeys) {
            if (!(k in merged)) {
              merged[k] = '';
            }
          }
          migrateLegacyRankedFieldsForGroup(merged, group);
          if (def.key === 'miasm') {
            migrateLegacyMiasmTenNonRanked(merged);
          }
          Object.assign(this.formValues, merged);
          this.loading.set(false);
        },
        error: () => {
          this.loadError.set(this.translate.instant('patient.selfDiagnosis.loadError'));
          this.loading.set(false);
        }
      });
  }

  logout() {
    this.auth.logout();
    void this.router.navigateByUrl('/login');
  }

  save() {
    const key = this.route.snapshot.paramMap.get('toolKey') ?? '';
    const def = selfDiagnosisToolByKey(key);
    if (!def) {
      return;
    }
    const answers: Record<string, string> = {};
    for (const k of this.flatKeys) {
      const raw = this.formValues[k] ?? '';
      if (raw.trim()) {
        answers[k] = raw;
      }
    }
    this.saving.set(true);
    this.saveNotice.set('');
    this.saveError.set('');
    this.api.savePatientSelfDiagnosis(def.key, answers).subscribe({
      next: () => {
        const summary = worksheetAnswersToSummaryText(answers);
        if (summary.trim()) {
          persistWorksheetBookingDraft({
            toolKey: def.key,
            toolLabel: def.label,
            summaryText: summary
          });
          this.saveNotice.set(this.translate.instant('patient.selfDiagnosis.saveNoticeWithSummary'));
        } else {
          clearWorksheetBookingDraft();
          this.saveNotice.set(this.translate.instant('patient.selfDiagnosis.saveNoticeEmpty'));
        }
        this.saving.set(false);
      },
      error: (err: { error?: { message?: string }; message?: string }) => {
        this.saveError.set(err.error?.message || err.message || this.translate.instant('patient.selfDiagnosis.saveErrorGeneric'));
        this.saving.set(false);
      }
    });
  }
}

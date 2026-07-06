import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { form, FormField } from '@angular/forms/signals';
import { AdminApi } from '../../../core/services/admin-api';
import { ROUTE_PATHS, adminRouteLink } from '../../../core/constants/app-routes.constants';
import { formatPaise } from '../../finance/constants/finance.constants';

type Tab = 'fees' | 'plans' | 'pay';

@Component({
  selector: 'app-rates-page',
  imports: [FormField, RouterLink],
  templateUrl: './rates-page.html',
  styleUrl: './rates-page.scss'
})
export class RatesPage implements OnInit {
  private api = inject(AdminApi);

  tab = signal<Tab>('fees');
  loading = signal(true);
  saving = signal(false);
  toast = signal('');

  diseases = signal<any[]>([]);
  stores = signal<any[]>([]);
  locationFees = signal<any[]>([]);
  plans = signal<any[]>([]);
  onlineKey = signal('ONLINE');

  selectedDiseaseId = signal('');
  readonly feeFormModel = signal({ locationKey: 'ONLINE', feeRupees: 0 });
  readonly feeForm = form(this.feeFormModel);
  readonly planEdits = signal<Record<string, { priceRupees: number; isActive: boolean }>>({});

  readonly payrollLink = adminRouteLink(ROUTE_PATHS.PAYROLL);
  readonly diseasesLink = adminRouteLink(ROUTE_PATHS.DISEASES);
  readonly financeLink = adminRouteLink(ROUTE_PATHS.FINANCE);
  readonly formatPaise = formatPaise;

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      const [diseasesRes, storesRes, feesRes, plansRes] = await Promise.all([
        this.api.getDiseases(),
        this.api.getAdminStores(),
        this.api.getLocationFees(),
        this.api.getBillingPlansAdmin()
      ]);
      this.diseases.set(diseasesRes.diseases);
      this.stores.set(storesRes.stores ?? []);
      this.locationFees.set(feesRes.fees);
      this.onlineKey.set(feesRes.onlineKey);
      this.feeFormModel.update((m) => ({ ...m, locationKey: feesRes.onlineKey }));
      this.plans.set(plansRes.plans);
      const edits: Record<string, { priceRupees: number; isActive: boolean }> = {};
      for (const p of plansRes.plans) {
        edits[p.id] = { priceRupees: p.priceInPaise / 100, isActive: p.isActive };
      }
      this.planEdits.set(edits);
      if (!this.selectedDiseaseId() && diseasesRes.diseases.length) {
        this.selectedDiseaseId.set(diseasesRes.diseases[0].id);
      }
    } finally {
      this.loading.set(false);
    }
  }

  setTab(t: Tab): void {
    this.tab.set(t);
  }

  selectedDisease(): any | undefined {
    const id = this.selectedDiseaseId();
    return this.diseases().find((d) => d.id === id);
  }

  feesForDisease(diseaseId: string): any[] {
    return this.locationFees().filter((f) => f.diseaseId === diseaseId);
  }

  locationLabel(key: string): string {
    if (key === this.onlineKey()) return 'Online / unassigned';
    return this.stores().find((s) => s.id === key)?.name ?? key;
  }

  async saveLocationFee(): Promise<void> {
    const diseaseId = this.selectedDiseaseId();
    if (!diseaseId) return;
    const form = this.feeFormModel();
    const feeInPaise = Math.round(Number(form.feeRupees) * 100);
    if (!feeInPaise) return;
    this.saving.set(true);
    try {
      await this.api.saveLocationFee({ diseaseId, locationKey: form.locationKey, feeInPaise });
      const feesRes = await this.api.getLocationFees();
      this.locationFees.set(feesRes.fees);
      this.showToast('Location fee saved');
    } catch {
      this.showToast('Could not save fee');
    } finally {
      this.saving.set(false);
    }
  }

  async removeLocationFee(diseaseId: string, locationKey: string): Promise<void> {
    if (!confirm('Remove this override? Default disease fee will apply.')) return;
    await this.api.deleteLocationFee(diseaseId, locationKey);
    const feesRes = await this.api.getLocationFees();
    this.locationFees.set(feesRes.fees);
    this.showToast('Override removed');
  }

  async savePlan(plan: any): Promise<void> {
    const edit = this.planEdits()[plan.id];
    if (!edit) return;
    this.saving.set(true);
    try {
      await this.api.updateBillingPlan(plan.id, {
        priceInPaise: Math.round(edit.priceRupees * 100),
        isActive: edit.isActive
      });
      this.showToast(`${plan.name} updated`);
      await this.load();
    } catch {
      this.showToast('Could not update plan');
    } finally {
      this.saving.set(false);
    }
  }

  updatePlanField(planId: string, field: 'priceRupees' | 'isActive', value: number | boolean): void {
    this.planEdits.update((m) => ({
      ...m,
      [planId]: { ...m[planId], [field]: value }
    }));
  }

  private showToast(msg: string): void {
    this.toast.set(msg);
    setTimeout(() => this.toast.set(''), 2500);
  }
}

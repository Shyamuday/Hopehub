import { Component, inject, signal, OnInit } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { DatePipe } from '@angular/common';
import { buildDetailRows, DetailRowsComponent } from '@hopehub/platform-ui';
import { AdminApi } from '../../../core/services/admin-api';
import { TOAST_DURATION_MS } from '../../../core/constants/timing.constants';
import { PURCHASE_ORDER_DETAIL_FIELDS } from '../constants/purchase-order-detail.fields';

type PoLine = { medicineId: string; label: string; qtyOrdered: number; unitPriceInPaise: number };

function emptyPoForm() {
  return { supplierId: '', storeId: '', notes: '', send: true };
}

function emptyListFilters() {
  return { statusFilter: '', storeFilter: '' };
}

@Component({
  selector: 'app-purchase-orders-page',
  imports: [FormField, DatePipe, DetailRowsComponent],
  templateUrl: './purchase-orders-page.html',
  styleUrl: './purchase-orders-page.scss'
})
export class PurchaseOrdersPage implements OnInit {
  private api = inject(AdminApi);

  orders = signal<any[]>([]);
  stores = signal<any[]>([]);
  suppliers = signal<any[]>([]);
  loading = signal(true);
  error = signal('');
  toast = signal('');
  saving = signal(false);
  modal = signal(false);
  detail = signal<any | null>(null);

  readonly listFilterModel = signal(emptyListFilters());
  readonly listFilterForm = form(this.listFilterModel);

  readonly poModel = signal(emptyPoForm());
  readonly poForm = form(this.poModel);

  lines = signal<PoLine[]>([]);
  readonly medicineSearchModel = signal({ q: '' });
  readonly medicineSearchForm = form(this.medicineSearchModel);
  medicineResults = signal<any[]>([]);
  medicineSearching = signal(false);

  ngOnInit(): void {
    void this.bootstrap();
  }

  private async bootstrap() {
    this.loading.set(true);
    this.error.set('');
    try {
      const [storesRes, suppliersRes] = await Promise.all([
        this.api.getAdminStores(),
        this.api.getSuppliers()
      ]);
      this.stores.set(storesRes.stores);
      this.suppliers.set(suppliersRes.suppliers);
      await this.load();
    } catch {
      this.error.set('Could not load purchase order data.');
      this.loading.set(false);
    }
  }

  async load() {
    this.loading.set(true);
    this.error.set('');
    const filters = this.listFilterModel();
    try {
      const response = await this.api.getPurchaseOrders({
        status: filters.statusFilter || undefined,
        storeId: filters.storeFilter || undefined
      });
      this.orders.set(response.orders);
    } catch {
      this.error.set('Could not load purchase orders.');
    } finally {
      this.loading.set(false);
    }
  }

  openCreate() {
    this.poModel.set({
      supplierId: '',
      storeId: this.stores()[0]?.id || '',
      notes: '',
      send: true
    });
    this.lines.set([]);
    this.medicineSearchModel.set({ q: '' });
    this.medicineResults.set([]);
    this.modal.set(true);
  }

  closeModal() {
    this.modal.set(false);
    this.detail.set(null);
  }

  async searchMedicines() {
    const q = this.medicineSearchModel().q.trim();
    if (q.length < 2) return;
    this.medicineSearching.set(true);
    try {
      const response = await this.api.searchMedicines(q);
      this.medicineResults.set(response.medicines);
    } catch {
      this.medicineResults.set([]);
    } finally {
      this.medicineSearching.set(false);
    }
  }

  addLine(medicine: any) {
    if (this.lines().some((line) => line.medicineId === medicine.id)) return;
    this.lines.update((rows) => [
      ...rows,
      {
        medicineId: medicine.id,
        label: `${medicine.name} ${medicine.potency}`,
        qtyOrdered: 10,
        unitPriceInPaise: 0
      }
    ]);
  }

  removeLine(medicineId: string) {
    this.lines.update((rows) => rows.filter((line) => line.medicineId !== medicineId));
  }

  updateLineField(medicineId: string, field: 'qtyOrdered' | 'unitPriceInPaise', value: number) {
    this.lines.update((rows) =>
      rows.map((line) => line.medicineId === medicineId ? { ...line, [field]: value } : line)
    );
  }

  async saveOrder() {
    const po = this.poModel();
    if (!po.supplierId || !po.storeId) {
      this.showToast('Select supplier and store.');
      return;
    }
    if (!this.lines().length) {
      this.showToast('Add at least one medicine line.');
      return;
    }
    this.saving.set(true);
    try {
      await this.api.createPurchaseOrder({
        supplierId: po.supplierId,
        storeId: po.storeId,
        notes: po.notes || undefined,
        send: po.send,
        lines: this.lines().map((line) => ({
          medicineId: line.medicineId,
          qtyOrdered: line.qtyOrdered,
          unitPriceInPaise: line.unitPriceInPaise
        }))
      });
      this.modal.set(false);
      this.showToast('Purchase order created.');
      await this.load();
    } catch (e: any) {
      this.showToast(e?.error?.message || 'Could not create purchase order.');
    } finally {
      this.saving.set(false);
    }
  }

  async viewOrder(id: string) {
    try {
      const order = await this.api.getPurchaseOrder(id);
      this.detail.set(order);
    } catch {
      this.showToast('Could not load order detail.');
    }
  }

  private showToast(msg: string) {
    this.toast.set(msg);
    setTimeout(() => this.toast.set(''), TOAST_DURATION_MS);
  }

  purchaseOrderDetailRows(order: {
    status: string;
    supplier?: { name?: string };
    store?: { name?: string };
    notes?: string;
  }) {
    return buildDetailRows(
      {
        status: order.status,
        supplierName: order.supplier?.name,
        storeName: order.store?.name,
        notes: order.notes
      },
      PURCHASE_ORDER_DETAIL_FIELDS
    );
  }
}

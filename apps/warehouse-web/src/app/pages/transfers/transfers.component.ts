import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { WarehouseApiService } from '../../services/warehouse-api.service';

type CreateLine = { medicineId: string; label: string; qtyRequested: number };
type DispatchLine = {
  transferLineId: string;
  label: string;
  qtyRequested: number;
  qtyDispatched: number;
  sourceBatchId: string;
  batchOptions: Array<{ id: string; label: string; qty: number }>;
};

@Component({
  selector: 'app-transfers',
  standalone: true,
  imports: [FormsModule, DatePipe],
  templateUrl: './transfers.component.html',
  styleUrl: './transfers.component.scss'
})
export class TransfersComponent implements OnInit {
  private api = inject(WarehouseApiService);

  loading = signal(true);
  error = signal('');
  transfers = signal<any[]>([]);
  branches = signal<any[]>([]);
  stock = signal<any[]>([]);
  toast = signal('');

  creating = signal(false);
  createToStoreId = '';
  createNotes = '';
  createLines = signal<CreateLine[]>([]);

  dispatchingId = signal<string | null>(null);
  dispatchLines = signal<DispatchLine[]>([]);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    Promise.all([this.api.getTransfers(), this.api.getBranches(), this.api.getDashboard()])
      .then(([transferRes, branchRes, dashboard]) => {
        this.transfers.set(transferRes.transfers ?? []);
        this.branches.set(branchRes.branches ?? []);
        this.stock.set(dashboard.stock ?? []);
        this.loading.set(false);
      })
      .catch(() => {
        this.error.set('Could not load transfers.');
        this.loading.set(false);
      });
  }

  openCreate(): void {
    this.creating.set(true);
    this.createToStoreId = this.branches()[0]?.id ?? '';
    this.createNotes = '';
    this.createLines.set([]);
  }

  closeCreate(): void {
    this.creating.set(false);
    this.createLines.set([]);
    this.createNotes = '';
  }

  addCreateLine(): void {
    const first = this.stock()[0];
    if (!first) return;
    this.createLines.update((lines) => [
      ...lines,
      {
        medicineId: first.medicineId,
        label: `${first.name} ${first.potency}`,
        qtyRequested: 10
      }
    ]);
  }

  onCreateMedicineChange(line: CreateLine): void {
    const med = this.stock().find((row) => row.medicineId === line.medicineId);
    if (med) line.label = `${med.name} ${med.potency}`;
  }

  async submitCreate(): Promise<void> {
    const lines = this.createLines().filter((line) => line.qtyRequested > 0);
    if (!this.createToStoreId || !lines.length) return;
    try {
      await this.api.createTransfer({
        toStoreId: this.createToStoreId,
        notes: this.createNotes || undefined,
        lines: lines.map((line) => ({ medicineId: line.medicineId, qtyRequested: line.qtyRequested }))
      });
      this.showToast('Transfer created');
      this.closeCreate();
      this.load();
    } catch {
      this.showToast('Create failed');
    }
  }

  openDispatch(transfer: any): void {
    this.dispatchingId.set(transfer.id);
    this.dispatchLines.set(
      transfer.lines.map((line: any) => {
        const stockRow = this.stock().find((row) => row.medicineId === line.medicineId);
        const batchOptions = (stockRow?.batches ?? []).map((batch: any) => ({
          id: batch.id,
          qty: batch.qty,
          label: `${batch.batchNumber} (${batch.qty} avail)`
        }));
        return {
          transferLineId: line.id,
          label: `${line.medicine.name} ${line.medicine.potency}`,
          qtyRequested: line.qtyRequested,
          qtyDispatched: line.qtyRequested,
          sourceBatchId: batchOptions[0]?.id ?? '',
          batchOptions
        };
      })
    );
  }

  closeDispatch(): void {
    this.dispatchingId.set(null);
    this.dispatchLines.set([]);
  }

  async submitDispatch(): Promise<void> {
    const id = this.dispatchingId();
    if (!id) return;
    const lines = this.dispatchLines()
      .filter((line) => line.qtyDispatched > 0 && line.sourceBatchId)
      .map((line) => ({
        transferLineId: line.transferLineId,
        qtyDispatched: line.qtyDispatched,
        sourceBatchId: line.sourceBatchId
      }));
    if (!lines.length) return;
    try {
      await this.api.dispatchTransfer(id, lines);
      this.showToast('Transfer dispatched — in transit');
      this.closeDispatch();
      this.load();
    } catch {
      this.showToast('Dispatch failed');
    }
  }

  private showToast(msg: string): void {
    this.toast.set(msg);
    setTimeout(() => this.toast.set(''), 2500);
  }
}

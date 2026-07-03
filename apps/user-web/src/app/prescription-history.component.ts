import { CommonModule } from '@angular/common';
import { Component, Input, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { Prescription } from './models';
import { PrescriptionPdfService } from './core/services/prescription-pdf.service';

@Component({
  selector: 'app-prescription-history',
  standalone: true,
  imports: [CommonModule],
  styleUrl: './prescription-history.component.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './prescription-history.component.html',
})
export class PrescriptionHistoryComponent {
  @Input() prescriptions: Prescription[] = [];

  private readonly pdf = inject(PrescriptionPdfService);

  readonly busyId = signal('');
  readonly error = signal('');

  canShare() {
    return this.pdf.canNativeShareFiles();
  }

  isBusy(id: string) {
    return this.busyId() === id;
  }

  async viewPdf(prescription: Prescription) {
    await this.run(prescription.id, () => this.pdf.viewInBrowser(prescription.id));
  }

  async downloadPdf(prescription: Prescription) {
    await this.run(prescription.id, () => this.pdf.download(prescription.id));
  }

  async printPdf(prescription: Prescription) {
    await this.run(prescription.id, () => this.pdf.print(prescription.id));
  }

  async sharePdf(prescription: Prescription) {
    await this.run(prescription.id, async () => {
      const meta = await this.pdf.fetchShareMeta(prescription.id);
      await this.pdf.shareNative(prescription.id, meta);
    });
  }

  async shareWhatsApp(prescription: Prescription) {
    await this.run(prescription.id, async () => {
      const meta = await this.pdf.fetchShareMeta(prescription.id);
      const url = this.pdf.whatsAppShareUrl(meta.shareText);
      window.open(url, '_blank', 'noopener,noreferrer');
    });
  }

  private async run(prescriptionId: string, action: () => Promise<void>) {
    this.busyId.set(prescriptionId);
    this.error.set('');
    try {
      await action();
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Could not complete PDF action.');
    } finally {
      this.busyId.set('');
    }
  }
}

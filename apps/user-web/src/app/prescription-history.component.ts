import { CommonModule } from '@angular/common';
import { Component, Input, injectAsync, onIdle, signal } from '@angular/core';
import { Prescription } from './models';

@Component({
  selector: 'app-prescription-history',
  standalone: true,
  imports: [CommonModule],
  styleUrl: './prescription-history.component.scss',
  templateUrl: './prescription-history.component.html'
})
export class PrescriptionHistoryComponent {
  @Input() prescriptions: Prescription[] = [];

  private readonly pdf = injectAsync(
    () => import('./core/services/prescription-pdf.service').then((module) => module.PrescriptionPdfService),
    { prefetch: onIdle }
  );

  readonly busyId = signal('');
  readonly error = signal('');
  readonly canShareFiles = signal(false);

  constructor() {
    void this.pdf().then((service) => this.canShareFiles.set(service.canNativeShareFiles()));
  }

  isBusy(id: string) {
    return this.busyId() === id;
  }

  async viewPdf(prescription: Prescription) {
    await this.run(prescription.id, async () => (await this.pdf()).viewInBrowser(prescription.id));
  }

  async downloadPdf(prescription: Prescription) {
    await this.run(prescription.id, async () => (await this.pdf()).download(prescription.id));
  }

  async printPdf(prescription: Prescription) {
    await this.run(prescription.id, async () => (await this.pdf()).print(prescription.id));
  }

  async sharePdf(prescription: Prescription) {
    await this.run(prescription.id, async () => {
      const service = await this.pdf();
      const meta = await service.fetchShareMeta(prescription.id);
      await service.shareNative(prescription.id, meta);
    });
  }

  async shareWhatsApp(prescription: Prescription) {
    await this.run(prescription.id, async () => {
      const service = await this.pdf();
      const meta = await service.fetchShareMeta(prescription.id);
      const url = service.whatsAppShareUrl(meta.shareText);
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

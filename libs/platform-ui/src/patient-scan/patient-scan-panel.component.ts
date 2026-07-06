import {
  Component,
  ElementRef,
  OnDestroy,
  inject,
  input,
  output,
  signal,
  viewChild
} from '@angular/core';
import { extractPatientCodeFromScan, isPatientCodeFormat } from './extract-patient-code';

@Component({
  selector: 'vitalis-patient-scan-panel',
  standalone: true,
  templateUrl: './patient-scan-panel.component.html',
  styleUrl: './patient-scan-panel.component.scss'
})
export class PatientScanPanelComponent implements OnDestroy {
  readonly title = input('Scan patient QR');
  readonly hint = input('Point the camera at a patient card or enter / paste patient ID (e.g. RNC-000001).');
  readonly loading = input(false);

  readonly codeSubmit = output<string>();
  readonly scanError = output<string>();

  readonly manualCode = signal('');
  readonly cameraOn = signal(false);
  readonly cameraSupported = signal(false);
  readonly cameraError = signal('');

  private readonly videoRef = viewChild<ElementRef<HTMLVideoElement>>('video');
  private stream: MediaStream | null = null;
  private detectTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.cameraSupported.set(
      typeof window !== 'undefined' &&
        !!navigator.mediaDevices?.getUserMedia &&
        'BarcodeDetector' in window
    );
  }

  ngOnDestroy(): void {
    this.stopCamera();
  }

  submitManual(): void {
    const code = extractPatientCodeFromScan(this.manualCode());
    if (!isPatientCodeFormat(code)) {
      this.scanError.emit('Enter a valid patient ID like RNC-000001.');
      return;
    }
    this.codeSubmit.emit(code);
  }

  onManualKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.submitManual();
    }
  }

  async toggleCamera(): Promise<void> {
    if (this.cameraOn()) {
      this.stopCamera();
      return;
    }

    this.cameraError.set('');
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false
      });
      this.cameraOn.set(true);
      queueMicrotask(() => this.attachStream());
      this.startDetecting();
    } catch {
      this.cameraError.set('Camera access denied or unavailable. Use manual entry.');
      this.stopCamera();
    }
  }

  private attachStream(): void {
    const video = this.videoRef()?.nativeElement;
    if (video && this.stream) {
      video.srcObject = this.stream;
      void video.play();
    }
  }

  private startDetecting(): void {
    if (!('BarcodeDetector' in window)) return;

    const Detector = (window as Window & { BarcodeDetector: new (opts?: { formats: string[] }) => {
      detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue: string }>>;
    } }).BarcodeDetector;

    const detector = new Detector({ formats: ['qr_code'] });
    this.detectTimer = setInterval(() => {
      const video = this.videoRef()?.nativeElement;
      if (!video || video.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA) return;

      void detector.detect(video).then((codes) => {
        const raw = codes[0]?.rawValue;
        if (!raw) return;
        const code = extractPatientCodeFromScan(raw);
        if (!isPatientCodeFormat(code)) return;
        this.stopCamera();
        this.manualCode.set(code);
        this.codeSubmit.emit(code);
      });
    }, 450);
  }

  private stopCamera(): void {
    if (this.detectTimer) {
      clearInterval(this.detectTimer);
      this.detectTimer = null;
    }
    if (this.stream) {
      for (const track of this.stream.getTracks()) {
        track.stop();
      }
      this.stream = null;
    }
    const video = this.videoRef()?.nativeElement;
    if (video) {
      video.srcObject = null;
    }
    this.cameraOn.set(false);
  }
}

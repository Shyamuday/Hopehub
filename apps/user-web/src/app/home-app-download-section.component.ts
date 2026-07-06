import { Component } from '@angular/core';
import { AppDownloadQrComponent } from './shared/app-download-qr/app-download-qr.component';

@Component({
  selector: 'app-home-app-download-section',
  standalone: true,
  imports: [AppDownloadQrComponent],
  template: `
    <section class="home-app-download panel">
      <app-download-qr />
    </section>
  `,
  styleUrl: './home-app-download-section.component.scss'
})
export class HomeAppDownloadSectionComponent {}

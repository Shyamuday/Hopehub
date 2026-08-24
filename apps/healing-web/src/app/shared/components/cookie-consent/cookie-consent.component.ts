import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CookieConsentService } from '../../../core/services/cookie-consent.service';

@Component({
  selector: 'app-cookie-consent',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './cookie-consent.component.html',
  styleUrl: './cookie-consent.component.scss',
})
export class CookieConsentComponent {
  readonly consent = inject(CookieConsentService);
}

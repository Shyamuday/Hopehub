import { Component } from '@angular/core';
import { APP_CONSTANTS } from '../../../core';

@Component({
  selector: 'app-quick-access',
  standalone: true,
  templateUrl: './quick-access.component.html',
  styleUrl: './quick-access.component.scss',
})
export class QuickAccessComponent {
  readonly APP_CONSTANTS = APP_CONSTANTS;
}

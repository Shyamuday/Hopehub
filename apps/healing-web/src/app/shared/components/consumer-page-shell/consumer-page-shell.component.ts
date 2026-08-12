import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-consumer-page-shell',
  standalone: true,
  templateUrl: './consumer-page-shell.component.html',
  styleUrl: './consumer-page-shell.component.scss',
})
export class ConsumerPageShellComponent {
  @Input() eyebrow = '';
  @Input({ required: true }) title = '';
  @Input() description = '';
  @Input() tone: 'plain' | 'soft' = 'plain';
}

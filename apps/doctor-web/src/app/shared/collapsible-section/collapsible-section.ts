import { Component, Input, OnInit, signal } from '@angular/core';

@Component({
  selector: 'app-collapsible-section',
  templateUrl: './collapsible-section.html',
  styleUrl: './collapsible-section.scss'
})
export class CollapsibleSectionComponent implements OnInit {
  @Input({ required: true }) title = '';
  @Input() subtitle = '';
  @Input() startCollapsed = false;
  @Input() badge = '';

  readonly collapsed = signal(false);

  ngOnInit() {
    this.collapsed.set(this.startCollapsed);
  }

  toggle() {
    this.collapsed.update((value) => !value);
  }
}

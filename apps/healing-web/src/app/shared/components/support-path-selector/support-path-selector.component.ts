import { Component, EventEmitter, Input, Output } from '@angular/core';
import {
  CONSUMER_SUPPORT_PATHS,
  ConsumerSupportPath,
} from '../../../core/constants/support-paths.constants';
import { CONSUMER_UX_COPY } from '../../../core/constants/consumer-ux-copy.constants';

@Component({
  selector: 'app-support-path-selector',
  standalone: true,
  templateUrl: './support-path-selector.component.html',
  styleUrl: './support-path-selector.component.scss',
})
export class SupportPathSelectorComponent {
  @Input() selected: ConsumerSupportPath | '' = '';
  @Input() counts: Partial<Record<ConsumerSupportPath | '', number>> | null = null;
  @Input() showCounts = false;
  @Input() ariaLabel = CONSUMER_UX_COPY.supportPath.chooserAria;
  @Output() selectedChange = new EventEmitter<ConsumerSupportPath>();

  readonly paths = CONSUMER_SUPPORT_PATHS;

  select(value: ConsumerSupportPath): void {
    this.selectedChange.emit(value);
  }

  count(value: ConsumerSupportPath): number {
    return this.counts?.[value] ?? 0;
  }
}

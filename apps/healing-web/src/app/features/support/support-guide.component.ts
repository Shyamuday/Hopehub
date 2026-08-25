import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  CONSUMER_CONCERN_FLOWS,
  CONSUMER_CONCERN_ORDER,
  ConsumerConcernFlow,
  ConsumerConcernKey,
} from '../../core/constants/consumer-concerns.constants';
import { CONSUMER_ROUTES } from '../../core/constants/consumer-routes.constants';
import { CONSUMER_UX_COPY } from '../../core/constants/consumer-ux-copy.constants';
import { ConsumerFlowsService } from '../../core/services/consumer-flows.service';
import {
  ConsumerPageShellComponent,
  ConsumerSelectionRailComponent,
} from '../../shared/components';

@Component({
  selector: 'app-support-guide',
  standalone: true,
  imports: [CommonModule, RouterModule, ConsumerPageShellComponent, ConsumerSelectionRailComponent],
  templateUrl: './support-guide.component.html',
  styleUrl: './support-guide.component.scss',
})
export class SupportGuideComponent implements OnInit {
  private readonly consumerFlowsService = inject(ConsumerFlowsService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly UX = CONSUMER_UX_COPY;
  readonly ROUTES = CONSUMER_ROUTES;
  readonly flows = signal<Record<ConsumerConcernKey, ConsumerConcernFlow>>(CONSUMER_CONCERN_FLOWS);
  readonly selectedKey = signal<ConsumerConcernKey>('anxiety');
  readonly flowSource = signal<'backend' | 'fallback'>('fallback');

  readonly concernOptions = computed(() =>
    CONSUMER_CONCERN_ORDER.map((key) => this.flows()[key]).filter(
      (flow) => flow?.isActive && flow.showInSupportGuide,
    ),
  );
  readonly concernSelectionOptions = computed(() =>
    this.concernOptions().map((concern) => ({
      value: concern.key,
      label: concern.shortLabel,
      description: concern.assessment.label,
    })),
  );
  readonly selectedFlow = computed(() => this.flows()[this.selectedKey()] || this.flows().general);

  ngOnInit(): void {
    this.consumerFlowsService.state$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((state) => {
        this.flows.set(state.flows);
        this.flowSource.set(state.source);
        this.selectInitialConcern();
      });
    this.selectInitialConcern();
  }

  selectConcern(key: ConsumerConcernKey): void {
    this.selectedKey.set(key);
  }

  liveConnectQueryParams(flow: ConsumerConcernFlow): Record<string, string> {
    return {
      concern: flow.label,
      supportPath: flow.supportPath,
      source: 'support-guide',
    };
  }

  private selectInitialConcern(): void {
    const value = this.route.snapshot.queryParamMap.get('concern') || '';
    if (!value) return;
    const flow = this.consumerFlowsService.matchFlowForText(value, this.flows());
    this.selectedKey.set(flow.key);
  }
}

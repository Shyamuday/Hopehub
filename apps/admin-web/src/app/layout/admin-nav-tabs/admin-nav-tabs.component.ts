import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild
} from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { NAV_GROUPS, type AdminNavItem } from '../../core/constants/app-routes.constants';

@Component({
  selector: 'app-admin-nav-tabs',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './admin-nav-tabs.component.html',
  styleUrl: './admin-nav-tabs.component.scss'
})
export class AdminNavTabsComponent implements AfterViewInit, OnDestroy {
  readonly items = input.required<readonly AdminNavItem[]>();

  private readonly router = inject(Router);
  private readonly tabsScroll = viewChild<ElementRef<HTMLElement>>('tabsScroll');
  private navSub?: Subscription;
  private resizeObserver?: ResizeObserver;

  readonly activeGroupId = signal('');
  readonly canScrollLeft = signal(false);
  readonly canScrollRight = signal(false);

  readonly visibleGroups = computed(() => {
    const items = this.items();
    return NAV_GROUPS.map((group) => ({
      ...group,
      items: items.filter((item) =>
        (group.segments as readonly string[]).includes(this.pathSegment(item.path))
      )
    })).filter((group) => group.items.length > 0);
  });

  readonly activeGroupItems = computed(() => {
    const groups = this.visibleGroups();
    const id = this.activeGroupId();
    return groups.find((group) => group.id === id)?.items ?? groups[0]?.items ?? [];
  });

  readonly activeGroupLabel = computed(() => {
    const id = this.activeGroupId();
    return this.visibleGroups().find((group) => group.id === id)?.label ?? 'section';
  });

  constructor() {
    effect(() => {
      this.items();
      this.visibleGroups();
      this.syncGroupFromUrl();
    });
  }

  ngAfterViewInit(): void {
    this.syncGroupFromUrl();
    this.navSub = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => {
        this.syncGroupFromUrl();
        queueMicrotask(() => this.scrollActiveIntoView());
      });

    const el = this.tabsScroll()?.nativeElement;
    if (el && typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.updateScrollButtons());
      this.resizeObserver.observe(el);
    }

    queueMicrotask(() => {
      this.updateScrollButtons();
      this.scrollActiveIntoView();
    });
  }

  ngOnDestroy(): void {
    this.navSub?.unsubscribe();
    this.resizeObserver?.disconnect();
  }

  selectGroup(id: string): void {
    this.activeGroupId.set(id);
    queueMicrotask(() => {
      this.updateScrollButtons();
      this.scrollActiveIntoView();
    });
  }

  scroll(direction: -1 | 1): void {
    const el = this.tabsScroll()?.nativeElement;
    if (!el) return;
    el.scrollBy({ left: direction * 220, behavior: 'smooth' });
    window.setTimeout(() => this.updateScrollButtons(), 280);
  }

  onTabsScroll(): void {
    this.updateScrollButtons();
  }

  private syncGroupFromUrl(): void {
    const url = this.router.url.split('?')[0];
    const groups = this.visibleGroups();
    const match = groups.find((group) =>
      group.items.some((item) => url === item.path || url.startsWith(`${item.path}/`))
    );

    if (match) {
      this.activeGroupId.set(match.id);
      return;
    }

    if (!this.activeGroupId() && groups[0]) {
      this.activeGroupId.set(groups[0].id);
    }
  }

  private pathSegment(path: string): string {
    return path.split('/').filter(Boolean).pop() ?? '';
  }

  private updateScrollButtons(): void {
    const el = this.tabsScroll()?.nativeElement;
    if (!el) {
      this.canScrollLeft.set(false);
      this.canScrollRight.set(false);
      return;
    }

    const { scrollLeft, scrollWidth, clientWidth } = el;
    this.canScrollLeft.set(scrollLeft > 4);
    this.canScrollRight.set(scrollLeft + clientWidth < scrollWidth - 4);
  }

  private scrollActiveIntoView(): void {
    const el = this.tabsScroll()?.nativeElement;
    if (!el) return;
    const active = el.querySelector('a.active') as HTMLElement | null;
    active?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
    this.updateScrollButtons();
  }
}

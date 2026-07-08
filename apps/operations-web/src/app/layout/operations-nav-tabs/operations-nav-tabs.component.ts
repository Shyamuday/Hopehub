import {
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  OnInit,
  computed,
  effect,
  inject,
  input,
  output,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs';
import { OPERATIONS_NAV_GROUPS, type PlatformNavItem } from '@vitalis/platform-nav';

@Component({
  selector: 'app-operations-nav-tabs',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './operations-nav-tabs.component.html',
  styleUrl: './operations-nav-tabs.component.scss'
})
export class OperationsNavTabsComponent implements OnInit {
  readonly items = input<readonly PlatformNavItem[]>([]);
  readonly layout = input<'horizontal' | 'sidebar'>('horizontal');
  readonly navSelected = output<void>();

  private readonly router = inject(Router);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);

  readonly openGroupId = signal<string | null>(null);
  readonly activeGroupId = signal('');
  readonly currentPath = signal('');

  private closeTimer: ReturnType<typeof setTimeout> | null = null;

  readonly visibleGroups = computed(() => {
    const items = this.items();
    if (!items.length) return [];

    return OPERATIONS_NAV_GROUPS.map((group) => ({
      ...group,
      items: items.filter((item) => (group.paths as readonly string[]).includes(item.path))
    })).filter((group) => group.items.length > 0);
  });

  readonly currentPageLabel = computed(() => {
    const path = this.currentPath();
    const item = this.items().find(
      (entry) => path === entry.path || path.startsWith(`${entry.path}/`)
    );
    return item?.label ?? '';
  });

  private readonly syncWhenItemsReady = effect(() => {
    if (!this.items().length) return;
    this.syncFromUrl(this.router.url);
  });

  ngOnInit(): void {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((event) => {
        this.syncFromUrl(event.urlAfterRedirects);
        this.closeSubmenu();
      });

    this.syncFromUrl(this.router.url);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.openGroupId()) return;
    const target = event.target;
    if (target instanceof Node && this.host.nativeElement.contains(target)) return;
    this.closeSubmenu();
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Escape' || !this.openGroupId()) return;
    this.closeSubmenu();
    event.stopPropagation();
  }

  openGroup(id: string): void {
    this.cancelCloseTimer();
    this.openGroupId.set(id);
  }

  toggleGroup(id: string, event: MouseEvent): void {
    event.stopPropagation();
    this.cancelCloseTimer();
    this.openGroupId.update((current) => (current === id ? null : id));
  }

  onGroupEnter(id: string): void {
    if (this.layout() === 'sidebar') return;
    this.cancelCloseTimer();
    this.openGroupId.set(id);
  }

  onGroupLeave(): void {
    if (this.layout() === 'sidebar') return;
    this.cancelCloseTimer();
    this.closeTimer = window.setTimeout(() => this.closeSubmenu(), 160);
  }

  onNavItemClick(): void {
    this.closeSubmenu();
    this.navSelected.emit();
  }

  isGroupExpanded(groupId: string): boolean {
    if (this.layout() === 'horizontal') {
      return this.openGroupId() === groupId;
    }
    return this.openGroupId() === groupId || this.isGroupActive(groupId);
  }

  closeSubmenu(): void {
    this.cancelCloseTimer();
    this.openGroupId.set(null);
  }

  isGroupActive(groupId: string): boolean {
    return this.activeGroupId() === groupId;
  }

  isItemActive(path: string): boolean {
    const url = this.currentPath();
    return url === path || url.startsWith(`${path}/`);
  }

  private cancelCloseTimer(): void {
    if (this.closeTimer) {
      clearTimeout(this.closeTimer);
      this.closeTimer = null;
    }
  }

  private syncFromUrl(url: string): void {
    const path = url.split('?')[0];
    this.currentPath.set(path);

    if (!this.items().length) return;

    const groups = this.visibleGroups();
    const match = groups.find((group) =>
      group.items.some((item) => path === item.path || path.startsWith(`${item.path}/`))
    );

    if (match) {
      this.activeGroupId.set(match.id);
      if (this.layout() === 'sidebar') {
        this.openGroupId.set(match.id);
      }
      return;
    }

    if (!this.activeGroupId() && groups[0]) {
      this.activeGroupId.set(groups[0].id);
    }
  }
}

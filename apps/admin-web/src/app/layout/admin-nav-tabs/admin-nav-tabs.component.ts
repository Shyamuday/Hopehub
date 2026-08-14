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
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs';
import { NAV_GROUPS, type AdminNavItem } from '../../core/constants/app-routes.constants';

@Component({
  selector: 'app-admin-nav-tabs',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './admin-nav-tabs.component.html',
  styleUrl: './admin-nav-tabs.component.scss',
})
export class AdminNavTabsComponent implements OnInit {
  readonly items = input<readonly AdminNavItem[]>([]);
  readonly layout = input<'horizontal' | 'sidebar'>('horizontal');
  readonly navSelected = output<void>();

  private readonly router = inject(Router);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);

  readonly openGroupId = signal<string | null>(null);
  readonly activeGroupId = signal('');
  readonly currentPath = signal('');
  readonly searchQuery = signal('');

  private closeTimer: ReturnType<typeof setTimeout> | null = null;

  readonly visibleGroups = computed(() => {
    const items = this.items();
    if (!items.length) return [];
    const query = this.searchQuery().trim().toLocaleLowerCase();

    return NAV_GROUPS.map((group) => {
      const groupItems = items.filter(
        (item) =>
          (group.segments as readonly string[]).includes(this.pathSegment(item.path)) &&
          (!query || item.label.toLocaleLowerCase().includes(query)),
      );
      return {
        ...group,
        items: groupItems,
        sections: (group.sections ?? [])
          .map((section) => ({
            ...section,
            items: groupItems.filter((item) =>
              section.segments.includes(this.pathSegment(item.path)),
            ),
          }))
          .filter((section) => section.items.length > 0),
      };
    }).filter((group) => group.items.length > 0);
  });

  readonly currentPageLabel = computed(() => {
    const path = this.currentPath();
    const item = this.items().find(
      (entry) => path === entry.path || path.startsWith(`${entry.path}/`),
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
        takeUntilDestroyed(this.destroyRef),
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
    this.searchQuery.set('');
    this.navSelected.emit();
  }

  updateSearch(event: Event): void {
    const value = event.target instanceof HTMLInputElement ? event.target.value : '';
    this.searchQuery.set(value);
    if (value.trim()) this.openGroupId.set(null);
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
      group.items.some((item) => path === item.path || path.startsWith(`${item.path}/`)),
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

  private pathSegment(path: string): string {
    return path.split('/').filter(Boolean).pop() ?? '';
  }
}

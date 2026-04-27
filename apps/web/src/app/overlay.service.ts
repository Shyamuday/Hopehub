import { Injectable, Injector, Type, inject } from '@angular/core';
import { Overlay, OverlayConfig, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { Subject } from 'rxjs';
import { APP_OVERLAY_DATA, APP_OVERLAY_REF } from './overlay.tokens';

export type AppOverlayOpenOptions<TData> = {
  data?: TData;
  hasBackdrop?: boolean;
  backdropClass?: string;
  panelClass?: string;
  disableClose?: boolean;
  width?: string;
  maxWidth?: string;
};

export class AppOverlayRef<TResult = unknown> {
  private readonly closed$ = new Subject<TResult | undefined>();

  constructor(
    private readonly overlayRef: OverlayRef,
    private readonly disableClose = false
  ) { }

  close(result?: TResult) {
    if (!this.overlayRef.hasAttached()) {
      return;
    }

    this.overlayRef.dispose();
    this.closed$.next(result);
    this.closed$.complete();
  }

  afterClosed() {
    return this.closed$.asObservable();
  }

  setupBackdropClose() {
    if (this.disableClose) {
      return;
    }

    this.overlayRef.backdropClick().subscribe(() => this.close());
    this.overlayRef.keydownEvents().subscribe((event) => {
      if (event.key === 'Escape') {
        this.close();
      }
    });
  }
}

@Injectable({ providedIn: 'root' })
export class AppOverlayService {
  private readonly overlay = inject(Overlay);
  private readonly injector = inject(Injector);

  open<TData = unknown, TResult = unknown>(component: Type<unknown>, options: AppOverlayOpenOptions<TData> = {}) {
    const overlayConfig = new OverlayConfig({
      hasBackdrop: options.hasBackdrop ?? true,
      backdropClass: options.backdropClass ?? 'app-overlay-backdrop',
      panelClass: options.panelClass ?? 'app-overlay-panel',
      disposeOnNavigation: true,
      scrollStrategy: this.overlay.scrollStrategies.block(),
      positionStrategy: this.overlay.position().global().centerHorizontally().centerVertically(),
      width: options.width,
      maxWidth: options.maxWidth ?? '92vw'
    });

    const overlayRef = this.overlay.create(overlayConfig);
    const appOverlayRef = new AppOverlayRef<TResult>(overlayRef, options.disableClose ?? false);

    const portalInjector = Injector.create({
      parent: this.injector,
      providers: [
        { provide: APP_OVERLAY_DATA, useValue: options.data },
        { provide: APP_OVERLAY_REF, useValue: appOverlayRef }
      ]
    });

    overlayRef.attach(new ComponentPortal(component, null, portalInjector));
    appOverlayRef.setupBackdropClose();

    return appOverlayRef;
  }
}

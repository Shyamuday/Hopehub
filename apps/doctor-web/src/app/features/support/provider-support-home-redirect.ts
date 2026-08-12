import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ROUTE_PATHS } from '../../core/constants/app-routes.constants';

/** Opens the provider help centre at the root of support.hopehub.in. */
@Component({ template: '' })
export class ProviderSupportHomeRedirect implements OnInit {
  private readonly router = inject(Router);

  ngOnInit(): void {
    const isSupportDomain = window.location.hostname.toLowerCase() === 'support.hopehub.in';
    void this.router.navigate(
      ['/', isSupportDomain ? ROUTE_PATHS.SUPPORT : ROUTE_PATHS.DASHBOARD],
      {
        replaceUrl: true,
      },
    );
  }
}

import { Component, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { PlatformAuthService } from '../../services/platform-auth.service';

@Component({
  selector: 'app-home-redirect',
  standalone: true,
  template: '',
  changeDetection: ChangeDetectionStrategy.Eager
})
export class HomeRedirectComponent implements OnInit {
  private auth = inject(PlatformAuthService);
  private router = inject(Router);

  ngOnInit(): void {
    const target = this.auth.defaultRoute() || 'dashboard';
    void this.router.navigate([`/${target}`], { replaceUrl: true });
  }
}

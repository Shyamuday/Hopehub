import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ConcernPageData, ResourceHubService } from '../../core/services/resource-hub.service';

@Component({
  selector: 'app-concern-detail',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './concern-detail.component.html',
  styleUrl: './concern-detail.component.scss',
})
export class ConcernDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly resources = inject(ResourceHubService);
  readonly data = signal<ConcernPageData | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly hasSelfHelp = computed(() =>
    Boolean(
      this.data()?.practices.length ||
      this.data()?.lifestyleTips.length ||
      this.data()?.articles.length,
    ),
  );

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const slug = params.get('slug');
      if (slug) this.load(slug);
    });
  }

  ngOnInit(): void {}

  routePath(url: string): string {
    return url.split('?')[0] || '/';
  }

  routeQueryParams(url: string): Record<string, string> | null {
    const query = url.split('?')[1];
    if (!query) return null;
    return Object.fromEntries(new URLSearchParams(query).entries());
  }

  private load(slug: string): void {
    this.loading.set(true);
    this.error.set('');
    this.resources.getConcern(slug).subscribe({
      next: (response) => {
        this.data.set(response);
        this.loading.set(false);
      },
      error: (error) => {
        if (error?.status === 404) void this.router.navigate(['/404'], { replaceUrl: true });
        else {
          this.error.set('This concern guide could not be loaded. Please try again.');
          this.loading.set(false);
        }
      },
    });
  }
}

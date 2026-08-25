import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  ResourceConcern,
  ResourceHubService,
  ResourceSection,
} from '../../core/services/resource-hub.service';

@Component({
  selector: 'app-resources-hub',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './resources-hub.component.html',
  styleUrl: './resources-hub.component.scss',
})
export class ResourcesHubComponent implements OnInit {
  private readonly resources = inject(ResourceHubService);
  readonly concerns = signal<ResourceConcern[]>([]);
  readonly sections = signal<ResourceSection[]>([
    {
      key: 'assessments',
      label: 'Self-checks',
      description: 'Private tools that help you understand what you may be experiencing.',
      path: '/assessments',
    },
    {
      key: 'practices',
      label: 'Guided exercises',
      description: 'Simple breathing, grounding and reflection practices you can try now.',
      path: '/exercises',
    },
    {
      key: 'lifestyle',
      label: 'Lifestyle guides',
      description: 'Practical steps for sleep, routine, movement and everyday wellbeing.',
      path: '/lifestyle-tips',
    },
    {
      key: 'articles',
      label: 'Articles',
      description: 'Clear, reviewed reading for common emotional and mental-health concerns.',
      path: '/articles',
    },
    {
      key: 'recordings',
      label: 'Recorded sessions',
      description: 'Replay Hope Hub audio and video sessions at your own pace.',
      path: '/recorded-sessions',
    },
  ]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly query = signal('');
  readonly filteredConcerns = computed(() => {
    const query = this.query().trim().toLowerCase();
    if (!query) return this.concerns();
    return this.concerns().filter((concern) =>
      `${concern.label} ${concern.shortLabel} ${concern.description}`.toLowerCase().includes(query),
    );
  });

  ngOnInit(): void {
    this.resources.getHub().subscribe({
      next: (response) => {
        this.concerns.set(response.concerns ?? []);
        if (response.sections?.length) this.sections.set(response.sections);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('The resource library could not be loaded right now. Please try again.');
        this.loading.set(false);
      },
    });
  }

  updateQuery(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }
}

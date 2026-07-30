import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { LeadService, PublicTestimonial } from '../../../core/services/lead.service';

@Component({
  selector: 'app-feedback-section',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './feedback-section.component.html',
  styleUrl: './feedback-section.component.scss',
})
export class FeedbackSectionComponent implements OnInit {
  private readonly leadService = inject(LeadService);

  readonly testimonials = signal<PublicTestimonial[]>([]);

  ngOnInit(): void {
    this.leadService.listTestimonials().subscribe({
      next: (items) => this.testimonials.set(items.slice(0, 5)),
      error: () => this.testimonials.set([]),
    });
  }

  stars(count: number): number[] {
    return Array.from({ length: count }, (_, index) => index + 1);
  }
}

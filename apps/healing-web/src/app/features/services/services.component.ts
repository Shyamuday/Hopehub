import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NOTE_CONTENT } from '../../core/constants/note-content.constants';
import { Service, ServiceCategory } from '../../core/models';
import { getAllServices } from '../../core/data/services-data';
import { ServiceCardComponent } from '../../shared/components';

@Component({
  selector: 'app-services',
  standalone: true,
  imports: [FormsModule, ServiceCardComponent],
  templateUrl: './services.component.html',
  styleUrl: './services.component.scss',
})
export class ServicesComponent implements OnInit {
  readonly notes = NOTE_CONTENT;
  services = signal<Service[]>([]);
  searchTerm = signal('');
  selectedFilter = signal('all');

  filters = [
    { id: 'all', label: 'All' },
    { id: 'relationship', label: 'Relationship' },
    { id: 'anxiety-stress', label: 'Anxiety / Stress' },
    { id: 'career', label: 'Career / Study' },
    { id: 'family', label: 'Family' },
    { id: 'habits', label: 'Habits' },
    { id: 'sleep', label: 'Sleep / Overthinking' },
  ];

  filteredServices = computed(() => {
    const query = this.searchTerm().trim().toLowerCase();
    const filter = this.selectedFilter();

    return this.services().filter((service) => {
      const searchable = [service.name, service.description, service.category, ...service.benefits]
        .join(' ')
        .toLowerCase();

      const matchesSearch = !query || searchable.includes(query);
      const matchesFilter = filter === 'all' || this.matchesFilter(service, filter);

      return matchesSearch && matchesFilter;
    });
  });

  constructor(private router: Router) {}

  ngOnInit() {
    this.loadServices();
  }

  navigateToService(serviceId: string) {
    this.router.navigate(['/services', serviceId]);
  }

  setFilter(filter: string): void {
    this.selectedFilter.set(filter);
  }

  updateSearch(value: string): void {
    this.searchTerm.set(value);
  }

  private loadServices() {
    this.services.set(getAllServices());
  }

  private matchesFilter(service: Service, filter: string): boolean {
    const text = `${service.id} ${service.name} ${service.description}`.toLowerCase();

    if (filter === 'relationship') {
      return service.category === ServiceCategory.RELATIONSHIP || text.includes('breakup');
    }
    if (filter === 'anxiety-stress') {
      return (
        text.includes('anxiety') ||
        text.includes('stress') ||
        text.includes('panic') ||
        text.includes('burnout')
      );
    }
    if (filter === 'career') {
      return (
        service.category === ServiceCategory.CAREER ||
        text.includes('exam') ||
        text.includes('study')
      );
    }
    if (filter === 'family') {
      return (
        service.category === ServiceCategory.FAMILY ||
        text.includes('parenting') ||
        text.includes('family')
      );
    }
    if (filter === 'habits') {
      return (
        service.category === ServiceCategory.ADDICTION ||
        text.includes('habit') ||
        text.includes('addiction')
      );
    }
    if (filter === 'sleep') {
      return text.includes('sleep') || text.includes('overthinking');
    }

    return true;
  }
}

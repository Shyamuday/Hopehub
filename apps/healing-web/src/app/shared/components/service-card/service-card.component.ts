import { Component, input, output } from '@angular/core';
import { Service } from '../../../core/models';

@Component({
  selector: 'app-service-card',
  standalone: true,
  imports: [],
  templateUrl: './service-card.component.html',
  styleUrl: './service-card.component.scss'
})
export class ServiceCardComponent {
  service = input.required<Service>();
  learnMore = output<string>();

  onLearnMore() {
    this.learnMore.emit(this.service().id);
  }
}
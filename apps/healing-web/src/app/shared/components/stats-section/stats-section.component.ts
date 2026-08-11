import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { PageHeaderComponent } from '../page-header/page-header.component';

@Component({
  selector: 'app-stats-section',
  standalone: true,
  imports: [RouterModule, PageHeaderComponent],
  templateUrl: './stats-section.component.html',
  styleUrl: './stats-section.component.scss',
})
export class StatsSectionComponent {}

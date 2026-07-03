import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { LabResult } from './models';

@Component({
  selector: 'app-lab-results',
  standalone: true,
  imports: [CommonModule],
  styleUrl: './lab-results.component.scss',
  templateUrl: './lab-results.component.html'
})
export class LabResultsComponent {
  @Input() referrals: LabResult[] = [];
}

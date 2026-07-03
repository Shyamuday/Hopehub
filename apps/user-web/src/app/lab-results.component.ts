import { CommonModule } from '@angular/common';
import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { LabResult } from './models';

@Component({
  selector: 'app-lab-results',
  standalone: true,
  imports: [CommonModule],
  styleUrl: './lab-results.component.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './lab-results.component.html',
})
export class LabResultsComponent {
  @Input() referrals: LabResult[] = [];
}

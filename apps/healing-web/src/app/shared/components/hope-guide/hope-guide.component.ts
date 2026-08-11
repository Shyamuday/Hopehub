import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { HopeGuideService } from '../../../core/services/hope-guide.service';

@Component({
  selector: 'app-hope-guide',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './hope-guide.component.html',
  styleUrl: './hope-guide.component.scss',
})
export class HopeGuideComponent {
  readonly guide = inject(HopeGuideService);
}

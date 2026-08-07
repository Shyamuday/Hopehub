import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import {
  LISTENER_GUIDELINES_SECTIONS,
  LISTENER_GUIDELINES_VERSION,
} from '../../core/content/listener-guidelines.content';

@Component({
  selector: 'app-listener-guidelines',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './listener-guidelines.component.html',
  styleUrl: './listener-guidelines.component.scss',
})
export class ListenerGuidelinesComponent {
  readonly version = LISTENER_GUIDELINES_VERSION;
  readonly sections = LISTENER_GUIDELINES_SECTIONS;
}

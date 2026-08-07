import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import {
  LISTENER_TRAINING_MODULES,
  LISTENER_TRAINING_VERSION,
} from '../../core/content/listener-training.content';

@Component({
  selector: 'app-listener-training',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './listener-training.component.html',
  styleUrl: './listener-training.component.scss',
})
export class ListenerTrainingComponent {
  readonly version = LISTENER_TRAINING_VERSION;
  readonly modules = LISTENER_TRAINING_MODULES;
}

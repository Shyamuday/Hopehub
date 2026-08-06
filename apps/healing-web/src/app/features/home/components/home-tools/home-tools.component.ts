import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-home-tools',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './home-tools.component.html',
  styles: [
    `
      .hope-card > .hope-icon-box {
        display: none;
      }
    `,
  ],
})
export class HomeToolsComponent {}

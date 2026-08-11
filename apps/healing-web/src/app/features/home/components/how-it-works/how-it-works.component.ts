import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NOTE_CONTENT } from '../../../../core/constants/note-content.constants';
import { CONSUMER_UX_COPY } from '../../../../core/constants/consumer-ux-copy.constants';
import { CONSUMER_ROUTES } from '../../../../core/constants/consumer-routes.constants';

interface HowItWorksStep {
  title: string;
  description: string;
}

@Component({
  selector: 'app-how-it-works',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './how-it-works.component.html',
})
export class HowItWorksComponent {
  readonly notes = NOTE_CONTENT;
  readonly UX = CONSUMER_UX_COPY;
  readonly ROUTES = CONSUMER_ROUTES;
  readonly steps: HowItWorksStep[] = [
    {
      title: 'Choose support',
      description: 'Choose the concern, preferred mode, and a time that works for you.',
    },
    {
      title: 'We confirm',
      description: `The Hope Hub team checks the booking and confirms the right ${CONSUMER_UX_COPY.supportPath.genericRouteText}.`,
    },
    {
      title: 'Expert matched',
      description: 'A suitable Hope Hub care guide is assigned based on your concern.',
    },
    {
      title: 'Confirm slot',
      description: `Review the suggested ${CONSUMER_UX_COPY.supportPath.genericRouteText} and continue when you feel ready.`,
    },
    {
      title: 'Join session',
      description: 'Join the confirmed session or receive next steps through your chosen channel.',
    },
  ];
}

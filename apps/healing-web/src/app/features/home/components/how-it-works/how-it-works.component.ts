import { Component } from '@angular/core';

interface HowItWorksStep {
  title: string;
  description: string;
}

@Component({
  selector: 'app-how-it-works',
  standalone: true,
  templateUrl: './how-it-works.component.html',
})
export class HowItWorksComponent {
  readonly steps: HowItWorksStep[] = [
    {
      title: 'Submit request',
      description: 'Tell us the concern, preferred contact method, and a time that works for you.',
    },
    {
      title: 'We review',
      description: 'The Hope Hub team checks your request and routes it to the right support path.',
    },
    {
      title: 'Provider matched',
      description: 'A suitable provider or care team member is assigned based on your concern.',
    },
    {
      title: 'Confirm next step',
      description: 'Review the suggested support path and continue when you feel ready.',
    },
    {
      title: 'Get support',
      description: 'Join the confirmed session or receive next steps through your chosen channel.',
    },
  ];
}

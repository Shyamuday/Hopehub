import { Component, Input, output } from '@angular/core';
import { isStepComplete, type StepCompletionContext } from '@hopehub/homeopathy-approaches';
import type { ApproachStep, ApproachStepId } from '@hopehub/homeopathy-approaches';

@Component({
  selector: 'app-approach-stepper',
  templateUrl: './approach-stepper.html',
  styleUrl: './approach-stepper.scss',
})
export class ApproachStepperComponent {
  @Input({ required: true }) steps: ApproachStep[] = [];
  @Input({ required: true }) activeStepId: ApproachStepId = 'approach-select';
  @Input({ required: true }) completion: StepCompletionContext = {};

  readonly stepSelected = output<ApproachStepId>();

  activeIndex() {
    return Math.max(
      0,
      this.steps.findIndex((step) => step.id === this.activeStepId),
    );
  }

  activeStep() {
    return this.steps[this.activeIndex()] || this.steps[0] || null;
  }

  previousStep() {
    return this.steps[this.activeIndex() - 1] || null;
  }

  nextStep() {
    return this.steps[this.activeIndex() + 1] || null;
  }

  completedCount() {
    return this.steps.filter((step) => this.isDone(step)).length;
  }

  progressPercent() {
    if (!this.steps.length) return 0;
    return Math.round((this.completedCount() / this.steps.length) * 100);
  }

  isDone(step: ApproachStep) {
    return isStepComplete(step, this.completion);
  }

  isActive(step: ApproachStep) {
    return step.id === this.activeStepId;
  }

  select(step: ApproachStep) {
    this.stepSelected.emit(step.id);
  }

  selectPrevious() {
    const previous = this.previousStep();
    if (previous) this.select(previous);
  }

  selectNext() {
    const next = this.nextStep();
    if (next) this.select(next);
  }

  selectById(event: Event) {
    const stepId = (event.target as HTMLSelectElement).value as ApproachStepId;
    const step = this.steps.find((item) => item.id === stepId);
    if (step) this.select(step);
  }
}

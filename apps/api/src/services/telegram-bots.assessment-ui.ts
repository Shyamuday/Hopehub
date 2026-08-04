import type { AssessmentDefinitionRecord } from './assessment-definitions.js';
import { callbackRows } from './telegram-bots.ui.js';
import type { InlineButton } from './telegram-bots.types.js';

export function answerButtonRows(definition: AssessmentDefinitionRecord): InlineButton[][] {
  return callbackRows(
    definition.config.responseOptions.map((option) => ({
      text: option.label,
      callback_data: `assessment:answer:${option.value}`
    })),
    1
  );
}

export function assessmentNavRows(questionIndex: number): InlineButton[][] {
  return [
    [
      ...(questionIndex > 0 ? [{ text: 'Back', callback_data: 'assessment:back' }] : []),
      { text: 'Pause', callback_data: 'assessment:pause' }
    ]
  ];
}

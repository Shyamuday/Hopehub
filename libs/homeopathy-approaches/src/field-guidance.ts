import type { ApproachFieldDef } from './types';

export function fieldDoctorGuidanceLines(field: ApproachFieldDef): string[] {
  const lines: string[] = [];

  if (field.description) {
    lines.push(field.description);
  }
  if (field.hint) {
    lines.push(`Tip: ${field.hint}`);
  }
  if (field.placeholder) {
    lines.push(`Example: ${field.placeholder}`);
  }
  if (field.required) {
    lines.push('Required — fill this before moving to the next step.');
  }

  switch (field.suggestEndpoint) {
    case 'ai-extract-intake':
      lines.push('Click “From intake” to pull matching answers from the patient questionnaire.');
      break;
    case 'ai-complete':
      lines.push('Click “Suggest” to draft text from intake and fields already captured in this case.');
      break;
    case 'ai-extract-media':
      lines.push('Click “From photos” to use observations from clinical images on this case.');
      break;
    default:
      break;
  }

  if (field.rubricSearchable) {
    lines.push('After entering symptoms, use “Search rubrics” to jump to the repertory.');
  }

  if (!lines.length) {
    lines.push('Enter clinical notes relevant to this part of the case.');
  }

  return lines;
}

export function fieldDoctorGuidance(field: ApproachFieldDef): string {
  return fieldDoctorGuidanceLines(field).join('\n\n');
}

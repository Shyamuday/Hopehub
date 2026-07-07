import type { ApproachDataPayload } from './types';

export type PrescriptionHandoffPayload = {
  remedy: string;
  companionRemedy?: string;
  advice: string;
};

function joinParts(parts: Array<string | undefined | null>) {
  return parts.map((part) => part?.trim()).filter(Boolean).join('. ');
}

function field(data: Record<string, string> | undefined, key: string) {
  return data?.[key]?.trim() || '';
}

export function buildPrescriptionHandoff(
  approachData: ApproachDataPayload,
  options: {
    selectedRemedyName?: string | null;
    protocolPrimaryRemedy?: string | null;
    protocolCompanionRemedy?: string | null;
  } = {}
): PrescriptionHandoffPayload | null {
  const protocol = approachData.protocol;
  const organonLm = approachData.organonLm;
  const fibonacci = approachData.fibonacciPotency;
  const drainage = approachData.drainageSupport;
  const combination = approachData.combinationRemedy;
  const acute = approachData.acuteFastTrack;
  const tautopathy = approachData.tautopathyIsopathy;

  const remedy =
    options.selectedRemedyName?.trim() ||
    field(acute, 'selectedRemedy') ||
    field(combination, 'combinationName') ||
    protocol?.primaryRemedy?.trim() ||
    options.protocolPrimaryRemedy?.trim() ||
    '';

  if (!remedy) return null;

  const companionRemedy =
    field(drainage, 'supportRemedies') ||
    field(drainage, 'drainageRemedies') ||
    protocol?.companionRemedy?.trim() ||
    options.protocolCompanionRemedy?.trim() ||
    field(combination, 'componentRemedies') ||
    undefined;

  const advice = joinParts([
    organonLm
      ? joinParts([
          organonLm.selectedLmPotency ? `LM potency: ${organonLm.selectedLmPotency}` : '',
          organonLm.dilutionGlass ? `Dilution glass: ${organonLm.dilutionGlass}` : '',
          organonLm.repetitionSchedule ? `Schedule: ${organonLm.repetitionSchedule}` : '',
          organonLm.responseMonitoring ? `Monitor: ${organonLm.responseMonitoring}` : ''
        ])
      : '',
    fibonacci
      ? joinParts([
          field(fibonacci, 'startingPotency') ? `Starting potency: ${field(fibonacci, 'startingPotency')}` : '',
          field(fibonacci, 'fibonacciSequence') ? `Fibonacci sequence: ${field(fibonacci, 'fibonacciSequence')}` : '',
          field(fibonacci, 'doseInterval') ? `Interval: ${field(fibonacci, 'doseInterval')}` : '',
          field(fibonacci, 'responseCheckpoints') ? `Checkpoints: ${field(fibonacci, 'responseCheckpoints')}` : ''
        ])
      : '',
    field(acute, 'potencyPlan') ? `Acute potency plan: ${field(acute, 'potencyPlan')}` : '',
    tautopathy
      ? joinParts([
          field(tautopathy, 'causalSubstance') ? `Causal agent: ${field(tautopathy, 'causalSubstance')}` : '',
          field(tautopathy, 'potencyRationale') ? `Potency rationale: ${field(tautopathy, 'potencyRationale')}` : '',
          field(tautopathy, 'clearingPlan') ? `Clearing plan: ${field(tautopathy, 'clearingPlan')}` : ''
        ])
      : '',
    field(drainage, 'sequencingNotes') ? `Drainage sequencing: ${field(drainage, 'sequencingNotes')}` : '',
    field(combination, 'indicationMatch') ? `Indication match: ${field(combination, 'indicationMatch')}` : '',
    field(combination, 'durationPlan') ? `Duration: ${field(combination, 'durationPlan')}` : '',
    protocol?.personalizationNotes ? `Protocol notes: ${protocol.personalizationNotes}` : ''
  ]);

  return {
    remedy,
    companionRemedy: companionRemedy || undefined,
    advice
  };
}

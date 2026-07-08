import { APPROACH_DEFINITIONS, DEFAULT_APPROACH } from './approach-definitions';
import { normalizeMethodLabel } from './normalize-method-label';
import type { ApproachDefinition } from './types';

function aliasKeys(def: ApproachDefinition): string[] {
  return [
    def.methodNormalizedLabel,
    normalizeMethodLabel(def.title),
    def.title.trim().toLowerCase()
  ].filter(Boolean);
}

const byNormalizedLabel = new Map<string, ApproachDefinition>();
for (const def of APPROACH_DEFINITIONS) {
  for (const key of aliasKeys(def)) {
    byNormalizedLabel.set(key, def);
  }
}

export type MethodOptionRef = {
  label?: string | null;
  normalizedLabel?: string | null;
};

export function resolveApproachByMethodLabel(label?: string | null): ApproachDefinition {
  if (!label?.trim()) return DEFAULT_APPROACH;
  const normalized = normalizeMethodLabel(label);
  return (
    byNormalizedLabel.get(normalized) ||
    byNormalizedLabel.get(label.trim().toLowerCase()) ||
    DEFAULT_APPROACH
  );
}

/** Prefer DB `normalizedLabel`, then display `label`. */
export function resolveApproachByMethodOption(option?: MethodOptionRef | null): ApproachDefinition {
  if (!option) return DEFAULT_APPROACH;
  const stored = option.normalizedLabel?.trim().toLowerCase();
  if (stored && byNormalizedLabel.has(stored)) {
    return byNormalizedLabel.get(stored)!;
  }
  return resolveApproachByMethodLabel(option.label);
}

export function resolveApproachBySlug(slug?: string | null): ApproachDefinition {
  if (!slug?.trim()) return DEFAULT_APPROACH;
  return APPROACH_DEFINITIONS.find((item) => item.slug === slug) || DEFAULT_APPROACH;
}

export function allApproachDefinitions(): ApproachDefinition[] {
  return APPROACH_DEFINITIONS;
}

export function approachOptionsForSelect(): Array<{ slug: string; label: string; workflowKind: string }> {
  return APPROACH_DEFINITIONS.map((item) => ({
    slug: item.slug,
    label: item.title,
    workflowKind: item.workflowKind
  }));
}

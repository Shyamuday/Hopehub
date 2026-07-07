import { resolveApproachByMethodLabel, weightMultiplierForChapter } from '../lib/homeopathy-approaches.js';

export type WeightedRubricInput = {
  rubricId: string;
  weight: number;
  chapter?: string | null;
};

export function applyApproachRubricWeights(
  methodLabel: string | null | undefined,
  rubrics: WeightedRubricInput[]
) {
  const approach = resolveApproachByMethodLabel(methodLabel);
  return rubrics.map((item) => ({
    rubricId: item.rubricId,
    weight: Math.min(4, Math.max(1, Math.round(item.weight * weightMultiplierForChapter(approach, item.chapter))))
  }));
}

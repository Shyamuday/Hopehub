import { ASSESSMENT_CONFIGS, getAssessmentConfig } from './assessment-configs';

describe('assessment configs', () => {
  it('registers the added self-check assessments', () => {
    expect(getAssessmentConfig('panic-symptoms')?.title).toContain('Panic');
    expect(getAssessmentConfig('social-anxiety')?.title).toContain('Social Anxiety');
    expect(getAssessmentConfig('loneliness')?.title).toContain('Loneliness');
    expect(getAssessmentConfig('self-esteem')?.title).toContain('Self-Esteem');
    expect(getAssessmentConfig('anger-regulation')?.title).toContain('Anger');
    expect(getAssessmentConfig('grief-support')?.title).toContain('Grief');
  });

  it('keeps assessment ids unique', () => {
    const ids = ASSESSMENT_CONFIGS.map((assessment) => assessment.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has complete answer arrays and scoring ranges for every assessment', () => {
    for (const assessment of ASSESSMENT_CONFIGS) {
      expect(assessment.questions.length).toBeGreaterThan(0);
      expect(assessment.responseOptions.length).toBeGreaterThan(1);
      expect(assessment.scoring.length).toBeGreaterThan(0);

      const highestOption = assessment.responseOptions[assessment.responseOptions.length - 1].value;
      const maxScore = highestOption * assessment.questions.length;
      expect(assessment.scoring[0].min).toBe(0);
      expect(assessment.scoring[assessment.scoring.length - 1].max).toBe(maxScore);

      assessment.scoring.forEach((range, index) => {
        expect(range.min).toBeLessThanOrEqual(range.max);
        if (index > 0) {
          expect(range.min).toBe(assessment.scoring[index - 1].max + 1);
        }
      });
    }
  });
});

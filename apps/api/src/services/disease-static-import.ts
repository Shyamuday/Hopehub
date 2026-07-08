import type { StaticDiseasePageImport } from '../types/disease-public-page.js';

export async function loadStaticDiseasePageImports(): Promise<StaticDiseasePageImport[]> {
  const { diseaseInfos } = await import(
    '../../../user-web/src/app/disease/disease-info.constants.ts'
  );

  return diseaseInfos.map((info) => ({
    name: info.name,
    slug: info.slug,
    shortName: info.shortName,
    imageUrl: info.imageUrl,
    imageAlt: info.imageAlt,
    category: info.category,
    diseaseType: info.diseaseType,
    icdCode: info.icdCode,
    summary: info.summary,
    about: info.about,
    ourApproach: info.ourApproach,
    symptoms: info.symptoms,
    causes: info.causes,
    riskFactors: info.riskFactors,
    diagnosis: info.diagnosis,
    tests: info.tests,
    treatmentOptions: info.treatmentOptions,
    medications: info.medications,
    homeCare: info.homeCare,
    prevention: info.prevention,
    severityLevel: info.severityLevel,
    whenToSeeDoctor: info.whenToSeeDoctor,
    emergencySigns: info.emergencySigns,
    duration: info.duration,
    stages: info.stages,
    commonIn: info.commonIn,
    faq: info.faq,
    reviewedBy: info.reviewedBy,
    lastUpdated: info.lastUpdated,
    references: info.references,
    careApproach: info.careApproach,
    details: info.details,
    warning: info.warning,
    seo: info.seo
  }));
}

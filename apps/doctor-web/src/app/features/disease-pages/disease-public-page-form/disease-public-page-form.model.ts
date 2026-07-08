export type DiseaseFaqItem = { question: string; answer: string };

export type DiseasePublicPageForm = {
  publicDescription: string;
  publicImageUrl: string;
  seoTitle: string;
  seoDescription: string;
  publicFaq: DiseaseFaqItem[];
  shortName: string;
  imageAlt: string;
  category: string;
  diseaseType: string;
  icdCode: string;
  about: string;
  ourApproachTitle: string;
  ourApproachIntro: string;
  ourApproachPoints: string[];
  symptoms: string[];
  causes: string[];
  riskFactors: string[];
  diagnosis: string;
  tests: string[];
  treatmentAllopathy: string;
  treatmentAyurveda: string;
  treatmentHomeopathy: string;
  treatmentLifestyle: string;
  medications: string[];
  homeCare: string[];
  prevention: string[];
  severityLevel: string;
  whenToSeeDoctor: string;
  emergencySigns: string[];
  duration: string;
  stages: string[];
  commonInAgeGroup: string;
  commonInGender: string;
  reviewedBy: string;
  lastUpdated: string;
  references: string[];
  careApproach: string[];
  details: string[];
  warning: string;
};

export function emptyPublicPageForm(): DiseasePublicPageForm {
  return {
    publicDescription: '',
    publicImageUrl: '',
    seoTitle: '',
    seoDescription: '',
    publicFaq: [],
    shortName: '',
    imageAlt: '',
    category: '',
    diseaseType: '',
    icdCode: '',
    about: '',
    ourApproachTitle: '',
    ourApproachIntro: '',
    ourApproachPoints: [],
    symptoms: [],
    causes: [],
    riskFactors: [],
    diagnosis: '',
    tests: [],
    treatmentAllopathy: '',
    treatmentAyurveda: '',
    treatmentHomeopathy: '',
    treatmentLifestyle: '',
    medications: [],
    homeCare: [],
    prevention: [],
    severityLevel: '',
    whenToSeeDoctor: '',
    emergencySigns: [],
    duration: '',
    stages: [],
    commonInAgeGroup: '',
    commonInGender: '',
    reviewedBy: '',
    lastUpdated: '',
    references: [],
    careApproach: [],
    details: [],
    warning: ''
  };
}

export function publicPagePayloadToForm(payload: {
  publicDescription?: string | null;
  publicImageUrl?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  publicFaq?: DiseaseFaqItem[];
  publicPageContent?: Record<string, unknown> | null;
}): DiseasePublicPageForm {
  const content = payload.publicPageContent || {};
  const ourApproach = content['ourApproach'] as
    | { title?: string; intro?: string; points?: string[] }
    | undefined;
  const treatmentOptions = content['treatmentOptions'] as
    | { allopathy?: string; ayurveda?: string; homeopathy?: string; lifestyle?: string }
    | undefined;
  const commonIn = content['commonIn'] as { ageGroup?: string; gender?: string } | undefined;

  return {
    publicDescription: payload.publicDescription || '',
    publicImageUrl: payload.publicImageUrl || '',
    seoTitle: payload.seoTitle || '',
    seoDescription: payload.seoDescription || '',
    publicFaq: [...(payload.publicFaq || [])],
    shortName: (content['shortName'] as string) || '',
    imageAlt: (content['imageAlt'] as string) || '',
    category: (content['category'] as string) || '',
    diseaseType: (content['diseaseType'] as string) || '',
    icdCode: (content['icdCode'] as string) || '',
    about: (content['about'] as string) || '',
    ourApproachTitle: ourApproach?.title || '',
    ourApproachIntro: ourApproach?.intro || '',
    ourApproachPoints: [...(ourApproach?.points || [])],
    symptoms: [...((content['symptoms'] as string[]) || [])],
    causes: [...((content['causes'] as string[]) || [])],
    riskFactors: [...((content['riskFactors'] as string[]) || [])],
    diagnosis: (content['diagnosis'] as string) || '',
    tests: [...((content['tests'] as string[]) || [])],
    treatmentAllopathy: treatmentOptions?.allopathy || '',
    treatmentAyurveda: treatmentOptions?.ayurveda || '',
    treatmentHomeopathy: treatmentOptions?.homeopathy || '',
    treatmentLifestyle: treatmentOptions?.lifestyle || '',
    medications: [...((content['medications'] as string[]) || [])],
    homeCare: [...((content['homeCare'] as string[]) || [])],
    prevention: [...((content['prevention'] as string[]) || [])],
    severityLevel: (content['severityLevel'] as string) || '',
    whenToSeeDoctor: (content['whenToSeeDoctor'] as string) || '',
    emergencySigns: [...((content['emergencySigns'] as string[]) || [])],
    duration: (content['duration'] as string) || '',
    stages: [...((content['stages'] as string[]) || [])],
    commonInAgeGroup: commonIn?.ageGroup || '',
    commonInGender: commonIn?.gender || '',
    reviewedBy: (content['reviewedBy'] as string) || '',
    lastUpdated: (content['lastUpdated'] as string) || '',
    references: [...((content['references'] as string[]) || [])],
    careApproach: [...((content['careApproach'] as string[]) || [])],
    details: [...((content['details'] as string[]) || [])],
    warning: (content['warning'] as string) || ''
  };
}

export function publicPageFormToPayload(form: DiseasePublicPageForm) {
  const ourApproach =
    form.ourApproachTitle.trim() && form.ourApproachIntro.trim() && form.ourApproachPoints.length
      ? {
          title: form.ourApproachTitle.trim(),
          intro: form.ourApproachIntro.trim(),
          points: form.ourApproachPoints
        }
      : undefined;

  const treatmentOptions =
    form.treatmentAllopathy.trim() ||
    form.treatmentAyurveda.trim() ||
    form.treatmentHomeopathy.trim() ||
    form.treatmentLifestyle.trim()
      ? {
          allopathy: form.treatmentAllopathy.trim() || undefined,
          ayurveda: form.treatmentAyurveda.trim() || undefined,
          homeopathy: form.treatmentHomeopathy.trim() || undefined,
          lifestyle: form.treatmentLifestyle.trim() || undefined
        }
      : undefined;

  const commonIn =
    form.commonInAgeGroup.trim() || form.commonInGender.trim()
      ? {
          ageGroup: form.commonInAgeGroup.trim() || undefined,
          gender: form.commonInGender.trim() || undefined
        }
      : undefined;

  return {
    publicDescription: form.publicDescription.trim() || null,
    publicImageUrl: form.publicImageUrl.trim() || null,
    seoTitle: form.seoTitle.trim() || null,
    seoDescription: form.seoDescription.trim() || null,
    publicFaq: form.publicFaq,
    publicPageContent: {
      ...(form.shortName.trim() ? { shortName: form.shortName.trim() } : {}),
      ...(form.imageAlt.trim() ? { imageAlt: form.imageAlt.trim() } : {}),
      ...(form.category.trim() ? { category: form.category.trim() } : {}),
      ...(form.diseaseType.trim() ? { diseaseType: form.diseaseType.trim() } : {}),
      ...(form.icdCode.trim() ? { icdCode: form.icdCode.trim() } : {}),
      ...(form.about.trim() ? { about: form.about.trim() } : {}),
      ...(ourApproach ? { ourApproach } : {}),
      ...(form.symptoms.length ? { symptoms: form.symptoms } : {}),
      ...(form.causes.length ? { causes: form.causes } : {}),
      ...(form.riskFactors.length ? { riskFactors: form.riskFactors } : {}),
      ...(form.diagnosis.trim() ? { diagnosis: form.diagnosis.trim() } : {}),
      ...(form.tests.length ? { tests: form.tests } : {}),
      ...(treatmentOptions ? { treatmentOptions } : {}),
      ...(form.medications.length ? { medications: form.medications } : {}),
      ...(form.homeCare.length ? { homeCare: form.homeCare } : {}),
      ...(form.prevention.length ? { prevention: form.prevention } : {}),
      ...(form.severityLevel.trim() ? { severityLevel: form.severityLevel.trim() } : {}),
      ...(form.whenToSeeDoctor.trim() ? { whenToSeeDoctor: form.whenToSeeDoctor.trim() } : {}),
      ...(form.emergencySigns.length ? { emergencySigns: form.emergencySigns } : {}),
      ...(form.duration.trim() ? { duration: form.duration.trim() } : {}),
      ...(form.stages.length ? { stages: form.stages } : {}),
      ...(commonIn ? { commonIn } : {}),
      ...(form.reviewedBy.trim() ? { reviewedBy: form.reviewedBy.trim() } : {}),
      ...(form.lastUpdated.trim() ? { lastUpdated: form.lastUpdated.trim() } : {}),
      ...(form.references.length ? { references: form.references } : {}),
      ...(form.careApproach.length ? { careApproach: form.careApproach } : {}),
      ...(form.details.length ? { details: form.details } : {}),
      ...(form.warning.trim() ? { warning: form.warning.trim() } : {})
    }
  };
}

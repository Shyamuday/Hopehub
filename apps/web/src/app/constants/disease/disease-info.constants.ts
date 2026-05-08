import { chronicCareDiseaseInfo } from './chronic-care-disease-info.constants';
import { type DiseaseInfo } from '../../interfaces';
import { cardiovascularDiseaseInfo } from '../treatment-approach/cardiovascular-disease-info.constants';
import { chronicKidneyDiseaseInfo } from './chronic-kidney-disease-info.constants';
import { diabetesMellitusDiseaseInfo } from './diabetes-mellitus-disease-info.constants';
import { gallstoneDiseaseInfo } from './gallstone-disease-info.constants';
import { hairFallDiseaseInfo } from './hair-fall-disease-info.constants';
import { hypertensionDiseaseInfo } from './hypertension-disease-info.constants';
import { kidneyStoneDiseaseInfo } from './kidney-stone-disease-info.constants';
import { liverCirrhosisDiseaseInfo } from './liver-cirrhosis-disease-info.constants';
import { mentalHealthDiseaseInfo } from './mental-health-disease-info.constants';
import { musculoskeletalDiseaseInfo } from './musculoskeletal-disease-info.constants';
import { pilesDiseaseInfo } from './piles-disease-info.constants';
import { respiratoryDiseaseInfo } from './respiratory-disease-info.constants';
import { sexualHealthDiseaseInfo } from './sexual-health-disease-info.constants';
import { skinCareDiseaseInfo } from './skin-care-disease-info.constants';

const baseDiseases: DiseaseInfo[] = [
  kidneyStoneDiseaseInfo,
  hairFallDiseaseInfo,
  skinCareDiseaseInfo,
  chronicCareDiseaseInfo,
  cardiovascularDiseaseInfo,
  diabetesMellitusDiseaseInfo,
  hypertensionDiseaseInfo,
  musculoskeletalDiseaseInfo,
  respiratoryDiseaseInfo,
  chronicKidneyDiseaseInfo,
  gallstoneDiseaseInfo,
  liverCirrhosisDiseaseInfo,
  pilesDiseaseInfo,
  sexualHealthDiseaseInfo,
  mentalHealthDiseaseInfo
];

function buildDiseaseSeo(disease: DiseaseInfo): DiseaseInfo['seo'] {
  const defaultKeywords = [
    disease.name,
    `${disease.shortName} treatment`,
    `${disease.shortName} consultation`,
    'Vitalis Care and Research Centre',
    'online doctor consultation',
    'digital clinic',
    'chronic care',
    'homeopathy-led care'
  ];

  return {
    metaTitle: `${disease.name} Treatment | Vitalis Care and Research Centre`,
    metaDescription:
      disease.summary || disease.about || `Learn about ${disease.name} treatment and care approach at Vitalis Care and Research Centre.`,
    keywords: Array.from(new Set(defaultKeywords)),
    ogTitle: `${disease.name} Care | Vitalis Care and Research Centre`,
    ogDescription:
      disease.summary || `Doctor-led consultation and care approach for ${disease.name} at Vitalis Care and Research Centre.`,
    ogImage: disease.imageUrl,
    canonicalPath: `/treatments/${disease.slug}`
  };
}

export const diseaseInfos: DiseaseInfo[] = baseDiseases.map((disease) => ({
  ...disease,
  seo: {
    ...buildDiseaseSeo(disease),
    ...(disease.seo || {})
  }
}));

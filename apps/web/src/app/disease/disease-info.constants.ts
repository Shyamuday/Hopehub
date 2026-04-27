import { chronicCareDiseaseInfo } from '../constants/chronic-care-disease-info.constants';
import { DiseaseInfo } from '../models';
import { cardiovascularDiseaseInfo } from '../treatment-approach/cardiovascular-disease-info.constants';
import { chronicKidneyDiseaseInfo } from './chronic-kidney-disease-info.constants';
import { diabetesMellitusDiseaseInfo } from './diabetes-mellitus-disease-info.constants';
import { gallstoneDiseaseInfo } from './gallstone-disease-info.constants';
import { hairFallDiseaseInfo } from './hair-fall-disease-info.constants';
import { hypertensionDiseaseInfo } from './hypertension-disease-info.constants';
import { liverCirrhosisDiseaseInfo } from './liver-cirrhosis-disease-info.constants';
import { mentalHealthDiseaseInfo } from './mental-health-disease-info.constants';
import { musculoskeletalDiseaseInfo } from './musculoskeletal-disease-info.constants';
import { pilesDiseaseInfo } from './piles-disease-info.constants';
import { respiratoryDiseaseInfo } from './respiratory-disease-info.constants';
import { sexualHealthDiseaseInfo } from './sexual-health-disease-info.constants';
import { skinCareDiseaseInfo } from './skin-care-disease-info.constants';

export const diseaseInfos: DiseaseInfo[] = [
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

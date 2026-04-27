import { DiseaseInfo } from './models';
import { cardiovascularDiseaseInfo } from './cardiovascular-disease-info.constants';
import { chronicKidneyDiseaseInfo } from './chronic-kidney-disease-info.constants';
import { chronicCareDiseaseInfo } from './chronic-care-disease-info.constants';
import { diabetesMellitusDiseaseInfo } from './diabetes-mellitus-disease-info.constants';
import { hairFallDiseaseInfo } from './hair-fall-disease-info.constants';
import { hypertensionDiseaseInfo } from './hypertension-disease-info.constants';
import { musculoskeletalDiseaseInfo } from './musculoskeletal-disease-info.constants';
import { respiratoryDiseaseInfo } from './respiratory-disease-info.constants';
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
  chronicKidneyDiseaseInfo
];

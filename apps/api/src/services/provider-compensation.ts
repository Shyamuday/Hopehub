import { ProviderEarningModel, type Doctor } from '@prisma/client';

export type ProviderCompensationConfig = Pick<
  Doctor,
  | 'providerEarningModel'
  | 'consultationSharePercent'
  | 'providerFixedEarningInPaise'
  | 'platformFeePercent'
  | 'platformFixedFeeInPaise'
  | 'minimumProviderEarningInPaise'
  | 'maximumPlatformFeeInPaise'
>;

function clampInteger(value: unknown, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.round(Number(value) || 0)));
}

export function serializeProviderCompensation(config: ProviderCompensationConfig) {
  return {
    model: config.providerEarningModel,
    providerPercent: clampInteger(config.consultationSharePercent, 0, 100),
    providerFixedInPaise: Math.max(0, Math.round(config.providerFixedEarningInPaise || 0)),
    platformPercent: clampInteger(config.platformFeePercent, 0, 100),
    platformFixedInPaise: Math.max(0, Math.round(config.platformFixedFeeInPaise || 0)),
    minimumProviderInPaise:
      config.minimumProviderEarningInPaise == null
        ? null
        : Math.max(0, Math.round(config.minimumProviderEarningInPaise)),
    maximumPlatformInPaise:
      config.maximumPlatformFeeInPaise == null
        ? null
        : Math.max(0, Math.round(config.maximumPlatformFeeInPaise))
  };
}

export function compensationConfigFromSnapshot(
  value: unknown,
  fallback: ProviderCompensationConfig
): ProviderCompensationConfig {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fallback;
  const snapshot = value as Record<string, unknown>;
  const model = Object.values(ProviderEarningModel).includes(
    snapshot['model'] as ProviderEarningModel
  )
    ? (snapshot['model'] as ProviderEarningModel)
    : fallback.providerEarningModel;
  return {
    providerEarningModel: model,
    consultationSharePercent: Number(
      snapshot['providerPercent'] ?? fallback.consultationSharePercent
    ),
    providerFixedEarningInPaise: Number(
      snapshot['providerFixedInPaise'] ?? fallback.providerFixedEarningInPaise
    ),
    platformFeePercent: Number(snapshot['platformPercent'] ?? fallback.platformFeePercent),
    platformFixedFeeInPaise: Number(
      snapshot['platformFixedInPaise'] ?? fallback.platformFixedFeeInPaise
    ),
    minimumProviderEarningInPaise:
      snapshot['minimumProviderInPaise'] == null
        ? null
        : Number(snapshot['minimumProviderInPaise']),
    maximumPlatformFeeInPaise:
      snapshot['maximumPlatformInPaise'] == null ? null : Number(snapshot['maximumPlatformInPaise'])
  };
}

export function computeProviderCompensation(
  grossAmountInPaise: number,
  rawConfig: ProviderCompensationConfig
) {
  const gross = Math.max(0, Math.round(grossAmountInPaise || 0));
  const config = serializeProviderCompensation(rawConfig);
  let platformFeeInPaise = 0;
  let providerEarningInPaise = 0;
  let configuredPercent = 0;
  let configuredFixedInPaise = 0;

  switch (config.model) {
    case ProviderEarningModel.FIXED_PROVIDER_AMOUNT:
      configuredFixedInPaise = config.providerFixedInPaise;
      providerEarningInPaise = Math.min(gross, config.providerFixedInPaise);
      platformFeeInPaise = gross - providerEarningInPaise;
      break;
    case ProviderEarningModel.PLATFORM_PERCENTAGE:
      configuredPercent = config.platformPercent;
      platformFeeInPaise = Math.round((gross * config.platformPercent) / 100);
      providerEarningInPaise = gross - platformFeeInPaise;
      break;
    case ProviderEarningModel.FIXED_PLATFORM_FEE:
      configuredFixedInPaise = config.platformFixedInPaise;
      platformFeeInPaise = Math.min(gross, config.platformFixedInPaise);
      providerEarningInPaise = gross - platformFeeInPaise;
      break;
    case ProviderEarningModel.HYBRID_PLATFORM_FEE:
      configuredPercent = config.platformPercent;
      configuredFixedInPaise = config.platformFixedInPaise;
      platformFeeInPaise = Math.min(
        gross,
        Math.round((gross * config.platformPercent) / 100) + config.platformFixedInPaise
      );
      providerEarningInPaise = gross - platformFeeInPaise;
      break;
    case ProviderEarningModel.PROVIDER_PERCENTAGE:
    default:
      configuredPercent = config.providerPercent;
      providerEarningInPaise = Math.round((gross * config.providerPercent) / 100);
      platformFeeInPaise = gross - providerEarningInPaise;
      break;
  }

  if (config.maximumPlatformInPaise != null) {
    platformFeeInPaise = Math.min(platformFeeInPaise, config.maximumPlatformInPaise);
    providerEarningInPaise = gross - platformFeeInPaise;
  }
  if (config.minimumProviderInPaise != null && gross > 0) {
    providerEarningInPaise = Math.min(
      gross,
      Math.max(providerEarningInPaise, config.minimumProviderInPaise)
    );
    platformFeeInPaise = gross - providerEarningInPaise;
  }

  return {
    grossAmountInPaise: gross,
    providerEarningInPaise,
    platformFeeInPaise,
    effectiveProviderPercent: gross ? Math.round((providerEarningInPaise * 100) / gross) : 0,
    earningModel: config.model,
    configuredPercent,
    configuredFixedInPaise
  };
}

export const providerCompensationSelect = {
  providerEarningModel: true,
  consultationSharePercent: true,
  providerFixedEarningInPaise: true,
  platformFeePercent: true,
  platformFixedFeeInPaise: true,
  minimumProviderEarningInPaise: true,
  maximumPlatformFeeInPaise: true
} as const;

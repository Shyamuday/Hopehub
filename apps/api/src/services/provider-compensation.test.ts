import assert from 'node:assert/strict';
import test from 'node:test';
import { ProviderEarningModel } from '@prisma/client';
import {
  computeProviderCompensation,
  type ProviderCompensationConfig
} from './provider-compensation.js';

function config(
  model: ProviderEarningModel,
  overrides: Partial<ProviderCompensationConfig> = {}
): ProviderCompensationConfig {
  return {
    providerEarningModel: model,
    consultationSharePercent: 60,
    providerFixedEarningInPaise: 30_000,
    platformFeePercent: 25,
    platformFixedFeeInPaise: 5_000,
    minimumProviderEarningInPaise: null,
    maximumPlatformFeeInPaise: null,
    ...overrides
  };
}

test('provider percentage model splits the paid amount', () => {
  const result = computeProviderCompensation(
    100_000,
    config(ProviderEarningModel.PROVIDER_PERCENTAGE)
  );
  assert.equal(result.providerEarningInPaise, 60_000);
  assert.equal(result.platformFeeInPaise, 40_000);
});

test('fixed provider amount never exceeds the user payment', () => {
  const result = computeProviderCompensation(
    20_000,
    config(ProviderEarningModel.FIXED_PROVIDER_AMOUNT)
  );
  assert.equal(result.providerEarningInPaise, 20_000);
  assert.equal(result.platformFeeInPaise, 0);
});

test('hybrid platform fee combines percentage and fixed fee', () => {
  const result = computeProviderCompensation(
    100_000,
    config(ProviderEarningModel.HYBRID_PLATFORM_FEE)
  );
  assert.equal(result.platformFeeInPaise, 30_000);
  assert.equal(result.providerEarningInPaise, 70_000);
});

test('minimum provider and maximum platform protections are applied safely', () => {
  const result = computeProviderCompensation(
    100_000,
    config(ProviderEarningModel.PLATFORM_PERCENTAGE, {
      platformFeePercent: 80,
      minimumProviderEarningInPaise: 40_000,
      maximumPlatformFeeInPaise: 50_000
    })
  );
  assert.equal(result.providerEarningInPaise, 50_000);
  assert.equal(result.platformFeeInPaise, 50_000);
  assert.equal(result.providerEarningInPaise + result.platformFeeInPaise, 100_000);
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { assertRequestedPromoApplied, type ConsultationCheckoutQuote } from './checkout-pricing.js';

function quote(
  payableInPaise: number,
  promoCode: string | null = 'FIRSTCHAT'
): ConsultationCheckoutQuote {
  return {
    grossAmountInPaise: 9900,
    discountInPaise: 9900 - payableInPaise,
    walletRedeemedInPaise: 0,
    payableInPaise,
    walletBalanceInPaise: 0,
    maxWalletRedeemInPaise: 0,
    appliedRules: promoCode
      ? [
          {
            ruleId: 'rule-1',
            code: 'FIRSTCHAT_LISTENER_FREE',
            promoCode,
            name: 'First Chat free listener session',
            amountInPaise: 9900 - payableInPaise,
            valueType: 'CHECKOUT_DISCOUNT_PERCENT'
          }
        ]
      : []
  };
}

test('FIRSTCHAT is accepted only when the final payable amount is zero', () => {
  assert.doesNotThrow(() => assertRequestedPromoApplied('firstchat', quote(0)));
  assert.throws(
    () => assertRequestedPromoApplied('FIRSTCHAT', quote(100)),
    /must make this listener session free/
  );
});

test('a submitted coupon cannot silently fall back to full-price checkout', () => {
  assert.throws(
    () => assertRequestedPromoApplied('FIRSTCHAT', quote(9900, null)),
    /could not be applied/
  );
});

test('checkout without a coupon is unaffected', () => {
  assert.doesNotThrow(() => assertRequestedPromoApplied('', quote(9900, null)));
});

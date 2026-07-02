import { BillingPlanType } from '@prisma/client';

export const DEFAULT_BILLING_PLANS = [
  {
    code: 'ONE_TIME',
    name: 'One-Time Appointment',
    description: 'Single consultation with diagnosis, chat, and prescription follow-up.',
    planType: BillingPlanType.ONE_TIME_APPOINTMENT,
    priceInPaise: 150000,
    consultationsLimit: 1,
    sortOrder: 1
  },
  {
    code: 'STARTER_MONTHLY',
    name: 'Starter Monthly Plan',
    description: 'Monthly care plan with up to 3 consultations and follow-up support.',
    planType: BillingPlanType.STARTER_MONTHLY,
    priceInPaise: 350000,
    consultationsLimit: 3,
    sortOrder: 2
  },
  {
    code: 'CONTINUITY_QUARTERLY',
    name: 'Continuity Quarterly Plan',
    description: 'Quarterly continuity plan with up to 10 consultations and medicine adherence tracking.',
    planType: BillingPlanType.CONTINUITY_QUARTERLY,
    priceInPaise: 900000,
    consultationsLimit: 10,
    sortOrder: 3
  }
] as const;

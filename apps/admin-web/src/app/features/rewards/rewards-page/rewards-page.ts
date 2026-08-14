import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { AdminApi } from '../../../core/services/admin-api';
import { AdminCanDirective } from '../../../core/directives/admin-can.directive';
import { ADMIN_PERMISSIONS } from '../../../core/admin-permissions';

type RewardRule = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  kind: string;
  trigger: string;
  beneficiary: string;
  valueType: string;
  valueAmount: number;
  appliesTo: string;
  promoCode?: string | null;
  maxUsesPerPatient?: number | null;
  maxUsesGlobal?: number | null;
  maxDiscountInPaise?: number | null;
  minOrderInPaise?: number | null;
  minPayableInPaise: number;
  conditions?: Record<string, unknown> | null;
  isActive: boolean;
  priority: number;
};

const KINDS = ['REFERRAL', 'LOYALTY', 'PROMO', 'WELCOME', 'CUSTOM'];
const TRIGGERS = [
  'PATIENT_SIGNUP_WITH_REFERRAL',
  'FIRST_CONSULTATION_PAID',
  'CONSULTATION_PAID',
  'MEDICINE_ORDER_PAID',
  'MANUAL',
];
const BENEFICIARIES = ['REFERRER', 'REFERRED_PATIENT', 'PAYING_PATIENT'];
const VALUE_TYPES = ['WALLET_CREDIT_FLAT', 'CHECKOUT_DISCOUNT_FLAT', 'CHECKOUT_DISCOUNT_PERCENT'];
const APPLIES_TO = ['CONSULTATION', 'MEDICINE_DELIVERY', 'ANY'];
const TARGET_TYPES = [
  { value: 'ALL', label: 'All Hope Hub checkout' },
  { value: 'SERVICE', label: 'Service names' },
  { value: 'CARE_TEAM', label: 'Care-team service IDs' },
  { value: 'INDIVIDUAL', label: 'Individual/provider IDs' },
  { value: 'OFFERING', label: 'Package/offering IDs' },
  { value: 'ASSESSMENT', label: 'Assessment/test IDs' },
] as const;

function emptyRule() {
  return {
    code: '',
    name: '',
    description: '',
    kind: 'PROMO',
    trigger: 'CONSULTATION_PAID',
    beneficiary: 'PAYING_PATIENT',
    valueType: 'CHECKOUT_DISCOUNT_PERCENT',
    valueAmount: 10,
    appliesTo: 'CONSULTATION',
    promoCode: '',
    maxUsesPerPatient: 1 as number | '',
    maxUsesGlobal: '' as number | '',
    maxDiscountInPaise: '' as number | '',
    minOrderInPaise: '' as number | '',
    minPayableInPaise: 100,
    targetType: 'ALL',
    targetValues: '',
    showToConsumers: false,
    featured: false,
    publicLabel: '',
    publicDescription: '',
    isActive: true,
    priority: 10,
  };
}

function rupeesToPaise(v: number | '') {
  return v === '' ? null : Math.round(Number(v) * 100);
}

function paiseToRupees(p: number | null | undefined) {
  return p == null ? '' : (p / 100).toFixed(0);
}

function valueAmountToPayload(valueType: string, value: number | '') {
  const amount = Number(value) || 0;
  return valueType === 'CHECKOUT_DISCOUNT_PERCENT'
    ? Math.round(amount * 100)
    : Math.round(amount * 100);
}

function valueAmountFromRule(rule: RewardRule) {
  if (rule.valueType === 'CHECKOUT_DISCOUNT_PERCENT') return rule.valueAmount / 100;
  return Number(paiseToRupees(rule.valueAmount));
}

function targetValuesToList(value: string) {
  return value
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function targetConditions(targetType: string, targetValues: string) {
  const values = targetValuesToList(targetValues);
  if (targetType === 'ALL' || values.length === 0) return null;
  if (targetType === 'SERVICE') return { serviceNames: values };
  if (targetType === 'CARE_TEAM') return { careTeamServiceIds: values };
  if (targetType === 'INDIVIDUAL') return { providerIds: values };
  if (targetType === 'OFFERING') return { offeringIds: values };
  if (targetType === 'ASSESSMENT') return { assessmentIds: values };
  return null;
}

const TARGET_CONDITION_KEYS = [
  'serviceNames',
  'careTeamServiceIds',
  'providerIds',
  'offeringIds',
  'assessmentIds',
] as const;

function ruleConditions(
  model: ReturnType<typeof emptyRule>,
  existing?: Record<string, unknown> | null,
) {
  const conditions: Record<string, unknown> = { ...(existing ?? {}) };
  for (const key of TARGET_CONDITION_KEYS) delete conditions[key];
  Object.assign(conditions, targetConditions(model.targetType, model.targetValues) ?? {});

  if (model.showToConsumers) {
    conditions['showToConsumers'] = true;
    conditions['featured'] = model.featured;
    conditions['publicLabel'] = model.publicLabel.trim() || model.name.trim();
    conditions['publicDescription'] = model.publicDescription.trim() || model.description.trim();
  } else {
    delete conditions['showToConsumers'];
    delete conditions['featured'];
    delete conditions['publicLabel'];
    delete conditions['publicDescription'];
  }

  return Object.keys(conditions).length ? conditions : null;
}

function targetTypeFromConditions(conditions?: Record<string, unknown> | null) {
  if (!conditions) return 'ALL';
  if (Array.isArray(conditions['serviceNames'])) return 'SERVICE';
  if (Array.isArray(conditions['careTeamServiceIds'])) return 'CARE_TEAM';
  if (Array.isArray(conditions['providerIds'])) return 'INDIVIDUAL';
  if (Array.isArray(conditions['offeringIds'])) return 'OFFERING';
  if (Array.isArray(conditions['assessmentIds'])) return 'ASSESSMENT';
  return 'ALL';
}

function targetValuesFromConditions(conditions?: Record<string, unknown> | null) {
  if (!conditions) return '';
  const key = Array.isArray(conditions['serviceNames'])
    ? 'serviceNames'
    : Array.isArray(conditions['careTeamServiceIds'])
      ? 'careTeamServiceIds'
      : Array.isArray(conditions['providerIds'])
        ? 'providerIds'
        : Array.isArray(conditions['offeringIds'])
          ? 'offeringIds'
          : Array.isArray(conditions['assessmentIds'])
            ? 'assessmentIds'
            : '';
  return key ? (conditions[key] as unknown[]).map((item) => String(item)).join('\n') : '';
}

@Component({
  selector: 'app-rewards-page',
  imports: [CommonModule, FormField, AdminCanDirective],
  templateUrl: './rewards-page.html',
  styleUrl: './rewards-page.scss',
})
export class RewardsPage {
  readonly managePermissions = [
    ADMIN_PERMISSIONS.PAYMENTS_READ,
    ADMIN_PERMISSIONS.CATALOG_WRITE,
  ] as const;
  readonly rules = signal<RewardRule[]>([]);
  readonly referrals = signal<unknown[]>([]);
  readonly loading = signal(false);
  readonly mutating = signal(false);
  readonly error = signal('');
  readonly message = signal('');
  readonly tab = signal<'rules' | 'referrals'>('rules');

  readonly kinds = KINDS;
  readonly triggers = TRIGGERS;
  readonly beneficiaries = BENEFICIARIES;
  readonly valueTypes = VALUE_TYPES;
  readonly appliesToOptions = APPLIES_TO;
  readonly targetTypes = TARGET_TYPES;

  readonly createModel = signal(emptyRule());
  readonly createForm = form(this.createModel);
  editingId = signal<string | null>(null);
  readonly editModel = signal(emptyRule());
  readonly editForm = form(this.editModel);

  constructor(private readonly api: AdminApi) {
    void this.load();
  }

  async load() {
    this.loading.set(true);
    this.error.set('');
    try {
      const [rulesRes, refRes] = await Promise.all([
        this.api.listRewardRules(),
        this.api.listReferrals(30),
      ]);
      this.rules.set(rulesRes.rules as RewardRule[]);
      this.referrals.set(refRes.referrals);
    } catch {
      this.error.set('Could not load rewards data.');
    } finally {
      this.loading.set(false);
    }
  }

  private payloadFromModel(
    m: ReturnType<typeof emptyRule>,
    existingConditions?: Record<string, unknown> | null,
  ) {
    return {
      code: m.code,
      name: m.name,
      description: m.description || null,
      kind: m.kind,
      trigger: m.trigger,
      beneficiary: m.beneficiary,
      valueType: m.valueType,
      valueAmount: valueAmountToPayload(m.valueType, m.valueAmount),
      appliesTo: m.appliesTo,
      promoCode: m.promoCode?.trim() || null,
      maxUsesPerPatient: m.maxUsesPerPatient === '' ? null : Number(m.maxUsesPerPatient),
      maxUsesGlobal: m.maxUsesGlobal === '' ? null : Number(m.maxUsesGlobal),
      maxDiscountInPaise: rupeesToPaise(m.maxDiscountInPaise),
      minOrderInPaise: rupeesToPaise(m.minOrderInPaise),
      minPayableInPaise: Number(m.minPayableInPaise) || 100,
      conditions: ruleConditions(m, existingConditions),
      isActive: m.isActive,
      priority: Number(m.priority) || 0,
    };
  }

  async createRule() {
    this.mutating.set(true);
    this.error.set('');
    try {
      await this.api.createRewardRule(this.payloadFromModel(this.createModel()));
      this.createModel.set(emptyRule());
      this.message.set('Rule created.');
      await this.load();
    } catch {
      this.error.set('Could not create rule.');
    } finally {
      this.mutating.set(false);
    }
  }

  startEdit(rule: RewardRule) {
    this.editingId.set(rule.id);
    this.editModel.set({
      code: rule.code,
      name: rule.name,
      description: rule.description || '',
      kind: rule.kind,
      trigger: rule.trigger,
      beneficiary: rule.beneficiary,
      valueType: rule.valueType,
      valueAmount: valueAmountFromRule(rule),
      appliesTo: rule.appliesTo,
      promoCode: rule.promoCode || '',
      maxUsesPerPatient: rule.maxUsesPerPatient ?? '',
      maxUsesGlobal: rule.maxUsesGlobal ?? '',
      maxDiscountInPaise: paiseToRupees(rule.maxDiscountInPaise) as number | '',
      minOrderInPaise: paiseToRupees(rule.minOrderInPaise) as number | '',
      minPayableInPaise: rule.minPayableInPaise,
      targetType: targetTypeFromConditions(rule.conditions),
      targetValues: targetValuesFromConditions(rule.conditions),
      showToConsumers: rule.conditions?.['showToConsumers'] === true,
      featured: rule.conditions?.['featured'] === true,
      publicLabel:
        typeof rule.conditions?.['publicLabel'] === 'string' ? rule.conditions['publicLabel'] : '',
      publicDescription:
        typeof rule.conditions?.['publicDescription'] === 'string'
          ? rule.conditions['publicDescription']
          : '',
      isActive: rule.isActive,
      priority: rule.priority,
    });
  }

  cancelEdit() {
    this.editingId.set(null);
  }

  async saveEdit() {
    const id = this.editingId();
    if (!id) return;
    this.mutating.set(true);
    try {
      const existing = this.rules().find((rule) => rule.id === id);
      await this.api.updateRewardRule(
        id,
        this.payloadFromModel(this.editModel(), existing?.conditions),
      );
      this.editingId.set(null);
      this.message.set('Rule updated.');
      await this.load();
    } catch {
      this.error.set('Could not update rule.');
    } finally {
      this.mutating.set(false);
    }
  }

  async deleteRule(id: string) {
    if (!confirm('Delete this reward rule?')) return;
    this.mutating.set(true);
    try {
      await this.api.deleteRewardRule(id);
      this.message.set('Rule deleted.');
      await this.load();
    } catch {
      this.error.set('Could not delete rule.');
    } finally {
      this.mutating.set(false);
    }
  }

  formatValue(rule: RewardRule) {
    if (rule.valueType === 'CHECKOUT_DISCOUNT_PERCENT')
      return `${(rule.valueAmount / 100).toFixed(1)}%`;
    return `₹${(rule.valueAmount / 100).toFixed(0)}`;
  }

  valueAmountLabel(formValue: ReturnType<typeof emptyRule>) {
    if (formValue.valueType === 'CHECKOUT_DISCOUNT_PERCENT') return 'Discount percent';
    if (formValue.valueType === 'CHECKOUT_DISCOUNT_FLAT') return 'Discount amount (₹)';
    return 'Wallet credit amount (₹)';
  }

  valueAmountPlaceholder(formValue: ReturnType<typeof emptyRule>) {
    if (formValue.valueType === 'CHECKOUT_DISCOUNT_PERCENT') return '100 = free, 10 = 10% off';
    return 'Enter rupees, e.g. 99';
  }

  targetHint(formValue: ReturnType<typeof emptyRule>) {
    if (formValue.targetType === 'ALL') return 'Coupon works on all Hope Hub checkout.';
    if (formValue.targetType === 'SERVICE')
      return 'Enter exact service names, one per line or comma-separated.';
    if (formValue.targetType === 'CARE_TEAM') return 'Enter care-team service IDs.';
    if (formValue.targetType === 'INDIVIDUAL') return 'Enter provider/individual IDs.';
    if (formValue.targetType === 'OFFERING') return 'Enter Hope Hub offering/package IDs.';
    return 'Assessment coupons are mainly managed in Assessment Definitions; enter assessment IDs only if this rule is reused for assessment checkout.';
  }

  targetSummary(rule: RewardRule) {
    const type = targetTypeFromConditions(rule.conditions);
    const values = targetValuesFromConditions(rule.conditions);
    const label = this.targetTypes.find((item) => item.value === type)?.label || 'All';
    return values ? `${label}: ${values.split('\n').join(', ')}` : label;
  }

  isPublicOffer(rule: RewardRule) {
    return rule.conditions?.['showToConsumers'] === true;
  }
}

import type { ApiPricingRule, PricingRow } from '../../types/models';

function extractRows(payload: unknown): ApiPricingRule[] {
  if (Array.isArray(payload)) return payload;
  const p = payload as Record<string, unknown> | null;
  if (Array.isArray(p?.data)) return p!.data as ApiPricingRule[];
  if (Array.isArray(p?.items)) return p!.items as ApiPricingRule[];
  if (Array.isArray((p?.data as Record<string, unknown>)?.items)) return (p!.data as Record<string, unknown>).items as ApiPricingRule[];
  return [];
}

function toMoney(value: unknown): string {
  const n = Number(value);
  return Number.isFinite(n) ? `₹${n}` : '₹0';
}

export const PRICING_PATCH = {
  endpoints: {
    list: '/v1/admin/pricing',
    create: '/v1/admin/pricing',
    update: (id: string) => `/v1/admin/pricing/${encodeURIComponent(id)}`,
    remove: (id: string) => `/v1/admin/pricing/${encodeURIComponent(id)}`,
  },

  fromListPayload(payload: unknown): PricingRow[] {
    return extractRows(payload).map((row) => this.fromApiPricing(row));
  },

  fromApiPricing(raw: ApiPricingRule): PricingRow {
    const ruleType = raw.rule_type || 'per_minute';
    return {
      id: String(raw.id || ''),
      apiId: String(raw.id || ''),
      name: raw.rule_type ? `${raw.rule_type} rule` : 'Pricing Rule',
      type: ruleType === 'per_minute' ? 'Simple' : 'Advance',
      ruleType,
      subscriptionId: raw.subscription_id || '',
      minMinutes: Number(raw.min_minutes || 0),
      maxMinutes: Number(raw.max_minutes || 0),
      ratePerMinute: Number(raw.rate_per_minute || 0),
      flatCharge: Number(raw.flat_charge || 0),
      chargePercent: Number(raw.charge_percent || 0),
      bufferMinutes: Number(raw.buffer_minutes || 0),
      priority: Number(raw.priority || 0),
      status: raw.is_active === false ? 'Inactive' : 'Active',
      simpleRates: ruleType === 'per_minute' ? {
        weekday: { cancellation: toMoney(raw.flat_charge), perHr: toMoney((raw.rate_per_minute || 0) * 60) },
        weekend: { cancellation: toMoney(raw.flat_charge), perHr: toMoney((raw.rate_per_minute || 0) * 60) },
      } : undefined,
      advanceRates: ruleType !== 'per_minute' ? {
        weekday: { unlock: toMoney(raw.flat_charge), perMin: toMoney(raw.rate_per_minute), perHr: toMoney((raw.rate_per_minute || 0) * 60), base: toMoney(raw.flat_charge), waiting: '₹0' },
        weekend: { unlock: toMoney(raw.flat_charge), perMin: toMoney(raw.rate_per_minute), perHr: toMoney((raw.rate_per_minute || 0) * 60), base: toMoney(raw.flat_charge), waiting: '₹0' },
      } : undefined,
    };
  },

  toPayload(plan: Partial<PricingRow>): Record<string, unknown> {
    return {
      id: plan.apiId || plan.id || undefined,
      subscription_id: plan.subscriptionId || '',
      rule_type: plan.ruleType || 'per_minute',
      min_minutes: Number(plan.minMinutes) || 0,
      max_minutes: Number(plan.maxMinutes) || 0,
      rate_per_minute: Number(plan.ratePerMinute) || 0,
      flat_charge: Number(plan.flatCharge) || 0,
      charge_percent: Number(plan.chargePercent) || 0,
      buffer_minutes: Number(plan.bufferMinutes) || 0,
      priority: Number(plan.priority) || 0,
      is_active: plan.status !== 'Inactive',
    };
  },
};

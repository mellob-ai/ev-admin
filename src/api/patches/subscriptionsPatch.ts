import type { ApiSubscription, SubscriptionRow } from '../../types/models';

function extractRows(payload: unknown): ApiSubscription[] {
  if (Array.isArray(payload)) return payload;
  const p = payload as Record<string, unknown> | null;
  if (Array.isArray(p?.data)) return p!.data as ApiSubscription[];
  if (Array.isArray(p?.items)) return p!.items as ApiSubscription[];
  if (Array.isArray((p?.data as Record<string, unknown>)?.items)) return (p!.data as Record<string, unknown>).items as ApiSubscription[];
  return [];
}

function formatPrice(value: unknown): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return '₹0';
  return `₹${Math.round(n)}`;
}

export const SUBSCRIPTIONS_PATCH = {
  endpoints: {
    list: '/v1/admin/subscriptions',
    create: '/v1/admin/subscriptions',
    get: (id: string) => `/v1/admin/subscriptions/${encodeURIComponent(id)}`,
    update: '/v1/admin/subscriptions',
    remove: '/v1/admin/subscriptions',
    users: (id: string) => `/v1/admin/subscriptions/users/${encodeURIComponent(id)}`,
  },

  fromListPayload(payload: unknown): SubscriptionRow[] {
    return extractRows(payload).map((row) => this.fromApiPlan(row));
  },

  fromApiPlan(raw: ApiSubscription): SubscriptionRow {
    return {
      id: String(raw.id || ''),
      apiId: String(raw.id || ''),
      type: raw.pricing_model || raw.target_type || 'Subscription',
      name: raw.name || 'Plan',
      description: raw.description || '',
      price: formatPrice(raw.price),
      priceRaw: Number(raw.price || 0),
      validity: raw.duration_days ? `${raw.duration_days} days` : '30 days',
      validityDays: Number(raw.duration_days || 30),
      vehicles: Array.isArray(raw.included_modes) ? raw.included_modes : ['ev'],
      coins: Number(raw.coins_included || 0),
      daily: Number(raw.daily_time_limit_mins || 0),
      limit: Number(raw.daily_time_limit_mins || 30),
      status: raw.is_active === false ? 'Inactive' : 'Active',
      targetType: raw.target_type || 'public',
      organizationId: raw.organization_id || '',
      securityDeposit: Number(raw.security_deposit || 0),
      carryForwardCoins: Boolean(raw.carry_forward_coins),
      carryForwardTime: Boolean(raw.carry_forward_time),
      location: raw.location || '',
      features: Array.isArray(raw.features) ? raw.features : [],
      popular: Boolean(raw.popular),
    };
  },

  toPayload(plan: Partial<SubscriptionRow>): Record<string, unknown> {
    return {
      id: plan.apiId || plan.id || undefined,
      name: plan.name,
      description: plan.description || '',
      target_type: plan.targetType || 'public',
      pricing_model: plan.type || 'subscription',
      organization_id: plan.organizationId || '',
      price: Number(String(plan.price || '').replace(/[^\d.]/g, '')) || plan.priceRaw || 0,
      coins_included: Number(plan.coins) || 0,
      daily_time_limit_mins: Number(plan.daily || plan.limit) || 30,
      duration_days: Number(plan.validityDays) || 30,
      security_deposit: Number(plan.securityDeposit) || 0,
      carry_forward_coins: Boolean(plan.carryForwardCoins),
      carry_forward_time: Boolean(plan.carryForwardTime),
      location: plan.location || '',
      features: plan.features || [],
      included_modes: plan.vehicles || ['ev'],
      popular: Boolean(plan.popular),
      is_active: plan.status !== 'Inactive',
    };
  },
};

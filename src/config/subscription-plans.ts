export const SUBSCRIPTION_PLAN_SEED = [];

const STORAGE_KEY = 'mos.subscriptionPlans';

function normalizePlan(plan) {
  return {
    ...plan,
    type: plan?.type || 'Subscription',
    vehicles: Array.isArray(plan?.vehicles) ? plan.vehicles : [],
  };
}

export function loadSubscriptionPlans() {
  if (typeof window === 'undefined') return SUBSCRIPTION_PLAN_SEED;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return SUBSCRIPTION_PLAN_SEED;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? parsed.map(normalizePlan) : SUBSCRIPTION_PLAN_SEED;
  } catch {
    return SUBSCRIPTION_PLAN_SEED;
  }
}

export function saveSubscriptionPlans(plans) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
    window.dispatchEvent(new Event('mos:subscription-plans-updated'));
  } catch {
    return;
  }
}

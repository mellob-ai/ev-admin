import type { SubscriptionRow } from '../../types/models';
import { httpRequest } from '../httpClient';
import { SUBSCRIPTIONS_PATCH } from '../patches/subscriptionsPatch';

export async function listSubscriptions(query: Record<string, string> = {}): Promise<SubscriptionRow[]> {
  const payload = await httpRequest({ method: 'GET', path: SUBSCRIPTIONS_PATCH.endpoints.list, query });
  return SUBSCRIPTIONS_PATCH.fromListPayload(payload);
}

export async function getSubscription(id: string): Promise<SubscriptionRow> {
  const payload = await httpRequest({ method: 'GET', path: SUBSCRIPTIONS_PATCH.endpoints.get(id) });
  const row = (payload as Record<string, unknown>)?.data || payload;
  return SUBSCRIPTIONS_PATCH.fromApiPlan(row as Parameters<typeof SUBSCRIPTIONS_PATCH.fromApiPlan>[0]);
}

export async function createSubscription(plan: Partial<SubscriptionRow>): Promise<unknown> {
  return httpRequest({ method: 'POST', path: SUBSCRIPTIONS_PATCH.endpoints.create, body: SUBSCRIPTIONS_PATCH.toPayload(plan) });
}

export async function updateSubscription(plan: Partial<SubscriptionRow>): Promise<unknown> {
  return httpRequest({ method: 'PUT', path: SUBSCRIPTIONS_PATCH.endpoints.update, body: SUBSCRIPTIONS_PATCH.toPayload(plan) });
}

export async function deleteSubscription(plan: Partial<SubscriptionRow>): Promise<unknown> {
  // Backend DeleteSubscription reads the id from the query string (?id=...).
  return httpRequest({ method: 'DELETE', path: SUBSCRIPTIONS_PATCH.endpoints.remove, query: { id: String(plan.apiId || plan.id || '') } });
}

export async function getSubscriptionUsers(subId: string): Promise<unknown> {
  return httpRequest({ method: 'GET', path: SUBSCRIPTIONS_PATCH.endpoints.users(subId) });
}

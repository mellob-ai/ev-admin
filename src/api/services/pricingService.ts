import type { PricingRow } from '../../types/models';
import { httpRequest } from '../httpClient';
import { PRICING_PATCH } from '../patches/pricingPatch';

export async function listPricing(query: Record<string, string> = {}): Promise<PricingRow[]> {
  const payload = await httpRequest({ method: 'GET', path: PRICING_PATCH.endpoints.list, query });
  return PRICING_PATCH.fromListPayload(payload);
}

export async function createPricing(plan: Partial<PricingRow>): Promise<unknown> {
  return httpRequest({ method: 'POST', path: PRICING_PATCH.endpoints.create, body: PRICING_PATCH.toPayload(plan) });
}

export async function updatePricing(plan: Partial<PricingRow>): Promise<unknown> {
  const id = String(plan.apiId || plan.id || '');
  return httpRequest({ method: 'PUT', path: PRICING_PATCH.endpoints.update(id), body: PRICING_PATCH.toPayload(plan) });
}

export async function deletePricing(plan: Partial<PricingRow>): Promise<unknown> {
  const id = String(plan.apiId || plan.id || '');
  return httpRequest({ method: 'DELETE', path: PRICING_PATCH.endpoints.remove(id) });
}

import type { OrganizationRow } from '../../types/models';
import { httpRequest } from '../httpClient';
import { ORGANIZATIONS_PATCH } from '../patches/organizationsPatch';

export async function listOrganizations(query: Record<string, string> = {}): Promise<OrganizationRow[]> {
  const payload = await httpRequest({ method: 'GET', path: ORGANIZATIONS_PATCH.endpoints.list, query });
  return ORGANIZATIONS_PATCH.fromListPayload(payload);
}

export async function createOrganization(org: Partial<OrganizationRow>): Promise<unknown> {
  return httpRequest({ method: 'POST', path: ORGANIZATIONS_PATCH.endpoints.create, body: ORGANIZATIONS_PATCH.toPayload(org) });
}

export async function updateOrganization(org: Partial<OrganizationRow>): Promise<unknown> {
  return httpRequest({ method: 'PUT', path: ORGANIZATIONS_PATCH.endpoints.update, body: ORGANIZATIONS_PATCH.toPayload(org) });
}

export async function deleteOrganization(org: Partial<OrganizationRow>): Promise<unknown> {
  const id = String(org.apiId || org.id || '');
  return httpRequest({ method: 'DELETE', path: ORGANIZATIONS_PATCH.endpoints.remove(id) });
}

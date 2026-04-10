import type { ApiB2B, OrganizationRow } from '../../types/models';

function extractRows(payload: unknown): ApiB2B[] {
  if (Array.isArray(payload)) return payload;
  const p = payload as Record<string, unknown> | null;
  if (Array.isArray(p?.data)) return p!.data as ApiB2B[];
  if (Array.isArray(p?.items)) return p!.items as ApiB2B[];
  if (Array.isArray((p?.data as Record<string, unknown>)?.items)) return (p!.data as Record<string, unknown>).items as ApiB2B[];
  return [];
}

export const ORGANIZATIONS_PATCH = {
  endpoints: {
    list: '/v1/b2b',
    create: '/v1/b2b',
    get: (id: string) => `/v1/b2b/${encodeURIComponent(id)}`,
    update: '/v1/b2b',
    remove: (id: string) => `/v1/b2b/${encodeURIComponent(id)}`,
  },

  fromListPayload(payload: unknown): OrganizationRow[] {
    return extractRows(payload).map((raw) => this.fromApiOrg(raw));
  },

  fromApiOrg(raw: ApiB2B): OrganizationRow {
    return {
      id: String(raw.id || ''),
      apiId: String(raw.id || ''),
      name: raw.name || 'Unknown Organization',
      description: raw.description || '',
      city: raw.city || '',
      logo: raw.logo || '',
      banner: raw.banner || '',
      type: raw.type || 'general',
      status: raw.is_active === false ? 'Inactive' : 'Active',
      createdAt: raw.created_at || '',
    };
  },

  toPayload(org: Partial<OrganizationRow>): Record<string, unknown> {
    return {
      id: org.apiId || org.id || undefined,
      name: org.name,
      description: org.description || '',
      city: org.city || '',
      logo: org.logo || '',
      banner: org.banner || '',
      type: org.type || 'general',
      is_active: org.status !== 'Inactive',
    };
  },
};

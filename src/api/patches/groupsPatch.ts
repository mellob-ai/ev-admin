import type { ApiGroup, GroupRow } from '../../types/models';

function extractRows(payload: unknown): ApiGroup[] {
  if (Array.isArray(payload)) return payload;
  const p = payload as Record<string, unknown> | null;
  if (Array.isArray(p?.data)) return p!.data as ApiGroup[];
  if (Array.isArray(p?.items)) return p!.items as ApiGroup[];
  return [];
}

export const GROUPS_PATCH = {
  endpoints: {
    list: '/v1/admin/groups',
    get: (id: string) => `/v1/groups/${encodeURIComponent(id)}`,
    members: (id: string) => `/v1/groups/${encodeURIComponent(id)}/members`,
    membersData: (id: string) => `/v1/groups/${encodeURIComponent(id)}/members/data`,
  },

  fromListPayload(payload: unknown): GroupRow[] {
    return extractRows(payload).map((raw) => this.fromApiGroup(raw));
  },

  fromApiGroup(raw: ApiGroup): GroupRow {
    return {
      id: String(raw.id || ''),
      apiId: String(raw.id || ''),
      name: raw.name || 'Unnamed Group',
      description: raw.description || '',
      category: raw.category || 'Campus',
      visibility: raw.visibility || 'public',
      createdAt: raw.created_at || '',
      createdBy: raw.created_by || '',
      groupImage: raw.group_image || '',
      memberCount: Number(raw.member_count || 0),
    };
  },
};

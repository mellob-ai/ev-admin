import type { ApiUser, UserRow } from '../../types/models';

function extractRows(payload: unknown): ApiUser[] {
  if (Array.isArray(payload)) return payload;
  const p = payload as Record<string, unknown> | null;
  if (Array.isArray(p?.data)) return p!.data as ApiUser[];
  if (Array.isArray(p?.items)) return p!.items as ApiUser[];
  if (Array.isArray((p?.data as Record<string, unknown>)?.items)) return (p!.data as Record<string, unknown>).items as ApiUser[];
  return [];
}

function normalizedStatus(value: unknown): string {
  const raw = String(value || '').toLowerCase();
  return raw === 'inactive' || raw === 'blocked' ? 'Blocked' : 'Active';
}

function normalizedRole(value: unknown): string {
  const raw = String(value || '').toLowerCase();
  if (raw === 'admin') return 'Admin';
  if (raw === 'driver') return 'Driver';
  if (raw === 'staff') return 'Staff';
  return 'Viewer';
}

export const USERS_PATCH = {
  endpoints: {
    list: '/v1/admin/users',
    create: '/v1/admin/users',
    get: (uid: string) => `/v1/admin/users/${encodeURIComponent(uid)}`,
    update: (uid: string) => `/v1/admin/users/${encodeURIComponent(uid)}`,
    remove: '/v1/admin/users',
    block: (uid: string) => `/v1/admin/users/${encodeURIComponent(uid)}/block`,
    unblock: (uid: string) => `/v1/admin/users/${encodeURIComponent(uid)}/unblock`,
    addCoins: (uid: string) => `/v1/admin/users/${encodeURIComponent(uid)}/coins`,
    addWalletBalance: (uid: string) => `/v1/admin/users/${encodeURIComponent(uid)}/wallet`,
  },

  fromListPayload(payload: unknown): UserRow[] {
    return extractRows(payload).map((row) => this.fromApiUser(row));
  },

  fromApiUser(raw: ApiUser): UserRow {
    const firstName = raw.first_name || '';
    const lastName = raw.last_name || '';
    return {
      id: String(raw.uid || ''),
      apiId: String(raw.uid || ''),
      empId: '',
      name: [firstName, lastName].filter(Boolean).join(' ') || 'Unknown User',
      phone: raw.phone || '',
      email: raw.email || '',
      avatar: raw.avatar || '',
      role: normalizedRole(raw.type),
      status: normalizedStatus(raw.status || 'active'),
      joined: raw.created_at ? new Date(raw.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A',
      businessType: 'B2C',
      orgType: raw.organization_id ? 'B2B' : 'Individual',
      orgName: raw.organization_id || 'Independent',
      organizationId: raw.organization_id || '',
      wallet: '₹0',
      coins: 0,
      rides: 0,
      activeRides: 0,
      completedRides: 0,
      cancelledRides: 0,
      subscriptions: [],
      groups: [],
      location: 'N/A',
      achievements: [],
      weight: raw.weight || '70',
      points: Number(raw.points || 0),
    };
  },

  toCreatePayload(form: Record<string, unknown>, context: Record<string, unknown> = {}): Record<string, unknown> {
    const nameParts = String(form.name || '').split(' ');
    return {
      first_name: nameParts[0] || '',
      last_name: nameParts.slice(1).join(' ') || '',
      phone: form.phone || context.phone || '',
      email: form.email || '',
      type: String(form.role || 'user').toLowerCase(),
      organization_id: form.organizationId || '',
    };
  },

  toUpdatePayload(user: Record<string, unknown>): Record<string, unknown> {
    const nameParts = String(user.name || '').split(' ');
    return {
      first_name: nameParts[0] || '',
      last_name: nameParts.slice(1).join(' ') || '',
      phone: user.phone || '',
      email: user.email || '',
      type: String(user.role || 'user').toLowerCase(),
      organization_id: user.organizationId || '',
    };
  },

  toDeletePayload(user: Record<string, unknown>): Record<string, unknown> {
    return { phone: user.phone || '' };
  },
} as const;

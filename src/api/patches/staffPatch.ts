import type { ApiUser, StaffRow } from '../../types/models';

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
  return raw === 'inactive' || raw === 'blocked' ? 'inactive' : 'active';
}

function normalizedRole(value: unknown): string {
  const raw = String(value || '').toLowerCase();
  if (raw === 'driver') return 'driver';
  if (raw === 'admin') return 'admin';
  if (raw === 'staff') return 'staff';
  return 'manager';
}

export const STAFF_PATCH = {
  endpoints: {
    list: '/v1/admin/users',
    create: '/v1/auth/register',
    update: (uid: string) => `/v1/admin/users/${encodeURIComponent(uid)}`,
    remove: '/v1/admin/users',
  },

  staffTypes: ['staff', 'admin', 'driver', 'manager', 'operator'] as const,

  fromListPayload(payload: unknown): StaffRow[] {
    const allUsers = extractRows(payload);
    const staffUsers = allUsers.filter((u) => {
      const uType = String(u.type || '').toLowerCase();
      return (this.staffTypes as readonly string[]).includes(uType);
    });
    return staffUsers.map((row) => this.fromApiStaff(row));
  },

  fromApiStaff(raw: ApiUser): StaffRow {
    const firstName = raw.first_name || '';
    const lastName = raw.last_name || '';
    return {
      id: String(raw.uid || ''),
      staff_id: raw.uid || '',
      name: [firstName, lastName].filter(Boolean).join(' ') || 'Unknown Staff',
      phone: raw.phone || '',
      email: raw.email || '',
      role: normalizedRole(raw.type),
      status: normalizedStatus(raw.status || 'active'),
      assigned_business_type: '',
      assigned_organization_id: raw.organization_id || '',
      assigned_location_id: '',
      created_at: raw.created_at || new Date().toISOString(),
      updated_at: raw.created_at || new Date().toISOString(),
      apiId: String(raw.uid || ''),
    };
  },

  toCreatePayload(staff: Partial<StaffRow>): Record<string, unknown> {
    const nameParts = (staff.name || '').split(' ');
    return {
      first_name: nameParts[0] || '',
      last_name: nameParts.slice(1).join(' ') || '',
      phone: staff.phone || '',
      email: staff.email || '',
      type: normalizedRole(staff.role),
      organization_id: staff.assigned_organization_id || '',
    };
  },

  toUpdatePayload(staff: Partial<StaffRow>): Record<string, unknown> {
    return this.toCreatePayload(staff);
  },
};

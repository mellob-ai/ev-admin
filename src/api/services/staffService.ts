import type { StaffRow } from '../../types/models';
import { httpRequest } from '../httpClient';
import { STAFF_PATCH } from '../patches/staffPatch';

export async function listStaff(query: Record<string, string> = {}): Promise<StaffRow[]> {
  const payload = await httpRequest({ method: 'GET', path: STAFF_PATCH.endpoints.list, query });
  return STAFF_PATCH.fromListPayload(payload);
}

export async function createStaff(staff: Partial<StaffRow>): Promise<unknown> {
  return httpRequest({ method: 'POST', path: STAFF_PATCH.endpoints.create, body: STAFF_PATCH.toCreatePayload(staff) });
}

export async function updateStaff(staff: Partial<StaffRow>): Promise<unknown> {
  const uid = String(staff.apiId || staff.id || '');
  return httpRequest({ method: 'PUT', path: STAFF_PATCH.endpoints.update(uid), body: STAFF_PATCH.toUpdatePayload(staff) });
}

export async function deleteStaff(staff: Partial<StaffRow>): Promise<unknown> {
  return httpRequest({ method: 'DELETE', path: STAFF_PATCH.endpoints.remove, body: { phone: staff.phone } });
}

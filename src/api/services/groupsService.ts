import type { GroupRow } from '../../types/models';
import { httpRequest } from '../httpClient';
import { GROUPS_PATCH } from '../patches/groupsPatch';

export async function listGroups(query: Record<string, string> = {}): Promise<GroupRow[]> {
  const payload = await httpRequest({ method: 'GET', path: GROUPS_PATCH.endpoints.list, query });
  return GROUPS_PATCH.fromListPayload(payload);
}

export async function getGroupMembers(groupId: string): Promise<unknown[]> {
  const payload = await httpRequest({ method: 'GET', path: GROUPS_PATCH.endpoints.members(groupId) });
  return ((payload as Record<string, unknown>)?.data || []) as unknown[];
}

export async function getGroupMembersData(groupId: string): Promise<unknown[]> {
  const payload = await httpRequest({ method: 'GET', path: GROUPS_PATCH.endpoints.membersData(groupId) });
  return ((payload as Record<string, unknown>)?.data || []) as unknown[];
}

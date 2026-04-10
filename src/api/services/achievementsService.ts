import type { AchievementRow } from '../../types/models';
import { httpRequest } from '../httpClient';
import { ACHIEVEMENTS_PATCH } from '../patches/achievementsPatch';

export async function listAchievements(): Promise<AchievementRow[]> {
  const payload = await httpRequest({ method: 'GET', path: ACHIEVEMENTS_PATCH.endpoints.list });
  return ACHIEVEMENTS_PATCH.fromListPayload(payload);
}

export async function createAchievement(row: Partial<AchievementRow>): Promise<unknown> {
  return httpRequest({ method: 'POST', path: ACHIEVEMENTS_PATCH.endpoints.create, body: ACHIEVEMENTS_PATCH.toPayload(row) });
}

export async function updateAchievement(row: Partial<AchievementRow>): Promise<unknown> {
  const id = String(row.apiId || row.id || '');
  return httpRequest({ method: 'PUT', path: ACHIEVEMENTS_PATCH.endpoints.update(id), body: ACHIEVEMENTS_PATCH.toPayload(row) });
}

export async function deleteAchievement(row: Partial<AchievementRow>): Promise<unknown> {
  const id = String(row.apiId || row.id || '');
  return httpRequest({ method: 'DELETE', path: ACHIEVEMENTS_PATCH.endpoints.remove(id) });
}

import type { AchievementRow } from '../../types/models';

function extractRows(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) return payload;
  const p = payload as Record<string, unknown> | null;
  if (Array.isArray(p?.data)) return p!.data as Record<string, unknown>[];
  return [];
}

export const ACHIEVEMENTS_PATCH = {
  endpoints: {
    list: '/v1/admin/achievements',
    create: '/v1/admin/achievements',
    update: (id: string) => `/v1/admin/achievements/${encodeURIComponent(id)}`,
    remove: (id: string) => `/v1/admin/achievements/${encodeURIComponent(id)}`,
  },

  fromListPayload(payload: unknown): AchievementRow[] {
    return extractRows(payload).map((row) => this.fromApiAchievement(row));
  },

  fromApiAchievement(raw: Record<string, unknown>): AchievementRow {
    return {
      id: String(raw.id || ''),
      apiId: String(raw.id || ''),
      title: String(raw.title || ''),
      description: String(raw.description || ''),
      category: String(raw.category || ''),
      icon: String(raw.icon || 'fa-trophy'),
      colorHex: String(raw.color_hex || '#00a877'),
      thresholdLabel: String(raw.threshold_label || ''),
      active: Boolean(raw.active),
    };
  },

  toPayload(row: Partial<AchievementRow>): Record<string, unknown> {
    return {
      id: row.apiId || row.id || '',
      title: row.title || '',
      description: row.description || '',
      category: row.category || '',
      icon: row.icon || 'fa-trophy',
      color_hex: row.colorHex || '#00a877',
      threshold_label: row.thresholdLabel || '',
      active: row.active ?? true,
    };
  },
};

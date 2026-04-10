import { create } from 'zustand';
import type { DashboardStats } from '../types/models';
import { isApiIntegrationEnabled } from '../api/runtime';
import { getDashboardStats as fetchStats } from '../api/services/dashboardService';

interface DashboardState {
  stats: DashboardStats | null;
  loading: boolean;
  error: string | null;
  fetchStats: () => Promise<void>;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  stats: null,
  loading: false,
  error: null,

  fetchStats: async () => {
    if (!isApiIntegrationEnabled()) return;
    set({ loading: true, error: null });
    try {
      const stats = await fetchStats();
      set({ stats, loading: false });
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  },
}));

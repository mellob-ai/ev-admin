import { create } from 'zustand';
import type { GroupRow } from '../types/models';
import { isApiIntegrationEnabled } from '../api/runtime';
import * as api from '../api/services/groupsService';

interface GroupsState {
  groups: GroupRow[];
  loading: boolean;
  error: string | null;
  fetchGroups: () => Promise<void>;
  setGroups: (groups: GroupRow[]) => void;
}

export const useGroupsStore = create<GroupsState>((set) => ({
  groups: [],
  loading: false,
  error: null,

  fetchGroups: async () => {
    if (!isApiIntegrationEnabled()) return;
    set({ loading: true, error: null });
    try {
      const groups = await api.listGroups();
      set({ groups, loading: false });
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  },

  setGroups: (groups) => set({ groups }),
}));

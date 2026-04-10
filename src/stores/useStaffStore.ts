import { create } from 'zustand';
import type { StaffRow } from '../types/models';
import { isApiIntegrationEnabled } from '../api/runtime';
import * as api from '../api/services/staffService';

interface StaffState {
  staff: StaffRow[];
  loading: boolean;
  error: string | null;
  fetchStaff: () => Promise<void>;
  createStaff: (s: Partial<StaffRow>) => Promise<void>;
  updateStaff: (s: Partial<StaffRow>) => Promise<void>;
  deleteStaff: (s: Partial<StaffRow>) => Promise<void>;
  setStaff: (staff: StaffRow[]) => void;
}

export const useStaffStore = create<StaffState>((set, get) => ({
  staff: [],
  loading: false,
  error: null,

  fetchStaff: async () => {
    if (!isApiIntegrationEnabled()) return;
    set({ loading: true, error: null });
    try {
      const staff = await api.listStaff();
      set({ staff, loading: false });
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  },

  createStaff: async (s) => { await api.createStaff(s); await get().fetchStaff(); },
  updateStaff: async (s) => { await api.updateStaff(s); await get().fetchStaff(); },
  deleteStaff: async (s) => { await api.deleteStaff(s); await get().fetchStaff(); },
  setStaff: (staff) => set({ staff }),
}));

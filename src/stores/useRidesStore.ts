import { create } from 'zustand';
import type { RideRow } from '../types/models';
import { isApiIntegrationEnabled } from '../api/runtime';
import * as api from '../api/services/ridesService';

interface RidesState {
  rides: RideRow[];
  loading: boolean;
  error: string | null;
  fetchRides: () => Promise<void>;
  setRides: (rides: RideRow[]) => void;
}

export const useRidesStore = create<RidesState>((set) => ({
  rides: [],
  loading: false,
  error: null,

  fetchRides: async () => {
    if (!isApiIntegrationEnabled()) return;
    set({ loading: true, error: null });
    try {
      const rides = await api.listRides();
      set({ rides, loading: false });
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  },

  setRides: (rides) => set({ rides }),
}));

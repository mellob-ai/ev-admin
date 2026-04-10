import { create } from 'zustand';
import type { TripRow } from '../types/models';
import { isApiIntegrationEnabled } from '../api/runtime';
import * as api from '../api/services/tripsService';

interface TripsState {
  trips: TripRow[];
  loading: boolean;
  error: string | null;
  fetchTrips: () => Promise<void>;
  setTrips: (trips: TripRow[]) => void;
}

export const useTripsStore = create<TripsState>((set) => ({
  trips: [],
  loading: false,
  error: null,

  fetchTrips: async () => {
    if (!isApiIntegrationEnabled()) return;
    set({ loading: true, error: null });
    try {
      const trips = await api.listTrips();
      set({ trips, loading: false });
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  },

  setTrips: (trips) => set({ trips }),
}));

import { create } from 'zustand';
import type { StationRow } from '../types/models';
import { isApiIntegrationEnabled } from '../api/runtime';
import * as api from '../api/services/locationsService';

interface LocationsState {
  locations: StationRow[];
  loading: boolean;
  error: string | null;
  fetchLocations: () => Promise<void>;
  createLocation: (station: Partial<StationRow>) => Promise<void>;
  updateLocation: (station: Partial<StationRow>) => Promise<void>;
  deleteLocation: (station: Partial<StationRow>) => Promise<void>;
  setLocations: (locations: StationRow[]) => void;
}

export const useLocationsStore = create<LocationsState>((set, get) => ({
  locations: [],
  loading: false,
  error: null,

  fetchLocations: async () => {
    if (!isApiIntegrationEnabled()) return;
    set({ loading: true, error: null });
    try {
      const locations = await api.listLocations();
      set({ locations, loading: false });
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  },

  createLocation: async (station) => { await api.createLocation(station); await get().fetchLocations(); },
  updateLocation: async (station) => { await api.updateLocation(station); await get().fetchLocations(); },
  deleteLocation: async (station) => { await api.deleteLocation(station); await get().fetchLocations(); },
  setLocations: (locations) => set({ locations }),
}));

import { create } from 'zustand';
import type { VehicleRow } from '../types/models';
import { isApiIntegrationEnabled } from '../api/runtime';
import * as api from '../api/services/vehiclesService';

interface VehiclesState {
  vehicles: VehicleRow[];
  loading: boolean;
  error: string | null;
  fetchVehicles: () => Promise<void>;
  createVehicle: (row: Partial<VehicleRow>) => Promise<void>;
  updateVehicle: (row: Partial<VehicleRow>) => Promise<void>;
  deleteVehicle: (row: Partial<VehicleRow>) => Promise<void>;
  setVehicles: (vehicles: VehicleRow[]) => void;
}

export const useVehiclesStore = create<VehiclesState>((set, get) => ({
  vehicles: [],
  loading: false,
  error: null,

  fetchVehicles: async () => {
    if (!isApiIntegrationEnabled()) return;
    set({ loading: true, error: null });
    try {
      const vehicles = await api.listVehicles();
      set({ vehicles, loading: false });
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  },

  createVehicle: async (row) => { await api.createVehicle(row); await get().fetchVehicles(); },
  updateVehicle: async (row) => { await api.updateVehicle(row); await get().fetchVehicles(); },
  deleteVehicle: async (row) => { await api.deleteVehicle(row); await get().fetchVehicles(); },
  setVehicles: (vehicles) => set({ vehicles }),
}));

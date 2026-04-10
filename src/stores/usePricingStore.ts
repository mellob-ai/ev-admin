import { create } from 'zustand';
import type { PricingRow } from '../types/models';
import { isApiIntegrationEnabled } from '../api/runtime';
import * as api from '../api/services/pricingService';

interface PricingState {
  rules: PricingRow[];
  loading: boolean;
  error: string | null;
  fetchPricing: () => Promise<void>;
  createRule: (rule: Partial<PricingRow>) => Promise<void>;
  updateRule: (rule: Partial<PricingRow>) => Promise<void>;
  deleteRule: (rule: Partial<PricingRow>) => Promise<void>;
  setRules: (rules: PricingRow[]) => void;
}

export const usePricingStore = create<PricingState>((set, get) => ({
  rules: [],
  loading: false,
  error: null,

  fetchPricing: async () => {
    if (!isApiIntegrationEnabled()) return;
    set({ loading: true, error: null });
    try {
      const rules = await api.listPricing();
      set({ rules, loading: false });
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  },

  createRule: async (rule) => { await api.createPricing(rule); await get().fetchPricing(); },
  updateRule: async (rule) => { await api.updatePricing(rule); await get().fetchPricing(); },
  deleteRule: async (rule) => { await api.deletePricing(rule); await get().fetchPricing(); },
  setRules: (rules) => set({ rules }),
}));

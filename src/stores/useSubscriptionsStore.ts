import { create } from 'zustand';
import type { SubscriptionRow } from '../types/models';
import { isApiIntegrationEnabled } from '../api/runtime';
import * as api from '../api/services/subscriptionsService';

interface SubscriptionsState {
  subscriptions: SubscriptionRow[];
  loading: boolean;
  error: string | null;
  fetchSubscriptions: () => Promise<void>;
  createSubscription: (plan: Partial<SubscriptionRow>) => Promise<void>;
  updateSubscription: (plan: Partial<SubscriptionRow>) => Promise<void>;
  deleteSubscription: (plan: Partial<SubscriptionRow>) => Promise<void>;
  setSubscriptions: (plans: SubscriptionRow[]) => void;
}

export const useSubscriptionsStore = create<SubscriptionsState>((set, get) => ({
  subscriptions: [],
  loading: false,
  error: null,

  fetchSubscriptions: async () => {
    if (!isApiIntegrationEnabled()) return;
    set({ loading: true, error: null });
    try {
      const subscriptions = await api.listSubscriptions();
      set({ subscriptions, loading: false });
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  },

  createSubscription: async (plan) => { await api.createSubscription(plan); await get().fetchSubscriptions(); },
  updateSubscription: async (plan) => { await api.updateSubscription(plan); await get().fetchSubscriptions(); },
  deleteSubscription: async (plan) => { await api.deleteSubscription(plan); await get().fetchSubscriptions(); },
  setSubscriptions: (plans) => set({ subscriptions: plans }),
}));

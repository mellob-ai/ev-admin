import { create } from 'zustand';
import type { WalletRow, TransactionRow } from '../types/models';
import { isApiIntegrationEnabled } from '../api/runtime';
import * as api from '../api/services/walletService';

interface WalletState {
  wallets: WalletRow[];
  transactions: TransactionRow[];
  loading: boolean;
  error: string | null;
  fetchWallets: () => Promise<void>;
  fetchTransactions: () => Promise<void>;
}

export const useWalletStore = create<WalletState>((set) => ({
  wallets: [],
  transactions: [],
  loading: false,
  error: null,

  fetchWallets: async () => {
    if (!isApiIntegrationEnabled()) return;
    set({ loading: true, error: null });
    try {
      const wallets = await api.listWallets();
      set({ wallets, loading: false });
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  },

  fetchTransactions: async () => {
    if (!isApiIntegrationEnabled()) return;
    set({ loading: true, error: null });
    try {
      const transactions = await api.listTransactions();
      set({ transactions, loading: false });
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  },
}));

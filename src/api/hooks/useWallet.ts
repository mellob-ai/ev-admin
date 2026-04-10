import { useQuery } from '@tanstack/react-query';
import { listWallets, listTransactions } from '../services/walletService';

export const walletKeys = {
  all: ['wallet'] as const,
  wallets: () => [...walletKeys.all, 'wallets'] as const,
  transactions: () => [...walletKeys.all, 'transactions'] as const,
};

export function useWallets() {
  return useQuery({
    queryKey: walletKeys.wallets(),
    queryFn: () => listWallets(),
  });
}

export function useTransactions() {
  return useQuery({
    queryKey: walletKeys.transactions(),
    queryFn: () => listTransactions(),
  });
}

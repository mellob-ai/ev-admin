import type { ApiWallet, ApiTransaction, WalletRow, TransactionRow } from '../../types/models';

function extractRows<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload;
  const p = payload as Record<string, unknown> | null;
  if (Array.isArray(p?.data)) return p!.data as T[];
  if (Array.isArray(p?.items)) return p!.items as T[];
  return [];
}

export const WALLET_PATCH = {
  endpoints: {
    wallets: '/v1/admin/wallets',
    transactions: '/v1/admin/transactions',
  },

  fromWalletsPayload(payload: unknown): WalletRow[] {
    return extractRows<ApiWallet>(payload).map((raw) => ({
      userId: raw.user_id || '',
      balance: Number(raw.balance || 0),
      balanceLabel: `₹${Number(raw.balance || 0).toFixed(2)}`,
    }));
  },

  fromTransactionsPayload(payload: unknown): TransactionRow[] {
    return extractRows<ApiTransaction>(payload).map((raw) => ({
      id: String(raw.id || ''),
      userId: raw.user_id || '',
      amount: Number(raw.amount || 0),
      amountLabel: `₹${Number(raw.amount || 0).toFixed(2)}`,
      description: raw.description || '',
      type: raw.type || 'CREDIT',
      timestamp: raw.timestamp || '',
      dateLabel: raw.timestamp ? new Date(raw.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '',
    }));
  },
};

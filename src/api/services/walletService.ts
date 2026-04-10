import type { WalletRow, TransactionRow } from '../../types/models';
import { httpRequest } from '../httpClient';
import { WALLET_PATCH } from '../patches/walletPatch';

export async function listWallets(query: Record<string, string> = {}): Promise<WalletRow[]> {
  const payload = await httpRequest({ method: 'GET', path: WALLET_PATCH.endpoints.wallets, query });
  return WALLET_PATCH.fromWalletsPayload(payload);
}

export async function listTransactions(query: Record<string, string> = {}): Promise<TransactionRow[]> {
  const payload = await httpRequest({ method: 'GET', path: WALLET_PATCH.endpoints.transactions, query });
  return WALLET_PATCH.fromTransactionsPayload(payload);
}

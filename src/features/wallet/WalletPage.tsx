import { useEffect, useMemo, useState } from 'react';
import { useFilterPanel, FilterPanel } from '../../components/ColumnFilter';
import { downloadCsv, timestampSlug } from '../../utils/clientActions';
import { buildWalletData, loadStoredUsers } from '../../utils/usageData';
import { isApiIntegrationEnabled } from '../../api/runtime';
import { listWallets, listTransactions } from '../../api/services/walletService';

const WALLET = buildWalletData(loadStoredUsers());

const COLUMNS = [
  { key: 'id',      label: 'User ID',          type: 'text' },
  { key: 'name',    label: 'Name',             type: 'text' },
  { key: 'balance', label: 'Wallet Balance',   type: 'text' },
  { key: 'pending', label: 'Pending Refund',   type: 'text' },
  { key: 'last',    label: 'Last Transaction', type: 'text' },
  { key: 'status',  label: 'Status' },
];

export default function WalletPage() {
  const [walletRows, setWalletRows] = useState(WALLET);
  const fp = useFilterPanel();

  // Overlay real wallet balances (and last-transaction dates) from the API,
  // falling back to the locally-derived rows if the API is unavailable/empty.
  useEffect(() => {
    if (!isApiIntegrationEnabled()) return;
    let mounted = true;
    Promise.all([listWallets(), listTransactions().catch(() => [])])
      .then(([wallets, txns]) => {
        if (!mounted || !wallets?.length) return;
        const latest: Record<string, { date: string; ts: string }> = {};
        for (const t of txns) {
          if (!t.userId || !t.timestamp) continue;
          if (!latest[t.userId] || t.timestamp > latest[t.userId].ts) {
            latest[t.userId] = { date: t.dateLabel, ts: t.timestamp };
          }
        }
        setWalletRows(wallets.map((w) => ({
          id: w.userId,
          name: '—',
          balance: w.balanceLabel,
          pending: '₹0',
          last: latest[w.userId]?.date || '—',
          status: 'Cleared',
        })));
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);
  const visible = useMemo(() => walletRows.filter((w) => COLUMNS.every((c) => fp.match(c.key, w[c.key]))), [walletRows, fp.filters]);

  const summary = useMemo(() => {
    const parseAmount = (value) => Number(String(value).replace(/[^\d.-]/g, '') || 0);
    const totalBalances = visible.reduce((sum, row) => sum + parseAmount(row.balance), 0);
    const pendingRefunds = visible.reduce((sum, row) => sum + parseAmount(row.pending), 0);
    const disputed = visible.filter((row) => row.status === 'Disputed').reduce((sum, row) => sum + parseAmount(row.pending), 0);
    const cleared = visible.filter((row) => row.status === 'Cleared').reduce((sum, row) => sum + parseAmount(row.balance), 0);
    const formatCurrency = (value) => `₹${value.toLocaleString('en-IN')}`;
    return {
      totalBalances: formatCurrency(totalBalances),
      pendingRefunds: formatCurrency(pendingRefunds),
      disputed: formatCurrency(disputed),
      cleared: formatCurrency(cleared),
    };
  }, [visible]);

  const handleRefund = (id) => {
    setWalletRows((current) => current.map((row) => (
      row.id === id
        ? { ...row, pending: '₹0', status: 'Cleared', last: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }
        : row
    )));
  };

  const handleExport = () => {
    downloadCsv(timestampSlug('wallet-ledger') + '.csv', visible.map((row) => ({
      userId: row.id,
      name: row.name,
      balance: row.balance,
      pendingRefund: row.pending,
      lastTransaction: row.last,
      status: row.status,
    })));
  };

  const badgeClass = (status) => {
    if (status === 'Cleared') return 'border-emerald-300 bg-emerald-50 text-emerald-700';
    if (status === 'Pending') return 'border-amber-300 bg-amber-50 text-amber-700';
    return 'border-rose-300 bg-rose-50 text-rose-700';
  };

  return (
    <section className="page active" id="page-wallet">

      {/* Hero */}
      <div className="page-hero ph-wallet">
        <div className="page-hero-left">
          <div className="page-hero-icon" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}><i className="fa fa-wallet"></i></div>
          <div className="page-hero-text">
            <h1>Wallet &amp; Refund Ops</h1>
            <p>Monitor balances, pending reimbursements, and settlement flow across all mobility users.</p>
          </div>
        </div>
        <div className="page-hero-right">
          <div className="page-hero-chips">
            <span className="page-hero-chip"><i className="fa fa-users"></i> {visible.length} Accounts</span>
            <span className="page-hero-chip"><i className="fa fa-rotate-left"></i> {summary.pendingRefunds} Pending</span>
          </div>
          <button className="btn-outline" onClick={handleExport}><i className="fa fa-file-export"></i> Export CSV</button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid" style={{ marginTop: 'var(--grid-gap)' }}>
        <div className="kpi-card">
          <div className="kpi-info">
            <span className="kpi-label">Total Balances</span>
            <strong className="kpi-value">{summary.totalBalances}</strong>
            <span className="kpi-sub">Across all wallets</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-info">
            <span className="kpi-label">Pending Refunds</span>
            <strong className="kpi-value">{summary.pendingRefunds}</strong>
            <span className="kpi-sub">Awaiting processing</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-info">
            <span className="kpi-label">Disputed</span>
            <strong className="kpi-value">{summary.disputed}</strong>
            <span className="kpi-sub">Under review</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-info">
            <span className="kpi-label">Cleared</span>
            <strong className="kpi-value">{summary.cleared}</strong>
            <span className="kpi-sub">Settled</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-info">
            <span className="kpi-label">Platform Float</span>
            <strong className="kpi-value">₹0</strong>
            <span className="kpi-sub">Operational reserve</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-info">
            <span className="kpi-label">Escrow Reserve</span>
            <strong className="kpi-value">₹0</strong>
            <span className="kpi-sub">Protected balance</span>
          </div>
        </div>
      </div>

      {/* Full Ledger Table */}
      <div className="table-card" style={{ marginTop: 'var(--grid-gap)' }}>
        <div className="table-card-header">
          <div>
            <div className="table-card-title">Wallet Ledger</div>
            <div className="table-card-subtitle">Full view of user balances, refund status, and settlement actions.</div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <button className={`btn-outline${fp.anyFiltered ? ' filter-btn-active' : ''}`} onClick={() => fp.setOpen(true)}>
              <i className="fa fa-filter"></i> Filter{fp.anyFiltered ? ` (${fp.filterCount})` : ''}
            </button>
            <button className="btn-outline" onClick={handleExport}><i className="fa fa-file-export"></i> Export</button>
          </div>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>User ID</th>
                <th>Name</th>
                <th>Wallet Balance</th>
                <th>Pending Refund</th>
                <th>Last Transaction</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((w) => (
                <tr key={w.id}>
                  <td><span style={{ fontFamily: 'monospace', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-3)' }}>{w.id}</span></td>
                  <td><strong style={{ color: 'var(--text-1)', fontWeight: 600 }}>{w.name}</strong></td>
                  <td><strong style={{ color: 'var(--text-1)' }}>{w.balance}</strong></td>
                  <td>{w.pending}</td>
                  <td style={{ color: 'var(--text-3)', fontSize: '0.84rem' }}>{w.last}</td>
                  <td>
                    {w.status === 'Cleared' && <span className="status completed">Cleared</span>}
                    {w.status === 'Pending' && <span className="status pending">Pending</span>}
                    {w.status === 'Disputed' && <span className="status cancelled">Disputed</span>}
                  </td>
                  <td>
                    {w.status !== 'Cleared' ? (
                      <button
                        className="btn-outline"
                        style={{ fontSize: '0.76rem', padding: '4px 10px' }}
                        onClick={() => handleRefund(w.id)}
                      >
                        <i className="fa fa-rotate-left"></i> Refund
                      </button>
                    ) : (
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>No action</span>
                    )}
                  </td>
                </tr>
              ))}
              {!visible.length && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-3)', fontSize: '0.84rem' }}>No wallet records match the current filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <FilterPanel hook={fp} columns={COLUMNS} data={walletRows} />
      </div>

    </section>
  );
}

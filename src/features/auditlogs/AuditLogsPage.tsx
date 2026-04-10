import { useMemo } from 'react';
import { useFilterPanel, FilterPanel } from '../../components/ColumnFilter';
import { downloadCsv, timestampSlug } from '../../utils/clientActions';
import { maskIp } from '../../utils/safety';
const LOGS = [
  { ts: 'Apr 5, 2026 09:14', user: 'admin@mos.in',      action: 'Admin login',                  module: 'Auth',          ip: '192.168.1.42',  result: 'Success' },
  { ts: 'Apr 5, 2026 09:18', user: 'admin@mos.in',      action: 'User approved',                module: 'Users',         ip: '192.168.1.42',  result: 'Success' },
  { ts: 'Apr 5, 2026 09:25', user: 'admin@mos.in',      action: 'Vehicle status updated',       module: 'Vehicles',      ip: '192.168.1.42',  result: 'Success' },
  { ts: 'Apr 5, 2026 10:02', user: 'admin@mos.in',      action: 'Pricing plan created',         module: 'Pricing',       ip: '192.168.1.42',  result: 'Success' },
  { ts: 'Apr 5, 2026 10:15', user: 'admin@mos.in',      action: 'Organization added',           module: 'Organizations', ip: '192.168.1.42',  result: 'Success' },
  { ts: 'Apr 4, 2026 11:43', user: 'unknown',           action: 'Failed login attempt',         module: 'Auth',          ip: '45.33.12.99',   result: 'Failed'  },
  { ts: 'Apr 4, 2026 14:05', user: 'admin@mos.in',      action: 'Subscription plan updated',    module: 'Subscriptions', ip: '203.145.72.18', result: 'Success' },
  { ts: 'Apr 4, 2026 14:22', user: 'admin@mos.in',      action: 'Staff member added',           module: 'Staff',         ip: '203.145.72.18', result: 'Success' },
  { ts: 'Apr 4, 2026 15:10', user: 'admin@mos.in',      action: 'Location zone edited',         module: 'Locations',     ip: '203.145.72.18', result: 'Success' },
  { ts: 'Apr 4, 2026 16:33', user: 'admin@mos.in',      action: 'Group created',                module: 'Groups',        ip: '203.145.72.18', result: 'Success' },
  { ts: 'Apr 3, 2026 09:05', user: 'admin@mos.in',      action: 'Admin login',                  module: 'Auth',          ip: '192.168.1.42',  result: 'Success' },
  { ts: 'Apr 3, 2026 09:30', user: 'admin@mos.in',      action: 'Bulk user import',             module: 'Users',         ip: '192.168.1.42',  result: 'Success' },
  { ts: 'Apr 3, 2026 10:45', user: 'admin@mos.in',      action: 'Ride flagged for review',      module: 'Rides',         ip: '192.168.1.42',  result: 'Success' },
  { ts: 'Apr 3, 2026 11:58', user: 'admin@mos.in',      action: 'Wallet refund processed',      module: 'Wallet',        ip: '192.168.1.42',  result: 'Success' },
  { ts: 'Apr 3, 2026 14:15', user: 'admin@mos.in',      action: 'API key rotated',              module: 'API',           ip: '192.168.1.42',  result: 'Success' },
  { ts: 'Apr 2, 2026 08:30', user: 'admin@mos.in',      action: 'Admin login',                  module: 'Auth',          ip: '192.168.1.42',  result: 'Success' },
  { ts: 'Apr 2, 2026 09:12', user: 'admin@mos.in',      action: 'Settings updated',             module: 'Settings',      ip: '192.168.1.42',  result: 'Success' },
  { ts: 'Apr 2, 2026 11:04', user: 'admin@mos.in',      action: 'Report exported',              module: 'Reports',       ip: '192.168.1.42',  result: 'Success' },
  { ts: 'Apr 1, 2026 09:02', user: 'admin@mos.in',      action: 'Admin login',                  module: 'Auth',          ip: '10.0.0.8',      result: 'Success' },
  { ts: 'Apr 1, 2026 10:30', user: 'admin@mos.in',      action: 'Achievement unlocked for user',module: 'Achievements',  ip: '10.0.0.8',      result: 'Success' },
  { ts: 'Mar 31, 2026 07:55',user: 'unknown',           action: 'Failed login attempt',         module: 'Auth',          ip: '198.51.100.77', result: 'Failed'  },
  { ts: 'Mar 31, 2026 16:20',user: 'admin@mos.in',      action: 'Pricing plan deactivated',     module: 'Pricing',       ip: '192.168.1.42',  result: 'Success' },
  { ts: 'Mar 30, 2026 10:00',user: 'admin@mos.in',      action: 'Vehicle batch assigned',       module: 'Vehicles',      ip: '192.168.1.42',  result: 'Success' },
];

const COLUMNS = [
  { key: 'ts',     label: 'Timestamp',  type: 'text' },
  { key: 'user',   label: 'User',       type: 'text' },
  { key: 'action', label: 'Action',     type: 'text' },
  { key: 'module', label: 'Module' },
  { key: 'ip',     label: 'IP Address', type: 'text' },
  { key: 'result', label: 'Result' },
];

export default function AuditLogsPage() {
  const fp = useFilterPanel();
  const visible = useMemo(() => LOGS.filter((l) => COLUMNS.every((c) => fp.match(c.key, l[c.key]))), [fp.filters]);
  const failedCount = useMemo(() => LOGS.filter((l) => l.result === 'Failed').length, []);
  const handleExport = () => {
    downloadCsv(timestampSlug('audit-logs') + '.csv', visible.map((row) => ({
      timestamp: row.ts,
      user: row.user,
      action: row.action,
      module: row.module,
      ipAddress: row.ip,
      result: row.result,
    })));
  };

  return (
    <section className="page active" id="page-audit-logs">
      <div className="page-hero ph-audit">
        <div className="page-hero-left">
          <div className="page-hero-icon"><i className="fa fa-terminal"></i></div>
          <div className="page-hero-text">
            <h1>Audit Logs</h1>
            <p>Complete tamper-evident trail of all admin actions and system events</p>
          </div>
        </div>
        <div className="page-hero-right">
          <div className="page-hero-chips">
            <span className="page-hero-chip"><i className="fa fa-list-check"></i> {LOGS.length} Events</span>
            <span className="page-hero-chip" style={{ color:'#ff5f57', borderColor:'rgba(255,95,87,0.28)', background:'rgba(255,95,87,0.09)' }}><i className="fa fa-circle-exclamation"></i> {failedCount} Failed</span>
          </div>
          <button className={`btn-outline${fp.anyFiltered ? ' filter-btn-active' : ''}`} onClick={() => fp.setOpen(true)}>
            <i className="fa fa-filter"></i> Filter{fp.anyFiltered ? ` (${fp.filterCount})` : ''}
          </button>
          <button className="btn-outline" onClick={handleExport}><i className="fa fa-file-export"></i> Export</button>
        </div>
      </div>

      <div className="audit-terminal">
        <div className="audit-terminal-bar">
          <span className="audit-dot audit-dot-r"></span>
          <span className="audit-dot audit-dot-y"></span>
          <span className="audit-dot audit-dot-g"></span>
          <span className="audit-terminal-title">mjollnir-audit-log — /var/log/admin/audit.log — {visible.length} records</span>
        </div>
        <div className="audit-terminal-body">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr><th>Timestamp</th><th>User</th><th>Action</th><th>Module</th><th>IP Address</th><th>Result</th></tr>
              </thead>
              <tbody>
                {visible.map((l) => (
                  <tr key={`${l.ts}-${l.user}-${l.action}`}>
                    <td><span className="audit-ts">{l.ts}</span></td>
                    <td style={{ color:'var(--text-1)' }}>{l.user}</td>
                    <td style={{ color:'var(--text-1)' }}>{l.action}</td>
                    <td><span className="audit-module-badge">{l.module}</span></td>
                    <td><span className="audit-ip">{maskIp(l.ip)}</span></td>
                    <td><span className={l.result === 'Success' ? 'audit-ok' : 'audit-fail'}>{l.result}</span></td>
                  </tr>
                ))}
                {!visible.length && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-3)', padding: '18px 0', fontSize: '0.82rem' }}>
                      No logs match the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <FilterPanel hook={fp} columns={COLUMNS} data={LOGS} />
    </section>
  );
}

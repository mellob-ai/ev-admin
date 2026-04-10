import { useState, useMemo } from 'react';
import { useFilterPanel, FilterPanel } from '../../components/ColumnFilter';
import Modal from '../../components/Modal';
import { isStrongPassword, maskIp } from '../../utils/safety';

const SESSIONS = [
  { device: 'Chrome 124 — macOS Sonoma',  ip: '192.168.1.42',  location: 'Bengaluru, IN',  started: 'Apr 5, 2026, 09:14 AM' },
  { device: 'Safari 17 — iPhone 15 Pro',  ip: '10.0.0.8',      location: 'Hyderabad, IN', started: 'Apr 5, 2026, 08:58 AM' },
  { device: 'Edge 123 — Windows 11',      ip: '203.145.72.18', location: 'Delhi, IN',      started: 'Apr 4, 2026, 06:22 PM' },
];

const LOGINS = [
  { ts: 'Apr 5, 2026  09:14 AM', ip: '192.168.1.42',   device: 'Chrome 124 / macOS', result: 'Success' },
  { ts: 'Apr 5, 2026  08:58 AM', ip: '10.0.0.8',       device: 'Safari 17 / iOS',    result: 'Success' },
  { ts: 'Apr 4, 2026  11:43 PM', ip: '45.33.12.99',    device: 'Unknown / Linux',    result: 'Failed'  },
  { ts: 'Apr 4, 2026  06:22 PM', ip: '203.145.72.18',  device: 'Edge 123 / Windows', result: 'Success' },
  { ts: 'Apr 3, 2026  10:05 AM', ip: '192.168.1.42',   device: 'Chrome 124 / macOS', result: 'Success' },
  { ts: 'Apr 2, 2026  08:30 AM', ip: '192.168.1.42',   device: 'Chrome 124 / macOS', result: 'Success' },
  { ts: 'Apr 1, 2026  09:02 AM', ip: '10.0.0.8',       device: 'Safari 17 / iOS',    result: 'Success' },
  { ts: 'Mar 31, 2026 07:55 PM', ip: '198.51.100.77',  device: 'Firefox 125 / Linux', result: 'Failed' },
];

const SESSION_COLS = [
  { key: 'device',   label: 'Device',     type: 'text' },
  { key: 'ip',       label: 'IP Address', type: 'text' },
  { key: 'location', label: 'Location' },
  { key: 'started',  label: 'Started' },
];

const LOGIN_COLS = [
  { key: 'ts',     label: 'Timestamp',       type: 'text' },
  { key: 'ip',     label: 'IP Address',      type: 'text' },
  { key: 'device', label: 'Device / Browser',type: 'text' },
  { key: 'result', label: 'Result' },
];

export default function SecurityPage() {
  const [twoFA, setTwoFA] = useState(true);
  const [sessions, setSessions] = useState(SESSIONS);
  const [pendingSession, setPendingSession] = useState(null);
  const [passwordForm, setPasswordForm] = useState({ current: '', next: '', confirm: '' });
  const [passwordNotice, setPasswordNotice] = useState({ type: '', text: '' });
  const [authenticatorApp, setAuthenticatorApp] = useState('Google Authenticator');
  const [showQr, setShowQr] = useState(false);
  const fpS = useFilterPanel();
  const fpL = useFilterPanel();

  const visibleSessions = useMemo(() => sessions.filter((s) => SESSION_COLS.every((c) => fpS.match(c.key, s[c.key]))), [sessions, fpS.filters]);
  const visibleLogins   = useMemo(() => LOGINS.filter((l) => LOGIN_COLS.every((c) => fpL.match(c.key, l[c.key]))), [fpL.filters]);

  const updatePassword = () => {
    if (!passwordForm.current || !passwordForm.next || !passwordForm.confirm) {
      setPasswordNotice({ type: 'error', text: 'Please fill all password fields.' });
      return;
    }
    if (!isStrongPassword(passwordForm.next)) {
      setPasswordNotice({ type: 'error', text: 'Use at least 12 characters with uppercase, lowercase, number, and special character.' });
      return;
    }
    if (passwordForm.next !== passwordForm.confirm) {
      setPasswordNotice({ type: 'error', text: 'New password and confirm password must match.' });
      return;
    }
    setPasswordForm({ current: '', next: '', confirm: '' });
    setPasswordNotice({ type: 'ok', text: 'Password updated successfully.' });
  };

  const revokeSession = (session) => {
    setPendingSession(session);
  };

  const confirmRevokeSession = () => {
    if (!pendingSession) return;
    setSessions((prev) => prev.filter((s) => !(s.ip === pendingSession.ip && s.started === pendingSession.started)));
    setPendingSession(null);
  };

  return (
    <section className="page active space-y-4" id="page-security">
      <div className="page-hero ph-security">
        <div className="page-hero-left">
          <div className="page-hero-icon"><i className="fa fa-shield-halved"></i></div>
          <div className="page-hero-text">
            <h1>Security Center</h1>
            <p>Protect access with session control, login intelligence, and two-factor enforcement.</p>
          </div>
        </div>
        <div className="page-hero-right">
          <div className="page-hero-chips">
            <span className="page-hero-chip"><i className="fa fa-mobile-screen"></i> {visibleSessions.length} Sessions</span>
            <span className="page-hero-chip"><i className="fa fa-clock-rotate-left"></i> {visibleLogins.length} Logins</span>
          </div>
        </div>
      </div>

      <div className="security-grid security-premium-grid">
        <div className="security-card">
          <h3><i className="fa fa-key"></i> Change Password</h3>
          <p>Update your account password. Use a strong, unique password.</p>
          <div className="setting-item"><label>Current Password</label><input className="setting-input" type="password" placeholder="••••••••" value={passwordForm.current} onChange={(e) => setPasswordForm((p) => ({ ...p, current: e.target.value }))} /></div>
          <div className="setting-item"><label>New Password</label><input className="setting-input" type="password" placeholder="••••••••" value={passwordForm.next} onChange={(e) => setPasswordForm((p) => ({ ...p, next: e.target.value }))} /></div>
          <div className="setting-item"><label>Confirm Password</label><input className="setting-input" type="password" placeholder="••••••••" value={passwordForm.confirm} onChange={(e) => setPasswordForm((p) => ({ ...p, confirm: e.target.value }))} /></div>
          {passwordNotice.text && (
            <div style={{ marginTop: '8px', fontSize: '0.78rem', color: passwordNotice.type === 'ok' ? '#16a34a' : '#ef4444' }}>
              {passwordNotice.text}
            </div>
          )}
          <div className="settings-save"><button className="btn-primary" onClick={updatePassword}><i className="fa fa-lock"></i> Update Password</button></div>
        </div>

        <div className="security-card">
          <h3><i className="fa fa-shield-halved"></i> Two-Factor Authentication</h3>
          <p>Add an extra layer of security by requiring a verification code on login.</p>
          <div className="setting-item toggle-item">
            <label>Enable 2FA</label>
            <label className="toggle"><input type="checkbox" checked={twoFA} onChange={(e) => { setTwoFA(e.target.checked); if (!e.target.checked) setShowQr(false); }} /><span className="slider"></span></label>
          </div>
          {twoFA && (
            <>
              <div className="setting-item"><label>Authenticator App</label><input className="setting-input" value={authenticatorApp} onChange={(e) => setAuthenticatorApp(e.target.value)} /></div>
              <button className="btn-outline" onClick={() => setShowQr((v) => !v)}><i className="fa fa-qrcode"></i> {showQr ? 'Hide QR Code' : 'Show QR Code'}</button>
              {showQr && <div className="mono" style={{ marginTop: '8px' }}>otpauth://totp/MOS%20Admin?secret=JBSWY3DPEHPK3PXP&issuer=MOS</div>}
            </>
          )}
        </div>

        <div className="security-card full-width">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
            <h3 style={{ margin: 0 }}><i className="fa fa-display"></i> Active Sessions</h3>
            <button className={`btn-outline${fpS.anyFiltered ? ' filter-btn-active' : ''}`} onClick={() => fpS.setOpen(true)}>
              <i className="fa fa-filter"></i> Filter{fpS.anyFiltered ? ` (${fpS.filterCount})` : ''}
            </button>
          </div>
          <div className="table-wrap overflow-x-auto">
            <table className="data-table">
              <thead><tr>
                <th>Device</th><th>IP Address</th><th>Location</th><th>Started</th><th>Action</th>
              </tr></thead>
              <tbody>
                {visibleSessions.map((s) => (
                  <tr key={`${s.ip}-${s.started}`}>
                    <td><strong>{s.device}</strong>{s.current && <span className="badge-pill badge-inline">Current</span>}</td>
                    <td>{maskIp(s.ip)}</td>
                    <td>{s.location}</td>
                    <td>{s.started}</td>
                    <td>
                      {!s.current && (
                        <button className="btn-outline btn-outline-danger" onClick={() => revokeSession(s)}>
                          <i className="fa fa-power-off"></i> Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {!visibleSessions.length && (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-3)', fontSize: '0.84rem' }}>No active sessions.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <FilterPanel hook={fpS} columns={SESSION_COLS} data={sessions} />
        </div>

        <div className="security-card full-width">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
            <h3 style={{ margin: 0 }}><i className="fa fa-clock-rotate-left"></i> Recent Login History</h3>
            <button className={`btn-outline${fpL.anyFiltered ? ' filter-btn-active' : ''}`} onClick={() => fpL.setOpen(true)}>
              <i className="fa fa-filter"></i> Filter{fpL.anyFiltered ? ` (${fpL.filterCount})` : ''}
            </button>
          </div>
          <div className="table-wrap overflow-x-auto">
            <table className="data-table">
              <thead><tr>
                <th>Timestamp</th><th>IP Address</th><th>Device / Browser</th><th>Result</th>
              </tr></thead>
              <tbody>
                {visibleLogins.map((l) => (
                  <tr key={`${l.ts}-${l.ip}-${l.result}`}>
                    <td><span className="mono">{l.ts}</span></td>
                    <td>{maskIp(l.ip)}</td>
                    <td>{l.device}</td>
                    <td><span className={`status ${l.result === 'Success' ? 'completed' : 'cancelled'}`}>{l.result}</span></td>
                  </tr>
                ))}
                {!visibleLogins.length && (
                  <tr><td colSpan={4} style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-3)', fontSize: '0.84rem' }}>No login history.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <FilterPanel hook={fpL} columns={LOGIN_COLS} data={LOGINS} />
        </div>
      </div>

      <Modal
        open={Boolean(pendingSession)}
        title="Revoke Session"
        onClose={() => setPendingSession(null)}
        footer={(
          <>
            <button className="btn-outline" onClick={() => setPendingSession(null)}>Cancel</button>
            <button className="btn-outline btn-outline-danger" onClick={confirmRevokeSession}><i className="fa fa-power-off"></i> Revoke</button>
          </>
        )}
      >
        <p style={{ margin: 0, color: 'var(--text-2)', fontSize: '0.86rem' }}>
          Revoke access for <strong>{pendingSession?.device}</strong>?
        </p>
      </Modal>
    </section>
  );
}

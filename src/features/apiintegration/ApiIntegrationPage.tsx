import { useMemo, useState } from 'react';
import { useFilterPanel, FilterPanel } from '../../components/ColumnFilter';
import Modal from '../../components/Modal';
import { copyText } from '../../utils/clientActions';
import { API_REQUEST_TIMEOUT_MS, getApiBaseUrl, isApiIntegrationEnabled } from '../../api/runtime';
import { USERS_PATCH } from '../../api/patches/usersPatch';
import { STAFF_PATCH } from '../../api/patches/staffPatch';
import { ORGANIZATIONS_PATCH } from '../../api/patches/organizationsPatch';
import { LOCATIONS_PATCH } from '../../api/patches/locationsPatch';
import { PRICING_PATCH } from '../../api/patches/pricingPatch';
import { RIDES_PATCH } from '../../api/patches/ridesPatch';
import { SUBSCRIPTIONS_PATCH } from '../../api/patches/subscriptionsPatch';
import { VEHICLES_PATCH } from '../../api/patches/vehiclesPatch';
import { sanitizeText } from '../../utils/safety';

const API_INTEGRATION_STORAGE_KEY = 'mos.api.integration.settings.v1';
const API_TOKEN_KEY = 'mos.api.token';

function buildMaskableValue(prefix) {
  const stamp = Date.now().toString(36).slice(-8);
  return `${prefix}_${stamp}`;
}

function endpointValue(value) {
  if (typeof value === 'function') return value(':id');
  return String(value || '').trim();
}

function titleFromKey(key) {
  return String(key || '')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

function buildDefaultEndpoints() {
  const groups = [
    ['Users', USERS_PATCH],
    ['Staff', STAFF_PATCH],
    ['Organizations', ORGANIZATIONS_PATCH],
    ['Locations', LOCATIONS_PATCH],
    ['Pricing', PRICING_PATCH],
    ['Rides', RIDES_PATCH],
    ['Subscriptions', SUBSCRIPTIONS_PATCH],
    ['Vehicles', VEHICLES_PATCH],
  ];

  const rows = [];
  let id = 1;
  for (const [domain, patch] of groups) {
    const entries = Object.entries(patch?.endpoints || {});
    for (const [name, endpoint] of entries) {
      rows.push({
        id: id++,
        name: `${domain} ${titleFromKey(name)}`,
        endpoint: endpointValue(endpoint),
        method: name.startsWith('list') ? 'REST' : name.startsWith('forceEnd') ? 'Webhook' : 'REST',
        status: 'Active',
      });
    }
  }

  return rows;
}

function loadIntegrationState() {
  const defaultEndpoints = buildDefaultEndpoints();
  const token = localStorage.getItem(API_TOKEN_KEY) || buildMaskableValue('mjl_live');
  const webhook = buildMaskableValue('whsec');

  try {
    const raw = localStorage.getItem(API_INTEGRATION_STORAGE_KEY);
    if (!raw) {
      return {
        endpoints: defaultEndpoints,
        liveKey: token,
        webhookSecret: webhook,
      };
    }

    const parsed = JSON.parse(raw);
    return {
      endpoints: Array.isArray(parsed?.endpoints) ? parsed.endpoints : defaultEndpoints,
      liveKey: String(parsed?.liveKey || token),
      webhookSecret: String(parsed?.webhookSecret || webhook),
    };
  } catch {
    return {
      endpoints: defaultEndpoints,
      liveKey: token,
      webhookSecret: webhook,
    };
  }
}

function persistIntegrationState(next) {
  const payload = {
    endpoints: Array.isArray(next?.endpoints) ? next.endpoints : [],
    liveKey: String(next?.liveKey || ''),
    webhookSecret: String(next?.webhookSecret || ''),
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(API_INTEGRATION_STORAGE_KEY, JSON.stringify(payload));
}

function maskValue(value) {
  const text = String(value || '');
  if (text.length < 12) return text || 'Not configured';
  return `${text.slice(0, 9)}••••••••••••••••••••${text.slice(-4)}`;
}

const COLUMNS = [
  { key: 'name',     label: 'Name',     type: 'text' },
  { key: 'endpoint', label: 'Endpoint', type: 'text' },
  { key: 'method',   label: 'Method' },
  { key: 'status',   label: 'Status' },
];

export default function ApiIntegrationPage() {
  const initial = useMemo(() => loadIntegrationState(), []);
  const usingApi = isApiIntegrationEnabled();
  const apiBaseUrl = getApiBaseUrl();
  const [copiedField, setCopiedField] = useState('');
  const [endpoints, setEndpoints] = useState(initial.endpoints);
  const [liveKey, setLiveKey] = useState(initial.liveKey);
  const [webhookSecret, setWebhookSecret] = useState(initial.webhookSecret);
  const [saveState, setSaveState] = useState('idle');
  const [showRotateConfirm, setShowRotateConfirm] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [showEndpointModal, setShowEndpointModal] = useState(false);
  const [editingEndpointId, setEditingEndpointId] = useState(null);
  const [endpointDraft, setEndpointDraft] = useState({ name: '', endpoint: '', method: 'REST', status: 'Active' });
  const fp = useFilterPanel();
  const visible = useMemo(() => endpoints.filter((e) => COLUMNS.every((c) => fp.match(c.key, e[c.key]))), [endpoints, fp.filters]);

  const markCopied = (field) => {
    setCopiedField(field);
    window.setTimeout(() => setCopiedField((current) => (current === field ? '' : current)), 2000);
  };

  const handleCopy = async (value, field) => {
    const didCopy = await copyText(value);
    if (didCopy) markCopied(field);
  };

  const handleRotate = () => {
    setShowRotateConfirm(true);
  };

  const confirmRotate = () => {
    const nextStamp = Date.now().toString(36).slice(-6).toUpperCase();
    const nextLiveKey = `mjl_live_${nextStamp}_key`;
    const nextWebhookSecret = `whsec_${nextStamp.toLowerCase()}_secret`;
    setLiveKey(nextLiveKey);
    setWebhookSecret(nextWebhookSecret);
    persistIntegrationState({ endpoints, liveKey: nextLiveKey, webhookSecret: nextWebhookSecret });
    localStorage.setItem(API_TOKEN_KEY, nextLiveKey);
    setSaveState('saved');
    setShowRotateConfirm(false);
    window.setTimeout(() => setSaveState('idle'), 2000);
  };

  const handleSave = () => {
    persistIntegrationState({ endpoints, liveKey, webhookSecret });
    localStorage.setItem(API_TOKEN_KEY, liveKey);
    setSaveState('saved');
    window.setTimeout(() => setSaveState('idle'), 2000);
  };

  const openAddEndpoint = () => {
    setEditingEndpointId(null);
    setEndpointDraft({ name: '', endpoint: '/api/v1/new-endpoint', method: 'REST', status: 'Active' });
    setShowEndpointModal(true);
  };

  const openEditEndpoint = (endpointId) => {
    const current = endpoints.find((item) => item.id === endpointId);
    if (!current) return;
    setEditingEndpointId(endpointId);
    setEndpointDraft({ name: current.name, endpoint: current.endpoint, method: current.method, status: current.status });
    setShowEndpointModal(true);
  };

  const saveEndpoint = () => {
    const draftName = sanitizeText(endpointDraft.name);
    const draftEndpoint = sanitizeText(endpointDraft.endpoint);
    if (!draftName || !draftEndpoint) return;

    if (editingEndpointId) {
      setEndpoints((current) => {
        const next = current.map((item) => (
        item.id === editingEndpointId
          ? { ...item, name: draftName, endpoint: draftEndpoint, method: endpointDraft.method, status: endpointDraft.status }
          : item
      ));
        persistIntegrationState({ endpoints: next, liveKey, webhookSecret });
        return next;
      });
    } else {
      setEndpoints((current) => {
        const next = [
          {
            id: current.reduce((max, item) => Math.max(max, item.id), 0) + 1,
            name: draftName,
            endpoint: draftEndpoint,
            method: endpointDraft.method,
            status: endpointDraft.status,
          },
          ...current,
        ];
        persistIntegrationState({ endpoints: next, liveKey, webhookSecret });
        return next;
      });
    }

    setShowEndpointModal(false);
    setEditingEndpointId(null);
  };

  const handleDeleteEndpoint = (endpointId) => {
    setPendingDeleteId(endpointId);
  };

  const confirmDeleteEndpoint = () => {
    if (!pendingDeleteId) return;
    setEndpoints((current) => {
      const next = current.filter((item) => item.id !== pendingDeleteId);
      persistIntegrationState({ endpoints: next, liveKey, webhookSecret });
      return next;
    });
    setPendingDeleteId(null);
  };

  return (
    <section className="page active space-y-4" id="page-api-integration">
      <div className="page-hero ph-api">
        <div className="page-hero-left">
          <div className="page-hero-icon"><i className="fa fa-code-branch"></i></div>
          <div className="page-hero-text">
            <h1>API Gateway</h1>
            <p>Secure keys, endpoint contracts, and webhook channels for external platform integrations.</p>
          </div>
        </div>
        <div className="page-hero-right">
          <div className="page-hero-chips">
            <span className="page-hero-chip"><i className="fa fa-satellite-dish"></i> {usingApi ? 'API Enabled' : 'Local Mode'}</span>
            <span className="page-hero-chip"><i className="fa fa-plug"></i> {visible.length} Endpoints</span>
            <span className="page-hero-chip"><i className="fa fa-bolt"></i> {visible.filter((e) => e.status === 'Active').length} Active</span>
          </div>
        </div>
      </div>

      <div className="api-portal-grid">
      <div className="settings-group settings-group-api api-key-card rounded-2xl p-4 md:p-5">
        <h3><i className="fa fa-key icon-accent"></i>&nbsp; API Key</h3>
        <div className="setting-item" style={{ marginTop: '8px' }}>
          <label>Base URL</label>
          <div className="api-key-field">
            <div className="api-key-value mono">{apiBaseUrl || '/ (same-origin)'}</div>
            <button className="copy-btn" onClick={() => handleCopy(apiBaseUrl || '/', 'base-url')}>
              <i className={`fa fa-${copiedField === 'base-url' ? 'check' : 'copy'}`}></i> {copiedField === 'base-url' ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
        <div className="setting-item">
          <label>Request Timeout</label>
          <div className="api-key-field">
            <div className="api-key-value mono">{API_REQUEST_TIMEOUT_MS} ms</div>
          </div>
        </div>
        <div className="setting-item">
          <label>Live API Key</label>
          <div className="api-key-field">
            <div className="api-key-value">{maskValue(liveKey)}</div>
            <button className="copy-btn" onClick={() => handleCopy(liveKey, 'live-key')}>
              <i className={`fa fa-${copiedField === 'live-key' ? 'check' : 'copy'}`}></i> {copiedField === 'live-key' ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
        <div className="setting-item">
          <label>Webhook Secret</label>
          <div className="api-key-field">
            <div className="api-key-value">{maskValue(webhookSecret)}</div>
            <button className="copy-btn" onClick={() => handleCopy(webhookSecret, 'webhook-secret')}><i className={`fa fa-${copiedField === 'webhook-secret' ? 'check' : 'copy'}`}></i> {copiedField === 'webhook-secret' ? 'Copied!' : 'Copy'}</button>
          </div>
        </div>
        <div className="settings-save">
          <button className="btn-outline btn-outline-danger" onClick={handleRotate}>
            <i className="fa fa-rotate"></i> Rotate Key
          </button>
          <button className="btn-primary" onClick={handleSave}><i className="fa fa-floppy-disk"></i> {saveState === 'saved' ? 'Saved' : 'Save Settings'}</button>
        </div>
      </div>

      <div className="api-stats-row">
        <div className="api-stat-card"><span>Total Endpoints</span><strong>{endpoints.length}</strong></div>
        <div className="api-stat-card"><span>REST</span><strong>{endpoints.filter((e) => e.method === 'REST').length}</strong></div>
        <div className="api-stat-card"><span>Webhooks</span><strong>{endpoints.filter((e) => e.method === 'Webhook').length}</strong></div>
      </div>
      </div>

      <div className="table-card full">
        <div className="card-header">
          <h3>Registered Endpoints</h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className={`btn-outline${fp.anyFiltered ? ' filter-btn-active' : ''}`} onClick={() => fp.setOpen(true)}>
              <i className="fa fa-filter"></i> Filter{fp.anyFiltered ? ` (${fp.filterCount})` : ''}
            </button>
            <button className="btn-primary" onClick={openAddEndpoint}><i className="fa fa-plus"></i> Add Endpoint</button>
          </div>
        </div>
        <div className="table-wrap overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th><th>Endpoint</th><th>Method</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((e) => (
                <tr key={e.id}>
                  <td><strong>{e.name}</strong></td>
                  <td><span className="mono mono-muted">{e.endpoint}</span></td>
                  <td><span className={`status ${e.method === 'REST' ? 'processing' : 'pending'}`}>{e.method}</span></td>
                  <td><span className={`status ${e.status === 'Active' ? 'completed' : 'cancelled'}`}>{e.status}</span></td>
                  <td className="actions">
                    <button className="act-btn" title="Edit" onClick={() => openEditEndpoint(e.id)}><i className="fa fa-pen"></i></button>
                    <button className="act-btn red" title="Delete" onClick={() => handleDeleteEndpoint(e.id)}><i className="fa fa-trash"></i></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <FilterPanel hook={fp} columns={COLUMNS} data={endpoints} />

      <Modal
        open={showEndpointModal}
        title={editingEndpointId ? 'Edit Endpoint' : 'Add Endpoint'}
        onClose={() => { setShowEndpointModal(false); setEditingEndpointId(null); }}
        footer={<><button className="btn-outline" onClick={() => { setShowEndpointModal(false); setEditingEndpointId(null); }}>Cancel</button><button className="btn-primary" onClick={saveEndpoint} disabled={!endpointDraft.name.trim() || !endpointDraft.endpoint.trim()}>{editingEndpointId ? 'Save' : 'Create'}</button></>}
      >
        <div className="form-grid">
          <div className="form-field"><label>Name</label><input className="setting-input" value={endpointDraft.name} onChange={(e) => setEndpointDraft((prev) => ({ ...prev, name: e.target.value }))} placeholder="Endpoint name" /></div>
          <div className="form-field"><label>Method</label>
            <select className="setting-input" value={endpointDraft.method} onChange={(e) => setEndpointDraft((prev) => ({ ...prev, method: e.target.value }))}>
              <option>REST</option>
              <option>Webhook</option>
            </select>
          </div>
          <div className="form-field full"><label>Endpoint</label><input className="setting-input mono" value={endpointDraft.endpoint} onChange={(e) => setEndpointDraft((prev) => ({ ...prev, endpoint: e.target.value }))} placeholder="/api/v1/new-endpoint" /></div>
          <div className="form-field"><label>Status</label>
            <select className="setting-input" value={endpointDraft.status} onChange={(e) => setEndpointDraft((prev) => ({ ...prev, status: e.target.value }))}>
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </div>
        </div>
      </Modal>

      <Modal
        open={showRotateConfirm}
        title="Rotate API Key"
        onClose={() => setShowRotateConfirm(false)}
        footer={(
          <>
            <button className="btn-outline" onClick={() => setShowRotateConfirm(false)}>Cancel</button>
            <button className="btn-outline btn-outline-danger" onClick={confirmRotate}><i className="fa fa-rotate"></i> Rotate</button>
          </>
        )}
      >
        <p style={{ margin: 0, color: 'var(--text-2)', fontSize: '0.86rem' }}>
          Rotating the key invalidates current integrations until they are updated.
        </p>
      </Modal>

      <Modal
        open={Boolean(pendingDeleteId)}
        title="Remove Endpoint"
        onClose={() => setPendingDeleteId(null)}
        footer={(
          <>
            <button className="btn-outline" onClick={() => setPendingDeleteId(null)}>Cancel</button>
            <button className="btn-outline btn-outline-danger" onClick={confirmDeleteEndpoint}><i className="fa fa-trash"></i> Remove</button>
          </>
        )}
      >
        <p style={{ margin: 0, color: 'var(--text-2)', fontSize: '0.86rem' }}>
          This will remove the endpoint from integration settings.
        </p>
      </Modal>
    </section>
  );
}

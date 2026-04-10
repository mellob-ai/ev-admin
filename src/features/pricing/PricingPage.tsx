import { useEffect, useMemo, useState } from 'react';
import Modal from '../../components/Modal';
import { useFilterPanel, FilterPanel } from '../../components/ColumnFilter';
import { isApiIntegrationEnabled } from '../../api/runtime';
import { createPricing, deletePricing, listPricing, updatePricing } from '../../api/services/pricingService';

const SEED = [
  {
    id: 'PRC-001',
    name: 'Campus Basic',
    type: 'Simple',
    simpleRates: {
      weekday: { cancellation: '₹10', perHr: '₹35' },
      weekend: { cancellation: '₹12', perHr: '₹45' },
    },
    advanceRates: {
      weekday: { unlock: '₹5', perMin: '₹1.50', perHr: '₹70', base: '₹10', waiting: '₹0.50' },
      weekend: { unlock: '₹7', perMin: '₹2', perHr: '₹80', base: '₹12', waiting: '₹0.75' },
    },
    status: 'Active',
  },
  {
    id: 'PRC-002',
    name: 'Campus Premium',
    type: 'Advance',
    simpleRates: {
      weekday: { cancellation: '₹15', perHr: '₹60' },
      weekend: { cancellation: '₹18', perHr: '₹75' },
    },
    advanceRates: {
      weekday: { unlock: '₹8', perMin: '₹2.50', perHr: '₹100', base: '₹15', waiting: '₹1' },
      weekend: { unlock: '₹10', perMin: '₹3', perHr: '₹120', base: '₹18', waiting: '₹1.25' },
    },
    status: 'Active',
  },
  {
    id: 'PRC-003',
    name: 'Corporate Standard',
    type: 'Advance',
    simpleRates: {
      weekday: { cancellation: '₹12', perHr: '₹50' },
      weekend: { cancellation: '₹15', perHr: '₹65' },
    },
    advanceRates: {
      weekday: { unlock: '₹6', perMin: '₹2', perHr: '₹85', base: '₹12', waiting: '₹0.75' },
      weekend: { unlock: '₹8', perMin: '₹2.50', perHr: '₹100', base: '₹15', waiting: '₹1' },
    },
    status: 'Active',
  },
  {
    id: 'PRC-004',
    name: 'Public PAYG',
    type: 'Simple',
    simpleRates: {
      weekday: { cancellation: '₹8', perHr: '₹40' },
      weekend: { cancellation: '₹10', perHr: '₹50' },
    },
    advanceRates: {
      weekday: { unlock: '₹5', perMin: '₹1.75', perHr: '₹75', base: '₹10', waiting: '₹0.50' },
      weekend: { unlock: '₹6', perMin: '₹2', perHr: '₹85', base: '₹12', waiting: '₹0.75' },
    },
    status: 'Active',
  },
  {
    id: 'PRC-005',
    name: 'Off-Peak Discounted',
    type: 'Simple',
    simpleRates: {
      weekday: { cancellation: '₹5', perHr: '₹25' },
      weekend: { cancellation: '₹5', perHr: '₹25' },
    },
    advanceRates: {
      weekday: { unlock: '₹3', perMin: '₹1', perHr: '₹50', base: '₹8', waiting: '₹0.25' },
      weekend: { unlock: '₹3', perMin: '₹1', perHr: '₹50', base: '₹8', waiting: '₹0.25' },
    },
    status: 'Inactive',
  },
];

const COLUMNS = [
  { key: 'id', label: 'Pricing ID' },
  { key: 'name', label: 'Name', type: 'text' },
  { key: 'type', label: 'Type' },
  { key: 'weekdaySummary', label: 'Weekday', type: 'text' },
  { key: 'weekendSummary', label: 'Weekend', type: 'text' },
  { key: 'status', label: 'Status' },
];

function blankForm() {
  return {
    name: '',
    type: 'Simple',
    simpleRates: {
      weekday: { cancellation: '', perHr: '' },
      weekend: { cancellation: '', perHr: '' },
    },
    advanceRates: {
      weekday: { unlock: '', perMin: '', perHr: '', base: '', waiting: '' },
      weekend: { unlock: '', perMin: '', perHr: '', base: '', waiting: '' },
    },
    status: 'Active',
  };
}

function parseMoney(value) {
  return Number(String(value || '').replace(/[^\d.]/g, '')) || 0;
}

function getWeekdaySummary(plan) {
  if (plan.type === 'Simple') {
    return `Cancel ${plan.simpleRates?.weekday?.cancellation || '-'} • Hr ${plan.simpleRates?.weekday?.perHr || '-'}`;
  }

  return `Unlock ${plan.advanceRates?.weekday?.unlock || '-'} • Min ${plan.advanceRates?.weekday?.perMin || '-'} • Hr ${plan.advanceRates?.weekday?.perHr || '-'}`;
}

function getWeekendSummary(plan) {
  if (plan.type === 'Simple') {
    return `Cancel ${plan.simpleRates?.weekend?.cancellation || '-'} • Hr ${plan.simpleRates?.weekend?.perHr || '-'}`;
  }

  return `Unlock ${plan.advanceRates?.weekend?.unlock || '-'} • Min ${plan.advanceRates?.weekend?.perMin || '-'} • Hr ${plan.advanceRates?.weekend?.perHr || '-'}`;
}

export default function PricingPage() {
  const usingApi = isApiIntegrationEnabled();
  const [plans, setPlans] = useState(SEED);
  const [showAdd, setShowAdd] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState(null);
  const [form, setForm] = useState(blankForm());
  const [pricingMode, setPricingMode] = useState(usingApi ? 'API' : 'Local');
  const [pricingSyncError, setPricingSyncError] = useState('');
  const [isPricingLoading, setIsPricingLoading] = useState(false);
  const [simPlanId, setSimPlanId] = useState(SEED.length ? SEED[0].id : '');
  const [simDayType, setSimDayType] = useState('weekday');
  const [simMinutes, setSimMinutes] = useState(24);
  const [simWaitMinutes, setSimWaitMinutes] = useState(0);
  const fp = useFilterPanel();

  const planRows = useMemo(
    () => plans.map((plan) => ({
      ...plan,
      weekdaySummary: getWeekdaySummary(plan),
      weekendSummary: getWeekendSummary(plan),
    })),
    [plans]
  );

  const visible = useMemo(
    () => planRows.filter((plan) => COLUMNS.every((column) => fp.match(column.key, plan[column.key]))),
    [planRows, fp.filters]
  );

  const simulatorPlan = useMemo(
    () => plans.find((plan) => plan.id === simPlanId) || plans[0],
    [plans, simPlanId]
  );

  const pricingSummary = useMemo(() => {
    const active = visible.filter((plan) => plan.status === 'Active');
    const averageCharge = active.length
      ? active.reduce((sum, plan) => {
          if (plan.type === 'Simple') {
            return sum + ((parseMoney(plan.simpleRates?.weekday?.perHr) + parseMoney(plan.simpleRates?.weekend?.perHr)) / 2);
          }

          return sum + ((parseMoney(plan.advanceRates?.weekday?.perMin) + parseMoney(plan.advanceRates?.weekend?.perMin)) / 2);
        }, 0) / active.length
      : 0;

    return {
      visible: visible.length,
      active: active.length,
      advanced: visible.filter((plan) => plan.type === 'Advance').length,
      averageCharge: `₹${averageCharge.toFixed(2)}`,
    };
  }, [visible]);

  const estimatedFare = useMemo(() => {
    if (!simulatorPlan) return 0;

    if (simulatorPlan.type === 'Simple') {
      const selected = simulatorPlan.simpleRates?.[simDayType] || simulatorPlan.simpleRates?.weekday || { cancellation: '₹0', perHr: '₹0' };
      return parseMoney(selected.cancellation) + (parseMoney(selected.perHr) / 60) * Math.max(0, simMinutes);
    }

    const selected = simulatorPlan.advanceRates?.[simDayType] || simulatorPlan.advanceRates?.weekday || {
      unlock: '₹0',
      perMin: '₹0',
      base: '₹0',
      waiting: '₹0',
    };

    return parseMoney(selected.unlock)
      + parseMoney(selected.base)
      + parseMoney(selected.perMin) * Math.max(0, simMinutes)
      + parseMoney(selected.waiting) * Math.max(0, simWaitMinutes);
  }, [simDayType, simMinutes, simWaitMinutes, simulatorPlan]);

  const setSimpleRateField = (bucket, key, value) => {
    setForm((current) => ({
      ...current,
      simpleRates: {
        ...current.simpleRates,
        [bucket]: {
          ...current.simpleRates[bucket],
          [key]: value,
        },
      },
    }));
  };

  const setAdvanceRateField = (bucket, key, value) => {
    setForm((current) => ({
      ...current,
      advanceRates: {
        ...current.advanceRates,
        [bucket]: {
          ...current.advanceRates[bucket],
          [key]: value,
        },
      },
    }));
  };

  useEffect(() => {
    if (!usingApi) return;
    let mounted = true;

    const hydratePricing = async () => {
      setIsPricingLoading(true);
      setPricingSyncError('');
      try {
        const remoteRows = await listPricing({ page: 1, limit: 300 });
        if (!mounted) return;
        if (Array.isArray(remoteRows) && remoteRows.length) {
          setPlans(remoteRows);
          setPricingMode('API');
        } else {
          setPricingMode('Local');
        }
      } catch (error) {
        if (!mounted) return;
        setPricingMode('Local');
        setPricingSyncError(error?.message || 'Unable to sync pricing rules from backend.');
      } finally {
        if (mounted) setIsPricingLoading(false);
      }
    };

    hydratePricing();
    return () => {
      mounted = false;
    };
  }, [usingApi]);

  const reportPricingApiError = (actionLabel, error) => {
    setPricingSyncError(`${actionLabel} failed in API mode: ${error?.message || 'Unknown error'}. Local state was updated.`);
  };

  const handleCreate = async () => {
    if (!form.name.trim()) return;

    const nextPlan = {
      id: editingPlanId || `PRC-${String(plans.length + 1).padStart(3, '0')}`,
      name: form.name,
      type: form.type,
      simpleRates: form.type === 'Simple' ? form.simpleRates : undefined,
      advanceRates: form.type === 'Advance' ? form.advanceRates : undefined,
      status: form.status,
    };

    if (usingApi) {
      try {
        if (editingPlanId) {
          const updated = await updatePricing(nextPlan);
          setPlans((current) => current.map((plan) => (plan.id === editingPlanId ? { ...plan, ...updated } : plan)));
        } else {
          const created = await createPricing(nextPlan);
          setPlans((current) => [...current, created]);
        }

        setEditingPlanId(null);
        setForm(blankForm());
        setShowAdd(false);
        return;
      } catch (error) {
        reportPricingApiError(editingPlanId ? 'Update pricing' : 'Create pricing', error);
      }
    }

    if (editingPlanId) {
      setPlans((current) => current.map((plan) => (plan.id === editingPlanId ? nextPlan : plan)));
    } else {
      setPlans((current) => [...current, nextPlan]);
    }

    setEditingPlanId(null);
    setForm(blankForm());
    setShowAdd(false);
  };

  const openCreate = () => {
    setEditingPlanId(null);
    setForm(blankForm());
    setShowAdd(true);
  };

  const openEdit = (plan) => {
    setEditingPlanId(plan.id);
    setForm({
      name: plan.name,
      type: plan.type,
      simpleRates: plan.simpleRates || { weekday: { cancellation: '', perHr: '' }, weekend: { cancellation: '', perHr: '' } },
      advanceRates: plan.advanceRates || {
        weekday: { unlock: '', perMin: '', perHr: '', base: '', waiting: '' },
        weekend: { unlock: '', perMin: '', perHr: '', base: '', waiting: '' },
      },
      status: plan.status,
    });
    setShowAdd(true);
  };

  const handleReset = () => {
    fp.clearAll();
    setEditingPlanId(null);
    setForm(blankForm());
  };

  const deletePlan = async (id) => {
    if (!window.confirm('Delete this pricing rule?')) return;
    if (usingApi) {
      try {
        await deletePricing(id);
      } catch (error) {
        reportPricingApiError('Delete pricing', error);
      }
    }
    setPlans((current) => current.filter((plan) => plan.id !== id));
  };

  return (
    <section className="page active space-y-4" id="page-pricing">
      <div className="page-hero ph-pricing">
        <div className="page-hero-left">
          <div className="page-hero-icon"><i className="fa fa-tags"></i></div>
          <div className="page-hero-text">
            <h1>PAYG Payments</h1>
            <p>Configure pay-as-you-go payment rules with separate weekday and weekend pricing for both methods.</p>
          </div>
        </div>
        <div className="page-hero-right">
          <div className="page-hero-chips">
            <span className="page-hero-chip"><i className="fa fa-layer-group"></i> {pricingSummary.visible} Visible Rules</span>
            <span className="page-hero-chip"><i className="fa fa-circle-check"></i> {pricingSummary.active} Active</span>
            <span className="page-hero-chip"><i className="fa fa-gauge"></i> Avg Rate {pricingSummary.averageCharge}</span>
          </div>
          <button className="btn-primary" onClick={openCreate}><i className="fa fa-plus"></i> Create PAYG</button>
        </div>
      </div>

      <div className="table-card full" style={{ padding: '8px 12px' }}>
        <div className="flex flex-wrap items-center justify-between gap-2 text-[12px]">
          <span className={`badge-pill ${pricingMode === 'API' ? '' : 'bg-amber-500/20 text-amber-300'}`}>
            <i className={`fa ${pricingMode === 'API' ? 'fa-plug-circle-check' : 'fa-database'}`}></i>&nbsp;
            Pricing Mode: {pricingMode}
          </span>
          {isPricingLoading ? <span className="text-[11px] opacity-80">Syncing pricing rules from backend...</span> : null}
          {pricingSyncError ? <span className="text-[11px] text-rose-300">{pricingSyncError}</span> : null}
        </div>
      </div>

      <div className="payg-summary-grid">
        <div className="payg-stat-card">
          <span>Pricing Rules</span>
          <strong>{pricingSummary.visible}</strong>
          <em>{pricingSummary.active} active</em>
        </div>
        <div className="payg-stat-card">
          <span>Advanced Rules</span>
          <strong>{pricingSummary.advanced}</strong>
          <em>with weekday and weekend splits</em>
        </div>
        <div className="payg-stat-card">
          <span>Average Charge</span>
          <strong>{pricingSummary.averageCharge}</strong>
          <em>hourly for simple, minute-based for advance</em>
        </div>
        <div className="payg-stat-card payg-stat-card-highlight">
          <span>Estimated Fare</span>
          <strong>₹{estimatedFare.toFixed(2)}</strong>
          <em>live simulator</em>
        </div>
      </div>

      <div className="table-card full payg-simulator-card">
        <div className="card-header">
          <h3>PAYG Payment Preview</h3>
        </div>
        <div className="payg-simulator-grid">
          <div className="form-field">
            <label>Pricing Rule</label>
            <select className="setting-input" value={simPlanId} onChange={(e) => setSimPlanId(e.target.value)}>
              {plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name} ({plan.id})</option>)}
            </select>
          </div>
          <div className="form-field">
            <label>Day Category</label>
            <select className="setting-input" value={simDayType} onChange={(e) => setSimDayType(e.target.value)}>
              <option value="weekday">Weekday</option>
              <option value="weekend">Weekend</option>
            </select>
          </div>
          <div className="form-field">
            <label>Ride Minutes</label>
            <input className="setting-input" type="number" min={0} value={simMinutes} onChange={(e) => setSimMinutes(Number(e.target.value) || 0)} />
          </div>
          <div className="form-field">
            <label>Waiting Minutes</label>
            <input className="setting-input" type="number" min={0} value={simWaitMinutes} onChange={(e) => setSimWaitMinutes(Number(e.target.value) || 0)} disabled={simulatorPlan?.type !== 'Advance'} />
          </div>
          <div className="payg-simulator-result">
            <span>Estimated Total</span>
            <strong>₹{estimatedFare.toFixed(2)}</strong>
            <small>{simulatorPlan ? `${simulatorPlan.name} • ${simDayType === 'weekday' ? 'Weekday' : 'Weekend'} pricing` : 'No rule selected'}</small>
          </div>
        </div>
      </div>

      <div className="toolbar">
        <div className="toolbar-left">
          <button className="btn-outline" onClick={openCreate}><i className="fa fa-sliders"></i> Pricing Engine</button>
        </div>
        <div className="toolbar-right">
          <button className={`btn-outline${fp.anyFiltered ? ' filter-btn-active' : ''}`} onClick={() => fp.setOpen(true)}>
            <i className="fa fa-filter"></i> Filter{fp.anyFiltered ? ` (${fp.filterCount})` : ''}
          </button>
          <button className="btn-outline" onClick={handleReset}><i className="fa fa-rotate-left"></i> Reset</button>
        </div>
      </div>

      <div className="pricing-cards-grid">
        {visible.map((plan) => (
          <div className={`pricing-plan-card ${plan.type === 'Simple' ? 'ppc-simple' : 'ppc-advance'} rounded-2xl p-4 md:p-5`} key={plan.id}>
            <div className="ppc-id">{plan.id}</div>
            <div className="ppc-name">{plan.name}</div>
            <div className="ppc-type-row">
              <div className="ppc-type-badge">{plan.type}</div>
              <div className={`status ${plan.status === 'Active' ? 'completed' : 'cancelled'}`}>{plan.status}</div>
            </div>
            <div className="ppc-days-row">
              <span className="ppc-day-chip">Weekday</span>
              <span className="ppc-day-chip">Weekend</span>
            </div>
            <div className="ppc-rates">
              {plan.type === 'Simple' ? (
                <>
                  <div className="ppc-rate"><span className="ppc-rate-lbl">Weekday Cancellation</span><strong className="ppc-rate-val">{plan.simpleRates?.weekday?.cancellation || '-'}</strong></div>
                  <div className="ppc-rate"><span className="ppc-rate-lbl">Weekend Cancellation</span><strong className="ppc-rate-val">{plan.simpleRates?.weekend?.cancellation || '-'}</strong></div>
                  <div className="ppc-rate"><span className="ppc-rate-lbl">Weekday Per Hour</span><strong className="ppc-rate-val">{plan.simpleRates?.weekday?.perHr || '-'}</strong></div>
                  <div className="ppc-rate"><span className="ppc-rate-lbl">Weekend Per Hour</span><strong className="ppc-rate-val">{plan.simpleRates?.weekend?.perHr || '-'}</strong></div>
                </>
              ) : (
                <>
                  <div className="ppc-rate"><span className="ppc-rate-lbl">Weekday Unlock</span><strong className="ppc-rate-val">{plan.advanceRates?.weekday?.unlock || '-'}</strong></div>
                  <div className="ppc-rate"><span className="ppc-rate-lbl">Weekend Unlock</span><strong className="ppc-rate-val">{plan.advanceRates?.weekend?.unlock || '-'}</strong></div>
                  <div className="ppc-rate"><span className="ppc-rate-lbl">Weekday Per Minute</span><strong className="ppc-rate-val">{plan.advanceRates?.weekday?.perMin || '-'}</strong></div>
                  <div className="ppc-rate"><span className="ppc-rate-lbl">Weekend Per Minute</span><strong className="ppc-rate-val">{plan.advanceRates?.weekend?.perMin || '-'}</strong></div>
                  <div className="ppc-rate"><span className="ppc-rate-lbl">Weekday Per Hour</span><strong className="ppc-rate-val">{plan.advanceRates?.weekday?.perHr || '-'}</strong></div>
                  <div className="ppc-rate"><span className="ppc-rate-lbl">Weekend Per Hour</span><strong className="ppc-rate-val">{plan.advanceRates?.weekend?.perHr || '-'}</strong></div>
                  <div className="ppc-rate"><span className="ppc-rate-lbl">Weekday Base</span><strong className="ppc-rate-val">{plan.advanceRates?.weekday?.base || '-'}</strong></div>
                  <div className="ppc-rate"><span className="ppc-rate-lbl">Weekend Base</span><strong className="ppc-rate-val">{plan.advanceRates?.weekend?.base || '-'}</strong></div>
                  <div className="ppc-rate"><span className="ppc-rate-lbl">Weekday Waiting</span><strong className="ppc-rate-val">{plan.advanceRates?.weekday?.waiting || '-'}</strong></div>
                  <div className="ppc-rate"><span className="ppc-rate-lbl">Weekend Waiting</span><strong className="ppc-rate-val">{plan.advanceRates?.weekend?.waiting || '-'}</strong></div>
                </>
              )}
            </div>
            <div className="ppc-footer flex items-center justify-between gap-2">
              <button className="act-btn" title="Edit" onClick={() => openEdit(plan)}><i className="fa fa-pen"></i></button>
              <button className="act-btn red" title="Delete" onClick={() => deletePlan(plan.id)}><i className="fa fa-trash"></i></button>
            </div>
          </div>
        ))}
      </div>

      <div className="table-card full">
        <div className="table-wrap overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Pricing ID</th><th>Name</th><th>Type</th><th>Weekday</th><th>Weekend</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((plan) => (
                <tr key={plan.id}>
                  <td>{plan.id}</td>
                  <td><strong>{plan.name}</strong></td>
                  <td><span className={`status ${plan.type === 'Simple' ? 'processing' : 'pending'}`}>{plan.type}</span></td>
                  <td>{plan.weekdaySummary}</td>
                  <td>{plan.weekendSummary}</td>
                  <td><span className={`status ${plan.status === 'Active' ? 'completed' : 'cancelled'}`}>{plan.status}</span></td>
                  <td className="actions">
                    <button className="act-btn" title="Edit" onClick={() => openEdit(plan)}><i className="fa fa-pen"></i></button>
                    <button className="act-btn red" title="Delete" onClick={() => deletePlan(plan.id)}><i className="fa fa-trash"></i></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <FilterPanel hook={fp} columns={COLUMNS} data={planRows} />

      <Modal
        open={showAdd}
        title={editingPlanId ? 'Edit PAYG Pricing' : 'Create PAYG Pricing'}
        onClose={() => { setShowAdd(false); setEditingPlanId(null); }}
        size="lg"
        footer={<><button className="btn-outline" onClick={() => { setShowAdd(false); setEditingPlanId(null); }}>Cancel</button><button className="btn-primary" onClick={handleCreate}>{editingPlanId ? 'Update' : 'Create'}</button></>}
      >
        <div className="form-grid">
          <div className="form-field full"><label>Pricing Name</label><input className="setting-input" value={form.name} onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))} placeholder="e.g. Standard PAYG" /></div>
          <div className="form-field full">
            <label>Pricing Method</label>
            <select className="setting-input" value={form.type} onChange={(e) => setForm((current) => ({ ...current, type: e.target.value }))}>
              <option value="Simple">Simple</option>
              <option value="Advance">Advance</option>
            </select>
          </div>

          {form.type === 'Simple' && (
            <div className="form-field full">
              <label>Simple Pricing Values</label>
              <div className="payg-simple-matrix">
                <div className="payg-simple-header"></div>
                <div className="payg-simple-header">Weekday (₹)</div>
                <div className="payg-simple-header">Weekend (₹)</div>

                <div className="payg-simple-label">Cancellation Fee</div>
                <input className="setting-input payg-simple-input" value={form.simpleRates.weekday.cancellation} onChange={(e) => setSimpleRateField('weekday', 'cancellation', e.target.value)} placeholder="100" />
                <input className="setting-input payg-simple-input" value={form.simpleRates.weekend.cancellation} onChange={(e) => setSimpleRateField('weekend', 'cancellation', e.target.value)} placeholder="100" />

                <div className="payg-simple-label">Per Hour</div>
                <input className="setting-input payg-simple-input" value={form.simpleRates.weekday.perHr} onChange={(e) => setSimpleRateField('weekday', 'perHr', e.target.value)} placeholder="100" />
                <input className="setting-input payg-simple-input" value={form.simpleRates.weekend.perHr} onChange={(e) => setSimpleRateField('weekend', 'perHr', e.target.value)} placeholder="160" />
              </div>
            </div>
          )}

          {form.type === 'Advance' && (
            <div className="form-field full">
              <label>Advance Pricing Values</label>
              <div className="payg-advance-matrix">
                <div className="payg-simple-header"></div>
                <div className="payg-simple-header">Weekday (₹)</div>
                <div className="payg-simple-header">Weekend (₹)</div>

                <div className="payg-simple-label">Unlock Fee</div>
                <input className="setting-input payg-simple-input" value={form.advanceRates.weekday.unlock} onChange={(e) => setAdvanceRateField('weekday', 'unlock', e.target.value)} placeholder="100" />
                <input className="setting-input payg-simple-input" value={form.advanceRates.weekend.unlock} onChange={(e) => setAdvanceRateField('weekend', 'unlock', e.target.value)} placeholder="100" />

                <div className="payg-simple-label">Per Minute</div>
                <input className="setting-input payg-simple-input" value={form.advanceRates.weekday.perMin} onChange={(e) => setAdvanceRateField('weekday', 'perMin', e.target.value)} placeholder="100" />
                <input className="setting-input payg-simple-input" value={form.advanceRates.weekend.perMin} onChange={(e) => setAdvanceRateField('weekend', 'perMin', e.target.value)} placeholder="160" />

                <div className="payg-simple-label">Per Hour</div>
                <input className="setting-input payg-simple-input" value={form.advanceRates.weekday.perHr} onChange={(e) => setAdvanceRateField('weekday', 'perHr', e.target.value)} placeholder="150" />
                <input className="setting-input payg-simple-input" value={form.advanceRates.weekend.perHr} onChange={(e) => setAdvanceRateField('weekend', 'perHr', e.target.value)} placeholder="200" />

                <div className="payg-simple-label">Base Fare</div>
                <input className="setting-input payg-simple-input" value={form.advanceRates.weekday.base} onChange={(e) => setAdvanceRateField('weekday', 'base', e.target.value)} placeholder="100" />
                <input className="setting-input payg-simple-input" value={form.advanceRates.weekend.base} onChange={(e) => setAdvanceRateField('weekend', 'base', e.target.value)} placeholder="120" />

                <div className="payg-simple-label">Waiting</div>
                <input className="setting-input payg-simple-input" value={form.advanceRates.weekday.waiting} onChange={(e) => setAdvanceRateField('weekday', 'waiting', e.target.value)} placeholder="0.50/min" />
                <input className="setting-input payg-simple-input" value={form.advanceRates.weekend.waiting} onChange={(e) => setAdvanceRateField('weekend', 'waiting', e.target.value)} placeholder="0.80/min" />
              </div>
            </div>
          )}

          <div className="form-field"><label>Status</label>
            <select className="setting-input" value={form.status} onChange={(e) => setForm((current) => ({ ...current, status: e.target.value }))}>
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </div>
        </div>
      </Modal>
    </section>
  );
}

import { useState } from 'react';
import Modal from '../../components/Modal';
import { useAchievements, useCreateAchievement, useUpdateAchievement, useDeleteAchievement } from '../../api/hooks/useAchievements';

const ACH_COLORS = [
  { gradient:'linear-gradient(135deg,#f59e0b,#f97316)', iconBg:'rgba(245,158,11,0.14)', color:'#fbbf24', border:'rgba(245,158,11,0.28)' },
  { gradient:'linear-gradient(135deg,#6366f1,#a78bfa)', iconBg:'rgba(99,102,241,0.14)', color:'#818cf8', border:'rgba(99,102,241,0.28)' },
  { gradient:'linear-gradient(135deg,#10b981,#34d399)', iconBg:'rgba(16,185,129,0.14)', color:'#34d399', border:'rgba(16,185,129,0.28)' },
  { gradient:'linear-gradient(135deg,#ef4444,#fb923c)', iconBg:'rgba(239,68,68,0.14)',  color:'#fb7185', border:'rgba(239,68,68,0.28)'  },
  { gradient:'linear-gradient(135deg,#3b82f6,#22d3ee)', iconBg:'rgba(59,130,246,0.14)', color:'#60a5fa', border:'rgba(59,130,246,0.28)' },
  { gradient:'linear-gradient(135deg,#7c3aed,#c084fc)', iconBg:'rgba(124,58,237,0.14)', color:'#c084fc', border:'rgba(124,58,237,0.28)' },
];

function blankForm() { return { title:'', description:'', category:'', thresholdLabel:'', icon:'fa-trophy', colorHex:'#00a877', active: true }; }

export default function AchievementsPage() {
  const { data: items = [], isLoading } = useAchievements();
  const createMutation = useCreateAchievement();
  const updateMutation = useUpdateAchievement();
  const deleteMutation = useDeleteAchievement();

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(blankForm());
  const [filterStatus, setFilterStatus] = useState('All');

  const f = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleCreate = () => {
    if (!form.title.trim()) return;
    createMutation.mutate({
      title: form.title,
      description: form.description,
      category: form.category,
      thresholdLabel: form.thresholdLabel,
      icon: form.icon || 'fa-trophy',
      colorHex: form.colorHex || '#00a877',
      active: form.active,
    });
    setForm(blankForm());
    setShowAdd(false);
  };

  const toggleStatus = (item) => {
    updateMutation.mutate({ ...item, active: !item.active });
  };

  const deleteItem = (item) => {
    if (!window.confirm('Delete this achievement?')) return;
    deleteMutation.mutate(item);
  };

  const visible = filterStatus === 'All' ? items : items.filter((i) => (filterStatus === 'Active' ? i.active : !i.active));
  const activeCount = items.filter((i) => i.active).length;

  return (
    <section className="page active space-y-4" id="page-achievements">
      <div className="page-hero ph-achievements">
        <div className="page-hero-left">
          <div className="page-hero-icon"><i className="fa fa-trophy"></i></div>
          <div className="page-hero-text">
            <h1>Achievements</h1>
            <p>Gamification milestones with trigger rules and lifecycle controls.</p>
          </div>
        </div>
        <div className="page-hero-right">
          <div className="page-hero-chips">
            <span className="page-hero-chip"><i className="fa fa-trophy"></i> {items.length} Total</span>
            <span className="page-hero-chip"><i className="fa fa-circle-check"></i> {activeCount} Active</span>
          </div>
          <button className="btn-primary" onClick={() => setShowAdd(true)}><i className="fa fa-plus"></i> Create</button>
        </div>
      </div>

      <div className="toolbar pt-1">
        <div className="toolbar-left"></div>
        <div className="toolbar-right">
          <select className="filter-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="All">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>

      {isLoading && (
        <div className="table-card full" style={{ padding: '20px', textAlign: 'center' }}>
          <span style={{ color: 'var(--text-3)' }}><i className="fa fa-spinner fa-spin"></i> Loading achievements...</span>
        </div>
      )}

      <div className="medals-grid">
        {visible.map((a, index) => {
          const color = ACH_COLORS[index % ACH_COLORS.length];
          return (
          <div key={a.id} className="medal-card rounded-2xl p-4 md:p-5" style={{ '--medal-gradient': color.gradient, '--medal-icon-bg': color.iconBg, '--medal-color': color.color, '--medal-border': color.border }}>
            <div className="medal-icon-ring" style={{ background: 'var(--medal-icon-bg)', borderColor: 'var(--medal-border)', color: 'var(--medal-color)' }}><i className={`fa ${a.icon || 'fa-trophy'}`}></i></div>
            <div className="medal-name text-sm font-semibold tracking-tight">{a.title}</div>
            <p className="medal-desc text-xs leading-relaxed">{a.description}</p>
            <div className="medal-trigger text-xs">{a.thresholdLabel || a.category}</div>
            <div className="medal-footer flex items-center justify-between gap-2">
              <span className={a.active ? 'medal-status-active' : 'medal-status-inactive'}>{a.active ? 'Active' : 'Inactive'}</span>
              <div className="flex items-center gap-2">
                <button className="btn-outline" onClick={() => toggleStatus(a)}>{a.active ? 'Disable' : 'Enable'}</button>
                <button className="act-btn red" title="Delete" onClick={() => deleteItem(a)}><i className="fa fa-trash"></i></button>
              </div>
            </div>
          </div>
        );})}
        {!visible.length && !isLoading && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px 0', color: 'var(--text-3)', fontSize: '0.84rem' }}>
            No achievements found. Create one to get started.
          </div>
        )}
      </div>

      <Modal open={showAdd} title="Create Achievement" onClose={() => setShowAdd(false)}
        footer={<><button className="btn-outline" onClick={() => setShowAdd(false)}>Cancel</button><button className="btn-primary" onClick={handleCreate}>Create</button></>}>
        <div className="form-grid p-1">
          <div className="form-field full"><label>Achievement Title</label><input className="setting-input" value={form.title} onChange={f('title')} placeholder="e.g. First Ride" /></div>
          <div className="form-field full"><label>Description</label><input className="setting-input" value={form.description} onChange={f('description')} placeholder="Brief description..." /></div>
          <div className="form-field"><label>Category</label><input className="setting-input" value={form.category} onChange={f('category')} placeholder="e.g. Distance" /></div>
          <div className="form-field"><label>Icon (FontAwesome)</label><input className="setting-input" value={form.icon} onChange={f('icon')} placeholder="fa-trophy" /></div>
          <div className="form-field full"><label>Trigger Condition</label><input className="setting-input" value={form.thresholdLabel} onChange={f('thresholdLabel')} placeholder="e.g. After 10 trips" /></div>
        </div>
      </Modal>
    </section>
  );
}

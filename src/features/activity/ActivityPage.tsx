import { useMemo } from 'react';
import { useFilterPanel, FilterPanel } from '../../components/ColumnFilter';
import { downloadCsv, timestampSlug } from '../../utils/clientActions';
import { useTrips } from '../../api/hooks/useTrips';

const COLUMNS = [
  { key: 'date', label: 'Date' },
  { key: 'user', label: 'User',         type: 'text' },
  { key: 'type', label: 'Vehicle Type' },
  { key: 'dist', label: 'Distance',     type: 'text' },
  { key: 'co2',  label: 'CO₂ Saved',    type: 'text' },
  { key: 'cal',  label: 'Calories',     type: 'text' },
  { key: 'org',  label: 'Org' },
];

export default function ActivityPage() {
  const fp = useFilterPanel();
  const { data: trips = [], isLoading } = useTrips();

  const ACTIVITY = useMemo(() => {
    return trips.map((trip) => {
      const dist = parseFloat(String(trip.dist || '0').replace(/[^0-9.]/g, '')) || 0;
      return {
        date: trip.date || '—',
        user: trip.user || 'Unknown',
        type: trip.vehicleType || 'E-Bike',
        dist: trip.dist || '0 km',
        co2: `${(dist * 0.08).toFixed(2)} kg`,
        cal: String(Math.round(dist * 38 + 10)),
        org: trip.org || 'Independent',
      };
    });
  }, [trips]);

  const visible = useMemo(() => ACTIVITY.filter((a) => COLUMNS.every((c) => fp.match(c.key, a[c.key]))), [fp.filters, ACTIVITY]);

  const activityStats = useMemo(() => {
    const total = visible.length;
    const co2 = visible.reduce((s, a) => s + (parseFloat(String(a.co2).replace(/[^0-9.]/g, '')) || 0), 0);
    const cal = visible.reduce((s, a) => s + (parseInt(String(a.cal).replace(/[^0-9]/g, '')) || 0), 0);
    return {
      total,
      co2: total ? `${co2.toFixed(0)} kg` : '—',
      cal: total ? cal.toLocaleString() : '—',
      buggy: visible.filter((a) => a.type === 'Buggy').length,
      bus: visible.filter((a) => a.type === 'Bus').length,
      cycle: visible.filter((a) => a.type === 'Cycle').length,
      ebike: visible.filter((a) => a.type === 'E-Bike' || a.type === 'E-Scooter').length,
    };
  }, [visible]);

  const handleExport = () => {
    downloadCsv(timestampSlug('activity-feed') + '.csv', visible.map((item) => ({
      date: item.date,
      user: item.user,
      vehicleType: item.type,
      distance: item.dist,
      co2Saved: item.co2,
      calories: item.cal,
      organization: item.org,
    })));
  };

  const dotClass = (type) => {
    if (type === 'E-Bike') return 'tl-dot-bike';
    if (type === 'Cycle') return 'tl-dot-cycle';
    return 'tl-dot-buggy';
  };

  return (
    <section className="page active space-y-4" id="page-activity">
      <div className="page-hero ph-activity">
        <div className="page-hero-left">
          <div className="page-hero-icon"><i className="fa fa-person-biking"></i></div>
          <div className="page-hero-text">
            <h1>Activity Intelligence</h1>
            <p>Live mobility stream with environmental impact, calories burned, and route behavior.</p>
          </div>
        </div>
        <div className="page-hero-right">
          <div className="page-hero-chips">
            <span className="page-hero-chip"><i className="fa fa-list-check"></i> {visible.length} Events</span>
            <span className="page-hero-chip"><i className="fa fa-leaf"></i> {activityStats.co2} CO₂ Saved</span>
          </div>
        </div>
      </div>

      <div className="cards-grid">
        <div className="kpi-card"><div className="kpi-icon green"><i className="fa fa-leaf"></i></div><div className="kpi-info"><span className="kpi-label">CO₂ Saved</span><span className="kpi-value">{activityStats.co2}</span></div></div>
        <div className="kpi-card"><div className="kpi-icon red"><i className="fa fa-fire"></i></div><div className="kpi-info"><span className="kpi-label">Calories Burned</span><span className="kpi-value">{activityStats.cal}</span></div></div>
        <div className="kpi-card"><div className="kpi-icon blue"><i className="fa fa-gauge-high"></i></div><div className="kpi-info"><span className="kpi-label">Avg Speed</span><span className="kpi-value">—</span></div></div>
        <div className="kpi-card"><div className="kpi-icon gold"><i className="fa fa-route"></i></div><div className="kpi-info"><span className="kpi-label">Total Trips</span><span className="kpi-value">{activityStats.total}</span></div></div>
      </div>

      {isLoading && (
        <div className="table-card full" style={{ padding: '16px', textAlign: 'center' }}>
          <span style={{ color: 'var(--text-3)', fontSize: '0.84rem' }}><i className="fa fa-spinner fa-spin"></i> Loading activity data...</span>
        </div>
      )}

      <div className="activity-timeline rounded-2xl p-3 md:p-4">
        <div className="activity-timeline-title">Recent Journey Timeline</div>
        {visible.slice(0, 20).map((a, i) => (
          <div className="tl-entry" key={`${a.user}-${a.date}-${i}`}>
            <div className={`tl-dot ${dotClass(a.type)}`}></div>
            <div className="tl-content">
              <div className="tl-title">{a.user} completed a {a.type} trip in {a.org}</div>
              <div className="tl-meta">{a.date} • {a.dist}</div>
              <div className="tl-chips">
                <span className="tl-chip"><i className="fa fa-leaf"></i> {a.co2}</span>
                <span className="tl-chip"><i className="fa fa-fire"></i> {a.cal}</span>
              </div>
            </div>
          </div>
        ))}
        {!visible.length && !isLoading && (
          <p style={{ color: 'var(--text-3)', fontSize: '0.82rem', textAlign: 'center', padding: '18px 0', margin: 0 }}>No activity data available.</p>
        )}
      </div>

      <div className="cards-grid cards-grid-compact">
        <div className="kpi-card"><div className="kpi-icon blue"><i className="fa fa-shuttle-space"></i></div><div className="kpi-info"><span className="kpi-label">Buggy Trips</span><span className="kpi-value">{activityStats.buggy}</span></div></div>
        <div className="kpi-card"><div className="kpi-icon gold"><i className="fa fa-bus"></i></div><div className="kpi-info"><span className="kpi-label">Bus Trips</span><span className="kpi-value">{activityStats.bus}</span></div></div>
        <div className="kpi-card"><div className="kpi-icon green"><i className="fa fa-bicycle"></i></div><div className="kpi-info"><span className="kpi-label">Cycle Trips</span><span className="kpi-value">{activityStats.cycle}</span></div></div>
        <div className="kpi-card"><div className="kpi-icon red"><i className="fa fa-bolt"></i></div><div className="kpi-info"><span className="kpi-label">E-Bike Trips</span><span className="kpi-value">{activityStats.ebike}</span></div></div>
      </div>

      <div className="toolbar">
        <div className="toolbar-left"></div>
        <div className="toolbar-right">
          <button className={`btn-outline${fp.anyFiltered ? ' filter-btn-active' : ''}`} onClick={() => fp.setOpen(true)}>
            <i className="fa fa-filter"></i> Filter{fp.anyFiltered ? ` (${fp.filterCount})` : ''}
          </button>
          <button className="btn-outline" onClick={handleExport}><i className="fa fa-file-export"></i> Export</button>
        </div>
      </div>

      <div className="table-card full">
        <div className="card-header"><h3>Activity Feed</h3></div>
        <div className="table-wrap overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th><th>User</th><th>Vehicle Type</th><th>Distance</th>
                <th>CO₂ Saved</th><th>Calories</th><th>Org</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((a, i) => (
                <tr key={i}>
                  <td>{a.date}</td><td>{a.user}</td><td>{a.type}</td><td>{a.dist}</td>
                  <td>{a.co2}</td><td>{a.cal}</td><td>{a.org}</td>
                </tr>
              ))}
              {!visible.length && !isLoading && (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-3)', padding: '18px 0', fontSize: '0.82rem' }}>No activity data.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <FilterPanel hook={fp} columns={COLUMNS} data={ACTIVITY} />
    </section>
  );
}

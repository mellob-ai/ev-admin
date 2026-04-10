import { useMemo, useState } from 'react';
import Modal from '../../components/Modal';
import { useFilterPanel, FilterPanel } from '../../components/ColumnFilter';
import { downloadCsv, timestampSlug } from '../../utils/clientActions';
import { useTrips } from '../../api/hooks/useTrips';

const COLUMNS = [
  { key: 'id',      label: 'Trip ID',   type: 'text' },
  { key: 'user',    label: 'User',      type: 'text' },
  { key: 'vehicle', label: 'Vehicle' },
  { key: 'from',    label: 'From' },
  { key: 'to',      label: 'To' },
  { key: 'dist',    label: 'Distance' },
  { key: 'dur',     label: 'Duration' },
  { key: 'fare',    label: 'Fare' },
  { key: 'date',    label: 'Date' },
];

export default function TripsPage() {
  const { data: apiTrips = [], isLoading } = useTrips();
  const trips = useMemo(() => apiTrips.map((r) => ({
    id: r.id,
    user: r.userId || 'Unknown',
    vehicle: r.bikeId || 'N/A',
    from: r.stationId || 'N/A',
    to: '',
    dist: r.distance,
    dur: r.duration,
    fare: '₹0',
    date: r.date,
    status: r.status || 'completed',
    org: '',
    paymentMethod: r.accessMode || 'wallet',
    vehicleType: 'E-Bike',
    licensePlate: '',
    notes: '',
    feedback: '',
  })), [apiTrips]);

  const [selected, setSelected] = useState([]);
  const [detailTrip, setDetailTrip] = useState(null);
  const [detailUser, setDetailUser] = useState(null);
  const [detailVehicle, setDetailVehicle] = useState(null);
  const [detailTab, setDetailTab] = useState('overview');
  const fp = useFilterPanel();

  const visible = useMemo(() => trips.filter((t) => COLUMNS.every((c) => fp.match(c.key, t[c.key]))), [trips, fp.filters]);
  const totalRevenue = useMemo(() => trips.reduce((s, t) => s + (parseFloat(String(t.fare).replace(/[^0-9.]/g, '')) || 0), 0), [trips]);

  const tripStats = useMemo(() => {
    const count = trips.length;
    if (!count) return { avgDist: '—', avgDur: '—', avgPerDay: '—' };
    const totalDist = trips.reduce((s, t) => s + (parseFloat(String(t.dist).replace(/[^0-9.]/g, '')) || 0), 0);
    const totalDur = trips.reduce((s, t) => s + (parseInt(String(t.dur).replace(/[^0-9]/g, '')) || 0), 0);
    const uniqueDays = new Set(trips.map((t) => t.date)).size || 1;
    return {
      avgDist: `${(totalDist / count).toFixed(1)} km`,
      avgDur: `${Math.round(totalDur / count)} min`,
      avgPerDay: `${(totalDist / uniqueDays).toFixed(1)} km`,
    };
  }, [trips]);

  const toggleAll = (checked) => setSelected(checked ? visible.map((trip) => trip.id) : []);
  const toggleRow = (tripId, checked) => setSelected((prev) => checked ? [...prev, tripId] : prev.filter((id) => id !== tripId));
  const openTripDetail = (trip) => { setDetailTrip(trip); setDetailTab('overview'); };
  const openUserDetail = (trip) => setDetailUser(trip);
  const openVehicleDetail = (trip) => setDetailVehicle(trip);
  const handleDownloadReport = () => {
    downloadCsv(timestampSlug('trips-report') + '.csv', visible.map((trip) => ({
      tripId: trip.id,
      user: trip.user,
      vehicle: trip.vehicle,
      from: trip.from,
      to: trip.to,
      distance: trip.dist,
      duration: trip.dur,
      fare: trip.fare,
      date: trip.date,
    })));
  };

  return (
    <section className="page active space-y-4" id="page-trips">
      <div className="page-hero ph-trips">
        <div className="page-hero-left">
          <div className="page-hero-icon"><i className="fa fa-route"></i></div>
          <div className="page-hero-text">
            <h1>Trip History</h1>
            <p>Browse all completed trips till date with route, fare, user, and vehicle drill-downs.</p>
          </div>
        </div>
        <div className="page-hero-right">
          <div className="page-hero-chips">
            <span className="page-hero-chip"><i className="fa fa-list"></i> {trips.length.toLocaleString('en-IN')} Completed Trips</span>
            <span className="page-hero-chip"><i className="fa fa-road"></i> {tripStats.avgPerDay} Avg / Day</span>
          </div>
        </div>
      </div>

      <div className="cards-grid">
        <div className="kpi-card"><div className="kpi-icon blue"><i className="fa fa-flag-checkered"></i></div><div className="kpi-info"><span className="kpi-label">Completed Till Date</span><span className="kpi-value">{trips.length.toLocaleString('en-IN')}</span></div></div>
        <div className="kpi-card"><div className="kpi-icon green"><i className="fa fa-road"></i></div><div className="kpi-info"><span className="kpi-label">Avg Distance</span><span className="kpi-value">{tripStats.avgDist}</span></div></div>
        <div className="kpi-card"><div className="kpi-icon gold"><i className="fa fa-clock"></i></div><div className="kpi-info"><span className="kpi-label">Avg Duration</span><span className="kpi-value">{tripStats.avgDur}</span></div></div>
        <div className="kpi-card"><div className="kpi-icon red"><i className="fa fa-wallet"></i></div><div className="kpi-info"><span className="kpi-label">Revenue Till Date</span><span className="kpi-value">₹{totalRevenue.toLocaleString()}</span></div></div>
      </div>

      <div className="toolbar">
        <div className="toolbar-left">
          {selected.length > 0 && <span className="page-hero-chip"><i className="fa fa-check-square"></i> {selected.length} selected</span>}
        </div>
        <div className="toolbar-right">
          <button className={`btn-outline${fp.anyFiltered ? ' filter-btn-active' : ''}`} onClick={() => fp.setOpen(true)}>
            <i className="fa fa-filter"></i> Filter{fp.anyFiltered ? ` (${fp.filterCount})` : ''}
          </button>
          <button className="btn-outline" onClick={handleDownloadReport}><i className="fa fa-file-export"></i> Download Report</button>
        </div>
      </div>

      <div className="table-card full">
        <div className="table-wrap overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th><input type="checkbox" checked={visible.length > 0 && selected.length === visible.length} onChange={(e) => toggleAll(e.target.checked)} /></th>
                <th>Trip ID</th><th>User</th><th>Vehicle</th><th>From</th><th>To</th>
                <th>Distance</th><th>Duration</th><th>Fare</th><th>Date</th><th>Action</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((t) => (
                <tr key={t.id}>
                  <td><input type="checkbox" checked={selected.includes(t.id)} onChange={(e) => toggleRow(t.id, e.target.checked)} /></td>
                  <td><button className="link-btn" onClick={() => openTripDetail(t)}><span className="trip-id-mono">{t.id}</span></button></td>
                  <td><button className="link-btn" onClick={() => openUserDetail(t)}>{t.user}</button></td>
                  <td><button className="link-btn" onClick={() => openVehicleDetail(t)}><span className="trip-id-mono">{t.vehicle}</span></button></td>
                  <td>{t.from}</td><td>{t.to}</td>
                  <td>{t.dist}</td><td>{t.dur}</td><td><strong>{t.fare}</strong></td><td>{t.date}</td>
                  <td><button className="act-btn" title="View Details" onClick={() => openTripDetail(t)}><i className="fa fa-eye"></i></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {detailTrip && (
        <Modal open={true} title={`Trip Details: ${detailTrip.id}`} onClose={() => setDetailTrip(null)} size="large" footer={<button className="btn-outline" onClick={() => setDetailTrip(null)}>Close</button>}>
          <div className="detail-tabs">
            <div className="tab-buttons">
              <button className={`tab-btn${detailTab === 'overview' ? ' active' : ''}`} onClick={() => setDetailTab('overview')}><i className="fa fa-info-circle"></i> Overview</button>
              <button className={`tab-btn${detailTab === 'route' ? ' active' : ''}`} onClick={() => setDetailTab('route')}><i className="fa fa-map"></i> Route</button>
              <button className={`tab-btn${detailTab === 'payment' ? ' active' : ''}`} onClick={() => setDetailTab('payment')}><i className="fa fa-credit-card"></i> Payment</button>
              <button className={`tab-btn${detailTab === 'feedback' ? ' active' : ''}`} onClick={() => setDetailTab('feedback')}><i className="fa fa-comment"></i> Feedback</button>
            </div>
            {detailTab === 'overview' && <div className="detail-content"><div className="detail-grid"><div className="detail-section"><h4>Trip Information</h4><div className="detail-row"><label>Trip ID</label><span className="mono">{detailTrip.id}</span></div><div className="detail-row"><label>Status</label><span className="status completed">{detailTrip.status}</span></div><div className="detail-row"><label>Date</label><span>{detailTrip.date}</span></div><div className="detail-row"><label>Duration</label><span>{detailTrip.dur}</span></div></div><div className="detail-section"><h4>Passenger</h4><div className="detail-row"><label>User</label><span>{detailTrip.user}</span></div><div className="detail-row"><label>Organization</label><span>{detailTrip.org}</span></div><div className="detail-row"><label>Payment</label><span>{detailTrip.paymentMethod}</span></div></div><div className="detail-section"><h4>Vehicle Information</h4><div className="detail-row"><label>Vehicle ID</label><span className="mono">{detailTrip.vehicle}</span></div><div className="detail-row"><label>Type</label><span>{detailTrip.vehicleType}</span></div><div className="detail-row"><label>License Plate</label><span className="mono">{detailTrip.licensePlate}</span></div></div><div className="detail-section"><h4>Fare & Distance</h4><div className="detail-row"><label>Distance</label><span>{detailTrip.dist}</span></div><div className="detail-row"><label>Fare</label><span>{detailTrip.fare}</span></div></div></div></div>}
            {detailTab === 'route' && <div className="detail-content"><div className="route-section"><h4>Trip Route</h4><div className="location-info"><div className="location-item"><div className="location-marker"><i className="fa fa-circle" style={{ color: 'var(--brand)' }}></i></div><div><div className="location-label">Pickup Location</div><div className="location-address">{detailTrip.from}</div></div></div><div className="route-line"></div><div className="location-item"><div className="location-marker"><i className="fa fa-flag" style={{ color: 'var(--brand-2)' }}></i></div><div><div className="location-label">Dropoff Location</div><div className="location-address">{detailTrip.to}</div></div></div></div></div></div>}
            {detailTab === 'payment' && <div className="detail-content"><div className="payment-section"><div className="detail-section"><h4>Fare Details</h4><div className="detail-row"><label>Total Fare</label><span style={{ color: 'var(--brand)', fontWeight: '700', fontSize: '1.1rem' }}>{detailTrip.fare}</span></div><div className="detail-row"><label>Payment Method</label><span>{detailTrip.paymentMethod}</span></div></div></div></div>}
            {detailTab === 'feedback' && <div className="detail-content"><div className="feedback-section"><div className="detail-section"><h4>Trip Notes</h4><div className="feedback-box"><p>{detailTrip.notes}</p></div></div><div className="detail-section"><h4>User Feedback</h4><div className="feedback-box"><p>{detailTrip.feedback}</p></div></div></div></div>}
          </div>
        </Modal>
      )}

      {detailUser && (
        <Modal open={true} title={`User Details: ${detailUser.user}`} onClose={() => setDetailUser(null)} size="md" footer={<button className="btn-outline" onClick={() => setDetailUser(null)}>Close</button>}>
          <div className="detail-content"><div className="detail-grid"><div className="detail-section"><h4>User Profile</h4><div className="detail-row"><label>Name</label><span>{detailUser.user}</span></div><div className="detail-row"><label>Organization</label><span>{detailUser.org}</span></div><div className="detail-row"><label>Latest Trip</label><span className="mono">{detailUser.id}</span></div></div><div className="detail-section"><h4>Usage Snapshot</h4><div className="detail-row"><label>Vehicle</label><span>{detailUser.vehicle}</span></div><div className="detail-row"><label>Fare</label><span>{detailUser.fare}</span></div><div className="detail-row"><label>Date</label><span>{detailUser.date}</span></div></div></div></div>
        </Modal>
      )}

      {detailVehicle && (
        <Modal open={true} title={`Vehicle Details: ${detailVehicle.vehicle}`} onClose={() => setDetailVehicle(null)} size="md" footer={<button className="btn-outline" onClick={() => setDetailVehicle(null)}>Close</button>}>
          <div className="detail-content"><div className="detail-grid"><div className="detail-section"><h4>Vehicle Profile</h4><div className="detail-row"><label>Vehicle ID</label><span className="mono">{detailVehicle.vehicle}</span></div><div className="detail-row"><label>Type</label><span>{detailVehicle.vehicleType}</span></div><div className="detail-row"><label>License Plate</label><span className="mono">{detailVehicle.licensePlate}</span></div></div><div className="detail-section"><h4>Latest Assignment</h4><div className="detail-row"><label>Trip</label><span className="mono">{detailVehicle.id}</span></div><div className="detail-row"><label>User</label><span>{detailVehicle.user}</span></div><div className="detail-row"><label>Organization</label><span>{detailVehicle.org}</span></div></div></div></div>
        </Modal>
      )}

      <FilterPanel hook={fp} columns={COLUMNS} data={trips} />
    </section>
  );
}

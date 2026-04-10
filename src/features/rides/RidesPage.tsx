import { useState, useMemo, useEffect } from 'react';
import Modal from '../../components/Modal';
import { useFilterPanel, FilterPanel } from '../../components/ColumnFilter';
import { BUSINESS_SETUP_UPDATED_EVENT, isDriverManagedVehicleType, loadBusinessSetup } from '../../config/business-setup';
import { forceEndRide } from '../../api/services/ridesService';
import { useRides } from '../../api/hooks/useRides';

const TODAY_LABEL = new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });

const COLUMNS = [
  { key: 'id',       label: 'Ride ID',      type: 'text' },
  { key: 'user',     label: 'User',         type: 'text' },
  { key: 'vehicle',  label: 'Vehicle' },
  { key: 'start',    label: 'Start Time',   type: 'text' },
  { key: 'duration', label: 'Duration',     type: 'text' },
  { key: 'org',      label: 'Organization' },
  { key: 'status',   label: 'Status' },
];

function getServiceModel(orgName) {
  const org = String(orgName || '').toLowerCase();
  if (org.includes('campus')) return 'Campus Mobility';
  if (org.includes('park') || org.includes('public')) return 'Public Mobility';
  return 'Corporate Mobility';
}

function getBillingSource(paymentMethod) {
  if (paymentMethod === 'Corporate Account') return 'Enterprise Account';
  if (paymentMethod === 'Digital Wallet') return 'Rider Wallet';
  return paymentMethod;
}

function getInterventionState(ride) {
  if (ride.status === 'Active') return ride.stops > 0 ? 'Watch Route' : 'Monitoring Live';
  return 'No Action Required';
}

function getExceptionSignal(ride) {
  if (ride.status === 'Active' && ride.route === 'Walking distance') return 'Short-hop ride under active watch';
  if (ride.stops > 1) return 'Multi-stop service pattern detected';
  if (ride.route === 'Optimized Route') return 'Route optimization applied';
  return 'Standard operating pattern';
}

function getSettlementState(ride) {
  return ride.status === 'Completed' ? 'Settled' : 'Open';
}

function getFareCategory(ride) {
  const distanceValue = parseFloat(String(ride.distance).replace(/[^0-9.]/g, ''));
  if (distanceValue <= 1) return 'Micro Mobility';
  if (distanceValue <= 5) return 'Standard Commute';
  return 'Extended Route';
}

export default function RidesPage() {
  const { data: apiRides = [], isLoading: isRidesLoading } = useRides();
  const [businessSetup, setBusinessSetup] = useState(loadBusinessSetup);
  const [rides, setRides] = useState([]);
  const [selected, setSelected] = useState([]);
  const [detailRide, setDetailRide] = useState(null);
  const [detailUser, setDetailUser] = useState(null);
  const [detailVehicle, setDetailVehicle] = useState(null);
  const [detailTab, setDetailTab] = useState('overview');
  const [userDetailTab, setUserDetailTab] = useState('overview');
  const fp = useFilterPanel();

  useEffect(() => {
    const reloadBusinessSetup = () => setBusinessSetup(loadBusinessSetup());
    window.addEventListener(BUSINESS_SETUP_UPDATED_EVENT, reloadBusinessSetup);
    return () => window.removeEventListener(BUSINESS_SETUP_UPDATED_EVENT, reloadBusinessSetup);
  }, []);

  useEffect(() => {
    if (apiRides.length) setRides(apiRides);
  }, [apiRides]);



  const ridesForOperations = useMemo(() => (
    rides.filter((ride) => ride.status === 'Active' || (ride.status === 'Completed' && ride.rideDate === TODAY_LABEL))
  ), [rides]);

  const visible = useMemo(() => ridesForOperations.filter((r) => COLUMNS.every((c) => fp.match(c.key, r[c.key]))), [ridesForOperations, fp.filters]);

  const rideStats = useMemo(() => {
    const durations = rides.filter((r) => r.duration && /\d/.test(String(r.duration)));
    const avgDur = durations.length
      ? `${Math.round(durations.reduce((s, r) => s + (parseInt(String(r.duration).replace(/[^0-9]/g, '')) || 0), 0) / durations.length)} min`
      : '—';
    const todayFares = rides
      .filter((r) => r.rideDate === TODAY_LABEL)
      .reduce((s, r) => s + (parseFloat(String(r.fare || '').replace(/[^0-9.]/g, '')) || 0), 0);
    return {
      avgDur,
      todayRevenue: todayFares ? `₹${todayFares.toLocaleString('en-IN')}` : '—',
    };
  }, [rides]);

  const forceEnd = async (id) => {
    if (!window.confirm('Force end this ride? The user will be charged for current duration.')) return;
    try {
      await forceEndRide(id);
    } catch (error) {
      console.error('Force end ride failed:', error);
    }
    setRides((p) => p.map((r) => r.id === id ? { ...r, status: 'Completed' } : r));
  };

  const openRideDetail = (ride) => {
    setDetailRide(ride);
    setDetailTab('overview');
  };

  const openUserDetail = (ride) => {
    setDetailUser(ride);
    setUserDetailTab('overview');
  };

  const openVehicleDetail = (ride) => {
    setDetailVehicle(ride);
  };

  const closeDetail = () => {
    setDetailRide(null);
  };

  const toggleSelectAll = (checked) => {
    setSelected(checked ? visible.map((ride) => ride.id) : []);
  };

  const toggleSelectRow = (rideId, checked) => {
    setSelected((prev) => checked ? [...prev, rideId] : prev.filter((id) => id !== rideId));
  };

  const userRideHistory = useMemo(() => {
    if (!detailUser) return [];
    return rides.filter((ride) => ride.user === detailUser.user);
  }, [detailUser, rides]);

  const userProfile = useMemo(() => {
    if (!detailUser) return null;

    const completedRides = userRideHistory.filter((ride) => ride.status === 'Completed').length;
    const activeRides = userRideHistory.filter((ride) => ride.status === 'Active').length;

    return {
      id: `USR-${detailUser.id.replace('RD-', '')}`,
      empId: `EMP-${detailUser.id.replace('RD-', '')}`,
      name: detailUser.user,
      email: `${detailUser.user.toLowerCase().replace(/\s+/g, '.')}@mjollnir.io`,
      role: detailUser.org.toLowerCase().includes('campus') ? 'Student / Staff' : 'Rider',
      businessType: detailUser.org.toLowerCase().includes('campus') ? 'Campus Mobility' : detailUser.org.toLowerCase().includes('park') || detailUser.org.toLowerCase().includes('public') ? 'Public / General Mobility' : 'Corporate Mobility',
      orgType: detailUser.org.toLowerCase().includes('campus') ? 'University / College' : detailUser.org.toLowerCase().includes('park') || detailUser.org.toLowerCase().includes('public') ? 'Public Zone' : 'Corporate Office',
      orgName: detailUser.org,
      status: detailUser.status === 'Active' ? 'Active' : 'Completed',
      joined: '12 Jan 2026',
      wallet: detailUser.paymentMethod === 'Corporate Account' ? '₹0' : '₹1,240',
      coins: detailUser.paymentMethod === 'Corporate Account' ? 0 : 148,
      location: `${detailUser.pickupLoc} -> ${detailUser.dropoffLoc}`,
      rides: userRideHistory.length,
      activeRides,
      completedRides,
      cancelledRides: 0,
      subscriptions: detailUser.paymentMethod === 'Corporate Account'
        ? []
        : [{ id: 'SUB-001', name: 'Mobility Prime', amount: '₹899', startDate: '01 Mar 2026', status: 'Active' }],
      groups: detailUser.org ? [detailUser.org] : [],
      achievements: [
        { id: 'ACH-001', name: 'Frequent Rider', note: 'Completed 10+ rides this month' },
        { id: 'ACH-002', name: 'Green Traveller', note: `Saved ${detailUser.co2Saved} CO2 on latest ride` },
      ],
    };
  }, [detailUser, userRideHistory]);

  const rideSummary = useMemo(() => {
    if (!detailRide) return null;

    return {
      hasDriver: isDriverManagedVehicleType(businessSetup, detailRide.vehicleType),
      serviceModel: getServiceModel(detailRide.org),
      billingSource: getBillingSource(detailRide.paymentMethod),
      interventionState: getInterventionState(detailRide),
      exceptionSignal: getExceptionSignal(detailRide),
      settlementState: getSettlementState(detailRide),
      fareCategory: getFareCategory(detailRide),
      serviceWindow: detailRide.endTime || detailRide.estimatedEnd || 'In progress',
    };
  }, [detailRide]);

  return (
    <section className="page active space-y-4" id="page-rides">
      <div className="page-hero ph-rides">
        <div className="page-hero-left">
          <div className="page-hero-icon"><i className="fa fa-motorcycle"></i></div>
          <div className="page-hero-text">
            <h1>Ride Operations</h1>
            <p>Track active rides, deep dive trip diagnostics, and intervene instantly when required.</p>
          </div>
        </div>
        <div className="page-hero-right">
          <div className="page-hero-chips">
            <span className="page-hero-chip"><i className="fa fa-spinner"></i> {rides.filter((r) => r.status === 'Active').length} Active Till Date</span>
            <span className="page-hero-chip"><i className="fa fa-flag-checkered"></i> {rides.filter((r) => r.status === 'Completed' && r.rideDate === TODAY_LABEL).length} Completed Today</span>
          </div>
        </div>
      </div>

      <div className="cards-grid">
        <div className="kpi-card"><div className="kpi-icon gold"><i className="fa fa-spinner"></i></div><div className="kpi-info"><span className="kpi-label">Active Rides Till Date</span><span className="kpi-value">{rides.filter((r) => r.status === 'Active').length}</span></div></div>
        <div className="kpi-card"><div className="kpi-icon blue"><i className="fa fa-flag-checkered"></i></div><div className="kpi-info"><span className="kpi-label">Completed Today</span><span className="kpi-value">{rides.filter((r) => r.status === 'Completed' && r.rideDate === TODAY_LABEL).length}</span></div></div>
        <div className="kpi-card"><div className="kpi-icon green"><i className="fa fa-clock"></i></div><div className="kpi-info"><span className="kpi-label">Avg Duration</span><span className="kpi-value">{rideStats.avgDur}</span></div></div>
        <div className="kpi-card"><div className="kpi-icon red"><i className="fa fa-indian-rupee-sign"></i></div><div className="kpi-info"><span className="kpi-label">Revenue Today</span><span className="kpi-value">{rideStats.todayRevenue}</span></div></div>
      </div>

      <div className="toolbar">
        <div className="toolbar-left">
          {selected.length > 0 && (
            <span className="page-hero-chip"><i className="fa fa-check-square"></i> {selected.length} selected</span>
          )}
        </div>
        <div className="toolbar-right">
          <button className={`btn-outline${fp.anyFiltered ? ' filter-btn-active' : ''}`} onClick={() => fp.setOpen(true)}>
            <i className="fa fa-filter"></i> Filter{fp.anyFiltered ? ` (${fp.filterCount})` : ''}
          </button>
        </div>
      </div>

      {isRidesLoading && (
        <div className="table-card full" style={{ padding: '8px 12px' }}>
          <span className="text-[11px] opacity-80"><i className="fa fa-spinner fa-spin"></i> Loading rides...</span>
        </div>
      )}

      <div className="table-card full">
        <div className="table-wrap overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={visible.length > 0 && selected.length === visible.length}
                    onChange={(e) => toggleSelectAll(e.target.checked)}
                    aria-label="Select all rides"
                  />
                </th>
                <th>Ride ID</th><th>User</th><th>Vehicle</th><th>Start Time</th>
                <th>Duration</th><th>Organization</th><th>Status</th><th>Action</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.includes(r.id)}
                      onChange={(e) => toggleSelectRow(r.id, e.target.checked)}
                      aria-label={`Select ${r.id}`}
                    />
                  </td>
                  <td><button className="link-btn" onClick={() => openRideDetail(r)}><span className="trip-id-mono">{r.id}</span></button></td>
                  <td><button className="link-btn" onClick={() => openUserDetail(r)}>{r.user}</button></td>
                  <td><button className="link-btn" onClick={() => openVehicleDetail(r)}><span className="trip-id-mono">{r.vehicle}</span></button></td>
                  <td>{r.start}</td>
                  <td>{r.duration}</td>
                  <td>{r.org}</td>
                  <td><span className={`status ${r.status === 'Active' ? 'pending' : 'completed'}`}>{r.status}</span></td>
                  <td>
                    <button className="act-btn" title="View Details" onClick={() => openRideDetail(r)}><i className="fa fa-eye"></i></button>
                    {r.status === 'Active' && (
                      <button className="act-btn red" title="Force End" onClick={() => forceEnd(r.id)}><i className="fa fa-stop"></i></button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {detailRide && (
        <Modal open={true} title={`Ride Details: ${detailRide.id}`} onClose={closeDetail} size="large"
          footer={<><button className="btn-outline" onClick={closeDetail}>Close</button></>}>
          <div className="detail-tabs">
            <div className="tab-buttons">
              <button className={`tab-btn${detailTab === 'overview' ? ' active' : ''}`} onClick={() => setDetailTab('overview')}><i className="fa fa-info-circle"></i> Summary</button>
              <button className={`tab-btn${detailTab === 'route' ? ' active' : ''}`} onClick={() => setDetailTab('route')}><i className="fa fa-map"></i> Route</button>
              <button className={`tab-btn${detailTab === 'payment' ? ' active' : ''}`} onClick={() => setDetailTab('payment')}><i className="fa fa-credit-card"></i> Payment</button>
              <button className={`tab-btn${detailTab === 'feedback' ? ' active' : ''}`} onClick={() => setDetailTab('feedback')}><i className="fa fa-comment"></i> Feedback</button>
            </div>

            {detailTab === 'overview' && rideSummary && (
              <div className="detail-content">
                <div className="ride-ops-summary">
                  <div className="route-stats">
                    <div className="stat-box">
                      <div className="stat-value">
                        <span className={`detail-signal ${detailRide.status === 'Active' ? 'live' : 'closed'}`}>{detailRide.status === 'Active' ? 'In Service' : 'Closed'}</span>
                      </div>
                      <div className="stat-label">Mission Status</div>
                    </div>
                    <div className="stat-box">
                      <div className="stat-value">{detailRide.duration}</div>
                      <div className="stat-label">Elapsed Time</div>
                    </div>
                    <div className="stat-box">
                      <div className="stat-value">{detailRide.distance}</div>
                      <div className="stat-label">Route Distance</div>
                    </div>
                    <div className="stat-box">
                      <div className="stat-value">{detailRide.co2Saved}</div>
                      <div className="stat-label">Carbon Reduction</div>
                    </div>
                  </div>
                </div>

                <div className="detail-grid">
                  <div className="detail-section ride-detail-span-2">
                    <h4>Mission Snapshot</h4>
                    <div className="detail-row"><label>Mission ID</label><span className="mono">{detailRide.id}</span></div>
                    <div className="detail-row"><label>Mission Status</label><span><span className={`detail-signal ${detailRide.status === 'Active' ? 'live' : 'closed'}`}>{detailRide.status === 'Active' ? 'In Service' : 'Closed'}</span></span></div>
                    <div className="detail-row"><label>Service Date</label><span>{detailRide.rideDate}</span></div>
                    <div className="detail-row"><label>Dispatch Start</label><span>{detailRide.startTime}</span></div>
                    <div className="detail-row"><label>{detailRide.endTime ? 'Close Time' : 'Expected Close'}</label><span>{rideSummary.serviceWindow}</span></div>
                    <div className="detail-row"><label>Operating Account</label><span>{detailRide.org}</span></div>
                  </div>

                  <div className="detail-section">
                    <h4>Route and Service Window</h4>
                    <div className="detail-row detail-row-stack"><label>Boarding Point</label><span className="detail-row-value-stack"><strong>{detailRide.pickupLoc}</strong><small>Ride entry location</small></span></div>
                    <div className="detail-row detail-row-stack"><label>Destination Point</label><span className="detail-row-value-stack"><strong>{detailRide.dropoffLoc}</strong><small>Ride completion location</small></span></div>
                    <div className="detail-row"><label>Routing Mode</label><span>{detailRide.route}</span></div>
                    <div className="detail-row"><label>Intermediate Stops</label><span>{detailRide.stops}</span></div>
                  </div>

                  <div className="detail-section">
                    <h4>Rider and Service Account</h4>
                    <div className="detail-row"><label>Rider</label><span>{detailRide.user}</span></div>
                    <div className="detail-row"><label>Service Model</label><span>{rideSummary.serviceModel}</span></div>
                    <div className="detail-row"><label>Billing Source</label><span>{rideSummary.billingSource}</span></div>
                    <div className="detail-row"><label>Rider Satisfaction</label><span><i className="fa fa-star" style={{ color: 'var(--brand)' }}></i> {detailRide.rating}</span></div>
                  </div>

                  <div className="detail-section">
                    <h4>Assigned Vehicle</h4>
                    <div className="detail-row"><label>Assigned Vehicle ID</label><span className="mono">{detailRide.vehicle}</span></div>
                    <div className="detail-row"><label>Vehicle Class</label><span>{detailRide.vehicleType}</span></div>
                    <div className="detail-row"><label>Plate Number</label><span className="mono">{detailRide.licensePlate}</span></div>
                    {rideSummary.hasDriver ? (
                      <>
                        <div className="detail-row"><label>Assigned Driver</label><span>{detailRide.driverName}</span></div>
                        <div className="detail-row"><label>Driver Service Score</label><span><i className="fa fa-star" style={{ color: 'var(--brand)' }}></i> {detailRide.driverRating}</span></div>
                      </>
                    ) : (
                      <div className="detail-row"><label>Operation Mode</label><span>Self Ride</span></div>
                    )}
                  </div>

                  <div className="detail-section">
                    <h4>Mobility Intelligence</h4>
                    <div className="detail-row"><label>Route Distance</label><span>{detailRide.distance}</span></div>
                    <div className="detail-row"><label>Carbon Reduction</label><span style={{ color: 'var(--brand)' }}>{detailRide.co2Saved}</span></div>
                    <div className="detail-row"><label>Operating Conditions</label><span>{detailRide.temperature}</span></div>
                    <div className="detail-row"><label>Service Pattern</label><span>{rideSummary.exceptionSignal}</span></div>
                  </div>

                  <div className="detail-section">
                    <h4>Billing and Controls</h4>
                    <div className="detail-row"><label>Fare Total</label><span>{detailRide.fare}</span></div>
                    <div className="detail-row"><label>Settlement State</label><span><span className={`detail-signal ${rideSummary.settlementState === 'Settled' ? 'closed' : 'live'}`}>{rideSummary.settlementState}</span></span></div>
                    <div className="detail-row"><label>Trip Category</label><span>{rideSummary.fareCategory}</span></div>
                    <div className="detail-row"><label>Intervention State</label><span>{rideSummary.interventionState}</span></div>
                  </div>

                  <div className="detail-section ride-detail-span-2">
                    <h4>Ops Notes</h4>
                    <div className="ops-note-callout">
                      <div className="ops-note-title">Operational Signal</div>
                      <p>{rideSummary.exceptionSignal}</p>
                    </div>
                    <div className="feedback-box">
                      <p><strong>Driver note:</strong> {detailRide.notes}</p>
                      <p><strong>Rider feedback:</strong> {detailRide.feedback}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {detailTab === 'route' && (
              <div className="detail-content">
                <div className="route-section">
                  <h4>Trip Route</h4>
                  <div className="location-info">
                    <div className="location-item">
                      <div className="location-marker"><i className="fa fa-circle" style={{ color: 'var(--brand)' }}></i></div>
                      <div>
                        <div className="location-label">Pickup Location</div>
                        <div className="location-address">{detailRide.pickupLoc}</div>
                      </div>
                    </div>
                    <div className="route-line"></div>
                    <div className="location-item">
                      <div className="location-marker"><i className="fa fa-flag" style={{ color: 'var(--brand-2)' }}></i></div>
                      <div>
                        <div className="location-label">Dropoff Location</div>
                        <div className="location-address">{detailRide.dropoffLoc}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="route-stats">
                  <div className="stat-box">
                    <div className="stat-value">{detailRide.distance}</div>
                    <div className="stat-label">Distance</div>
                  </div>
                  <div className="stat-box">
                    <div className="stat-value">{detailRide.duration}</div>
                    <div className="stat-label">Duration</div>
                  </div>
                  <div className="stat-box">
                    <div className="stat-value">{detailRide.route}</div>
                    <div className="stat-label">Route Type</div>
                  </div>
                </div>
              </div>
            )}

            {detailTab === 'payment' && (
              <div className="detail-content">
                <div className="payment-section">
                  <div className="detail-section">
                    <h4>Fare Details</h4>
                    <div className="detail-row"><label>Base Fare</label><span>{detailRide.fare}</span></div>
                    <div className="detail-row"><label>Distance Charge</label><span>₹{(parseFloat(detailRide.distance) * 15).toFixed(2)}</span></div>
                    <div className="detail-row"><label>Time Charge</label><span>₹{(parseInt(detailRide.duration) * 2).toFixed(2)}</span></div>
                    <div className="detail-row" style={{ borderTop: '2px solid var(--border-hi)', marginTop: '8px', paddingTop: '8px' }}><label style={{ fontWeight: '700' }}>Total Fare</label><span style={{ color: 'var(--brand)', fontWeight: '700', fontSize: '1.1rem' }}>{detailRide.fare}</span></div>
                  </div>

                  <div className="detail-section">
                    <h4>Payment Information</h4>
                    <div className="detail-row"><label>Payment Method</label><span>{detailRide.paymentMethod}</span></div>
                    <div className="detail-row"><label>Status</label><span className="status completed">Paid</span></div>
                  </div>
                </div>
              </div>
            )}

            {detailTab === 'feedback' && (
              <div className="detail-content">
                <div className="feedback-section">
                  <div className="detail-section">
                    <h4>Passenger Feedback</h4>
                    <div className="feedback-rating">
                      <span>Passenger Rating: </span>
                      <span style={{ color: 'var(--brand)', fontWeight: '700', fontSize: '1.2rem' }}>★ {detailRide.rating}</span>
                    </div>
                    <div className="feedback-box">
                      <p>{detailRide.feedback}</p>
                    </div>
                  </div>

                  <div className="detail-section">
                    <h4>Driver Notes</h4>
                    <div className="feedback-box">
                      <p>{detailRide.notes}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {detailUser && (
        <Modal
          open={true}
          title={`User Details: ${detailUser.user}`}
          onClose={() => setDetailUser(null)}
          size="large"
          footer={<button className="btn-outline" onClick={() => setDetailUser(null)}>Close</button>}
        >
          <div className="detail-tabs">
            <div className="tab-buttons">
              <button className={`tab-btn${userDetailTab === 'overview' ? ' active' : ''}`} onClick={() => setUserDetailTab('overview')}><i className="fa fa-user"></i> Overview</button>
              <button className={`tab-btn${userDetailTab === 'rides' ? ' active' : ''}`} onClick={() => setUserDetailTab('rides')}><i className="fa fa-car"></i> Rides</button>
              <button className={`tab-btn${userDetailTab === 'subs' ? ' active' : ''}`} onClick={() => setUserDetailTab('subs')}><i className="fa fa-receipt"></i> Subscriptions</button>
              <button className={`tab-btn${userDetailTab === 'groups' ? ' active' : ''}`} onClick={() => setUserDetailTab('groups')}><i className="fa fa-users"></i> Groups</button>
              <button className={`tab-btn${userDetailTab === 'achievements' ? ' active' : ''}`} onClick={() => setUserDetailTab('achievements')}><i className="fa fa-trophy"></i> Achievements</button>
            </div>

            {userDetailTab === 'overview' && userProfile && (
              <div className="detail-content">
                <div className="detail-grid">
                  <div className="detail-section">
                    <h4>Contact Information</h4>
                    <div className="detail-row"><label>Name</label><span>{userProfile.name}</span></div>
                    <div className="detail-row"><label>Email</label><span>{userProfile.email}</span></div>
                    <div className="detail-row"><label>Mjollnir ID</label><span className="mono">{userProfile.id}</span></div>
                    <div className="detail-row"><label>Emp / Student ID</label><span className="mono">{userProfile.empId}</span></div>
                  </div>

                  <div className="detail-section">
                    <h4>Organization Information</h4>
                    <div className="detail-row"><label>Business Type</label><span>{userProfile.businessType}</span></div>
                    <div className="detail-row"><label>Organization Type</label><span>{userProfile.orgType}</span></div>
                    <div className="detail-row"><label>Organization Name</label><span>{userProfile.orgName}</span></div>
                  </div>

                  <div className="detail-section">
                    <h4>Account Details</h4>
                    <div className="detail-row"><label>Role</label><span>{userProfile.role}</span></div>
                    <div className="detail-row"><label>Status</label><span className={`status ${detailUser.status === 'Active' ? 'pending' : 'completed'}`}>{userProfile.status}</span></div>
                    <div className="detail-row"><label>Joined</label><span>{userProfile.joined}</span></div>
                  </div>

                  <div className="detail-section">
                    <h4>Financial Information</h4>
                    <div className="detail-row"><label>Coins</label><span className="badge-pill"><i className="fa fa-coins"></i>&nbsp;{userProfile.coins}</span></div>
                    <div className="detail-row"><label>Wallet Balance</label><span>{userProfile.wallet}</span></div>
                  </div>

                  <div className="detail-section">
                    <h4>Location</h4>
                    <div className="detail-row"><label>Live Coordinates</label><span className="mono">{userProfile.location}</span></div>
                  </div>
                </div>
              </div>
            )}

            {userDetailTab === 'rides' && userProfile && (
              <div className="detail-content">
                <div className="stats-grid">
                  <div className="stat-box"><div className="stat-value">{userProfile.rides}</div><div className="stat-label">Total Rides</div></div>
                  <div className="stat-box"><div className="stat-value">{userProfile.activeRides}</div><div className="stat-label">Active Rides</div></div>
                  <div className="stat-box"><div className="stat-value">{userProfile.completedRides}</div><div className="stat-label">Completed</div></div>
                  <div className="stat-box"><div className="stat-value">{userProfile.cancelledRides}</div><div className="stat-label">Cancelled</div></div>
                </div>
                <div className="rides-detail-grid">
                  <div className="detail-section rides-breakdown-card">
                    <h4>Ride Breakdown</h4>
                    <div className="ride-breakdown-row"><div><div className="ride-breakdown-label">Latest Ride</div><div className="ride-breakdown-hint">Most recent trip on platform</div></div><div className="ride-breakdown-value">{detailUser.id}</div></div>
                    <div className="ride-breakdown-row"><div><div className="ride-breakdown-label">Average Rating</div><div className="ride-breakdown-hint">Recent experience score</div></div><div className="ride-breakdown-value">{detailUser.rating}</div></div>
                    <div className="ride-breakdown-row"><div><div className="ride-breakdown-label">Preferred Payment</div><div className="ride-breakdown-hint">Most used payment mode</div></div><div className="ride-breakdown-value">{detailUser.paymentMethod}</div></div>
                  </div>

                  <div className="detail-section rides-log-card">
                    <h4>All Ride Details ({userRideHistory.length})</h4>
                    <div className="ride-log-list ride-log-list-all">
                      {userRideHistory.map((ride) => (
                        <button key={ride.id} className="ride-log-item ride-log-button" onClick={() => openRideDetail(ride)}>
                          <div className="ride-log-top">
                            <span className="mono">{ride.id}</span>
                            <span className={`status ${ride.status === 'Completed' ? 'completed' : 'pending'}`}>{ride.status}</span>
                          </div>
                          <div className="ride-log-route">{ride.pickupLoc}{' -> '}{ride.dropoffLoc}</div>
                          <div className="ride-log-meta">
                            <span>{ride.start}</span>
                            <span>{ride.vehicle}</span>
                            <span>{ride.fare}</span>
                            <span>Open details</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {userDetailTab === 'subs' && userProfile && (
              <div className="detail-content">
                <div className="subs-list">
                  {userProfile.subscriptions.length > 0 ? userProfile.subscriptions.map((sub) => (
                    <div key={sub.id} className="sub-item">
                      <div className="sub-header">
                        <div className="sub-name">{sub.name}</div>
                        <span className="status completed">{sub.status}</span>
                      </div>
                      <div className="sub-details">
                        <span><strong>{sub.amount}</strong></span>
                        <span className="muted">Started: {sub.startDate}</span>
                      </div>
                    </div>
                  )) : <div className="empty-state">No subscriptions</div>}
                </div>
              </div>
            )}

            {userDetailTab === 'groups' && userProfile && (
              <div className="detail-content">
                <div className="detail-section">
                  <h4>Groups</h4>
                  {userProfile.groups.length ? userProfile.groups.map((group) => (
                    <div key={group} className="detail-row"><label>Assigned Group</label><span>{group}</span></div>
                  )) : <div className="empty-state">No groups assigned</div>}
                </div>
              </div>
            )}

            {userDetailTab === 'achievements' && userProfile && (
              <div className="detail-content">
                <div className="detail-section">
                  <h4>Achievements</h4>
                  {userProfile.achievements.map((achievement) => (
                    <div key={achievement.id} className="detail-row"><label>{achievement.name}</label><span>{achievement.note}</span></div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {detailVehicle && (
        <Modal
          open={true}
          title={`Vehicle Details: ${detailVehicle.vehicle}`}
          onClose={() => setDetailVehicle(null)}
          size="md"
          footer={<button className="btn-outline" onClick={() => setDetailVehicle(null)}>Close</button>}
        >
          <div className="detail-content">
            <div className="detail-grid">
              <div className="detail-section">
                <h4>Vehicle Profile</h4>
                <div className="detail-row"><label>Vehicle ID</label><span className="mono">{detailVehicle.vehicle}</span></div>
                <div className="detail-row"><label>Type</label><span>{detailVehicle.vehicleType}</span></div>
                <div className="detail-row"><label>License Plate</label><span className="mono">{detailVehicle.licensePlate}</span></div>
                <div className="detail-row"><label>Organization</label><span>{detailVehicle.org}</span></div>
              </div>
              <div className="detail-section">
                <h4>Ride Assignment</h4>
                <div className="detail-row"><label>Assigned Ride</label><span className="mono">{detailVehicle.id}</span></div>
                <div className="detail-row"><label>Passenger</label><span>{detailVehicle.user}</span></div>
                {isDriverManagedVehicleType(businessSetup, detailVehicle.vehicleType) ? (
                  <>
                    <div className="detail-row"><label>Driver</label><span>{detailVehicle.driverName}</span></div>
                    <div className="detail-row"><label>Driver Rating</label><span><i className="fa fa-star" style={{ color: 'var(--brand)' }}></i> {detailVehicle.driverRating}</span></div>
                  </>
                ) : (
                  <div className="detail-row"><label>Operation Mode</label><span>Self Ride</span></div>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      <FilterPanel hook={fp} columns={COLUMNS} data={rides} />
    </section>
  );
}

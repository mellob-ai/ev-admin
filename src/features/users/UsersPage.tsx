import { useEffect, useMemo, useState } from 'react';
import Modal from '../../components/Modal';
import { useFilterPanel, FilterPanel } from '../../components/ColumnFilter';
import { loadSubscriptionPlans } from '../../config/subscription-plans';
import { downloadCsv, timestampSlug } from '../../utils/clientActions';
import { BUSINESS_SETUP_UPDATED_EVENT, getActiveBusinessTypes, getActiveOrganizationTypes, getActiveUserTypes, getActiveVehicleTypes, isDriverManagedVehicleType, loadBusinessSetup } from '../../config/business-setup';
import { loadOperationalOrganizations, loadOperationalUsers, saveOperationalUsers } from '../../config/operations-store';
import { isApiIntegrationEnabled } from '../../api/runtime';
import { addUserCoins, addUserWalletBalance, createUser, deleteUser, listUsers, setUserBlocked, updateUser } from '../../api/services/usersService';

const GROUPS_SEED = [];

const SEED = [];

const COLUMNS = [
  { key: 'id',     label: 'Mjollnir ID',     type: 'text' },
  { key: 'empId',  label: 'Emp / Student ID',type: 'text' },
  { key: 'name',   label: 'Name',            type: 'text' },
  { key: 'email',  label: 'Email',           type: 'text' },
  { key: 'role',   label: 'Role' },
  { key: 'wallet', label: 'Wallet',          type: 'text' },
  { key: 'coins',  label: 'Coins',           type: 'text' },
  { key: 'status', label: 'Status' },
  { key: 'joined', label: 'Joined',          type: 'text' },
];

const USER_RIDE_LOGS = {};

function blankForm() {
  return { name: '', email: '', empId: '', businessTypeId: '', organizationTypeId: '', organizationId: '', role: '', status: 'Active' };
}

function getRideSummaryRows(user) {
  const total = user.rides || 0;
  const active = user.activeRides || 0;
  const completed = user.completedRides || 0;
  const cancelled = user.cancelledRides || 0;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  return [
    { label: 'Total rides', value: total, hint: 'All trips recorded for this user' },
    { label: 'Active rides', value: active, hint: 'Trips currently in progress' },
    { label: 'Completed rides', value: completed, hint: 'Trips successfully finished' },
    { label: 'Cancelled rides', value: cancelled, hint: 'Trips ended before completion' },
    { label: 'Completion rate', value: `${completionRate}%`, hint: `${completed} of ${total} rides completed` },
  ];
}

function buildTripDetail(user, ride, businessSetup) {
  const isActive = ride.status === 'Active';
  const isCancelled = ride.status === 'Cancelled';
  const baseFare = Number(String(ride.fare).replace(/[^\d]/g, '')) || 0;
  const durationMinutes = isActive ? 18 : isCancelled ? 0 : 26;
  const distanceKm = Math.max(0.8, Math.round((baseFare / 42) * 10) / 10);
  const configuredVehicleTypes = getActiveVehicleTypes(businessSetup).map((item) => item.name);
  const vehicleType = distanceKm > 8
    ? configuredVehicleTypes.find((item) => item.toLowerCase().includes('bus')) || 'Bus'
    : distanceKm > 3
      ? configuredVehicleTypes.find((item) => item.toLowerCase().includes('buggy')) || 'Buggy'
      : distanceKm > 1.2
        ? configuredVehicleTypes.find((item) => item.toLowerCase().includes('bike')) || 'E-Bike'
        : configuredVehicleTypes.find((item) => item.toLowerCase().includes('scooter')) || 'E-Scooter';
  const hasDriver = isDriverManagedVehicleType(businessSetup, vehicleType);

  return {
    ...ride,
    user: user.name,
    org: user.orgName,
    pickupLoc: `${user.orgName}, Main Gate`,
    dropoffLoc: ride.route.split('->')[1]?.trim() || `${user.orgName}, Central Stop`,
    distance: `${distanceKm.toFixed(1)} km`,
    paymentMethod: baseFare === 0 ? 'No charge' : 'Digital Wallet',
    startTime: isActive ? '09:14 AM' : '08:42 AM',
    endTime: isActive || isCancelled ? '' : '09:08 AM',
    estimatedEnd: isActive ? '09:32 AM' : '',
    temperature: '24°C',
    co2Saved: `${Math.max(0.1, distanceKm * 0.3).toFixed(1)}kg`,
    rating: isCancelled ? '-' : 4.8,
    vehicleType,
    licensePlate: `MH-01-${ride.vehicle?.slice(-3) || '001'}`,
    driverName: hasDriver ? ['James Wilson', 'Emma Garcia', 'David Kumar', 'Maria Santos'][baseFare % 4] : '',
    driverRating: hasDriver ? 4.7 : null,
    routeType: isCancelled ? 'Interrupted Route' : distanceKm > 5 ? 'Optimized Route' : 'Direct Route',
    stops: isCancelled ? 0 : distanceKm > 5 ? 1 : 0,
    notes: isCancelled ? 'Trip cancelled before completion' : 'Ride completed smoothly with normal traffic conditions',
    feedback: isCancelled ? 'Trip was cancelled by user' : 'Comfortable ride with timely pickup',
  };
}

function buildAllRideLogs(user) {
  const total = Math.max(0, Number(user.rides) || 0);
  const active = Math.max(0, Math.min(total, Number(user.activeRides) || 0));
  const completed = Math.max(0, Math.min(total - active, Number(user.completedRides) || 0));
  const cancelled = Math.max(0, Math.min(total - active - completed, Number(user.cancelledRides) || 0));
  const remaining = Math.max(0, total - active - completed - cancelled);

  const statusList = [
    ...Array.from({ length: active }, () => 'Active'),
    ...Array.from({ length: completed + remaining }, () => 'Completed'),
    ...Array.from({ length: cancelled }, () => 'Cancelled'),
  ];

  const starts = ['North Campus', 'Tech Park Tower', 'City Public Mob', 'Global Pool', 'City Park East', 'South Campus'];
  const ends = ['Midtown Hub', 'Innovation Dr', 'River Park', 'Commerce Rd', 'Industrial Zone', 'Central Mall'];
  const userSeed = Number(String(user.id || '').replace(/\D/g, '')) || 1000;

  return Array.from({ length: total }, (_, index) => {
    const rideNo = 7000 + (userSeed % 100) * 10 + index + 1;
    const date = new Date(2026, 2, 24 - Math.min(index, 60));
    const status = statusList[index] || 'Completed';
    const start = starts[index % starts.length];
    const end = ends[(index + 2) % ends.length];
    const fareValue = status === 'Cancelled' ? 0 : 60 + ((index * 17 + userSeed) % 540);

    return {
      id: `RD-${String(rideNo).padStart(4, '0')}`,
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      route: `${start} -> ${end}`,
      status,
      vehicle: `VH-${String((index % 19) + 1).padStart(3, '0')}`,
      fare: `₹${fareValue}`,
    };
  });
}

export default function UsersPage() {
  const usingApi = isApiIntegrationEnabled();
  const [businessSetup, setBusinessSetup] = useState(loadBusinessSetup);
  const [organizations, setOrganizations] = useState(() => loadOperationalOrganizations([]));
  const [users,    setUsers]    = useState(() => loadOperationalUsers(SEED));
  const [isUsersLoading, setIsUsersLoading] = useState(false);
  const [usersMode, setUsersMode] = useState(usingApi ? 'API' : 'Local');
  const [usersSyncError, setUsersSyncError] = useState('');
  const [query,    setQuery]    = useState('');
  const [selected, setSelected] = useState([]);
  const [showAdd,  setShowAdd]  = useState(false);
  const [form,     setForm]     = useState(blankForm());
  const [detailUser, setDetailUser] = useState(null);
  const [detailTab, setDetailTab] = useState('overview');
  const [editCoins, setEditCoins] = useState(null);
  const [editWallet, setEditWallet] = useState(null);
  const [editSubForm, setEditSubForm] = useState(null);
  const [detailGroup, setDetailGroup] = useState(null);
  const [detailGroupTab, setDetailGroupTab] = useState('overview');
  const [detailTrip, setDetailTrip] = useState(null);
  const [detailTripTab, setDetailTripTab] = useState('overview');
  const [subscriptionPlans, setSubscriptionPlans] = useState(loadSubscriptionPlans);
  const [navPath, setNavPath] = useState([]);
  const fp = useFilterPanel();

  useEffect(() => {
    const handlePlansUpdated = () => setSubscriptionPlans(loadSubscriptionPlans());
    window.addEventListener('mos:subscription-plans-updated', handlePlansUpdated);
    return () => window.removeEventListener('mos:subscription-plans-updated', handlePlansUpdated);
  }, []);

  useEffect(() => {
    const reloadDependencies = () => {
      setBusinessSetup(loadBusinessSetup());
      setOrganizations(loadOperationalOrganizations([]));
    };
    window.addEventListener('mos:organization-settings-updated', reloadDependencies);
    window.addEventListener('mos:operations-organizations-updated', reloadDependencies);
    window.addEventListener(BUSINESS_SETUP_UPDATED_EVENT, reloadDependencies);
    return () => {
      window.removeEventListener('mos:organization-settings-updated', reloadDependencies);
      window.removeEventListener('mos:operations-organizations-updated', reloadDependencies);
      window.removeEventListener(BUSINESS_SETUP_UPDATED_EVENT, reloadDependencies);
    };
  }, []);

  useEffect(() => {
    saveOperationalUsers(users);
  }, [users]);

  useEffect(() => {
    if (!usingApi) return;
    let mounted = true;

    const hydrateUsers = async () => {
      setIsUsersLoading(true);
      setUsersSyncError('');
      try {
        const remoteRows = await listUsers({ page: 1, limit: 200 });
        if (!mounted) return;
        if (Array.isArray(remoteRows) && remoteRows.length) {
          setUsers(remoteRows);
          setUsersMode('API');
        } else {
          setUsersMode('Local');
        }
      } catch (error) {
        if (!mounted) return;
        setUsersMode('Local');
        setUsersSyncError(error?.message || 'Unable to reach backend users API. Working in local mode.');
      } finally {
        if (mounted) setIsUsersLoading(false);
      }
    };

    hydrateUsers();
    return () => {
      mounted = false;
    };
  }, [usingApi]);

  const reportUsersApiError = (actionLabel, error) => {
    setUsersSyncError(`${actionLabel} failed in API mode: ${error?.message || 'Unknown error'}. Local state kept in sync.`);
  };

  const openUserDetail = (user) => {
    setDetailUser(user);
    setEditCoins(user.coins);
    setEditWallet(user.wallet.replace('₹', ''));
    setEditSubForm(null);
    setDetailTab('overview');
    setNavPath([{ type: 'user', name: user.name, id: user.id }]);
  };

  const openGroupFromUser = (group) => {
    setDetailGroup(group);
    setDetailGroupTab('overview');
    setNavPath((p) => [...p, { type: 'group', name: group.name, id: group.id }]);
  };

  const openUserFromGroupMembers = (user) => {
    setDetailGroup(null);
    setDetailUser(user);
    setEditCoins(user.coins);
    setEditWallet(user.wallet.replace('₹', ''));
    setEditSubForm(null);
    setDetailTab('overview');
    setNavPath((p) => [...p, { type: 'user', name: user.name, id: user.id }]);
  };

  const goBack = () => {
    if (navPath.length <= 1) {
      setDetailUser(null);
      setDetailGroup(null);
      setNavPath([]);
    } else {
      const newPath = navPath.slice(0, -1);
      setNavPath(newPath);
      const lastItem = newPath[newPath.length - 1];
      if (lastItem.type === 'user') {
        const user = users.find((u) => u.id === lastItem.id);
        setDetailUser(user);
        setDetailGroup(null);
      } else if (lastItem.type === 'group') {
        const group = GROUPS_SEED.find((g) => g.id === lastItem.id);
        setDetailGroup(group);
        setDetailUser(null);
      }
    }
  };

  const closeDetail = () => {
    setDetailUser(null);
    setDetailGroup(null);
    setDetailTrip(null);
    setNavPath([]);
    setEditCoins(null);
    setEditWallet(null);
    setEditSubForm(null);
  };

  const openTripDetail = (user, ride) => {
    setDetailTrip(buildTripDetail(user, ride, businessSetup));
    setDetailTripTab('overview');
  };

  const closeTripDetail = () => {
    setDetailTrip(null);
    setDetailTripTab('overview');
  };

  const flat = useMemo(() => users.map((u) => ({ ...u, coins: String(u.coins) })), [users]);

  const visible = useMemo(() =>
    flat.filter((u) => {
      if (![u.name, u.email, u.id, u.empId].join(' ').toLowerCase().includes(query.toLowerCase())) return false;
      return COLUMNS.every((c) => fp.match(c.key, u[c.key]));
    }),
    [flat, query, fp.filters]
  );

  const visibleFull = useMemo(() => users.filter((u) => visible.some((v) => v.id === u.id)), [users, visible]);
  const allUserRides = useMemo(() => (detailUser ? buildAllRideLogs(detailUser) : []), [detailUser]);
  const activeSubscriptionPlans = useMemo(() => subscriptionPlans.filter((plan) => plan.status === 'Active' && (plan.type || 'Subscription') === 'Subscription'), [subscriptionPlans]);
  const activeTopupPlans = useMemo(() => subscriptionPlans.filter((plan) => plan.status === 'Active' && (plan.type || 'Subscription') === 'Topup'), [subscriptionPlans]);
  const activeBusinessTypes = useMemo(() => getActiveBusinessTypes(businessSetup), [businessSetup]);
  const activeOrganizationTypes = useMemo(() => getActiveOrganizationTypes(businessSetup), [businessSetup]);
  const activeUserTypes = useMemo(() => getActiveUserTypes(businessSetup), [businessSetup]);
  const organizationTypeOptions = useMemo(() => activeOrganizationTypes.filter((item) => item.businessTypeId === form.businessTypeId), [activeOrganizationTypes, form.businessTypeId]);
  const organizationOptions = useMemo(() => organizations.filter((item) => item.businessTypeId === form.businessTypeId && (!form.organizationTypeId || item.organizationTypeId === form.organizationTypeId)), [organizations, form.businessTypeId, form.organizationTypeId]);
  const userTypeOptions = useMemo(() => activeUserTypes.filter((item) => item.businessTypeId === form.businessTypeId && ((item.organizationTypeId || null) === (form.organizationTypeId || null))), [activeUserTypes, form.businessTypeId, form.organizationTypeId]);

  const allChecked = visible.length > 0 && visible.every((u) => selected.includes(u.id));
  const toggleAll  = (c) => setSelected(c ? visible.map((u) => u.id) : []);
  const toggleRow  = (id, c) => setSelected((p) => (c ? [...p, id] : p.filter((x) => x !== id)));

  const bulkBlock  = async () => {
    if (!window.confirm(`Block ${selected.length} users?`)) return;
    const selectedRows = users.filter((u) => selected.includes(u.id));
    if (usingApi) {
      try {
        await Promise.all(selectedRows.map((user) => setUserBlocked(user, true)));
      } catch (error) {
        reportUsersApiError('Bulk block', error);
      }
    }
    setUsers((p) => p.map((u) => selected.includes(u.id) ? { ...u, status: 'Inactive' } : u));
    setSelected([]);
  };
  const bulkDelete = async () => {
    if (!window.confirm(`Delete ${selected.length} users?`)) return;
    const selectedRows = users.filter((u) => selected.includes(u.id));
    if (usingApi) {
      try {
        await Promise.all(selectedRows.map((user) => deleteUser(user)));
      } catch (error) {
        reportUsersApiError('Bulk delete', error);
      }
    }
    setUsers((p) => p.filter((u) => !selected.includes(u.id)));
    setSelected([]);
  };
  const bulkImport = () => {
    setUsers((current) => [
      ...current,
      {
        id: `MU-${1000 + current.length + 1}`,
        empId: `EMP-${String(9000 + current.length + 1)}`,
        name: 'Imported User 1',
        email: `imported${current.length + 1}@mos.io`,
        role: 'Viewer',
        wallet: '₹0',
        coins: 0,
        status: 'Active',
        joined: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        businessType: 'B2C',
        orgType: 'Individual',
        orgName: 'Independent',
        rides: 0,
        activeRides: 0,
        completedRides: 0,
        cancelledRides: 0,
        subscriptions: [],
        groups: [],
        location: 'N/A',
        achievements: [],
      },
    ]);
  };
  const exportUsers = () => {
    downloadCsv(timestampSlug('users-export') + '.csv', visibleFull.map((user) => ({
      mjollnirId: user.id,
      employeeId: user.empId,
      name: user.name,
      email: user.email,
      role: user.role,
      wallet: user.wallet,
      coins: user.coins,
      status: user.status,
      joined: user.joined,
    })));
  };

  const f = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const openAddUser = () => {
    const firstBusiness = activeBusinessTypes[0] || null;
    const firstOrgType = activeOrganizationTypes.find((item) => item.businessTypeId === firstBusiness?.id) || null;
    const firstUserType = activeUserTypes.find((item) => item.businessTypeId === firstBusiness?.id && ((item.organizationTypeId || null) === (firstOrgType?.id || null))) || null;

    setForm({
      ...blankForm(),
      businessTypeId: firstBusiness?.id || '',
      organizationTypeId: firstOrgType?.id || '',
      role: firstUserType?.name || '',
    });
    setShowAdd(true);
  };

  const handleCreate = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.businessTypeId || !form.role) return;
    const selectedBusiness = activeBusinessTypes.find((item) => item.id === form.businessTypeId) || null;
    const selectedOrgType = activeOrganizationTypes.find((item) => item.id === form.organizationTypeId) || null;
    const selectedOrg = organizations.find((item) => item.id === form.organizationId) || null;
    let createdUser = null;

    if (usingApi) {
      try {
        createdUser = await createUser(form, {
          businessTypeName: selectedBusiness?.name || '',
          organizationTypeName: selectedOrgType?.name || '',
          organizationName: selectedOrg?.name || '',
        });
      } catch (error) {
        reportUsersApiError('Create user', error);
      }
    }

    setUsers((p) => [
      ...p,
      createdUser || {
        id: `MU-${1000 + p.length + 1}`, empId: form.empId || '-', name: form.name, email: form.email,
        role: form.role, wallet: '₹0', coins: 0, status: form.status,
        joined: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        businessType: selectedBusiness?.name || '', orgType: selectedOrgType?.name || 'No Organization', orgName: selectedOrg?.name || 'Independent',
        rides: 0, activeRides: 0, completedRides: 0, cancelledRides: 0,
        subscriptions: [], groups: [], location: selectedOrg ? `${selectedOrg.city || '-'}, ${selectedOrg.state || '-'}` : 'N/A', achievements: []
      },
    ]);
    setForm(blankForm());
    setShowAdd(false);
  };

  const saveUserChanges = async () => {
    if (!detailUser) return;
    if (usingApi) {
      try {
        const updated = await updateUser(detailUser);
        setUsers((p) => p.map((u) => u.id === detailUser.id ? { ...u, ...updated } : u));
        closeDetail();
        return;
      } catch (error) {
        reportUsersApiError('Save user changes', error);
      }
    }
    setUsers((p) => p.map((u) => u.id === detailUser.id ? detailUser : u));
    closeDetail();
  };

  const updateCoins = async () => {
    if (editCoins === null || !detailUser) return;
    if (usingApi) {
      try {
        await addUserCoins(detailUser, parseInt(editCoins, 10) || 0);
      } catch (error) {
        reportUsersApiError('Update coins', error);
      }
    }
    setDetailUser((p) => ({ ...p, coins: parseInt(editCoins) || 0 }));
  };

  const updateWallet = async () => {
    if (editWallet === null || !detailUser) return;
    if (usingApi) {
      try {
        await addUserWalletBalance(detailUser, parseInt(editWallet, 10) || 0);
      } catch (error) {
        reportUsersApiError('Update wallet', error);
      }
    }
    setDetailUser((p) => ({ ...p, wallet: `₹${parseInt(editWallet) || 0}` }));
  };

  const toggleUserStatus = async (user) => {
    const nextIsBlocked = user.status === 'Active';
    if (usingApi) {
      try {
        await setUserBlocked(user, nextIsBlocked);
      } catch (error) {
        reportUsersApiError(nextIsBlocked ? 'Block user' : 'Unblock user', error);
      }
    }
    setUsers((p) => p.map((r) => r.id === user.id ? { ...r, status: nextIsBlocked ? 'Inactive' : 'Active' } : r));
  };

  const removeSingleUser = async (user) => {
    if (!window.confirm(`Delete ${user.name}?`)) return;
    if (usingApi) {
      try {
        await deleteUser(user);
      } catch (error) {
        reportUsersApiError('Delete user', error);
      }
    }
    setUsers((p) => p.filter((r) => r.id !== user.id));
  };

  const addSubscription = () => {
    if (!editSubForm || !editSubForm.planId || !detailUser) return;
    const selectedPlan = activeSubscriptionPlans.find((plan) => plan.id === editSubForm.planId);
    if (!selectedPlan) return;

    setDetailUser((p) => ({
      ...p,
      subscriptions: [...p.subscriptions, { 
        id: `sub-${Date.now()}`, 
        name: selectedPlan.name,
        amount: `${selectedPlan.price}/${selectedPlan.validity}`,
        startDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        status: 'Active'
      }]
    }));
    setEditSubForm(null);
  };

  const removeSubscription = (subId) => {
    if (!detailUser) return;
    setDetailUser((p) => ({
      ...p,
      subscriptions: p.subscriptions.filter((s) => s.id !== subId)
    }));
  };

  const applyTopupPlan = (plan) => {
    if (!detailUser) return;
    const topupAmount = Number(String(plan.price || '').replace(/[^\d]/g, '')) || 0;
    if (!window.confirm(`Apply ${plan.name} for ₹${topupAmount}?`)) return;

    const walletValue = Number(String(detailUser.wallet || '').replace(/[^\d]/g, '')) || 0;
    setDetailUser((p) => ({
      ...p,
      coins: (Number(p.coins) || 0) + (Number(plan.coins) || 0),
      wallet: `₹${walletValue + topupAmount}`,
    }));
  };

  const statusClass = { Active: 'completed', Pending: 'pending', Inactive: 'cancelled', Blocked: 'cancelled' };
  const userSummary = useMemo(() => ({
    total: visibleFull.length,
    active: visibleFull.filter((user) => user.status === 'Active').length,
    pending: visibleFull.filter((user) => user.status === 'Pending').length,
    totalCoins: visibleFull.reduce((sum, user) => sum + (Number(user.coins) || 0), 0),
  }), [visibleFull]);

  return (
    <section className="page active space-y-4" id="page-users">
      <div className="page-hero ph-users">
        <div className="page-hero-left">
          <div className="page-hero-icon"><i className="fa fa-users"></i></div>
          <div className="page-hero-text">
            <h1>User Intelligence Hub</h1>
            <p>Operate identities, balances, subscriptions, and activity histories from one control surface.</p>
          </div>
        </div>
        <div className="page-hero-right">
          <div className="page-hero-chips">
            <span className="page-hero-chip"><i className="fa fa-user-group"></i> {users.length} Users</span>
            <span className="page-hero-chip"><i className="fa fa-circle-check"></i> {users.filter((u) => u.status === 'Active').length} Active</span>
          </div>
        </div>
      </div>

      <div className="cards-grid users-kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon blue"><i className="fa fa-users"></i></div>
          <div className="kpi-info"><span className="kpi-label">Visible Users</span><span className="kpi-value">{userSummary.total}</span></div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon green"><i className="fa fa-circle-check"></i></div>
          <div className="kpi-info"><span className="kpi-label">Active</span><span className="kpi-value">{userSummary.active}</span></div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon gold"><i className="fa fa-hourglass-half"></i></div>
          <div className="kpi-info"><span className="kpi-label">Pending</span><span className="kpi-value">{userSummary.pending}</span></div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon cyan"><i className="fa fa-coins"></i></div>
          <div className="kpi-info"><span className="kpi-label">Visible Coins</span><span className="kpi-value">{userSummary.totalCoins.toLocaleString()}</span></div>
        </div>
      </div>

      <div className="toolbar">
        <div className="toolbar-left">
          <div className="search-box-inline">
            <i className="fa fa-search"></i>
            <input type="text" placeholder="Search by name, email, ID…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <button className="btn-primary" onClick={openAddUser}><i className="fa fa-plus"></i> Add User</button>
          <button className="btn-outline" onClick={bulkImport}><i className="fa fa-file-csv"></i> Bulk Import</button>
        </div>
        <div className="toolbar-right">
          <button className={`btn-outline${fp.anyFiltered ? ' filter-btn-active' : ''}`} onClick={() => fp.setOpen(true)}>
            <i className="fa fa-filter"></i> Filter{fp.anyFiltered ? ` (${fp.filterCount})` : ''}
          </button>
          <button className="btn-outline" onClick={exportUsers}><i className="fa fa-file-export"></i> Export</button>
        </div>
      </div>

      <div className="table-card full" style={{ padding: '8px 12px' }}>
        <div className="flex flex-wrap items-center justify-between gap-2 text-[12px]">
          <span className={`badge-pill ${usersMode === 'API' ? '' : 'bg-amber-500/20 text-amber-300'}`}>
            <i className={`fa ${usersMode === 'API' ? 'fa-plug-circle-check' : 'fa-database'}`}></i>&nbsp;
            Users Mode: {usersMode}
          </span>
          {isUsersLoading ? <span className="text-[11px] opacity-80">Syncing users from backend...</span> : null}
          {usersSyncError ? <span className="text-[11px] text-rose-300">{usersSyncError}</span> : null}
        </div>
      </div>

      {selected.length > 0 && (
        <div className="toolbar toolbar-selection">
          <span className="toolbar-selection-count">{selected.length} selected</span>
          <div className="toolbar-left">
            <button className="btn-outline" onClick={bulkBlock}><i className="fa fa-ban"></i> Block Selected</button>
            <button className="btn-outline btn-outline-danger" onClick={bulkDelete}><i className="fa fa-trash"></i> Delete Selected</button>
          </div>
        </div>
      )}

      <div className="table-card full">
        <div className="table-wrap overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th><input type="checkbox" checked={allChecked} onChange={(e) => toggleAll(e.target.checked)} /></th>
                <th>Mjollnir ID</th><th>Emp / Student ID</th><th>Name</th><th>Email</th><th>Role</th>
                <th>Wallet</th><th>Coins</th><th>Status</th><th>Joined</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleFull.map((u) => (
                <tr key={u.id}>
                  <td><input type="checkbox" checked={selected.includes(u.id)} onChange={(e) => toggleRow(u.id, e.target.checked)} /></td>
                  <td><button className="link-btn" onClick={() => openUserDetail(u)}><span className="mono">{u.id}</span></button></td>
                  <td><span className="mono mono-muted">{u.empId}</span></td>
                  <td><button className="link-btn" onClick={() => openUserDetail(u)}><strong>{u.name}</strong></button></td>
                  <td>{u.email}</td>
                  <td>{u.role}</td>
                  <td>{u.wallet}</td>
                  <td><span className="badge-pill"><i className="fa fa-coins"></i>&nbsp;{u.coins}</span></td>
                  <td><span className={`status ${statusClass[u.status]}`}>{u.status}</span></td>
                  <td>{u.joined}</td>
                  <td className="actions">
                    <button className="act-btn" title="View Details" onClick={() => openUserDetail(u)}><i className="fa fa-eye"></i></button>
                    <button className="act-btn" title="Block" onClick={() => toggleUserStatus(u)}><i className="fa fa-ban"></i></button>
                    <button className="act-btn red" title="Delete" onClick={() => removeSingleUser(u)}><i className="fa fa-trash"></i></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <FilterPanel hook={fp} columns={COLUMNS} data={flat} />

      <Modal open={showAdd} title="Add User" onClose={() => setShowAdd(false)}
        footer={<><button className="btn-outline" onClick={() => setShowAdd(false)}>Cancel</button><button className="btn-primary" onClick={handleCreate}>Add User</button></>}>
        <div className="form-grid">
          <div className="form-field"><label>Full Name</label><input className="setting-input" value={form.name} onChange={f('name')} placeholder="Full name" /></div>
          <div className="form-field"><label>Email</label><input className="setting-input" type="email" value={form.email} onChange={f('email')} placeholder="user@example.com" /></div>
          <div className="form-field"><label>Emp / Student ID</label><input className="setting-input" value={form.empId} onChange={f('empId')} placeholder="EMP-0001 or STD-0001" /></div>
          <div className="form-field"><label>Business Type</label>
            <select className="setting-input" value={form.businessTypeId} onChange={(e) => {
              const nextBusinessId = e.target.value;
              const nextOrgType = activeOrganizationTypes.find((item) => item.businessTypeId === nextBusinessId) || null;
              const nextUserType = activeUserTypes.find((item) => item.businessTypeId === nextBusinessId && ((item.organizationTypeId || null) === (nextOrgType?.id || null))) || null;
              setForm((prev) => ({ ...prev, businessTypeId: nextBusinessId, organizationTypeId: nextOrgType?.id || '', organizationId: '', role: nextUserType?.name || '' }));
            }}>
              <option value="">Select Business Type</option>
              {activeBusinessTypes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </div>
          <div className="form-field"><label>Organization Type</label>
            <select className="setting-input" value={form.organizationTypeId} onChange={(e) => {
              const nextOrgTypeId = e.target.value;
              const nextUserType = activeUserTypes.find((item) => item.businessTypeId === form.businessTypeId && ((item.organizationTypeId || null) === (nextOrgTypeId || null))) || null;
              setForm((prev) => ({ ...prev, organizationTypeId: nextOrgTypeId, organizationId: '', role: nextUserType?.name || '' }));
            }} disabled={!form.businessTypeId}>
              <option value="">Select Organization Type</option>
              {organizationTypeOptions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </div>
          <div className="form-field"><label>Organization</label>
            <select className="setting-input" value={form.organizationId} onChange={f('organizationId')} disabled={organizationOptions.length === 0}>
              <option value="">{organizationOptions.length ? 'Select Organization' : 'No organization required / available'}</option>
              {organizationOptions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </div>
          <div className="form-field"><label>User Type</label>
            <select className="setting-input" value={form.role} onChange={f('role')} disabled={!userTypeOptions.length}>
              <option value="">Select User Type</option>
              {userTypeOptions.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
            </select>
          </div>
          <div className="form-field"><label>Status</label>
            <select className="setting-input" value={form.status} onChange={f('status')}>
              <option>Active</option><option>Pending</option><option>Inactive</option>
            </select>
          </div>
        </div>
      </Modal>

      {detailUser && (
        <Modal open={true} title={`User Details: ${detailUser.name}`} onClose={closeDetail} size="large"
          footer={<>
            {navPath.length > 1 && <button className="btn-outline" onClick={goBack}><i className="fa fa-arrow-left"></i> Back</button>}
            <button className="btn-outline" onClick={closeDetail}>Close</button>
            <button className="btn-primary" onClick={saveUserChanges}>Save Changes</button>
          </>}
          breadcrumb={navPath}>
          <div className="breadcrumb-nav">
            <span className="breadcrumb-item">Users</span>
            {navPath.map((item, idx) => (
              <span key={idx}>
                <span className="breadcrumb-sep">/</span>
                <button className="breadcrumb-item" onClick={() => { if (item.type === 'user') { setDetailTab('overview'); } }}>{item.name}</button>
              </span>
            ))}
          </div>
          <div className="detail-tabs">
            <div className="tab-buttons">
              <button className={`tab-btn${detailTab === 'overview' ? ' active' : ''}`} onClick={() => setDetailTab('overview')}><i className="fa fa-user"></i> Overview</button>
              <button className={`tab-btn${detailTab === 'rides' ? ' active' : ''}`} onClick={() => setDetailTab('rides')}><i className="fa fa-car"></i> Rides</button>
              <button className={`tab-btn${detailTab === 'subs' ? ' active' : ''}`} onClick={() => setDetailTab('subs')}><i className="fa fa-receipt"></i> Subscriptions</button>
              <button className={`tab-btn${detailTab === 'groups' ? ' active' : ''}`} onClick={() => setDetailTab('groups')}><i className="fa fa-users"></i> Groups</button>
              <button className={`tab-btn${detailTab === 'achievements' ? ' active' : ''}`} onClick={() => setDetailTab('achievements')}><i className="fa fa-trophy"></i> Achievements</button>
            </div>

            {detailTab === 'overview' && (
              <div className="detail-content">
                <div className="detail-grid">
                  <div className="detail-section">
                    <h4>Contact Information</h4>
                    <div className="detail-row"><label>Name</label><span>{detailUser.name}</span></div>
                    <div className="detail-row"><label>Email</label><span>{detailUser.email}</span></div>
                    <div className="detail-row"><label>Mjollnir ID</label><span className="mono">{detailUser.id}</span></div>
                    <div className="detail-row"><label>Emp / Student ID</label><span className="mono">{detailUser.empId}</span></div>
                  </div>

                  <div className="detail-section">
                    <h4>Organization Information</h4>
                    <div className="detail-row"><label>Business Type</label><span>{detailUser.businessType}</span></div>
                    <div className="detail-row"><label>Organization Type</label><span>{detailUser.orgType}</span></div>
                    <div className="detail-row"><label>Organization Name</label><span>{detailUser.orgName}</span></div>
                  </div>

                  <div className="detail-section">
                    <h4>Account Details</h4>
                    <div className="detail-row"><label>Role</label><span>{detailUser.role}</span></div>
                    <div className="detail-row"><label>Status</label><span className={`status ${statusClass[detailUser.status]}`}>{detailUser.status}</span></div>
                    <div className="detail-row"><label>Joined</label><span>{detailUser.joined}</span></div>
                  </div>

                  <div className="detail-section">
                    <h4>Financial Information</h4>
                    <div className="detail-row">
                      <label>Coins</label>
                      {editCoins !== null ? (
                        <div className="inline-edit">
                          <input type="number" className="setting-input" value={editCoins} onChange={(e) => setEditCoins(e.target.value)} />
                          <button className="btn-primary btn-small" onClick={updateCoins}><i className="fa fa-check"></i></button>
                        </div>
                      ) : (
                        <div className="inline-display" onClick={() => setEditCoins(detailUser.coins)}>
                          <span className="badge-pill"><i className="fa fa-coins"></i>&nbsp;{detailUser.coins}</span>
                          <button className="act-btn" onClick={(e) => { e.stopPropagation(); setEditCoins(detailUser.coins); }}><i className="fa fa-pen"></i></button>
                        </div>
                      )}
                    </div>
                    <div className="detail-row">
                      <label>Wallet Balance</label>
                      {editWallet !== null ? (
                        <div className="inline-edit">
                          <input type="number" className="setting-input" placeholder="Amount" value={editWallet} onChange={(e) => setEditWallet(e.target.value)} />
                          <button className="btn-primary btn-small" onClick={updateWallet}><i className="fa fa-check"></i></button>
                        </div>
                      ) : (
                        <div className="inline-display" onClick={() => setEditWallet(detailUser.wallet.replace('₹', ''))}>
                          <span className="amount">{detailUser.wallet}</span>
                          <button className="act-btn" onClick={(e) => { e.stopPropagation(); setEditWallet(detailUser.wallet.replace('₹', '')); }}><i className="fa fa-pen"></i></button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="detail-section">
                    <h4>Location</h4>
                    <div className="detail-row"><label>Live Coordinates</label><span className="mono">{detailUser.location}</span></div>
                  </div>
                </div>
              </div>
            )}

            {detailTab === 'rides' && (
              <div className="detail-content">
                <div className="stats-grid">
                  <div className="stat-box">
                    <div className="stat-value">{detailUser.rides}</div>
                    <div className="stat-label">Total Rides</div>
                  </div>
                  <div className="stat-box">
                    <div className="stat-value">{detailUser.activeRides}</div>
                    <div className="stat-label">Active Rides</div>
                  </div>
                  <div className="stat-box">
                    <div className="stat-value">{detailUser.completedRides}</div>
                    <div className="stat-label">Completed</div>
                  </div>
                  <div className="stat-box">
                    <div className="stat-value">{detailUser.cancelledRides}</div>
                    <div className="stat-label">Cancelled</div>
                  </div>
                </div>
                <div className="ride-completion">
                  <h4>Completion Rate</h4>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${Math.round((detailUser.completedRides / detailUser.rides) * 100) || 0}%` }}></div>
                  </div>
                  <span>{Math.round((detailUser.completedRides / detailUser.rides) * 100) || 0}% of rides completed</span>
                </div>

                <div className="rides-detail-grid">
                  <div className="detail-section rides-breakdown-card">
                    <h4>Ride Breakdown</h4>
                    {getRideSummaryRows(detailUser).map((item) => (
                      <div key={item.label} className="ride-breakdown-row">
                        <div>
                          <div className="ride-breakdown-label">{item.label}</div>
                          <div className="ride-breakdown-hint">{item.hint}</div>
                        </div>
                        <div className="ride-breakdown-value">{item.value}</div>
                      </div>
                    ))}
                  </div>

                  <div className="detail-section rides-log-card">
                    <h4>All Ride Details ({allUserRides.length})</h4>
                    <div className="ride-log-list ride-log-list-all">
                      {allUserRides.map((ride) => (
                        <button key={ride.id} className="ride-log-item ride-log-button" onClick={() => openTripDetail(detailUser, ride)}>
                          <div className="ride-log-top">
                            <span className="mono">{ride.id}</span>
                            <span className={`status ${statusClass[ride.status] || (ride.status === 'Completed' ? 'completed' : ride.status === 'Active' ? 'pending' : 'cancelled')}`}>{ride.status}</span>
                          </div>
                          <div className="ride-log-route">{ride.route}</div>
                          <div className="ride-log-meta">
                            <span>{ride.date}</span>
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

            {detailTab === 'subs' && (
              <div className="detail-content">
                <div className="subs-list">
                  {detailUser.subscriptions.length > 0 ? (
                    detailUser.subscriptions.map((sub) => (
                      <div key={sub.id} className="sub-item">
                        <div className="sub-header">
                          <div className="sub-name">{sub.name}</div>
                          <span className={`status ${statusClass[sub.status]}`}>{sub.status}</span>
                          <button className="act-btn red" onClick={() => removeSubscription(sub.id)} title="Remove Subscription"><i className="fa fa-trash"></i></button>
                        </div>
                        <div className="sub-details">
                          <span><strong>{sub.amount}</strong></span>
                          <span className="muted">Started: {sub.startDate}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="empty-state">No subscriptions</div>
                  )}
                </div>

                <div className="add-sub-form">
                  <h4>Add New Subscription</h4>
                  {!editSubForm ? (
                    <button className="btn-outline" onClick={() => setEditSubForm({ planId: activeSubscriptionPlans[0]?.id || '' })}><i className="fa fa-plus"></i> Add Subscription</button>
                  ) : (
                    <div className="form-row">
                      <select className="setting-input" value={editSubForm.planId} onChange={(e) => setEditSubForm({ ...editSubForm, planId: e.target.value })}>
                        {activeSubscriptionPlans.map((plan) => (
                          <option key={plan.id} value={plan.id}>{plan.name} — {plan.price} / {plan.validity}</option>
                        ))}
                      </select>
                      <button className="btn-primary" onClick={addSubscription}><i className="fa fa-check"></i> Add</button>
                      <button className="btn-outline" onClick={() => setEditSubForm(null)}>Cancel</button>
                    </div>
                  )}
                </div>

                <div className="add-sub-form topup-section">
                  <h4>Topup Plans</h4>
                  {activeTopupPlans.length > 0 ? (
                  <div className="topup-grid">
                    {activeTopupPlans.map((plan) => (
                      <div key={plan.id} className="topup-card">
                        <div className="topup-title">{plan.name}</div>
                        <div className="topup-coins">+{plan.coins} coins</div>
                        <div className="topup-meta">
                          <span>Bonus: +{plan.daily || 0}</span>
                          <strong>{plan.price}</strong>
                        </div>
                        <button className="btn-outline" onClick={() => applyTopupPlan(plan)}>
                          <i className="fa fa-bolt"></i> Apply Topup
                        </button>
                      </div>
                    ))}
                  </div>
                  ) : (
                    <div className="empty-state">No active topup plans. Create one in Subscriptions page with type Topup.</div>
                  )}
                </div>
              </div>
            )}

            {detailTab === 'groups' && (
              <div className="detail-content">
                <div className="groups-list">
                  {detailUser.groups.length > 0 ? (
                    detailUser.groups.map((groupName, idx) => {
                      const grp = GROUPS_SEED.find((g) => g.name === groupName);
                      return (
                        <button key={idx} className="group-item" onClick={() => openGroupFromUser(grp)}>
                          <span>{grp?.icon || '👥'}</span> {groupName}
                        </button>
                      );
                    })
                  ) : (
                    <div className="empty-state">Not a member of any groups</div>
                  )}
                </div>
              </div>
            )}

            {detailTab === 'achievements' && (
              <div className="detail-content">
                <div className="achievements-list">
                  {detailUser.achievements.length > 0 ? (
                    detailUser.achievements.map((ach, idx) => (
                      <div key={idx} className="achievement-item">
                        <i className="fa fa-star"></i> {ach}
                      </div>
                    ))
                  ) : (
                    <div className="empty-state">No achievements yet</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {detailGroup && (
        <Modal open={true} title={`${detailGroup.icon} ${detailGroup.name}`} onClose={() => goBack()} size="large"
          footer={<><button className="btn-outline" onClick={() => goBack()}><i className="fa fa-arrow-left"></i> Back</button><button className="btn-outline" onClick={() => setDetailGroup(null)}>Close</button></>}>
          <div className="breadcrumb-nav">
            <span className="breadcrumb-item">Users</span>
            {navPath.map((item, idx) => (
              <span key={idx}>
                <span className="breadcrumb-sep">/</span>
                <button className="breadcrumb-item" onClick={() => { 
                  if (item.type === 'user') {
                    setDetailGroup(null);
                    const user = users.find((u) => u.id === item.id);
                    setDetailUser(user);
                  }
                }}>{item.name}</button>
              </span>
            ))}
          </div>
          <div className="detail-tabs">
            <div className="tab-buttons">
              <button className={`tab-btn${detailGroupTab === 'overview' ? ' active' : ''}`} onClick={() => setDetailGroupTab('overview')}><i className="fa fa-info-circle"></i> Overview</button>
              <button className={`tab-btn${detailGroupTab === 'members' ? ' active' : ''}`} onClick={() => setDetailGroupTab('members')}><i className="fa fa-users"></i> Members</button>
              <button className={`tab-btn${detailGroupTab === 'stats' ? ' active' : ''}`} onClick={() => setDetailGroupTab('stats')}><i className="fa fa-chart-bar"></i> Stats</button>
            </div>

            {detailGroupTab === 'overview' && (
              <div className="detail-content">
                <div className="detail-grid">
                  <div className="detail-section" style={{ gridColumn: '1 / -1' }}>
                    <h4>About</h4>
                    <p style={{ color: 'var(--text-1)', marginTop: '8px' }}>{detailGroup.description}</p>
                  </div>

                  <div className="detail-section">
                    <h4>Group Information</h4>
                    <div className="detail-row"><label>Group ID</label><span className="mono">{detailGroup.id}</span></div>
                    <div className="detail-row"><label>Founded</label><span>{detailGroup.created}</span></div>
                    <div className="detail-row"><label>Founder</label><span>{detailGroup.founder}</span></div>
                    <div className="detail-row"><label>Status</label><span className="status completed">{detailGroup.status}</span></div>
                  </div>

                  <div className="detail-section">
                    <h4>Membership</h4>
                    <div className="detail-row"><label>Total Members</label><span className="amount">{detailGroup.members}</span></div>
                    <div className="detail-row"><label>Monthly Active</label><span>{detailGroup.monthlyActive}</span></div>
                  </div>
                </div>
              </div>
            )}

            {detailGroupTab === 'members' && (
              <div className="detail-content">
                <div className="members-list">
                  {detailGroup.membersList.map((member, idx) => {
                    const user = users.find((u) => u.name === member);
                    return (
                      <button key={idx} className="member-item" onClick={() => openUserFromGroupMembers(user)}>
                        <div className="member-avatar">{member.charAt(0)}</div>
                        <div className="member-info">
                          <div className="member-name">{member}</div>
                          <div className="member-role">{user?.role || 'Core Member'}</div>
                        </div>
                        <i className="fa fa-chevron-right" style={{ color: 'var(--text-2)', marginLeft: 'auto' }}></i>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {detailGroupTab === 'stats' && (
              <div className="detail-content">
                <div className="stats-grid">
                  <div className="stat-box">
                    <div className="stat-value">{detailGroup.ridesCompleted}</div>
                    <div className="stat-label">Rides Completed</div>
                  </div>
                  <div className="stat-box">
                    <div className="stat-value">{detailGroup.coEmitted}</div>
                    <div className="stat-label">CO₂ Saved</div>
                  </div>
                  <div className="stat-box">
                    <div className="stat-value">{detailGroup.monthlyActive}</div>
                    <div className="stat-label">Monthly Active</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {detailTrip && (
        <Modal open={true} title={`Trip Details: ${detailTrip.id}`} onClose={closeTripDetail} size="large"
          footer={<><button className="btn-outline" onClick={closeTripDetail}>Close</button></>}>
          <div className="detail-tabs">
            <div className="tab-buttons">
              <button className={`tab-btn${detailTripTab === 'overview' ? ' active' : ''}`} onClick={() => setDetailTripTab('overview')}><i className="fa fa-info-circle"></i> Overview</button>
              <button className={`tab-btn${detailTripTab === 'route' ? ' active' : ''}`} onClick={() => setDetailTripTab('route')}><i className="fa fa-map"></i> Route</button>
              <button className={`tab-btn${detailTripTab === 'payment' ? ' active' : ''}`} onClick={() => setDetailTripTab('payment')}><i className="fa fa-credit-card"></i> Payment</button>
              <button className={`tab-btn${detailTripTab === 'feedback' ? ' active' : ''}`} onClick={() => setDetailTripTab('feedback')}><i className="fa fa-comment"></i> Feedback</button>
            </div>

            {detailTripTab === 'overview' && (
              <div className="detail-content">
                <div className="detail-grid">
                  <div className="detail-section">
                    <h4>Trip Information</h4>
                    <div className="detail-row"><label>Trip ID</label><span className="mono">{detailTrip.id}</span></div>
                    <div className="detail-row"><label>Status</label><span className={`status ${detailTrip.status === 'Active' ? 'pending' : detailTrip.status === 'Completed' ? 'completed' : 'cancelled'}`}>{detailTrip.status}</span></div>
                    <div className="detail-row"><label>Date</label><span>{detailTrip.date}</span></div>
                    <div className="detail-row"><label>Start Time</label><span>{detailTrip.startTime}</span></div>
                    <div className="detail-row"><label>Expected End</label><span>{detailTrip.endTime || detailTrip.estimatedEnd || '-'}</span></div>
                  </div>

                  <div className="detail-section">
                    <h4>Rider & Driver</h4>
                    <div className="detail-row"><label>User</label><span>{detailTrip.user}</span></div>
                    {isDriverManagedVehicleType(businessSetup, detailTrip.vehicleType) ? (
                      <>
                        <div className="detail-row"><label>Driver</label><span>{detailTrip.driverName}</span></div>
                        <div className="detail-row"><label>Driver Rating</label><span>{detailTrip.driverRating}</span></div>
                      </>
                    ) : (
                      <div className="detail-row"><label>Operation Mode</label><span>Self Ride</span></div>
                    )}
                    <div className="detail-row"><label>Organization</label><span>{detailTrip.org}</span></div>
                  </div>

                  <div className="detail-section">
                    <h4>Vehicle</h4>
                    <div className="detail-row"><label>Vehicle ID</label><span className="mono">{detailTrip.vehicle}</span></div>
                    <div className="detail-row"><label>Vehicle Type</label><span>{detailTrip.vehicleType}</span></div>
                    <div className="detail-row"><label>License Plate</label><span className="mono">{detailTrip.licensePlate}</span></div>
                  </div>

                  <div className="detail-section">
                    <h4>Trip Metrics</h4>
                    <div className="detail-row"><label>Distance</label><span>{detailTrip.distance}</span></div>
                    <div className="detail-row"><label>Route Type</label><span>{detailTrip.routeType}</span></div>
                    <div className="detail-row"><label>Stops</label><span>{detailTrip.stops}</span></div>
                    <div className="detail-row"><label>CO2 Saved</label><span>{detailTrip.co2Saved}</span></div>
                  </div>
                </div>
              </div>
            )}

            {detailTripTab === 'route' && (
              <div className="detail-content">
                <div className="detail-section">
                  <h4>Route Details</h4>
                  <div className="location-info">
                    <div className="location-item">
                      <div className="location-marker"><i className="fa fa-circle" style={{ color: 'var(--brand)' }}></i></div>
                      <div>
                        <div className="location-label">Pickup</div>
                        <div className="location-address">{detailTrip.pickupLoc}</div>
                      </div>
                    </div>
                    <div className="route-line"></div>
                    <div className="location-item">
                      <div className="location-marker"><i className="fa fa-flag" style={{ color: 'var(--brand-2)' }}></i></div>
                      <div>
                        <div className="location-label">Dropoff</div>
                        <div className="location-address">{detailTrip.dropoffLoc}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {detailTripTab === 'payment' && (
              <div className="detail-content">
                <div className="detail-grid">
                  <div className="detail-section">
                    <h4>Fare</h4>
                    <div className="detail-row"><label>Total Fare</label><span>{detailTrip.fare}</span></div>
                    <div className="detail-row"><label>Payment Method</label><span>{detailTrip.paymentMethod}</span></div>
                    <div className="detail-row"><label>Payment Status</label><span className={`status ${detailTrip.fare === '₹0' ? 'cancelled' : 'completed'}`}>{detailTrip.fare === '₹0' ? 'No Charge' : 'Paid'}</span></div>
                  </div>
                </div>
              </div>
            )}

            {detailTripTab === 'feedback' && (
              <div className="detail-content">
                <div className="detail-grid">
                  <div className="detail-section">
                    <h4>Feedback</h4>
                    <div className="feedback-box"><p>{detailTrip.feedback}</p></div>
                  </div>
                  <div className="detail-section">
                    <h4>Driver Notes</h4>
                    <div className="feedback-box"><p>{detailTrip.notes}</p></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </section>
  );
}

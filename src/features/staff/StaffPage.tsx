import { useEffect, useMemo, useState } from 'react';
import Modal from '../../components/Modal';
import { FilterPanel, useFilterPanel } from '../../components/ColumnFilter';
import { loadOperationalLocations } from '../../config/operations-store';
import {
  STAFF_UPDATED_EVENT,
  STATION_MANAGERS_UPDATED_EVENT,
  VEHICLE_DRIVERS_UPDATED_EVENT,
  canDeleteStaff,
  createPublicStaffId,
  loadOperationalStaff,
  loadStationManagers,
  loadVehicleDrivers,
  nowIso,
  saveOperationalStaff,
} from '../../config/staff-operations-store';
import { loadFleetRows } from '../../utils/fleetSync';
import { isApiIntegrationEnabled } from '../../api/runtime';
import { createStaff, deleteStaff, listStaff, updateStaff } from '../../api/services/staffService';

const STAFF_COLUMNS = [
  { key: 'staff_id', label: 'Staff ID' },
  { key: 'name', label: 'Name', type: 'text' },
  { key: 'role', label: 'Role' },
  { key: 'phone', label: 'Phone' },
  { key: 'assignedLocationName', label: 'Assigned Location', type: 'text' },
  { key: 'status', label: 'Status' },
];

const ACCOUNTABILITY_TABS = [
  { id: 'manager', label: 'Manager View', icon: 'fa-user-tie' },
  { id: 'driver', label: 'Driver View', icon: 'fa-car-side' },
  { id: 'station', label: 'Station View', icon: 'fa-map-location-dot' },
  { id: 'vehicle', label: 'Vehicle View', icon: 'fa-shuttle-van' },
];

const SEED_STAFF = [];

function blankStaff() {
  return {
    id: '',
    staff_id: '',
    name: '',
    phone: '',
    email: '',
    role: 'manager',
    status: 'active',
    assigned_business_type: '',
    assigned_organization_id: '',
    assigned_location_id: '',
  };
}

export default function StaffPage() {
  const usingApi = isApiIntegrationEnabled();
  const [staffRows, setStaffRows] = useState(() => loadOperationalStaff(SEED_STAFF));
  const [locations, setLocations] = useState(() => loadOperationalLocations([]));
  const [stationManagers, setStationManagers] = useState(() => loadStationManagers([]));
  const [vehicleDrivers, setVehicleDrivers] = useState(() => loadVehicleDrivers([]));
  const [fleetRows, setFleetRows] = useState(() => loadFleetRows([]));
  const [staffFilter, setStaffFilter] = useState('All');
  const [roleFilter, setRoleFilter] = useState('All');
  const [stationFilter, setStationFilter] = useState('All');
  const [locationFilter, setLocationFilter] = useState('All');
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState('All');
  const [accountabilityTab, setAccountabilityTab] = useState('manager');
  const [staffSearch, setStaffSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState('');
  const [form, setForm] = useState(blankStaff());
  const [staffMode, setStaffMode] = useState(usingApi ? 'API' : 'Local');
  const [staffSyncError, setStaffSyncError] = useState('');
  const [isStaffLoading, setIsStaffLoading] = useState(false);
  const fp = useFilterPanel();

  useEffect(() => {
    saveOperationalStaff(staffRows);
  }, [staffRows]);

  useEffect(() => {
    if (!usingApi) return;
    let mounted = true;

    const hydrateStaff = async () => {
      setIsStaffLoading(true);
      setStaffSyncError('');
      try {
        const remoteRows = await listStaff({ page: 1, limit: 200 });
        if (!mounted) return;
        if (Array.isArray(remoteRows) && remoteRows.length) {
          setStaffRows(remoteRows);
          setStaffMode('API');
        } else {
          setStaffMode('Local');
        }
      } catch (error) {
        if (!mounted) return;
        setStaffMode('Local');
        setStaffSyncError(error?.message || 'Unable to sync staff from backend.');
      } finally {
        if (mounted) setIsStaffLoading(false);
      }
    };

    hydrateStaff();
    return () => {
      mounted = false;
    };
  }, [usingApi]);

  const reportStaffApiError = (actionLabel, error) => {
    setStaffSyncError(`${actionLabel} failed in API mode: ${error?.message || 'Unknown error'}. Local state was updated.`);
  };

  useEffect(() => {
    const refreshLinkedData = () => {
      setLocations(loadOperationalLocations([]));
      setStationManagers(loadStationManagers([]));
      setVehicleDrivers(loadVehicleDrivers([]));
      setFleetRows(loadFleetRows([]));
    };

    window.addEventListener('mos:operations-locations-updated', refreshLinkedData);
    window.addEventListener(STATION_MANAGERS_UPDATED_EVENT, refreshLinkedData);
    window.addEventListener(VEHICLE_DRIVERS_UPDATED_EVENT, refreshLinkedData);
    window.addEventListener(STAFF_UPDATED_EVENT, refreshLinkedData);

    return () => {
      window.removeEventListener('mos:operations-locations-updated', refreshLinkedData);
      window.removeEventListener(STATION_MANAGERS_UPDATED_EVENT, refreshLinkedData);
      window.removeEventListener(VEHICLE_DRIVERS_UPDATED_EVENT, refreshLinkedData);
      window.removeEventListener(STAFF_UPDATED_EVENT, refreshLinkedData);
    };
  }, []);

  const locationMap = useMemo(() => {
    return locations.reduce((acc, location) => {
      acc[location.id] = location.name;
      return acc;
    }, {});
  }, [locations]);

  const rows = useMemo(() => {
    return staffRows.map((row) => ({
      ...row,
      role: row.role === 'manager' ? 'Manager' : 'Driver',
      status: row.status === 'active' ? 'Active' : 'Inactive',
      assignedLocationName: locationMap[row.assigned_location_id] || '-',
    }));
  }, [locationMap, staffRows]);

  const staffNameById = useMemo(() => {
    return staffRows.reduce((acc, row) => {
      acc[row.id] = row.name;
      return acc;
    }, {});
  }, [staffRows]);

  const stationCatalog = useMemo(() => {
    return locations.flatMap((location) =>
      (location.stations || []).map((station) => ({
        stationScopeId: `${location.id}::${station.id}`,
        stationId: station.id,
        stationName: station.name,
        locationId: location.id,
        locationName: location.name,
      }))
    );
  }, [locations]);

  const managerWiseRows = useMemo(() => {
    const managers = staffRows.filter((row) => row.role === 'manager');
    return managers.map((manager) => {
      const managedStations = stationManagers.filter((row) => row.manager_id === manager.id);
      const managedStationScopes = managedStations.map((row) => row.station_id);
      const managedStationRecords = stationCatalog.filter((station) => managedStationScopes.includes(station.stationScopeId));
      const managedLocationNames = [...new Set(managedStationRecords.map((row) => row.locationName))];
      const stationVehicles = fleetRows.filter((row) => managedLocationNames.includes(row.location));
      return {
        id: manager.id,
        managerName: manager.name,
        assignedStations: managedStationRecords.map((row) => row.stationName).join(', ') || '-',
        totalVehicles: stationVehicles.length,
        activeRides: stationVehicles.filter((row) => row.status === 'Active').length,
        issues: stationVehicles.filter((row) => row.status === 'Maintenance').length,
      };
    });
  }, [fleetRows, staffRows, stationCatalog, stationManagers]);

  const driverWiseRows = useMemo(() => {
    const drivers = staffRows.filter((row) => row.role === 'driver');
    return drivers.map((driver) => {
      const assignment = vehicleDrivers.find((row) => row.driver_id === driver.id);
      const vehicle = fleetRows.find((row) => row.id === assignment?.vehicle_id);
      return {
        id: driver.id,
        driverName: driver.name,
        assignedVehicle: vehicle?.id || '-',
        vehicleType: vehicle?.type || '-',
        currentStatus: vehicle?.status === 'Active' ? 'On Trip' : 'Idle',
        tripsCompleted: vehicle ? (vehicle.status === 'Active' ? 12 : 4) : 0,
      };
    });
  }, [fleetRows, staffRows, vehicleDrivers]);

  const stationWiseRows = useMemo(() => {
    return stationCatalog.map((station) => {
      const managerNames = stationManagers
        .filter((row) => row.station_id === station.stationScopeId)
        .map((row) => staffNameById[row.manager_id])
        .filter(Boolean);
      const fleet = fleetRows.filter((row) => row.location === station.locationName);
      return {
        stationScopeId: station.stationScopeId,
        stationName: station.stationName,
        assignedManagers: managerNames.join(', ') || '-',
        totalVehicles: fleet.length,
        activeRides: fleet.filter((row) => row.status === 'Active').length,
        availableVehicles: fleet.filter((row) => row.status !== 'Maintenance').length,
      };
    });
  }, [fleetRows, staffNameById, stationCatalog, stationManagers]);

  const vehicleWiseRows = useMemo(() => {
    return fleetRows.map((vehicle) => {
      const assignment = vehicleDrivers.find((row) => row.vehicle_id === vehicle.id);
      return {
        vehicleId: vehicle.id,
        type: vehicle.type,
        station: vehicle.location || '-',
        assignedDriver: staffNameById[assignment?.driver_id] || 'Unassigned',
        status: vehicle.status,
      };
    });
  }, [fleetRows, staffNameById, vehicleDrivers]);

  const filteredManagerRows = useMemo(() => {
    return managerWiseRows.filter((row) => {
      const inStaff = staffFilter === 'All' || row.managerName === staffFilter;
      const inRole = roleFilter === 'All' || roleFilter === 'Manager';
      return inStaff && inRole;
    });
  }, [managerWiseRows, roleFilter, staffFilter]);

  const filteredDriverRows = useMemo(() => {
    return driverWiseRows.filter((row) => {
      const inStaff = staffFilter === 'All' || row.driverName === staffFilter;
      const inRole = roleFilter === 'All' || roleFilter === 'Driver';
      const inType = vehicleTypeFilter === 'All' || row.vehicleType === vehicleTypeFilter;
      return inStaff && inRole && inType;
    });
  }, [driverWiseRows, roleFilter, staffFilter, vehicleTypeFilter]);

  const filteredStationRows = useMemo(() => {
    return stationWiseRows.filter((row) => {
      const stationRef = stationCatalog.find((entry) => entry.stationScopeId === row.stationScopeId);
      const inStation = stationFilter === 'All' || row.stationName === stationFilter;
      const inLocation = locationFilter === 'All' || stationRef?.locationName === locationFilter;
      return inStation && inLocation;
    });
  }, [locationFilter, stationCatalog, stationFilter, stationWiseRows]);

  const filteredVehicleRows = useMemo(() => {
    return vehicleWiseRows.filter((row) => {
      const inType = vehicleTypeFilter === 'All' || row.type === vehicleTypeFilter;
      const inLocation = locationFilter === 'All' || row.station === locationFilter;
      const inStaff = staffFilter === 'All' || row.assignedDriver === staffFilter;
      return inType && inLocation && inStaff;
    });
  }, [locationFilter, staffFilter, vehicleTypeFilter, vehicleWiseRows]);

  const searchedRows = useMemo(() => {
    const query = staffSearch.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) => {
      return [row.staff_id, row.name, row.role, row.phone, row.assignedLocationName, row.status]
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  }, [rows, staffSearch]);

  const visibleRows = useMemo(
    () => searchedRows.filter((row) => STAFF_COLUMNS.every((column) => fp.match(column.key, row[column.key]))),
    [searchedRows, fp.filters]
  );

  useEffect(() => {
    setSelectedIds((current) => current.filter((id) => staffRows.some((row) => row.id === id)));
  }, [staffRows]);

  const allVisibleSelected = visibleRows.length > 0 && visibleRows.every((row) => selectedIds.includes(row.id));

  const toggleAllVisible = (checked) => {
    setSelectedIds(checked ? visibleRows.map((row) => row.id) : []);
  };

  const toggleSelectedRow = (staffId, checked) => {
    setSelectedIds((current) => (
      checked
        ? [...new Set([...current, staffId])]
        : current.filter((id) => id !== staffId)
    ));
  };

  const summary = useMemo(() => {
    const active = staffRows.filter((row) => row.status === 'active').length;
    const managers = staffRows.filter((row) => row.role === 'manager').length;
    const drivers = staffRows.filter((row) => row.role === 'driver').length;
    return { total: staffRows.length, active, managers, drivers };
  }, [staffRows]);

  const activeLocationOptions = useMemo(
    () => locations.filter((location) => location.status === 'Active'),
    [locations]
  );

  const accountabilityStats = useMemo(() => {
    const assignedDrivers = vehicleWiseRows.filter((row) => row.assignedDriver !== 'Unassigned').length;
    const managedStations = stationWiseRows.filter((row) => row.assignedManagers !== '-').length;
    const openIssues = managerWiseRows.reduce((sum, row) => sum + row.issues, 0);
    return {
      assignedDrivers,
      managedStations,
      openIssues,
    };
  }, [managerWiseRows, stationWiseRows, vehicleWiseRows]);

  const openCreate = () => {
    setEditingStaffId('');
    setForm(blankStaff());
    setShowModal(true);
  };

  const openEdit = (row) => {
    const raw = staffRows.find((item) => item.id === row.id);
    if (!raw) return;
    setEditingStaffId(raw.id);
    setForm({
      ...raw,
      role: raw.role || 'manager',
      status: raw.status || 'active',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.phone.trim() || !form.email.trim()) return;

    if (editingStaffId) {
      if (usingApi) {
        try {
          await updateStaff({ ...form, id: editingStaffId, apiId: editingStaffId });
        } catch (error) {
          reportStaffApiError('Update staff', error);
        }
      }
      setStaffRows((current) => current.map((row) => (
        row.id === editingStaffId
          ? { ...row, ...form, updated_at: nowIso() }
          : row
      )));
    } else {
      let nextRow = {
        ...form,
        id: `staff-${Date.now()}`,
        staff_id: createPublicStaffId(staffRows),
        created_at: nowIso(),
        updated_at: nowIso(),
      };

      if (usingApi) {
        try {
          const created = await createStaff(nextRow);
          if (created?.id) nextRow = created;
        } catch (error) {
          reportStaffApiError('Create staff', error);
        }
      }

      setStaffRows((current) => [...current, nextRow]);
    }

    setShowModal(false);
    setEditingStaffId('');
    setForm(blankStaff());
  };

  const handleDelete = async (staffId) => {
    const check = canDeleteStaff(staffId, stationManagers, vehicleDrivers);
    if (!check.allowed) {
      window.alert(check.reason);
      return;
    }
    if (!window.confirm('Delete this staff member?')) return;
    // deleteStaff() reads `staff.phone` (the backend deletes users by phone), so
    // we must pass the full StaffRow — not the bare id string, which left phone
    // undefined and made the server return "User not found" while the UI removed
    // the row anyway (fake success).
    const target = staffRows.find((row) => row.id === staffId);
    if (usingApi) {
      try {
        await deleteStaff(target ?? { id: staffId });
      } catch (error) {
        reportStaffApiError('Delete staff', error);
        return; // keep the row on screen; the server delete failed
      }
    }
    setStaffRows((current) => current.filter((row) => row.id !== staffId));
  };

  const toggleStatus = async (staffId) => {
    const currentRow = staffRows.find((row) => row.id === staffId);
    const nextStatus = currentRow?.status === 'active' ? 'inactive' : 'active';
    if (usingApi && currentRow) {
      try {
        await updateStaff({ ...currentRow, status: nextStatus });
      } catch (error) {
        reportStaffApiError('Toggle staff status', error);
      }
    }
    setStaffRows((current) => current.map((row) => {
      if (row.id !== staffId) return row;
      return {
        ...row,
        status: row.status === 'active' ? 'inactive' : 'active',
        updated_at: nowIso(),
      };
    }));
  };

  return (
    <section className="page active" id="page-staff">

      {/* Hero */}
      <div className="page-hero ph-staff">
        <div className="page-hero-left">
          <div className="page-hero-icon"><i className="fa fa-users-gear"></i></div>
          <div className="page-hero-text">
            <h1>Staff Command Center</h1>
            <p>Manage operators, assignments, accountability metrics, and staffing health.</p>
          </div>
        </div>
        <div className="page-hero-right">
          <div className="page-hero-chips">
            <span className="page-hero-chip"><i className="fa fa-user-check"></i> {summary.active} Active</span>
            <span className="page-hero-chip"><i className="fa fa-user-tie"></i> {summary.managers} Managers</span>
            <span className="page-hero-chip"><i className="fa fa-car-side"></i> {summary.drivers} Drivers</span>
          </div>
          <button className="btn-primary" onClick={openCreate}><i className="fa fa-plus"></i> Add Staff</button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid" style={{ marginTop: 'var(--grid-gap)' }}>
        <div className="kpi-card">
          <div className="kpi-info">
            <span className="kpi-label">Total Staff</span>
            <strong className="kpi-value">{summary.total}</strong>
            <span className="kpi-sub">All roles</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-info">
            <span className="kpi-label">Active Staff</span>
            <strong className="kpi-value">{summary.active}</strong>
            <span className="kpi-sub">On duty</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-info">
            <span className="kpi-label">Assigned Drivers</span>
            <strong className="kpi-value">{accountabilityStats.assignedDrivers}</strong>
            <span className="kpi-sub">With vehicles</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-info">
            <span className="kpi-label">Managed Stations</span>
            <strong className="kpi-value">{accountabilityStats.managedStations}</strong>
            <span className="kpi-sub">Supervised</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-info">
            <span className="kpi-label">Open Issues</span>
            <strong className="kpi-value">{accountabilityStats.openIssues}</strong>
            <span className="kpi-sub">Needs attention</span>
          </div>
        </div>
      </div>

      {/* Data Mode Banner */}
      {(isStaffLoading || staffSyncError || staffMode === 'Local') && (
        <div className="table-card" style={{ marginTop: 'var(--grid-gap)', padding: '10px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', fontSize: '0.78rem' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 999, background: staffMode === 'API' ? 'rgba(0,212,160,0.12)' : 'rgba(251,191,36,0.14)', color: staffMode === 'API' ? 'var(--brand)' : '#fbbf24', border: `1px solid ${staffMode === 'API' ? 'rgba(0,212,160,0.25)' : 'rgba(251,191,36,0.28)'}`, fontWeight: 600 }}>
              <i className={`fa ${staffMode === 'API' ? 'fa-plug-circle-check' : 'fa-database'}`}></i> Staff Mode: {staffMode}
            </span>
            {isStaffLoading && <span style={{ color: 'var(--text-3)' }}>Syncing staff from backend…</span>}
            {staffSyncError && <span style={{ color: '#fca5a5' }}>{staffSyncError}</span>}
          </div>
        </div>
      )}

      {/* Staff Directory Table */}
      <div className="table-card" style={{ marginTop: 'var(--grid-gap)' }}>
        <div className="table-card-header">
          <div>
            <div className="table-card-title">Staff Directory</div>
            <div className="table-card-subtitle">Track identity, role, contact, and assignment status.</div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card-glass-bg)' }}>
              <i className="fa fa-search" style={{ opacity: 0.45, fontSize: '0.78rem', color: 'var(--text-3)' }}></i>
              <input
                type="search"
                style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: '0.82rem', color: 'var(--text-1)', width: 190 }}
                placeholder="Search staff, role, phone…"
                value={staffSearch}
                onChange={(e) => setStaffSearch(e.target.value)}
              />
            </label>
            <button className={`btn-outline${fp.anyFiltered ? ' filter-btn-active' : ''}`} onClick={() => fp.setOpen(true)}>
              <i className="fa fa-filter"></i> Filter{fp.anyFiltered ? ` (${fp.filterCount})` : ''}
            </button>
          </div>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th><input type="checkbox" checked={allVisibleSelected} onChange={(e) => toggleAllVisible(e.target.checked)} aria-label="Select all" /></th>
                <th>Staff ID</th>
                <th>Name</th>
                <th>Role</th>
                <th>Phone</th>
                <th>Location</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => (
                <tr key={row.id} aria-selected={selectedIds.includes(row.id)}>
                  <td><input type="checkbox" checked={selectedIds.includes(row.id)} onChange={(e) => toggleSelectedRow(row.id, e.target.checked)} aria-label={`Select ${row.name}`} /></td>
                  <td><span style={{ fontFamily: 'monospace', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-3)' }}>{row.staff_id}</span></td>
                  <td><strong style={{ color: 'var(--text-1)', fontWeight: 600 }}>{row.name}</strong></td>
                  <td>{row.role}</td>
                  <td>{row.phone}</td>
                  <td>{row.assignedLocationName}</td>
                  <td><span className={`status ${row.status === 'Active' ? 'completed' : 'cancelled'}`}>{row.status}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="act-btn" title="Edit" onClick={() => openEdit(row)}><i className="fa fa-pen"></i></button>
                      <button className="act-btn" title="Toggle Status" onClick={() => toggleStatus(row.id)}><i className="fa fa-power-off"></i></button>
                      <button className="act-btn red" title="Delete" onClick={() => handleDelete(row.id)}><i className="fa fa-trash"></i></button>
                    </div>
                  </td>
                </tr>
              ))}
              {!visibleRows.length && (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-3)', fontSize: '0.84rem' }}>No staff records found for selected filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <FilterPanel hook={fp} columns={STAFF_COLUMNS} data={rows} />
      </div>

      {/* Operations Accountability */}
      <div className="table-card" style={{ marginTop: 'var(--grid-gap)' }}>
        <div className="table-card-header">
          <div>
            <div className="table-card-title">Operations Accountability</div>
            <div className="table-card-subtitle">Analyze staffing responsibility by manager, driver, station, and vehicle.</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }} role="tablist" aria-label="Accountability views">
          {ACCOUNTABILITY_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={accountabilityTab === tab.id}
              onClick={() => setAccountabilityTab(tab.id)}
              style={{
                padding: '5px 14px',
                borderRadius: 999,
                fontSize: '0.8rem',
                fontWeight: 600,
                border: accountabilityTab === tab.id ? '1px solid rgba(0,212,160,0.4)' : '1px solid var(--border)',
                background: accountabilityTab === tab.id ? 'rgba(0,212,160,0.12)' : 'transparent',
                color: accountabilityTab === tab.id ? 'var(--brand)' : 'var(--text-2)',
                cursor: 'pointer',
              }}
            >
              <i className={`fa ${tab.icon}`} style={{ marginRight: 5 }}></i>{tab.label}
            </button>
          ))}
        </div>

        <div className="form-grid" style={{ marginBottom: 14 }}>
          <div className="form-field"><label>By Staff</label><select className="setting-input" value={staffFilter} onChange={(e) => setStaffFilter(e.target.value)}><option>All</option>{staffRows.map((row) => <option key={row.id}>{row.name}</option>)}</select></div>
          <div className="form-field"><label>By Role</label><select className="setting-input" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}><option>All</option><option>Manager</option><option>Driver</option></select></div>
          <div className="form-field"><label>By Station</label><select className="setting-input" value={stationFilter} onChange={(e) => setStationFilter(e.target.value)}><option>All</option>{stationCatalog.map((row) => <option key={row.stationScopeId}>{row.stationName}</option>)}</select></div>
          <div className="form-field"><label>By Location</label><select className="setting-input" value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)}><option>All</option>{locations.map((row) => <option key={row.id}>{locationMap[row.id]}</option>)}</select></div>
          <div className="form-field"><label>By Vehicle Type</label><select className="setting-input" value={vehicleTypeFilter} onChange={(e) => setVehicleTypeFilter(e.target.value)}><option>All</option>{[...new Set(fleetRows.map((row) => row.type))].map((type) => <option key={type}>{type}</option>)}</select></div>
        </div>

        {accountabilityTab === 'manager' && (
          <div className="table-wrap"><table className="data-table"><thead><tr><th>Manager Name</th><th>Assigned Stations</th><th>Total Vehicles</th><th>Active Rides</th><th>Issues</th></tr></thead><tbody>{filteredManagerRows.map((row) => <tr key={row.id}><td>{row.managerName}</td><td>{row.assignedStations}</td><td>{row.totalVehicles}</td><td>{row.activeRides}</td><td>{row.issues}</td></tr>)}{!filteredManagerRows.length && <tr><td colSpan={5} style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-3)', fontSize: '0.84rem' }}>No data</td></tr>}</tbody></table></div>
        )}
        {accountabilityTab === 'driver' && (
          <div className="table-wrap"><table className="data-table"><thead><tr><th>Driver Name</th><th>Assigned Vehicle</th><th>Vehicle Type</th><th>Current Status</th><th>Trips Completed</th></tr></thead><tbody>{filteredDriverRows.map((row) => <tr key={row.id}><td>{row.driverName}</td><td>{row.assignedVehicle}</td><td>{row.vehicleType}</td><td>{row.currentStatus}</td><td>{row.tripsCompleted}</td></tr>)}{!filteredDriverRows.length && <tr><td colSpan={5} style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-3)', fontSize: '0.84rem' }}>No data</td></tr>}</tbody></table></div>
        )}
        {accountabilityTab === 'station' && (
          <div className="table-wrap"><table className="data-table"><thead><tr><th>Station Name</th><th>Assigned Manager(s)</th><th>Total Vehicles</th><th>Active Rides</th><th>Available</th></tr></thead><tbody>{filteredStationRows.map((row) => <tr key={row.stationScopeId}><td>{row.stationName}</td><td>{row.assignedManagers}</td><td>{row.totalVehicles}</td><td>{row.activeRides}</td><td>{row.availableVehicles}</td></tr>)}{!filteredStationRows.length && <tr><td colSpan={5} style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-3)', fontSize: '0.84rem' }}>No data</td></tr>}</tbody></table></div>
        )}
        {accountabilityTab === 'vehicle' && (
          <div className="table-wrap"><table className="data-table"><thead><tr><th>Vehicle ID</th><th>Type</th><th>Station</th><th>Assigned Driver</th><th>Status</th></tr></thead><tbody>{filteredVehicleRows.map((row) => <tr key={row.vehicleId}><td>{row.vehicleId}</td><td>{row.type}</td><td>{row.station}</td><td>{row.assignedDriver}</td><td>{row.status}</td></tr>)}{!filteredVehicleRows.length && <tr><td colSpan={5} style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-3)', fontSize: '0.84rem' }}>No data</td></tr>}</tbody></table></div>
        )}
      </div>

      <Modal
        open={showModal}
        title={editingStaffId ? 'Edit Staff' : 'Add Staff'}
        onClose={() => setShowModal(false)}
        size="lg"
        footer={<><button className="btn-outline" onClick={() => setShowModal(false)}>Cancel</button><button className="btn-primary" onClick={handleSave}>Save</button></>}
      >
        <div className="form-grid">
          <div className="form-field"><label>Name</label><input className="setting-input" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} /></div>
          <div className="form-field"><label>Phone</label><input className="setting-input" value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} /></div>
          <div className="form-field"><label>Email</label><input className="setting-input" value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} /></div>
          <div className="form-field"><label>Role</label>
            <select className="setting-input" value={form.role} onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}>
              <option value="manager">Manager</option>
              <option value="driver">Driver</option>
            </select>
          </div>
          <div className="form-field"><label>Status</label>
            <select className="setting-input" value={form.status} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="form-field"><label>Business Type (Optional)</label><input className="setting-input" value={form.assigned_business_type} onChange={(e) => setForm((prev) => ({ ...prev, assigned_business_type: e.target.value }))} /></div>
          <div className="form-field"><label>Organization (Optional)</label><input className="setting-input" value={form.assigned_organization_id} onChange={(e) => setForm((prev) => ({ ...prev, assigned_organization_id: e.target.value }))} /></div>
          <div className="form-field"><label>Location (Optional)</label>
            <select className="setting-input" value={form.assigned_location_id} onChange={(e) => setForm((prev) => ({ ...prev, assigned_location_id: e.target.value }))}>
              <option value="">Unassigned</option>
              {activeLocationOptions.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
            </select>
          </div>
        </div>
      </Modal>
    </section>
  );
}

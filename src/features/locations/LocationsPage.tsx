import { useEffect, useMemo, useState } from 'react';
import Modal from '../../components/Modal';
import { LocationPickerMap, StationMap } from '../../components/StationMap';
import { loadFleetRows, subscribeFleetRows } from '../../utils/fleetSync';
import { BUSINESS_SETUP_UPDATED_EVENT, getActiveBusinessTypes, getActiveSetupLocations, getActiveVehicleTypes, loadBusinessSetup } from '../../config/business-setup';
import { loadOperationalLocations, saveOperationalLocations } from '../../config/operations-store';
import {
  STAFF_UPDATED_EVENT,
  STATION_MANAGERS_UPDATED_EVENT,
  loadOperationalStaff,
  loadStationManagers,
  saveStationManagers,
  upsertStationManagers,
} from '../../config/staff-operations-store';
import { isApiIntegrationEnabled } from '../../api/runtime';
import { createLocation as createLocationApi, listLocations, updateLocation } from '../../api/services/locationsService';

const DEFAULT_VEHICLE_TYPES = ['Cycle', 'E-Bike', 'E-Scooter', 'Buggy', 'Bus', 'E-Buggy', 'Shuttle Bus'];
const VEHICLE_STATUS_OPTIONS = ['Available', 'Maintenance', 'Running'];

function seedStation(id, name, locationPin, city, state, status = 'Active') {
  return { id, name, locationPin, city, state, status };
}

function buildVehicleRows(locationId, vehicles) {
  const rows = [];
  const types = Object.keys(vehicles.byType || {}).filter((type) => (vehicles.byType[type] || 0) > 0);
  types.forEach((type) => {
    const pool = vehicles.statusByType?.[type] || { Available: 0, Maintenance: 0, Running: 0 };
    Object.entries(pool).forEach(([status, count]) => {
      for (let i = 0; i < count; i += 1) {
        rows.push({
          id: `${locationId}-${type.replace(/\s+/g, '').toUpperCase()}-${String(rows.length + 1).padStart(3, '0')}`,
          type,
          status,
        });
      }
    });
  });
  return rows;
}

function buildVehicleMeta(byType, statusByType) {
  const total = Object.values(byType).reduce((sum, count) => sum + Number(count || 0), 0);
  const statusTotals = VEHICLE_STATUS_OPTIONS.reduce((acc, status) => {
    acc[status] = Object.values(statusByType).reduce((sum, pool) => sum + Number(pool?.[status] || 0), 0);
    return acc;
  }, {});

  return {
    total,
    statusTotals,
    byType,
    statusByType,
  };
}

const SEED_LOCATIONS = [];

function createLocationId(index) {
  return `LOC-${String(index).padStart(3, '0')}`;
}

function createStationId(index) {
  return `ST-${String(index).padStart(3, '0')}`;
}

function createStationScopeId(locationId, stationId) {
  return `${locationId}::${stationId}`;
}

function defaultStation() {
  return {
    id: '',
    name: '',
    locationPin: '',
    city: '',
    state: '',
    status: 'Active',
  };
}

function defaultVehicleAllocation() {
  return {
    selectedTypes: [],
    byType: {},
    statusByType: {},
  };
}

function defaultLocation(id) {
  return {
    id,
    sourceType: 'manual',
    businessTypeId: '',
    businessType: '',
    stateLocationId: '',
    cityLocationId: '',
    name: '',
    description: '',
    state: '',
    city: '',
    vehicles: buildVehicleMeta({}, {}),
    revenue: '₹0',
    health: 'Good',
    status: 'Active',
    stations: [],
    stationDisplayCount: 0,
  };
}

function defaultFilters() {
  return {
    search: '',
    status: 'All',
    businessType: 'All',
    health: 'All',
  };
}

function isValidLocationPin(value) {
  if (!value) return false;
  const parts = String(value).split(',').map((item) => Number(item.trim()));
  return parts.length === 2
    && Number.isFinite(parts[0])
    && Number.isFinite(parts[1])
    && Math.abs(parts[0]) <= 90
    && Math.abs(parts[1]) <= 180
    && (parts[0] !== 0 || parts[1] !== 0);
}

function mapFleetStatusToLocationStatus(status) {
  if (status === 'Maintenance') return 'Maintenance';
  if (status === 'Active') return 'Running';
  return 'Available';
}

function mergeVehiclesFromFleetRows(currentLocations, fleetRows) {
  if (!Array.isArray(fleetRows) || !fleetRows.length) return currentLocations;

  const aggregateByLocation = fleetRows.reduce((acc, row) => {
    const locationName = row.location || 'Unassigned';
    if (!acc[locationName]) {
      acc[locationName] = { byType: {}, statusByType: {} };
    }

    const type = row.type || 'Cycle';
    const mappedStatus = mapFleetStatusToLocationStatus(row.status);
    acc[locationName].byType[type] = Number(acc[locationName].byType[type] || 0) + 1;

    if (!acc[locationName].statusByType[type]) {
      acc[locationName].statusByType[type] = { Available: 0, Maintenance: 0, Running: 0 };
    }
    acc[locationName].statusByType[type][mappedStatus] += 1;
    return acc;
  }, {});

  return currentLocations.map((location) => {
    const aggregate = aggregateByLocation[location.name];
    if (!aggregate) return location;
    return {
      ...location,
      vehicles: buildVehicleMeta(aggregate.byType, aggregate.statusByType),
    };
  });
}

function mapApiLocation(raw) {
  return {
    ...defaultLocation(String(raw.id || raw.location_id || createLocationId(999))),
    id: String(raw.id || raw.location_id || createLocationId(999)),
    sourceType: 'manual',
    businessTypeId: raw.business_type_id || '',
    businessType: raw.business_type_name || raw.business_type || '',
    name: raw.name || raw.location_name || '',
    description: raw.description || '',
    state: raw.state || '',
    city: raw.city || '',
    status: String(raw.status || 'active').toLowerCase() === 'active' ? 'Active' : 'Inactive',
    stations: Array.isArray(raw.stations)
      ? raw.stations.map((station, index) => ({
          id: String(station.id || station.station_id || createStationId(index + 1)),
          name: station.station_name || station.name || `Station ${index + 1}`,
          locationPin: station.coordinates || station.locationPin || '',
          city: station.city || raw.city || '',
          state: station.state || raw.state || '',
          status: String(station.status || 'active').toLowerCase() === 'active' ? 'Active' : 'Inactive',
        }))
      : [],
  };
}

export default function LocationsPage() {
  const usingApi = isApiIntegrationEnabled();
  const [businessSetup, setBusinessSetup] = useState(loadBusinessSetup);
  const [locations, setLocations] = useState(() => loadOperationalLocations(SEED_LOCATIONS));
  const [staffRows, setStaffRows] = useState(() => loadOperationalStaff([]));
  const [stationManagers, setStationManagers] = useState(() => loadStationManagers([]));
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showStationModal, setShowStationModal] = useState(false);
  const [showManagerAssignModal, setShowManagerAssignModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [filters, setFilters] = useState(defaultFilters());
  const [locationForm, setLocationForm] = useState(() => defaultLocation(createLocationId(SEED_LOCATIONS.length + 1)));
  const [stationForm, setStationForm] = useState(defaultStation());
  const [editingStationId, setEditingStationId] = useState('');
  const [vehicleAllocation, setVehicleAllocation] = useState(defaultVehicleAllocation());
  const [selectedVehicleStatus, setSelectedVehicleStatus] = useState('All');
  const [detailVehicleTypeFilter, setDetailVehicleTypeFilter] = useState('All');
  const [detailVehicleSearch, setDetailVehicleSearch] = useState('');
  const [showDetailVehicleModal, setShowDetailVehicleModal] = useState(false);
  const [showDetailVehicleFilters, setShowDetailVehicleFilters] = useState(false);
  const [detailVehicleFiltersDraft, setDetailVehicleFiltersDraft] = useState({ search: '', type: 'All', status: 'All' });
  const [showVehicleTable, setShowVehicleTable] = useState(true);
  const [detailVehicleForm, setDetailVehicleForm] = useState({ type: DEFAULT_VEHICLE_TYPES[0], status: 'Available', count: 1 });
  const [showBulkAllocationModal, setShowBulkAllocationModal] = useState(false);
  const [detailVehicleAllocation, setDetailVehicleAllocation] = useState(defaultVehicleAllocation());
  const [detailStationDraft, setDetailStationDraft] = useState(defaultStation());
  const [detailEditingStationId, setDetailEditingStationId] = useState('');
  const [managerStationContext, setManagerStationContext] = useState({ locationId: '', stationId: '', stationName: '' });
  const [selectedManagerIds, setSelectedManagerIds] = useState([]);
  const [showDetailStationModal, setShowDetailStationModal] = useState(false);
  const [locationsMode, setLocationsMode] = useState(usingApi ? 'API' : 'Local');
  const [locationsSyncError, setLocationsSyncError] = useState('');
  const [isLocationsLoading, setIsLocationsLoading] = useState(false);

  useEffect(() => {
    setLocations((prev) => mergeVehiclesFromFleetRows(prev, loadFleetRows([])));
    const unsubscribe = subscribeFleetRows((fleetRows) => {
      setLocations((prev) => mergeVehiclesFromFleetRows(prev, fleetRows));
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!usingApi) return;
    let mounted = true;

    const hydrateLocations = async () => {
      setIsLocationsLoading(true);
      setLocationsSyncError('');
      try {
        const remoteRows = await listLocations({ page: 1, limit: 300 });
        if (!mounted) return;
        if (Array.isArray(remoteRows) && remoteRows.length) {
          setLocations(remoteRows.map((row) => mapApiLocation(row)));
          setLocationsMode('API');
        } else {
          setLocationsMode('Local');
        }
      } catch (error) {
        if (!mounted) return;
        setLocationsMode('Local');
        setLocationsSyncError(error?.message || 'Unable to sync locations from backend.');
      } finally {
        if (mounted) setIsLocationsLoading(false);
      }
    };

    hydrateLocations();
    return () => {
      mounted = false;
    };
  }, [usingApi]);

  const reportLocationsApiError = (actionLabel, error) => {
    setLocationsSyncError(`${actionLabel} failed in API mode: ${error?.message || 'Unknown error'}. Local state was updated.`);
  };

  useEffect(() => {
    const reloadSetup = () => setBusinessSetup(loadBusinessSetup());
    window.addEventListener('mos:organization-settings-updated', reloadSetup);
    window.addEventListener('mos:operations-locations-updated', reloadSetup);
    window.addEventListener(BUSINESS_SETUP_UPDATED_EVENT, reloadSetup);
    return () => {
      window.removeEventListener('mos:organization-settings-updated', reloadSetup);
      window.removeEventListener('mos:operations-locations-updated', reloadSetup);
      window.removeEventListener(BUSINESS_SETUP_UPDATED_EVENT, reloadSetup);
    };
  }, []);

  useEffect(() => {
    const syncStaffOps = () => {
      setStaffRows(loadOperationalStaff([]));
      setStationManagers(loadStationManagers([]));
    };

    window.addEventListener(STAFF_UPDATED_EVENT, syncStaffOps);
    window.addEventListener(STATION_MANAGERS_UPDATED_EVENT, syncStaffOps);

    return () => {
      window.removeEventListener(STAFF_UPDATED_EVENT, syncStaffOps);
      window.removeEventListener(STATION_MANAGERS_UPDATED_EVENT, syncStaffOps);
    };
  }, []);

  useEffect(() => {
    saveOperationalLocations(locations);
  }, [locations]);

  const activeBusinessTypes = useMemo(() => getActiveBusinessTypes(businessSetup), [businessSetup]);
  const activeSetupLocations = useMemo(() => getActiveSetupLocations(businessSetup), [businessSetup]);
  const vehicleTypeOptions = useMemo(() => {
    const configured = getActiveVehicleTypes(businessSetup).map((item) => item.name);
    const existing = locations.flatMap((location) => Object.keys(location?.vehicles?.byType || {}));
    const merged = [...configured];
    [...existing, ...DEFAULT_VEHICLE_TYPES].forEach((type) => {
      if (type && !merged.includes(type)) merged.push(type);
    });
    return merged;
  }, [businessSetup, locations]);
  const stateOptions = useMemo(() => activeSetupLocations.filter((item) => item.type === 'State'), [activeSetupLocations]);
  const cityOptions = useMemo(() => activeSetupLocations.filter((item) => item.type === 'City' && (!locationForm.stateLocationId || item.parentId === locationForm.stateLocationId)), [activeSetupLocations, locationForm.stateLocationId]);

  const totalVehicles = useMemo(() => locations.reduce((sum, location) => sum + Number(location.vehicles.total || 0), 0), [locations]);
  const totalStations = useMemo(() => locations.reduce((sum, location) => sum + (location.stationDisplayCount || location.stations.length), 0), [locations]);
  const totalRevenue = useMemo(() => locations.reduce((sum, location) => sum + Number(String(location.revenue).replace(/[^0-9.]/g, '') || 0), 0), [locations]);
  const activeLocations = useMemo(() => locations.filter((location) => location.status === 'Active').length, [locations]);
  const healthWarnings = useMemo(() => locations.filter((location) => location.health === 'Warning').length, [locations]);

  const selectedLocation = useMemo(() => locations.find((location) => location.id === selectedLocationId) || null, [locations, selectedLocationId]);

  const managerNameById = useMemo(() => {
    return staffRows.reduce((acc, row) => {
      acc[row.id] = row.name;
      return acc;
    }, {});
  }, [staffRows]);

  const activeManagers = useMemo(
    () => staffRows.filter((row) => row.role === 'manager' && row.status === 'active'),
    [staffRows]
  );

  const managerOptionsForSelectedLocation = useMemo(() => activeManagers, [activeManagers]);

  const getManagerIdsForStation = (locationId, stationId) => {
    const scopedId = createStationScopeId(locationId, stationId);
    return stationManagers.filter((row) => row.station_id === scopedId).map((row) => row.manager_id);
  };

  const getManagerNamesForStation = (locationId, stationId) => {
    const managerIds = getManagerIdsForStation(locationId, stationId);
    return managerIds.map((managerId) => managerNameById[managerId]).filter(Boolean);
  };

  useEffect(() => {
    setDetailVehicleForm((prev) => vehicleTypeOptions.includes(prev.type) ? prev : { ...prev, type: vehicleTypeOptions[0] || DEFAULT_VEHICLE_TYPES[0] });
  }, [vehicleTypeOptions]);

  const visibleLocations = useMemo(() => {
    return locations.filter((location) => {
      const search = filters.search.trim().toLowerCase();
      const inSearch = !search
        || location.name.toLowerCase().includes(search)
        || location.id.toLowerCase().includes(search)
        || location.businessType.toLowerCase().includes(search)
        || location.description.toLowerCase().includes(search);

      const inStatus = filters.status === 'All' || location.status === filters.status;
      const inBusiness = filters.businessType === 'All' || location.businessType === filters.businessType;
      const inHealth = filters.health === 'All' || location.health === filters.health;
      return inSearch && inStatus && inBusiness && inHealth;
    });
  }, [filters, locations]);

  const filterCount = Number(filters.status !== 'All') + Number(filters.businessType !== 'All') + Number(filters.health !== 'All') + Number(!!filters.search.trim());

  const canSaveStation = stationForm.name.trim() && isValidLocationPin(stationForm.locationPin);
  const canSaveLocation = locationForm.businessTypeId && locationForm.stateLocationId && locationForm.cityLocationId && locationForm.name.trim();
  const canSaveDetailStation = detailStationDraft.name.trim() && isValidLocationPin(detailStationDraft.locationPin);

  const detailVehicleRows = useMemo(() => {
    if (!selectedLocation) return [];
    return buildVehicleRows(selectedLocation.id, selectedLocation.vehicles);
  }, [selectedLocation]);

  const visibleDetailVehicleRows = useMemo(() => {
    const search = detailVehicleSearch.trim().toLowerCase();
    return detailVehicleRows.filter((row) => {
      const inStatus = selectedVehicleStatus === 'All' || row.status === selectedVehicleStatus;
      const inType = detailVehicleTypeFilter === 'All' || row.type === detailVehicleTypeFilter;
      const inSearch = !search || row.id.toLowerCase().includes(search) || row.type.toLowerCase().includes(search);
      return inStatus && inType && inSearch;
    });
  }, [detailVehicleRows, selectedVehicleStatus, detailVehicleTypeFilter, detailVehicleSearch]);

  const canSaveDetailVehicle = Math.max(0, Number(detailVehicleForm.count || 0)) > 0;
  const detailVehicleFilterCount = Number(!!detailVehicleSearch.trim()) + Number(detailVehicleTypeFilter !== 'All') + Number(selectedVehicleStatus !== 'All');

  useEffect(() => {
    setDetailVehicleTypeFilter('All');
    setDetailVehicleSearch('');
    setShowVehicleTable(true);
    setDetailVehicleForm({ type: vehicleTypeOptions[0] || DEFAULT_VEHICLE_TYPES[0], status: 'Available', count: 1 });
  }, [selectedLocationId]);

  const openCreateModal = () => {
    const next = defaultLocation(createLocationId(locations.length + 1));
    const firstBusiness = activeBusinessTypes[0] || null;
    setLocationForm({
      ...next,
      businessTypeId: firstBusiness?.id || '',
      businessType: firstBusiness?.name || '',
    });
    setStationForm(defaultStation());
    setEditingStationId('');
    setVehicleAllocation(defaultVehicleAllocation());
    setShowCreateModal(true);
  };

  const openStationModal = (station = null) => {
    if (!station) {
      setStationForm({ ...defaultStation(), city: locationForm.city || '', state: locationForm.state || '' });
      setEditingStationId('');
    } else {
      setStationForm({ ...station });
      setEditingStationId(station.id);
    }
    setShowStationModal(true);
  };

  const openDetailStationModal = (station = null) => {
    if (!station) {
      setDetailStationDraft(defaultStation());
      setDetailEditingStationId('');
    } else {
      setDetailStationDraft({ ...station });
      setDetailEditingStationId(station.id);
    }
    setShowDetailStationModal(true);
  };

  const openManagerAssignModal = (station) => {
    if (!selectedLocation || !station) return;
    const preselected = getManagerIdsForStation(selectedLocation.id, station.id);
    setManagerStationContext({ locationId: selectedLocation.id, stationId: station.id, stationName: station.name });
    setSelectedManagerIds(preselected);
    setShowManagerAssignModal(true);
  };

  const toggleManagerForStation = (managerId) => {
    setSelectedManagerIds((current) => (
      current.includes(managerId)
        ? current.filter((id) => id !== managerId)
        : [...current, managerId]
    ));
  };

  const saveStationManagerAssignments = () => {
    if (!managerStationContext.locationId || !managerStationContext.stationId) return;
    const scopedStationId = createStationScopeId(managerStationContext.locationId, managerStationContext.stationId);
    const nextRows = upsertStationManagers(stationManagers, scopedStationId, selectedManagerIds);
    setStationManagers(nextRows);
    saveStationManagers(nextRows);
    setShowManagerAssignModal(false);
  };

  const saveStation = () => {
    if (!canSaveStation) return;

    setLocationForm((prev) => {
      const payload = { ...stationForm, city: stationForm.city || prev.city || '', state: stationForm.state || prev.state || '' };
      if (editingStationId) {
        return {
          ...prev,
          stations: prev.stations.map((station) => (station.id === editingStationId ? { ...payload, id: editingStationId } : station)),
        };
      }

      return {
        ...prev,
        stations: [...prev.stations, { ...payload, id: createStationId(prev.stations.length + 1) }],
      };
    });

    setShowStationModal(false);
    setStationForm(defaultStation());
    setEditingStationId('');
  };

  const saveDetailStation = () => {
    if (!selectedLocation || !canSaveDetailStation) return;

    setLocations((prev) => prev.map((location) => {
      if (location.id !== selectedLocation.id) return location;

      if (detailEditingStationId) {
        const nextStations = location.stations.map((station) => (station.id === detailEditingStationId ? { ...detailStationDraft, id: detailEditingStationId } : station));
        return { ...location, stations: nextStations, stationDisplayCount: nextStations.length };
      }

      const nextStations = [...location.stations, { ...detailStationDraft, id: createStationId(location.stations.length + 1) }];
      return { ...location, stations: nextStations, stationDisplayCount: nextStations.length };
    }));

    setShowDetailStationModal(false);
    setDetailStationDraft(defaultStation());
    setDetailEditingStationId('');
  };

  const removeStation = (stationId) => {
    setLocationForm((prev) => ({
      ...prev,
      stations: prev.stations.filter((station) => station.id !== stationId),
    }));
  };

  const removeDetailStation = (stationId) => {
    if (!selectedLocation) return;

    const scopedStationId = createStationScopeId(selectedLocation.id, stationId);
    const nextManagerRows = stationManagers.filter((row) => row.station_id !== scopedStationId);
    setStationManagers(nextManagerRows);
    saveStationManagers(nextManagerRows);

    setLocations((prev) => prev.map((location) => {
      if (location.id !== selectedLocation.id) return location;
      const nextStations = location.stations.filter((station) => station.id !== stationId);
      return { ...location, stations: nextStations, stationDisplayCount: nextStations.length };
    }));
  };

  const saveDetailVehicle = () => {
    if (!selectedLocation || !canSaveDetailVehicle) return;

    const addCount = Math.max(1, Number(detailVehicleForm.count || 1));
    setLocations((prev) => prev.map((location) => {
      if (location.id !== selectedLocation.id) return location;

      const byType = { ...(location.vehicles.byType || {}) };
      const statusByType = Object.fromEntries(
        Object.entries(location.vehicles.statusByType || {}).map(([type, pool]) => ([type, {
          Available: Number(pool?.Available || 0),
          Maintenance: Number(pool?.Maintenance || 0),
          Running: Number(pool?.Running || 0),
        }]))
      );

      if (!statusByType[detailVehicleForm.type]) {
        statusByType[detailVehicleForm.type] = { Available: 0, Maintenance: 0, Running: 0 };
      }

      byType[detailVehicleForm.type] = Number(byType[detailVehicleForm.type] || 0) + addCount;
      statusByType[detailVehicleForm.type][detailVehicleForm.status] += addCount;

      return { ...location, vehicles: buildVehicleMeta(byType, statusByType) };
    }));

    setShowDetailVehicleModal(false);
    setDetailVehicleForm({ type: vehicleTypeOptions[0] || DEFAULT_VEHICLE_TYPES[0], status: 'Available', count: 1 });
  };

  const openDetailVehicleFilters = () => {
    if (showDetailVehicleFilters) {
      setShowDetailVehicleFilters(false);
      return;
    }
    setDetailVehicleFiltersDraft({
      search: detailVehicleSearch,
      type: detailVehicleTypeFilter,
      status: selectedVehicleStatus,
    });
    setShowDetailVehicleFilters(true);
  };

  const applyDetailVehicleFilters = () => {
    setDetailVehicleSearch(detailVehicleFiltersDraft.search);
    setDetailVehicleTypeFilter(detailVehicleFiltersDraft.type);
    setSelectedVehicleStatus(detailVehicleFiltersDraft.status);
    setShowDetailVehicleFilters(false);
  };

  const resetDetailVehicleFilters = () => {
    setDetailVehicleFiltersDraft({ search: '', type: 'All', status: 'All' });
    setDetailVehicleSearch('');
    setDetailVehicleTypeFilter('All');
    setSelectedVehicleStatus('All');
    setShowDetailVehicleFilters(false);
  };

  const removeDetailVehicle = (row) => {
    if (!selectedLocation) return;

    setLocations((prev) => prev.map((location) => {
      if (location.id !== selectedLocation.id) return location;

      const byType = { ...(location.vehicles.byType || {}) };
      const statusByType = Object.fromEntries(
        Object.entries(location.vehicles.statusByType || {}).map(([type, pool]) => ([type, {
          Available: Number(pool?.Available || 0),
          Maintenance: Number(pool?.Maintenance || 0),
          Running: Number(pool?.Running || 0),
        }]))
      );

      if (!statusByType[row.type] || Number(statusByType[row.type][row.status] || 0) <= 0) return location;

      statusByType[row.type][row.status] -= 1;
      byType[row.type] = Math.max(0, Number(byType[row.type] || 0) - 1);

      if (byType[row.type] === 0) {
        delete byType[row.type];
        delete statusByType[row.type];
      }

      return { ...location, vehicles: buildVehicleMeta(byType, statusByType) };
    }));
  };

  const toggleVehicleType = (type) => {
    setVehicleAllocation((prev) => {
      const isSelected = prev.selectedTypes.includes(type);
      if (isSelected) {
        const nextByType = { ...prev.byType };
        const nextStatusByType = { ...prev.statusByType };
        delete nextByType[type];
        delete nextStatusByType[type];
        return {
          ...prev,
          selectedTypes: prev.selectedTypes.filter((item) => item !== type),
          byType: nextByType,
          statusByType: nextStatusByType,
        };
      }

      return {
        ...prev,
        selectedTypes: [...prev.selectedTypes, type],
        byType: { ...prev.byType, [type]: 0 },
        statusByType: { ...prev.statusByType, [type]: { Available: 0, Maintenance: 0, Running: 0 } },
      };
    });
  };

  const setVehicleCount = (type, value) => {
    setVehicleAllocation((prev) => {
      const count = Math.max(0, Number(value || 0));
      const previousPool = prev.statusByType[type] || { Available: 0, Maintenance: 0, Running: 0 };
      const oldTotal = Object.values(previousPool).reduce((sum, v) => sum + Number(v || 0), 0);
      let nextPool = previousPool;

      if (count !== oldTotal) {
        const maintenance = Math.min(previousPool.Maintenance || 0, count);
        const running = Math.min(previousPool.Running || 0, Math.max(0, count - maintenance));
        const available = Math.max(0, count - maintenance - running);
        nextPool = { Available: available, Maintenance: maintenance, Running: running };
      }

      return {
        ...prev,
        byType: { ...prev.byType, [type]: count },
        statusByType: { ...prev.statusByType, [type]: nextPool },
      };
    });
  };

  const setVehicleStatusCount = (type, status, value) => {
    setVehicleAllocation((prev) => {
      const total = Number(prev.byType[type] || 0);
      const pool = { ...(prev.statusByType[type] || { Available: 0, Maintenance: 0, Running: 0 }) };
      pool[status] = Math.max(0, Number(value || 0));

      const sum = pool.Available + pool.Maintenance + pool.Running;
      if (sum > total) {
        const overflow = sum - total;
        pool.Available = Math.max(0, pool.Available - overflow);
      }

      return {
        ...prev,
        statusByType: { ...prev.statusByType, [type]: pool },
      };
    });
  };

  const toggleDetailVehicleType = (type) => {
    setDetailVehicleAllocation((prev) => {
      const isSelected = prev.selectedTypes.includes(type);
      if (isSelected) {
        const nextByType = { ...prev.byType };
        const nextStatusByType = { ...prev.statusByType };
        delete nextByType[type];
        delete nextStatusByType[type];
        return {
          ...prev,
          selectedTypes: prev.selectedTypes.filter((item) => item !== type),
          byType: nextByType,
          statusByType: nextStatusByType,
        };
      }

      return {
        ...prev,
        selectedTypes: [...prev.selectedTypes, type],
        byType: { ...prev.byType, [type]: 0 },
        statusByType: { ...prev.statusByType, [type]: { Available: 0, Maintenance: 0, Running: 0 } },
      };
    });
  };

  const setDetailVehicleCount = (type, value) => {
    setDetailVehicleAllocation((prev) => {
      const count = Math.max(0, Number(value || 0));
      const previousPool = prev.statusByType[type] || { Available: 0, Maintenance: 0, Running: 0 };
      const oldTotal = Object.values(previousPool).reduce((sum, v) => sum + Number(v || 0), 0);
      let nextPool = previousPool;

      if (count !== oldTotal) {
        const maintenance = Math.min(previousPool.Maintenance || 0, count);
        const running = Math.min(previousPool.Running || 0, Math.max(0, count - maintenance));
        const available = Math.max(0, count - maintenance - running);
        nextPool = { Available: available, Maintenance: maintenance, Running: running };
      }

      return {
        ...prev,
        byType: { ...prev.byType, [type]: count },
        statusByType: { ...prev.statusByType, [type]: nextPool },
      };
    });
  };

  const setDetailVehicleStatusCount = (type, status, value) => {
    setDetailVehicleAllocation((prev) => {
      const total = Number(prev.byType[type] || 0);
      const pool = { ...(prev.statusByType[type] || { Available: 0, Maintenance: 0, Running: 0 }) };
      pool[status] = Math.max(0, Number(value || 0));

      const sum = pool.Available + pool.Maintenance + pool.Running;
      if (sum > total) {
        const overflow = sum - total;
        pool.Available = Math.max(0, pool.Available - overflow);
      }

      return {
        ...prev,
        statusByType: { ...prev.statusByType, [type]: pool },
      };
    });
  };

  const openBulkAllocation = () => {
    setDetailVehicleAllocation(defaultVehicleAllocation());
    setShowBulkAllocationModal(true);
  };

  const saveBulkAllocation = () => {
    if (!selectedLocation) return;
    const selectedTypes = detailVehicleAllocation.selectedTypes.filter((type) => Number(detailVehicleAllocation.byType[type] || 0) > 0);
    if (!selectedTypes.length) return;

    setLocations((prev) => prev.map((location) => {
      if (location.id !== selectedLocation.id) return location;

      const byType = { ...(location.vehicles.byType || {}) };
      const statusByType = Object.fromEntries(
        Object.entries(location.vehicles.statusByType || {}).map(([type, pool]) => ([type, {
          Available: Number(pool?.Available || 0),
          Maintenance: Number(pool?.Maintenance || 0),
          Running: Number(pool?.Running || 0),
        }]))
      );

      selectedTypes.forEach((type) => {
        if (!statusByType[type]) {
          statusByType[type] = { Available: 0, Maintenance: 0, Running: 0 };
        }

        byType[type] = Number(byType[type] || 0) + Number(detailVehicleAllocation.byType[type] || 0);
        statusByType[type].Available += Number(detailVehicleAllocation.statusByType[type]?.Available || 0);
        statusByType[type].Maintenance += Number(detailVehicleAllocation.statusByType[type]?.Maintenance || 0);
        statusByType[type].Running += Number(detailVehicleAllocation.statusByType[type]?.Running || 0);
      });

      return { ...location, vehicles: buildVehicleMeta(byType, statusByType) };
    }));

    setDetailVehicleAllocation(defaultVehicleAllocation());
    setShowBulkAllocationModal(false);
  };

  const saveLocation = async () => {
    if (!canSaveLocation) return;

    const vehicles = buildVehicleMeta(vehicleAllocation.byType, vehicleAllocation.statusByType);
    const selectedState = stateOptions.find((item) => item.id === locationForm.stateLocationId) || null;
    const selectedCity = cityOptions.find((item) => item.id === locationForm.cityLocationId) || null;

    const payload = {
      ...locationForm,
      businessType: activeBusinessTypes.find((item) => item.id === locationForm.businessTypeId)?.name || locationForm.businessType,
      state: selectedState?.name || locationForm.state,
      city: selectedCity?.name || locationForm.city,
      description: locationForm.description.trim(),
      stationDisplayCount: locationForm.stations.length,
      vehicles,
    };

    if (usingApi) {
      try {
        const createdRaw = await createLocationApi({
          business_type_id: payload.businessTypeId,
          name: payload.name,
          state: payload.state,
          city: payload.city,
          status: String(payload.status || 'Active').toLowerCase(),
          stations: payload.stations.map((station) => ({ station_name: station.name, coordinates: station.locationPin, status: station.status })),
        });
        setLocations((prev) => [mapApiLocation(createdRaw), ...prev]);
        setShowCreateModal(false);
        setLocationForm(defaultLocation(createLocationId(locations.length + 2)));
        setStationForm(defaultStation());
        setEditingStationId('');
        setVehicleAllocation(defaultVehicleAllocation());
        return;
      } catch (error) {
        reportLocationsApiError('Create location', error);
      }
    }

    setLocations((prev) => [payload, ...prev]);
    setShowCreateModal(false);
    setLocationForm(defaultLocation(createLocationId(locations.length + 2)));
    setStationForm(defaultStation());
    setEditingStationId('');
    setVehicleAllocation(defaultVehicleAllocation());
  };

  if (selectedLocation) {
    const stationCount = selectedLocation.stationDisplayCount || selectedLocation.stations.length;
    const available = selectedLocation.vehicles.statusTotals.Available || 0;
    const maintenance = selectedLocation.vehicles.statusTotals.Maintenance || 0;
    const running = selectedLocation.vehicles.statusTotals.Running || 0;
    const locationRevenue = Number(String(selectedLocation.revenue).replace(/[^0-9.]/g, '') || 0);

    return (
      <section className="page active space-y-4" id="page-locations">
        <div className="page-hero ph-locations">
          <div className="page-hero-left">
            <div className="page-hero-icon"><i className="fa fa-map-location-dot"></i></div>
            <div className="page-hero-text">
              <h1>{selectedLocation.name}</h1>
              <p>{selectedLocation.description || 'No description provided.'}</p>
            </div>
          </div>
          <div className="page-hero-right">
            <div className="page-hero-chips">
              <span className="page-hero-chip"><i className="fa fa-layer-group"></i> {selectedLocation.businessType}</span>
              <span className="page-hero-chip"><i className="fa fa-hashtag"></i> {selectedLocation.id}</span>
              <span className="page-hero-chip"><i className="fa fa-map-pin"></i> {stationCount} Stations</span>
            </div>
            <button className="btn-outline" onClick={() => { setSelectedLocationId(''); setSelectedVehicleStatus('All'); }}>
              <i className="fa fa-arrow-left"></i> Back to Locations
            </button>
          </div>
        </div>

        <div className="cards-grid">
          <div className="kpi-card"><div className="kpi-icon blue"><i className="fa fa-bicycle"></i></div><div className="kpi-info"><span className="kpi-label">Total Vehicles</span><span className="kpi-value">{selectedLocation.vehicles.total}</span></div></div>
          <div className="kpi-card"><div className="kpi-icon green"><i className="fa fa-map-pin"></i></div><div className="kpi-info"><span className="kpi-label">Stations</span><span className="kpi-value">{stationCount}</span></div></div>
          <div className="kpi-card"><div className="kpi-icon gold"><i className="fa fa-indian-rupee-sign"></i></div><div className="kpi-info"><span className="kpi-label">Revenue</span><span className="kpi-value">₹{locationRevenue.toLocaleString()}</span></div></div>
          <div className="kpi-card"><div className="kpi-icon red"><i className={`fa fa-${selectedLocation.health === 'Good' ? 'circle-check' : 'triangle-exclamation'}`}></i></div><div className="kpi-info"><span className="kpi-label">Payout Health</span><span className="kpi-value">{selectedLocation.health}</span></div></div>
        </div>

        <div className="table-card full">
          <div className="card-header">
            <h3>Station Coverage Map</h3>
            <span className={`status ${selectedLocation.status === 'Active' ? 'completed' : 'cancelled'}`}>{selectedLocation.status}</span>
          </div>
          <div className="p-2">
            <StationMap
              stations={selectedLocation.stations.map((station) => ({
                id: station.id,
                name: station.name,
                locationPin: station.locationPin,
                city: station.city || '-',
                state: station.state || '-',
              }))}
              height="280px"
            />
          </div>
        </div>

        <div className="cards-grid">
          <button className={`kpi-card location-status-card${selectedVehicleStatus === 'Available' ? ' active' : ''} rounded-2xl`} onClick={() => setSelectedVehicleStatus('Available')}>
            <div className="kpi-icon green"><i className="fa fa-circle-check"></i></div>
            <div className="kpi-info"><span className="kpi-label">Available</span><span className="kpi-value">{available}</span></div>
          </button>
          <button className={`kpi-card location-status-card${selectedVehicleStatus === 'Maintenance' ? ' active' : ''} rounded-2xl`} onClick={() => setSelectedVehicleStatus('Maintenance')}>
            <div className="kpi-icon gold"><i className="fa fa-wrench"></i></div>
            <div className="kpi-info"><span className="kpi-label">Maintenance</span><span className="kpi-value">{maintenance}</span></div>
          </button>
          <button className={`kpi-card location-status-card${selectedVehicleStatus === 'Running' ? ' active' : ''} rounded-2xl`} onClick={() => setSelectedVehicleStatus('Running')}>
            <div className="kpi-icon blue"><i className="fa fa-route"></i></div>
            <div className="kpi-info"><span className="kpi-label">Running</span><span className="kpi-value">{running}</span></div>
          </button>
          <button className={`kpi-card location-status-card${selectedVehicleStatus === 'All' ? ' active' : ''} rounded-2xl`} onClick={() => setSelectedVehicleStatus('All')}>
            <div className="kpi-icon red"><i className="fa fa-bicycle"></i></div>
            <div className="kpi-info"><span className="kpi-label">All Vehicles</span><span className="kpi-value">{selectedLocation.vehicles.total}</span></div>
          </button>
        </div>

        <div className="table-card full">
          <div className="card-header">
            <h3>Vehicles {selectedVehicleStatus !== 'All' ? `(${selectedVehicleStatus})` : ''}</h3>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button className={`btn-outline${detailVehicleFilterCount ? ' filter-btn-active' : ''}`} onClick={openDetailVehicleFilters}>
                <i className="fa fa-filter"></i> Filters{detailVehicleFilterCount ? ` (${detailVehicleFilterCount})` : ''}
              </button>
              <button className="btn-primary" onClick={() => setShowDetailVehicleModal(true)}><i className="fa fa-plus"></i> Add Vehicle</button>
              <button className="btn-outline" onClick={openBulkAllocation}><i className="fa fa-layer-group"></i> Bulk Allocate</button>
              <button className="btn-outline" onClick={() => setShowVehicleTable((prev) => !prev)}>
                <i className={`fa fa-chevron-${showVehicleTable ? 'up' : 'down'}`}></i> {showVehicleTable ? 'Hide List' : 'Show List'}
              </button>
            </div>
          </div>

          {showDetailVehicleFilters && (
            <div className="vehicle-filter-panel">
              <div className="vehicle-filter-grid">
                <div className="form-field vehicle-filter-search">
                  <label>Search</label>
                  <input className="setting-input" value={detailVehicleFiltersDraft.search} onChange={(e) => setDetailVehicleFiltersDraft((prev) => ({ ...prev, search: e.target.value }))} placeholder="Vehicle ID or type" />
                </div>
                <div className="form-field vehicle-filter-type">
                  <label>Type</label>
                  <select className="setting-input" value={detailVehicleFiltersDraft.type} onChange={(e) => setDetailVehicleFiltersDraft((prev) => ({ ...prev, type: e.target.value }))}>
                    <option value="All">All Types</option>
                    {vehicleTypeOptions.map((type) => <option key={type} value={type}>{type}</option>)}
                  </select>
                </div>
                <div className="form-field vehicle-filter-status">
                  <label>Status</label>
                  <select className="setting-input" value={detailVehicleFiltersDraft.status} onChange={(e) => setDetailVehicleFiltersDraft((prev) => ({ ...prev, status: e.target.value }))}>
                    <option value="All">All Status</option>
                    {VEHICLE_STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                </div>
                <div className="vehicle-filter-actions">
                  <button className="btn-outline" onClick={resetDetailVehicleFilters}>Reset</button>
                  <button className="btn-primary" onClick={applyDetailVehicleFilters}>Apply</button>
                </div>
              </div>
            </div>
          )}

          {showVehicleTable && (
            <div className="table-wrap overflow-x-auto">
              <table className="data-table">
                <thead><tr><th>Vehicle ID</th><th>Type</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {visibleDetailVehicleRows.map((row) => (
                    <tr key={row.id}>
                      <td><span className="mono">{row.id}</span></td>
                      <td>{row.type}</td>
                      <td><span className={`status ${row.status === 'Running' ? 'processing' : row.status === 'Available' ? 'completed' : 'pending'}`}>{row.status}</span></td>
                      <td className="actions">
                        <button className="act-btn red" title="Delete Vehicle" onClick={() => removeDetailVehicle(row)}><i className="fa fa-trash"></i></button>
                      </td>
                    </tr>
                  ))}
                  {!visibleDetailVehicleRows.length && <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-2)' }}>No vehicles found for selected filters.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="table-card full">
          <div className="card-header">
            <h3>Stations</h3>
            <button className="btn-primary" onClick={() => openDetailStationModal()}><i className="fa fa-plus"></i> Add Station</button>
          </div>
          <div className="table-wrap overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>Station ID</th><th>Station Name</th><th>Location Pin</th><th>City</th><th>State</th><th>Managers</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {selectedLocation.stations.map((station) => (
                  <tr key={station.id}>
                    <td><span className="mono">{station.id}</span></td>
                    <td>{station.name}</td>
                    <td>{station.locationPin}</td>
                    <td>{station.city || '-'}</td>
                    <td>{station.state || '-'}</td>
                    <td>{getManagerNamesForStation(selectedLocation.id, station.id).join(', ') || '-'}</td>
                    <td><span className={`status ${station.status === 'Active' ? 'completed' : 'cancelled'}`}>{station.status}</span></td>
                    <td className="actions">
                      <button className="act-btn" title="Assign Managers" onClick={() => openManagerAssignModal(station)}><i className="fa fa-user-tie"></i></button>
                      <button className="act-btn" onClick={() => openDetailStationModal(station)}><i className="fa fa-pen"></i></button>
                      <button className="act-btn red" onClick={() => removeDetailStation(station.id)}><i className="fa fa-trash"></i></button>
                    </td>
                  </tr>
                ))}
                {!selectedLocation.stations.length && <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-2)' }}>No stations configured for this location.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <Modal
          open={showDetailVehicleModal}
          title="Add Vehicles"
          onClose={() => setShowDetailVehicleModal(false)}
          size="md"
          footer={<><button className="btn-outline" onClick={() => setShowDetailVehicleModal(false)}>Cancel</button><button className="btn-primary" onClick={saveDetailVehicle} disabled={!canSaveDetailVehicle}>Add</button></>}
        >
          <div className="form-grid">
            <div className="form-field"><label>Vehicle Type</label>
              <select className="setting-input" value={detailVehicleForm.type} onChange={(e) => setDetailVehicleForm((prev) => ({ ...prev, type: e.target.value }))}>
                {vehicleTypeOptions.map((type) => <option key={type}>{type}</option>)}
              </select>
            </div>
            <div className="form-field"><label>Status</label>
              <select className="setting-input" value={detailVehicleForm.status} onChange={(e) => setDetailVehicleForm((prev) => ({ ...prev, status: e.target.value }))}>
                {VEHICLE_STATUS_OPTIONS.map((status) => <option key={status}>{status}</option>)}
              </select>
            </div>
            <div className="form-field"><label>Count</label><input type="number" min={1} className="setting-input" value={detailVehicleForm.count} onChange={(e) => setDetailVehicleForm((prev) => ({ ...prev, count: Number(e.target.value) || 0 }))} /></div>
          </div>
        </Modal>

        <Modal
          open={showDetailStationModal}
          title={detailEditingStationId ? 'Edit Station' : 'Add Station'}
          onClose={() => setShowDetailStationModal(false)}
          size="lg"
          footer={<><button className="btn-outline" onClick={() => setShowDetailStationModal(false)}>Cancel</button><button className="btn-primary" onClick={saveDetailStation} disabled={!canSaveDetailStation}>Save</button></>}
        >
          <div className="form-grid">
            <div className="form-field full"><label>Station Name</label><input className="setting-input" value={detailStationDraft.name} onChange={(e) => setDetailStationDraft((prev) => ({ ...prev, name: e.target.value }))} /></div>
            <div className="form-field full">
              <label>Location Pin</label>
              <LocationPickerMap
                locationPin={detailStationDraft.locationPin}
                onLocationChange={(pin) => setDetailStationDraft((prev) => ({ ...prev, locationPin: pin }))}
                onLocationResolved={(location) => setDetailStationDraft((prev) => ({
                  ...prev,
                  locationPin: location.locationPin,
                  city: location.city || prev.city,
                  state: location.state || prev.state,
                }))}
                height="260px"
              />
            </div>
            <div className="form-field"><label>City</label><input className="setting-input" value={detailStationDraft.city} onChange={(e) => setDetailStationDraft((prev) => ({ ...prev, city: e.target.value }))} /></div>
            <div className="form-field"><label>State</label><input className="setting-input" value={detailStationDraft.state} onChange={(e) => setDetailStationDraft((prev) => ({ ...prev, state: e.target.value }))} /></div>
            <div className="form-field"><label>Status</label><select className="setting-input" value={detailStationDraft.status} onChange={(e) => setDetailStationDraft((prev) => ({ ...prev, status: e.target.value }))}><option>Active</option><option>Inactive</option></select></div>
          </div>
        </Modal>

        <Modal
          open={showManagerAssignModal}
          title={`Assign Managers • ${managerStationContext.stationName || 'Station'}`}
          onClose={() => setShowManagerAssignModal(false)}
          size="md"
          footer={<><button className="btn-outline" onClick={() => setShowManagerAssignModal(false)}>Cancel</button><button className="btn-primary" onClick={saveStationManagerAssignments}>Save Assignment</button></>}
        >
          <div className="form-grid">
            <div className="form-field full">
              <label>Manager Selection</label>
              <div className="location-vehicle-picker" style={{ marginTop: '6px' }}>
                {managerOptionsForSelectedLocation.map((manager) => (
                  <label key={manager.id} className="location-check-item">
                    <input
                      type="checkbox"
                      checked={selectedManagerIds.includes(manager.id)}
                      onChange={() => toggleManagerForStation(manager.id)}
                    />
                    {manager.name} ({manager.staff_id})
                  </label>
                ))}
                {!managerOptionsForSelectedLocation.length && (
                  <span style={{ color: 'var(--text-2)', fontSize: '12px' }}>No active managers found for this location scope.</span>
                )}
              </div>
            </div>
          </div>
        </Modal>

        <Modal
          open={showBulkAllocationModal}
          title={`Bulk Allocate Vehicles • ${selectedLocation.name}`}
          onClose={() => setShowBulkAllocationModal(false)}
          size="lg"
          footer={<><button className="btn-outline" onClick={() => setShowBulkAllocationModal(false)}>Cancel</button><button className="btn-primary" onClick={saveBulkAllocation} disabled={!detailVehicleAllocation.selectedTypes.length}>Apply Allocation</button></>}
        >
          <div className="location-vehicle-picker" style={{ marginBottom: '10px' }}>
            {vehicleTypeOptions.map((type) => (
              <label key={type} className="location-check-item">
                <input type="checkbox" checked={detailVehicleAllocation.selectedTypes.includes(type)} onChange={() => toggleDetailVehicleType(type)} />
                {type}
              </label>
            ))}
          </div>
          {detailVehicleAllocation.selectedTypes.length > 0 && (
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>Vehicle Type</th><th>Allocated Total</th><th>Available</th><th>Maintenance</th><th>Running</th></tr></thead>
                <tbody>
                  {detailVehicleAllocation.selectedTypes.map((type) => (
                    <tr key={type}>
                      <td>{type}</td>
                      <td><input type="number" min="0" className="setting-input" value={detailVehicleAllocation.byType[type] ?? 0} onChange={(e) => setDetailVehicleCount(type, e.target.value)} /></td>
                      <td><input type="number" min="0" className="setting-input" value={detailVehicleAllocation.statusByType[type]?.Available ?? 0} onChange={(e) => setDetailVehicleStatusCount(type, 'Available', e.target.value)} /></td>
                      <td><input type="number" min="0" className="setting-input" value={detailVehicleAllocation.statusByType[type]?.Maintenance ?? 0} onChange={(e) => setDetailVehicleStatusCount(type, 'Maintenance', e.target.value)} /></td>
                      <td><input type="number" min="0" className="setting-input" value={detailVehicleAllocation.statusByType[type]?.Running ?? 0} onChange={(e) => setDetailVehicleStatusCount(type, 'Running', e.target.value)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Modal>
      </section>
    );
  }

  return (
    <section className="page active space-y-4" id="page-locations">
      <div className="page-hero ph-locations">
        <div className="page-hero-left">
          <div className="page-hero-icon"><i className="fa fa-map-location-dot"></i></div>
          <div className="page-hero-text">
            <h1>Location Network</h1>
            <p>Control city-level deployment, station density, and fleet health through one operational map view.</p>
          </div>
        </div>
        <div className="page-hero-right">
          <div className="page-hero-chips">
            <span className="page-hero-chip"><i className="fa fa-location-dot"></i> {locations.length} Locations</span>
            <span className="page-hero-chip"><i className="fa fa-map-pin"></i> {totalStations} Stations</span>
          </div>
          <button className="btn-primary" onClick={openCreateModal}><i className="fa fa-plus"></i> Create Location</button>
        </div>
      </div>

      <div className="cards-grid">
        <div className="kpi-card"><div className="kpi-icon blue"><i className="fa fa-map-location-dot"></i></div><div className="kpi-info"><span className="kpi-label">Total Locations</span><span className="kpi-value">{locations.length}</span></div></div>
        <div className="kpi-card"><div className="kpi-icon gold"><i className="fa fa-bicycle"></i></div><div className="kpi-info"><span className="kpi-label">Total Vehicles</span><span className="kpi-value">{totalVehicles}</span></div></div>
        <div className="kpi-card"><div className="kpi-icon green"><i className="fa fa-dollar-sign"></i></div><div className="kpi-info"><span className="kpi-label">Total Revenue</span><span className="kpi-value">₹{totalRevenue.toLocaleString()}</span></div></div>
        <div className="kpi-card"><div className="kpi-icon red"><i className="fa fa-triangle-exclamation"></i></div><div className="kpi-info"><span className="kpi-label">Health Warnings</span><span className="kpi-value">{healthWarnings}</span></div></div>
      </div>

      <div className="toolbar">
        <div className="toolbar-left">
          <button className="btn-outline" onClick={() => setShowFilters(true)}><i className="fa fa-filter"></i> Filters{filterCount ? ` (${filterCount})` : ''}</button>
        </div>
        <div className="toolbar-right">
          <span className="locations-toolbar-note"><i className="fa fa-circle-info"></i> Click any location card to open its detail page.</span>
        </div>
      </div>

      <div className="locations-summary-card">
        <div className="locations-summary-copy">
          <span className="locations-summary-kicker">Location Builder</span>
          <h3>Create, filter, and inspect each location in a separate detail view.</h3>
          <p>Map previews are removed from this list view. Open a location card to view all location details, including station records.</p>
        </div>
        <div className="locations-summary-stats">
          <div className="locations-summary-stat"><span>Stations</span><strong>{totalStations}</strong></div>
          <div className="locations-summary-stat"><span>Avg / Location</span><strong>{locations.length ? (totalStations / locations.length).toFixed(1) : '0.0'}</strong></div>
          <div className="locations-summary-stat"><span>Active</span><strong>{activeLocations}</strong></div>
        </div>
      </div>

      <div className="location-grid">
        {visibleLocations.map((location) => {
          const stationCount = location.stationDisplayCount || location.stations.length;
          return (
            <div
              key={location.id}
              className="location-card"
              role="button"
              tabIndex={0}
              onClick={() => setSelectedLocationId(location.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setSelectedLocationId(location.id);
                }
              }}
            >
              <div className="location-card-header">
                <div>
                  <button
                    className="location-link-btn"
                    onClick={(event) => {
                      event.stopPropagation();
                      setSelectedLocationId(location.id);
                    }}
                  >
                    {location.name}
                  </button>
                  <div className="location-card-sub">{location.description || 'No description added yet.'}</div>
                </div>
                <span className={`status ${location.status === 'Active' ? 'completed' : 'cancelled'}`}>{location.status}</span>
              </div>

              <div className="location-card-meta">
                <span className="location-type-chip"><i className="fa fa-layer-group"></i> {location.businessType}</span>
                <span className="location-type-chip subtle"><i className="fa fa-hashtag"></i> {location.id}</span>
              </div>

              <div className="location-stats">
                <div className="location-stat"><span className="location-stat-label">Vehicles</span><span className="location-stat-value">{location.vehicles.total}</span></div>
                <div className="location-stat"><span className="location-stat-label">Stations</span><span className="location-stat-value">{stationCount}</span></div>
                <div className="location-stat"><span className="location-stat-label">Revenue</span><span className="location-stat-value">{location.revenue}</span></div>
                <div className="location-stat">
                  <span className="location-stat-label">Payout Health</span>
                  <span className="location-stat-value" style={{ color: location.health === 'Good' ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                    <i className={`fa fa-${location.health === 'Good' ? 'circle-check' : 'triangle-exclamation'}`}></i> {location.health}
                  </span>
                </div>
              </div>

              <div className="location-card-footer">
                <span className="location-card-id">{location.id}</span>
                <span className="location-card-footnote">{stationCount} station{stationCount === 1 ? '' : 's'} configured</span>
                <button
                  className="btn-outline"
                  style={{ padding: '6px 10px' }}
                  onClick={(event) => {
                    event.stopPropagation();
                    setSelectedLocationId(location.id);
                  }}
                >
                  View Stations
                </button>
              </div>
            </div>
          );
        })}

        {!visibleLocations.length && (
          <div className="table-card full" style={{ padding: '18px', color: 'var(--text-2)' }}>
            No locations match current filters.
          </div>
        )}
      </div>

      <Modal
        open={showFilters}
        title="Location Filters"
        onClose={() => setShowFilters(false)}
        footer={<><button className="btn-outline" onClick={() => setFilters(defaultFilters())}>Reset</button><button className="btn-primary" onClick={() => setShowFilters(false)}>Apply</button></>}
      >
        <div className="form-grid">
          <div className="form-field full"><label>Search (Name / ID / Business Type)</label><input className="setting-input" value={filters.search} onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))} /></div>
          <div className="form-field"><label>Status</label><select className="setting-input" value={filters.status} onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}><option>All</option><option>Active</option><option>Inactive</option></select></div>
          <div className="form-field"><label>Business Type</label><select className="setting-input" value={filters.businessType} onChange={(e) => setFilters((prev) => ({ ...prev, businessType: e.target.value }))}><option>All</option>{activeBusinessTypes.map((option) => <option key={option.id} value={option.name}>{option.name}</option>)}</select></div>
          <div className="form-field"><label>Payout Health</label><select className="setting-input" value={filters.health} onChange={(e) => setFilters((prev) => ({ ...prev, health: e.target.value }))}><option>All</option><option>Good</option><option>Warning</option></select></div>
        </div>
      </Modal>

      <Modal
        open={showCreateModal}
        title="Create Location"
        onClose={() => setShowCreateModal(false)}
        size="lg"
        footer={<><button className="btn-outline" onClick={() => setShowCreateModal(false)}>Cancel</button><button className="btn-primary" onClick={saveLocation} disabled={!canSaveLocation}>Save Location</button></>}
      >
        <div className="form-grid">
          <div className="form-field"><label>Location ID</label><input className="setting-input" value={locationForm.id} readOnly /></div>
          <div className="form-field"><label>Status</label><select className="setting-input" value={locationForm.status} onChange={(e) => setLocationForm((prev) => ({ ...prev, status: e.target.value }))}><option>Active</option><option>Inactive</option></select></div>
          <div className="form-field"><label>Business Type</label><select className="setting-input" value={locationForm.businessTypeId} onChange={(e) => {
            const nextBusiness = activeBusinessTypes.find((item) => item.id === e.target.value) || null;
            setLocationForm((prev) => ({ ...prev, businessTypeId: e.target.value, businessType: nextBusiness?.name || '' }));
          }}>{activeBusinessTypes.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></div>
          <div className="form-field"><label>State</label><select className="setting-input" value={locationForm.stateLocationId} onChange={(e) => {
            const nextState = stateOptions.find((item) => item.id === e.target.value) || null;
            setLocationForm((prev) => ({ ...prev, stateLocationId: e.target.value, state: nextState?.name || '', cityLocationId: '', city: '' }));
          }}><option value="">Select State</option>{stateOptions.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></div>
          <div className="form-field"><label>City</label><select className="setting-input" value={locationForm.cityLocationId} onChange={(e) => {
            const nextCity = cityOptions.find((item) => item.id === e.target.value) || null;
            setLocationForm((prev) => ({ ...prev, cityLocationId: e.target.value, city: nextCity?.name || '' }));
          }} disabled={!locationForm.stateLocationId}><option value="">Select City</option>{cityOptions.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></div>
          <div className="form-field"><label>Location Name</label><input className="setting-input" value={locationForm.name} onChange={(e) => setLocationForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Enter location name" /></div>
          <div className="form-field full"><label>Location Description</label><textarea className="setting-input location-description-input" rows={3} value={locationForm.description} onChange={(e) => setLocationForm((prev) => ({ ...prev, description: e.target.value }))} placeholder="Describe this location and how it should operate" /></div>
        </div>

        <div className="table-card full location-stations-card" style={{ marginTop: '12px' }}>
          <div className="card-header">
            <div>
              <h3>Vehicle Allocation</h3>
              <div className="location-section-sub">Select vehicle types and allocate quantities like organization allocation.</div>
            </div>
          </div>
          <div className="location-vehicle-picker">
            {vehicleTypeOptions.map((type) => (
              <label key={type} className="location-check-item">
                <input type="checkbox" checked={vehicleAllocation.selectedTypes.includes(type)} onChange={() => toggleVehicleType(type)} />
                {type}
              </label>
            ))}
          </div>
          {vehicleAllocation.selectedTypes.length > 0 && (
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>Vehicle Type</th><th>Allocated Total</th><th>Available</th><th>Maintenance</th><th>Running</th></tr></thead>
                <tbody>
                  {vehicleAllocation.selectedTypes.map((type) => (
                    <tr key={type}>
                      <td>{type}</td>
                      <td><input type="number" min="0" className="setting-input" value={vehicleAllocation.byType[type] ?? 0} onChange={(e) => setVehicleCount(type, e.target.value)} /></td>
                      <td><input type="number" min="0" className="setting-input" value={vehicleAllocation.statusByType[type]?.Available ?? 0} onChange={(e) => setVehicleStatusCount(type, 'Available', e.target.value)} /></td>
                      <td><input type="number" min="0" className="setting-input" value={vehicleAllocation.statusByType[type]?.Maintenance ?? 0} onChange={(e) => setVehicleStatusCount(type, 'Maintenance', e.target.value)} /></td>
                      <td><input type="number" min="0" className="setting-input" value={vehicleAllocation.statusByType[type]?.Running ?? 0} onChange={(e) => setVehicleStatusCount(type, 'Running', e.target.value)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="table-card full location-stations-card">
          <div className="card-header">
            <div>
              <h3>Stations</h3>
              <div className="location-section-sub">Use the same add-station experience as organizations, including map verification and editable pins.</div>
            </div>
            <button className="btn-primary" onClick={() => openStationModal()}><i className="fa fa-plus"></i> Add Station</button>
          </div>

          {locationForm.stations.length > 0 && (
            <div className="location-create-map-wrap">
              <StationMap stations={locationForm.stations} height="300px" onMarkerClick={(station) => openStationModal(station)} />
            </div>
          )}

          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Station ID</th><th>Station Name</th><th>Location Pin</th><th>City</th><th>State</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {locationForm.stations.map((station) => (
                  <tr key={station.id}>
                    <td>{station.id}</td>
                    <td>{station.name}</td>
                    <td>{station.locationPin}</td>
                    <td>{station.city || '-'}</td>
                    <td>{station.state || '-'}</td>
                    <td><span className={`status ${station.status === 'Active' ? 'completed' : 'cancelled'}`}>{station.status}</span></td>
                    <td className="actions">
                      <button className="act-btn" onClick={() => openStationModal(station)}><i className="fa fa-pen"></i></button>
                      <button className="act-btn red" onClick={() => removeStation(station.id)}><i className="fa fa-trash"></i></button>
                    </td>
                  </tr>
                ))}
                {!locationForm.stations.length && <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-2)' }}>No stations added yet. Use Add Station to create verified points for this location.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>

      <Modal
        open={showStationModal}
        title={editingStationId ? 'Edit Station' : 'Add Station'}
        onClose={() => setShowStationModal(false)}
        size="lg"
        footer={<><button className="btn-outline" onClick={() => setShowStationModal(false)}>Cancel</button><button className="btn-primary" onClick={saveStation} disabled={!canSaveStation}>Save</button></>}
      >
        <div className="form-grid">
          <div className="form-field full"><label>Station Name</label><input className="setting-input" value={stationForm.name} onChange={(e) => setStationForm((prev) => ({ ...prev, name: e.target.value }))} /></div>
          <div className="form-field full">
            <label>Location Pin</label>
            <LocationPickerMap
              locationPin={stationForm.locationPin}
              onLocationChange={(pin) => setStationForm((prev) => ({ ...prev, locationPin: pin }))}
              onLocationResolved={(location) => setStationForm((prev) => ({
                ...prev,
                locationPin: location.locationPin,
                city: location.city || prev.city,
                state: location.state || prev.state,
              }))}
              height="260px"
            />
          </div>
          <div className="form-field"><label>City</label><input className="setting-input" value={stationForm.city} onChange={(e) => setStationForm((prev) => ({ ...prev, city: e.target.value }))} /></div>
          <div className="form-field"><label>State</label><input className="setting-input" value={stationForm.state} onChange={(e) => setStationForm((prev) => ({ ...prev, state: e.target.value }))} /></div>
          <div className="form-field"><label>Status</label><select className="setting-input" value={stationForm.status} onChange={(e) => setStationForm((prev) => ({ ...prev, status: e.target.value }))}><option>Active</option><option>Inactive</option></select></div>
        </div>
      </Modal>
    </section>
  );
}

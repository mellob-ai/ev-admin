const STAFF_STORAGE_KEY = 'mos.operations.staff.v1';
const STATION_MANAGERS_STORAGE_KEY = 'mos.operations.station-managers.v1';
const VEHICLE_DRIVERS_STORAGE_KEY = 'mos.operations.vehicle-drivers.v1';

export const STAFF_UPDATED_EVENT = 'mos:operations-staff-updated';
export const STATION_MANAGERS_UPDATED_EVENT = 'mos:operations-station-managers-updated';
export const VEHICLE_DRIVERS_UPDATED_EVENT = 'mos:operations-vehicle-drivers-updated';

function loadCollection(storageKey, fallback) {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function saveCollection(storageKey, payload, eventName) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(payload));
    if (eventName) window.dispatchEvent(new Event(eventName));
  } catch {
    return;
  }
}

export function loadOperationalStaff(fallback = []) {
  return loadCollection(STAFF_STORAGE_KEY, fallback);
}

export function saveOperationalStaff(payload) {
  saveCollection(STAFF_STORAGE_KEY, payload, STAFF_UPDATED_EVENT);
}

export function loadStationManagers(fallback = []) {
  return loadCollection(STATION_MANAGERS_STORAGE_KEY, fallback);
}

export function saveStationManagers(payload) {
  saveCollection(STATION_MANAGERS_STORAGE_KEY, payload, STATION_MANAGERS_UPDATED_EVENT);
}

export function loadVehicleDrivers(fallback = []) {
  return loadCollection(VEHICLE_DRIVERS_STORAGE_KEY, fallback);
}

export function saveVehicleDrivers(payload) {
  saveCollection(VEHICLE_DRIVERS_STORAGE_KEY, payload, VEHICLE_DRIVERS_UPDATED_EVENT);
}

export function createPublicStaffId(staffRows) {
  const next = (staffRows || []).reduce((max, row) => {
    const match = String(row.staff_id || '').match(/(\d+)$/);
    return Math.max(max, Number(match?.[1] || 0));
  }, 0) + 1;
  return `STF_${String(next).padStart(4, '0')}`;
}

export function nowIso() {
  return new Date().toISOString();
}

export function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function upsertVehicleDriverAssignment(assignments, vehicleId, driverId, assignedOn = todayKey()) {
  const cleaned = (assignments || []).filter((row) => {
    const sameDay = !row.assigned_on || row.assigned_on === assignedOn;
    if (!sameDay) return true;
    return row.vehicle_id !== vehicleId && row.driver_id !== driverId;
  });
  if (!driverId) return cleaned;
  return [...cleaned, {
    id: `VD-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    vehicle_id: vehicleId,
    driver_id: driverId,
    assigned_on: assignedOn,
  }];
}

export function upsertStationManagers(assignments, stationId, managerIds) {
  const withoutStation = (assignments || []).filter((row) => row.station_id !== stationId);
  const nextRows = (managerIds || []).map((managerId, index) => ({
    id: `SM-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
    station_id: stationId,
    manager_id: managerId,
  }));
  return [...withoutStation, ...nextRows];
}

export function getAssignedVehicleIdForDriver(assignments, driverId, onDate = todayKey()) {
  return (assignments || []).find((row) => {
    if (row.driver_id !== driverId) return false;
    return !row.assigned_on || row.assigned_on === onDate;
  })?.vehicle_id || null;
}

export function canDeleteStaff(staffId, stationManagers, vehicleDrivers) {
  const stationUse = (stationManagers || []).some((row) => row.manager_id === staffId);
  const vehicleUse = (vehicleDrivers || []).some((row) => row.driver_id === staffId);
  return {
    allowed: !stationUse && !vehicleUse,
    reason: stationUse
      ? 'This manager is assigned to station(s). Reassign before deleting.'
      : vehicleUse
        ? 'This driver is assigned to a vehicle. Reassign before deleting.'
        : '',
  };
}

export function getStaffNameById(staffRows, staffId) {
  return (staffRows || []).find((row) => row.id === staffId)?.name || '-';
}

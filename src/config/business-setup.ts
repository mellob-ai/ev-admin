const HIERARCHY_STORAGE_KEY = 'mos.settings.hierarchy.v1';
const SETTINGS_LOCATIONS_STORAGE_KEY = 'mos.settings.locations.v1';
export const BUSINESS_SETUP_UPDATED_EVENT = 'mos:business-setup-updated';

const nowIso = () => new Date().toISOString();

const BUSINESS_SETUP_SEED = {
  businessTypes: [],
  organizationTypes: [],
  userTypes: [],
  vehicleTypes: [],
  locations: [
    { id: 'loc-global', type: 'Global', name: 'Global', parentId: null, description: 'Global coverage across all regions', status: 'active', createdAt: nowIso() },
  ],
};

function normalizeVehicleTypes(vehicleTypes) {
  const parsedVehicleTypes = Array.isArray(vehicleTypes)
    ? vehicleTypes.map((item) => ({
        ...item,
        seatCount: Math.max(1, Number(item?.seatCount) || 1),
        driverApplicable: Boolean(item?.driverApplicable),
      }))
    : [];

  const mergedVehicleTypes = [...parsedVehicleTypes];
  BUSINESS_SETUP_SEED.vehicleTypes.forEach((seedItem) => {
    if (!mergedVehicleTypes.some((item) => String(item.name || '').toLowerCase() === seedItem.name.toLowerCase())) {
      mergedVehicleTypes.push(seedItem);
    }
  });

  return mergedVehicleTypes.length ? mergedVehicleTypes : BUSINESS_SETUP_SEED.vehicleTypes;
}

function normalizeHierarchy(parsed) {
  const normalizedOrgTypes = Array.isArray(parsed?.organizationTypes)
    ? parsed.organizationTypes.map((item) => ({ ...item, locationId: item.locationId || 'loc-global' }))
    : [];
  const mergedOrgTypes = [...normalizedOrgTypes];
  BUSINESS_SETUP_SEED.organizationTypes.forEach((seedItem) => {
    if (!mergedOrgTypes.some((item) => item.id === seedItem.id)) {
      mergedOrgTypes.push(seedItem);
    }
  });

  return {
    businessTypes: Array.isArray(parsed?.businessTypes) ? parsed.businessTypes : BUSINESS_SETUP_SEED.businessTypes,
    organizationTypes: mergedOrgTypes.length ? mergedOrgTypes : BUSINESS_SETUP_SEED.organizationTypes,
    userTypes: Array.isArray(parsed?.userTypes) ? parsed.userTypes : BUSINESS_SETUP_SEED.userTypes,
    vehicleTypes: normalizeVehicleTypes(parsed?.vehicleTypes),
  };
}

export function loadBusinessSetup() {
  if (typeof window === 'undefined') {
    return BUSINESS_SETUP_SEED;
  }

  try {
    const rawHierarchy = window.localStorage.getItem(HIERARCHY_STORAGE_KEY);
    const rawLocations = window.localStorage.getItem(SETTINGS_LOCATIONS_STORAGE_KEY);
    const hierarchy = rawHierarchy ? normalizeHierarchy(JSON.parse(rawHierarchy)) : normalizeHierarchy(null);
    const locations = rawLocations ? JSON.parse(rawLocations) : BUSINESS_SETUP_SEED.locations;
    const normalizedLocations = Array.isArray(locations)
      ? locations.map((item) => ({ ...item, parentId: item.parentId || null }))
      : BUSINESS_SETUP_SEED.locations;
    if (!normalizedLocations.some((item) => item.id === 'loc-global')) {
      normalizedLocations.unshift(BUSINESS_SETUP_SEED.locations[0]);
    }

    return {
      ...hierarchy,
      vehicleTypes: normalizeVehicleTypes(hierarchy.vehicleTypes),
      locations: normalizedLocations,
    };
  } catch {
    return BUSINESS_SETUP_SEED;
  }
}

export function getActiveBusinessTypes(setup) {
  return (setup?.businessTypes || []).filter((item) => item.status === 'active');
}

export function getActiveOrganizationTypes(setup) {
  return (setup?.organizationTypes || []).filter((item) => item.status === 'active' && Boolean(item.locationId));
}

export function getActiveUserTypes(setup) {
  return (setup?.userTypes || []).filter((item) => item.status === 'active');
}

export function getActiveVehicleTypes(setup) {
  return (setup?.vehicleTypes || []).filter((item) => item.status === 'active');
}

export function getVehicleTypeByName(setup, vehicleTypeName) {
  if (!vehicleTypeName) return null;
  const targetName = String(vehicleTypeName).toLowerCase();
  return (setup?.vehicleTypes || []).find((item) => String(item.name || '').toLowerCase() === targetName) || null;
}

export function isDriverManagedVehicleType(setup, vehicleTypeName) {
  const vehicleType = getVehicleTypeByName(setup, vehicleTypeName);
  if (vehicleType) return Boolean(vehicleType.driverApplicable);
  const fallbackType = String(vehicleTypeName || '').toLowerCase();
  return fallbackType.includes('bus') || fallbackType.includes('buggy');
}

export function getActiveSetupLocations(setup) {
  return (setup?.locations || []).filter((item) => item.status === 'active');
}

export function getLocationPath(location, locations) {
  if (!location) return '';

  const allLocations = Array.isArray(locations) ? locations : [];
  const chain = [];
  let cursor = location;
  let guard = 0;

  while (cursor && guard < 12) {
    chain.unshift(cursor.name);
    cursor = cursor.parentId ? allLocations.find((item) => item.id === cursor.parentId) : null;
    guard += 1;
  }

  return chain.join(' > ');
}
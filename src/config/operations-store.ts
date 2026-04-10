const ORGANIZATIONS_STORAGE_KEY = 'mos.operations.organizations.v1';
const LOCATIONS_STORAGE_KEY = 'mos.operations.locations.v1';
const USERS_STORAGE_KEY = 'mos.operations.users.v1';

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
    if (eventName) {
      window.dispatchEvent(new Event(eventName));
    }
  } catch {
    return;
  }
}

export function loadOperationalOrganizations(fallback = []) {
  return loadCollection(ORGANIZATIONS_STORAGE_KEY, fallback);
}

export function saveOperationalOrganizations(payload) {
  saveCollection(ORGANIZATIONS_STORAGE_KEY, payload, 'mos:operations-organizations-updated');
}

export function loadOperationalLocations(fallback = []) {
  return loadCollection(LOCATIONS_STORAGE_KEY, fallback);
}

export function saveOperationalLocations(payload) {
  saveCollection(LOCATIONS_STORAGE_KEY, payload, 'mos:operations-locations-updated');
}

export function loadOperationalUsers(fallback = []) {
  return loadCollection(USERS_STORAGE_KEY, fallback);
}

export function saveOperationalUsers(payload) {
  saveCollection(USERS_STORAGE_KEY, payload, 'mos:operations-users-updated');
}
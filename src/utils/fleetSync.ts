const FLEET_ROWS_KEY = 'mos-fleet-rows-v1';
const FLEET_ROWS_EVENT = 'mos-fleet-rows-updated';

function canUseWindow() {
  return typeof window !== 'undefined';
}

export function loadFleetRows(fallback = []) {
  if (!canUseWindow()) return fallback;
  try {
    const raw = window.localStorage.getItem(FLEET_ROWS_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export function saveFleetRows(rows) {
  if (!canUseWindow()) return;
  try {
    window.localStorage.setItem(FLEET_ROWS_KEY, JSON.stringify(rows));
    window.dispatchEvent(new CustomEvent(FLEET_ROWS_EVENT));
  } catch {
    // no-op
  }
}

export function subscribeFleetRows(callback) {
  if (!canUseWindow()) return () => {};
  const handler = () => callback(loadFleetRows([]));
  window.addEventListener(FLEET_ROWS_EVENT, handler);
  return () => window.removeEventListener(FLEET_ROWS_EVENT, handler);
}

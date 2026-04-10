// src/utils/usageData.js
// Derives live usage data from stored seed users in localStorage.
// Used by Dashboard, Rides, Trips, Activity, and Analytics pages.

const LOCS = [
  'Main Gate', 'Library Hub', 'Admin Block', 'Tech Park A', 'Cafeteria',
  'Lab Complex', 'Sports Center', 'Hostel Block', 'Gate 2', 'Parking Bay',
  'Metro Station', 'Bus Terminal', 'Innovation Hub', 'Food Court', 'IT Tower',
];

const V_TYPES = ['E-Bike', 'E-Bike', 'Cycle', 'Cycle', 'E-Scooter', 'Buggy'];

// Pre-formatted start times (no AM/PM suffix needed — included in string)
const AM_STARTS = ['07:52 AM', '08:05 AM', '08:18 AM', '08:30 AM', '08:45 AM', '09:00 AM', '09:12 AM'];
const PM_STARTS = ['05:20 PM', '05:38 PM', '05:50 PM', '06:02 PM', '06:15 PM', '06:28 PM', '06:40 PM'];

function pick(arr, n) { return arr[Math.abs(n | 0) % arr.length]; }

function fmtDate(d) {
  return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
}

const TODAY_STR = fmtDate(new Date());

export function loadStoredUsers() {
  try {
    const raw = localStorage.getItem('mos.operations.users.v1');
    return (raw ? JSON.parse(raw) : null) || [];
  } catch { return []; }
}

export function loadStoredFleet() {
  try {
    const raw = localStorage.getItem('mos-fleet-rows-v1');
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

// Aggregate stats computed from all user records — used for KPI overrides.
export function computeTripTotals(users) {
  const safeUsers = Array.isArray(users) ? users : [];
  const completed = safeUsers.reduce((s, u) => s + (u?.completedRides || 0), 0);
  const cancelled = safeUsers.reduce((s, u) => s + (u?.cancelledRides || 0), 0);
  const active    = safeUsers.reduce((s, u) => s + (u?.activeRides   || 0), 0);
  const total     = safeUsers.reduce((s, u) => s + (u?.rides         || 0), 0);
  return { total, completed, cancelled, active, revenue: Math.round(completed * 122) };
}

// Generate completed trip records for TripsPage (capped sample, newest first).
export function buildTripRecords(users) {
  const safeUsers = Array.isArray(users) ? users : [];
  const trips = [];
  let idx = 1;
  const base = new Date('2026-03-05');

  for (const user of safeUsers) {
    const completed = Math.max(0, Number(user.completedRides) || 0);
    if (!completed) continue;
    const us = parseInt(String(user.id || '').replace(/\D/g, '')) || 100;
    const sample = Math.min(completed, 12); // cap at 12 per user → ~660 trips total

    for (let i = 0; i < sample; i++) {
      const day  = ((i * 3 + us) * 7) % 30;
      const d    = new Date(base.getTime() + day * 86400000);
      const from = pick(LOCS, us + i * 3);
      let   to   = pick(LOCS, us + i * 3 + 7);
      if (to === from) to = LOCS[(LOCS.indexOf(to) + 1) % LOCS.length];
      const dist = 0.5 + ((us * (i + 1) * 31) % 48) / 10;
      const dur  = 5 + Math.round(dist * 6 + (us + i) % 8);
      const fare = Math.round(dist * 28 + 30 + (us + i * 13) % 45);
      const vId  = `VH-${String(((us + i * 11) % 370) + 1).padStart(3, '0')}`;

      trips.push({
        id:           `TR-${String(7000 + idx++).padStart(5, '0')}`,
        user:         user.name,
        vehicle:      vId,
        vehicleType:  pick(V_TYPES, us + i),
        from,
        to,
        dist:         `${dist.toFixed(1)} km`,
        dur:          `${dur} min`,
        fare:         `₹${fare}`,
        date:         fmtDate(d),
        org:          user.orgName || 'Independent',
        co2Saved:     `${(dist * 0.08).toFixed(2)} kg`,
        calories:     String(Math.round(dist * 38 + 10)),
        paymentMethod: user.coins > 0 ? 'MO Coins + Wallet' : 'Digital Wallet',
      });
    }
  }

  return trips.sort((a, b) => new Date(b.date) - new Date(a.date));
}

// Generate active and today's completed ride records for RidesPage.
export function buildRideRecords(users) {
  const safeUsers = Array.isArray(users) ? users : [];
  const rides = [];

  safeUsers.forEach((user, i) => {
    const us = parseInt(String(user.id || '').replace(/\D/g, '')) || 100;
    const from = pick(LOCS, us + i * 5);
    let to = pick(LOCS, us + i * 5 + 7);
    if (to === from) to = LOCS[(LOCS.indexOf(to) + 1) % LOCS.length];
    const dist = 0.5 + ((us + i * 37) % 44) / 10;
    const fare = Math.round(dist * 28 + 30 + (us + i) % 40);
    const pay  = user.coins > 0 ? 'MO Coins + Wallet' : 'Digital Wallet';

    // 1. Active ride (currently ongoing — evening commute)
    if ((user.activeRides || 0) > 0) {
      const startTime = pick(PM_STARTS, us + i * 3);
      const vId = `VH-${String(((us + i * 7) % 370) + 1).padStart(3, '0')}`;
      rides.push({
        id:            `RD-${String(8000 + i + 1).padStart(4, '0')}`,
        user:          user.name,
        vehicle:       vId,
        vehicleType:   pick(V_TYPES, us + i),
        start:         startTime,
        duration:      '—',
        org:           user.orgName || 'Independent',
        status:        'Active',
        rideDate:      TODAY_STR,
        fare:          '₹0',
        paymentMethod: pay,
        pickupLoc:     from,
        dropoffLoc:    to,
        stops:         0,
        route:         'Standard Route',
        distance:      `${dist.toFixed(1)} km`,
        co2Saved:      `${(dist * 0.08).toFixed(2)} kg`,
        estimatedEnd:  pick(PM_STARTS, us + i * 3 + 2),
      });
    }

    // 2. Completed morning ride today (~2/3 of users)
    if ((user.completedRides || 0) > 0 && i % 3 !== 2) {
      const startTime = pick(AM_STARTS, us + i * 2);
      const dur  = 5 + Math.round(dist * 6 + us % 8);
      const vId2 = `VH-${String(((us + i * 13 + 180) % 370) + 1).padStart(3, '0')}`;
      rides.push({
        id:            `RD-${String(9000 + i + 1).padStart(4, '0')}`,
        user:          user.name,
        vehicle:       vId2,
        vehicleType:   pick(V_TYPES, us + i + 3),
        start:         startTime,
        duration:      `${dur} min`,
        org:           user.orgName || 'Independent',
        status:        'Completed',
        rideDate:      TODAY_STR,
        fare:          `₹${fare}`,
        paymentMethod: pay,
        pickupLoc:     to,   // reversed for return commute
        dropoffLoc:    from,
        stops:         0,
        route:         'Standard Route',
        distance:      `${dist.toFixed(1)} km`,
        co2Saved:      `${(dist * 0.08).toFixed(2)} kg`,
        endTime:       startTime.replace(/(\d+):(\d+)/, (_, h, m) => {
          const endM = (Number(m) + dur) % 60;
          const endH = Number(h) + Math.floor((Number(m) + dur) / 60);
          return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
        }),
      });
    }
  });

  return rides;
}

// Generate activity feed entries for ActivityPage (environmental impact log).
export function buildActivityFeed(users) {
  const safeUsers = Array.isArray(users) ? users : [];
  const feed = [];
  let idx = 1;
  const base = new Date('2026-03-05');

  for (const user of safeUsers) {
    const completed = Math.max(0, Number(user.completedRides) || 0);
    if (!completed) continue;
    const us     = parseInt(String(user.id || '').replace(/\D/g, '')) || 100;
    const sample = Math.min(completed, 5 + (us % 3)); // 5–7 entries per user

    for (let i = 0; i < sample; i++) {
      const day  = ((us * 7 + i * 11) * 3) % 30;
      const d    = new Date(base.getTime() + day * 86400000);
      const dist = 0.5 + ((us + i * 23) % 46) / 10;
      const co2  = dist * 0.08;
      const cal  = Math.round(dist * 38 + 10);

      feed.push({
        id:   `ACT-${String(1000 + idx++).padStart(5, '0')}`,
        date: fmtDate(d),
        user: user.name,
        type: pick(['E-Bike', 'Cycle', 'Cycle', 'E-Scooter', 'Buggy'], us + i),
        dist: `${dist.toFixed(1)} km`,
        co2:  `${co2.toFixed(2)} kg`,
        cal:  String(cal),
        org:  user.orgName || 'Independent',
      });
    }
  }

  return feed.sort((a, b) => new Date(b.date) - new Date(a.date));
}

// Derive wallet ledger rows from stored users for WalletPage.
export function buildWalletData(users) {
  const TXN_DATES = [
    'Apr 4, 2026', 'Apr 3, 2026', 'Apr 2, 2026', 'Apr 1, 2026',
    'Mar 31, 2026', 'Mar 30, 2026', 'Mar 28, 2026', 'Mar 25, 2026',
  ];
  const safeUsers = Array.isArray(users) ? users : [];
  return safeUsers
    .filter((u) => Number(String(u?.wallet ?? '').replace(/[^\d.]/g, '')) > 0)
    .map((u, i) => {
      const pending = u?.cancelledRides > 0 ? Math.round(u.cancelledRides * 18) : 0;
      const disputed = (u?.completedRides || 0) === 0 && (u?.cancelledRides || 0) > 2;
      const status = disputed ? 'Disputed' : pending > 0 ? 'Pending' : 'Cleared';
      return {
        id: u?.id || `USR-${String(i + 1).padStart(4, '0')}`,
        name: u?.name || 'Unknown User',
        balance: u?.wallet || '₹0',
        pending: `₹${pending}`,
        last: TXN_DATES[i % TXN_DATES.length],
        status,
      };
    });
}

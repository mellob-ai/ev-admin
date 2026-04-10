/**
 * MJOLLNIR Admin Panel — Scenario Seed Data
 *
 * Scenario:
 *  Campus Mobility  — 5 Universities (3 subscription, 2 PAYG)
 *                     2 stations each, 6-8 students + 2 staff per org
 *  Corporate        — 3 Tech Parks + 3 ORR Corporate Tie-ups
 *  Public/Tourism   — ORR Cycling Track (3 stations, 10 bikes/station)
 *                     General Public Zone (15 stations, 10 bikes/station)
 *
 * All data matches exact localStorage key schemas consumed by each page.
 */

const now = () => new Date().toISOString();
const d = (daysAgo) => {
  const dt = new Date();
  dt.setDate(dt.getDate() - daysAgo);
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// ─────────────────────────────────────────────────────────────────
// 1. SETTINGS HIERARCHY  →  mos.settings.hierarchy.v1
// ─────────────────────────────────────────────────────────────────
export const SEED_HIERARCHY = {
  businessTypes: [
    { id: 'bt-campus',    name: 'Campus Mobility',          description: 'Universities, colleges, and educational institutions.', isPublic: false, status: 'active', createdAt: now(), updatedAt: now() },
    { id: 'bt-corporate', name: 'Corporate Mobility',        description: 'Tech parks, corporates, and enterprise campuses.',       isPublic: false, status: 'active', createdAt: now(), updatedAt: now() },
    { id: 'bt-public',    name: 'Public / General Mobility', description: 'Open cycling tracks and public mobility zones.',         isPublic: true,  status: 'active', createdAt: now(), updatedAt: now() },
  ],
  organizationTypes: [
    { id: 'ot-university',  businessTypeId: 'bt-campus',    locationId: 'loc-global', name: 'University',        description: 'Full campus mobility for universities.',        status: 'active', createdAt: now() },
    { id: 'ot-tech-park',   businessTypeId: 'bt-corporate', locationId: 'loc-global', name: 'Tech Park',         description: 'Multi-company technology park.',                status: 'active', createdAt: now() },
    { id: 'ot-company',     businessTypeId: 'bt-corporate', locationId: 'loc-global', name: 'Corporate Company', description: 'Individual company with ID-based access.',      status: 'active', createdAt: now() },
    { id: 'ot-cycle-track', businessTypeId: 'bt-public',    locationId: 'loc-global', name: 'Cycling Track',     description: 'Dedicated public cycling track with stations.', status: 'active', createdAt: now() },
    { id: 'ot-public-zone', businessTypeId: 'bt-public',    locationId: 'loc-global', name: 'Public Zone',       description: 'Open public mobility zone for all riders.',     status: 'active', createdAt: now() },
  ],
  userTypes: [
    { id: 'ut-student',    businessTypeId: 'bt-campus',    organizationTypeId: 'ot-university',  name: 'Student',        description: 'University student rider.',          status: 'active', createdAt: now() },
    { id: 'ut-faculty',    businessTypeId: 'bt-campus',    organizationTypeId: 'ot-university',  name: 'Faculty / Staff', description: 'University faculty and staff.',      status: 'active', createdAt: now() },
    { id: 'ut-employee',   businessTypeId: 'bt-corporate', organizationTypeId: 'ot-company',     name: 'Employee',       description: 'Corporate employee rider.',          status: 'active', createdAt: now() },
    { id: 'ut-corp-admin', businessTypeId: 'bt-corporate', organizationTypeId: 'ot-tech-park',   name: 'Corporate Admin', description: 'Tech park administrator.',          status: 'active', createdAt: now() },
    { id: 'ut-public',     businessTypeId: 'bt-public',    organizationTypeId: null,             name: 'Public Rider',    description: 'General public rider, no org.',    status: 'active', createdAt: now() },
  ],
  vehicleTypes: [
    { id: 'vt-cycle',    name: 'Cycle',    seatCount: 1, driverApplicable: false, description: 'Standard self-ride cycle.',              status: 'active', createdAt: now() },
    { id: 'vt-ebike',    name: 'E-Bike',   seatCount: 1, driverApplicable: false, description: 'Electric bike for self-ride.',           status: 'active', createdAt: now() },
    { id: 'vt-escooter', name: 'E-Scooter',seatCount: 1, driverApplicable: false, description: 'Electric scooter for short commutes.',   status: 'active', createdAt: now() },
    { id: 'vt-buggy',    name: 'Buggy',    seatCount: 4, driverApplicable: true,  description: 'Driver-managed campus buggy.',           status: 'active', createdAt: now() },
    { id: 'vt-ebuggy',   name: 'E-Buggy',  seatCount: 6, driverApplicable: true,  description: 'Electric buggy for tours and events.',   status: 'active', createdAt: now() },
  ],
};

// ─────────────────────────────────────────────────────────────────
// 2. SUBSCRIPTION PLANS  →  mos.subscriptionPlans
// ─────────────────────────────────────────────────────────────────
export const SEED_SUBSCRIPTION_PLANS = [
  { id: 'PLAN-001', name: 'Campus Starter',   type: 'Subscription', description: 'Entry plan for campus students. Unlimited Cycles.',                         vehicles: ['Cycle'],              price: '₹499',  coins: 60,  daily: 4, limit: 45, validity: '30 days', status: 'Active', coinToRideRatio: '1' },
  { id: 'PLAN-002', name: 'Campus Prime',     type: 'Subscription', description: 'Full-access campus plan. Cycle + E-Bike, generous ride time.',              vehicles: ['Cycle', 'E-Bike'],    price: '₹899',  coins: 120, daily: 8, limit: 60, validity: '30 days', status: 'Active', coinToRideRatio: '1' },
  { id: 'PLAN-003', name: 'Campus Premium',   type: 'Subscription', description: 'Premium all-vehicle plan including Buggy access.',                          vehicles: ['Cycle','E-Bike','Buggy'], price: '₹1299', coins: 200, daily: 12, limit: 90, validity: '30 days', status: 'Active', coinToRideRatio: '1' },
  { id: 'PLAN-004', name: 'Corporate Booster',type: 'Topup',       description: 'Corporate top-up for employees. 350 coins loaded per recharge.',            vehicles: [],                     price: '₹299',  coins: 350, daily: 70, limit: 0,  validity: '30 days', status: 'Active', coinToRideRatio: '1' },
];

// ─────────────────────────────────────────────────────────────────
// 3. ORGANIZATIONS  →  mos.operations.organizations.v1
// ─────────────────────────────────────────────────────────────────
export const SEED_ORGANIZATIONS = [

  // ── CAMPUS ── 3 Subscription Universities ─────────────────────

  {
    id: 'ORG-001', name: 'IIT Delhi Tech Campus', businessTypeId: 'bt-campus', businessType: 'Campus Mobility',
    organizationTypeId: 'ot-university', organizationType: 'University',
    city: 'New Delhi', state: 'Delhi', zipCode: '110016', address: 'Hauz Khas, New Delhi',
    contactEmail: 'mobility@iitd.ac.in', contactPhone: '+91-9811001001', status: 'Active',
    revenueOptions: ['Subscription'],
    vehicleSelections: ['Cycle', 'E-Bike', 'Buggy'],
    vehicleAllotment: { Cycle: 20, 'E-Bike': 10, Buggy: 4 },
    vehicleAdjust: {},
    payment: {
      subscriptionEnabled: true, topupEnabled: false, paygEnabled: false,
      subscriptions: [
        { id: 'SUB-ORG001-A', name: 'Campus Starter',  price: '₹499',  coins: 60,  dailyCoins: 4,  rideTimeLimit: 45, validity: '30 days', status: 'Active', vehicles: ['Cycle'],           coinToRideRatio: '1', description: '' },
        { id: 'SUB-ORG001-B', name: 'Campus Prime',    price: '₹899',  coins: 120, dailyCoins: 8,  rideTimeLimit: 60, validity: '30 days', status: 'Active', vehicles: ['Cycle','E-Bike'],  coinToRideRatio: '1', description: '' },
      ],
      topups: [], payg: { advanceRows: [], simpleRows: [] },
    },
    stations: [
      { id: 'ST-ORG001-01', name: 'Main Gate',       locationPin: '28.5456,77.1926', city: 'New Delhi', state: 'Delhi', status: 'Active' },
      { id: 'ST-ORG001-02', name: 'Library Hub',     locationPin: '28.5462,77.1935', city: 'New Delhi', state: 'Delhi', status: 'Active' },
    ],
    users: [
      { id: 'USR-ORG001-01', name: 'Arjun Sharma',   employeeId: 'IIT-S001', email: 'arjun.s@iitd.ac.in',   phone: '9810011001', role: 'Student',  status: 'Active', mappedPlan: 'Campus Prime',   validation: 'Matched', access: 'Enabled', ridePermission: 'Enabled' },
      { id: 'USR-ORG001-02', name: 'Priya Mehta',    employeeId: 'IIT-S002', email: 'priya.m@iitd.ac.in',   phone: '9810011002', role: 'Student',  status: 'Active', mappedPlan: 'Campus Starter', validation: 'Matched', access: 'Enabled', ridePermission: 'Enabled' },
      { id: 'USR-ORG001-03', name: 'Kabir Singh',    employeeId: 'IIT-S003', email: 'kabir.s@iitd.ac.in',   phone: '9810011003', role: 'Student',  status: 'Active', mappedPlan: 'Campus Prime',   validation: 'Matched', access: 'Enabled', ridePermission: 'Enabled' },
      { id: 'USR-ORG001-04', name: 'Nivedita Rao',   employeeId: 'IIT-S004', email: 'niv.r@iitd.ac.in',     phone: '9810011004', role: 'Student',  status: 'Active', mappedPlan: 'Campus Starter', validation: 'Matched', access: 'Enabled', ridePermission: 'Enabled' },
      { id: 'USR-ORG001-05', name: 'Rohan Verma',    employeeId: 'IIT-S005', email: 'rohan.v@iitd.ac.in',   phone: '9810011005', role: 'Student',  status: 'Active', mappedPlan: 'Campus Prime',   validation: 'Matched', access: 'Enabled', ridePermission: 'Enabled' },
      { id: 'USR-ORG001-06', name: 'Dr. Suresh Kumar',employeeId: 'IIT-F001', email: 'suresh.k@iitd.ac.in', phone: '9810011010', role: 'Staff',   status: 'Active', mappedPlan: 'Campus Premium', validation: 'Matched', access: 'Enabled', ridePermission: 'Enabled' },
      { id: 'USR-ORG001-07', name: 'Prof. Anita Joshi',employeeId: 'IIT-F002', email: 'anita.j@iitd.ac.in', phone: '9810011011', role: 'Staff',   status: 'Active', mappedPlan: 'Campus Premium', validation: 'Matched', access: 'Enabled', ridePermission: 'Enabled' },
    ],
  },

  {
    id: 'ORG-002', name: 'BITS Hyderabad Campus', businessTypeId: 'bt-campus', businessType: 'Campus Mobility',
    organizationTypeId: 'ot-university', organizationType: 'University',
    city: 'Hyderabad', state: 'Telangana', zipCode: '500078', address: 'Jawahar Nagar, Shameerpet, Hyderabad',
    contactEmail: 'mobility@bits-hyd.ac.in', contactPhone: '+91-9912002002', status: 'Active',
    revenueOptions: ['Subscription'],
    vehicleSelections: ['Cycle', 'E-Bike', 'E-Scooter'],
    vehicleAllotment: { Cycle: 18, 'E-Bike': 10, 'E-Scooter': 6 },
    vehicleAdjust: {},
    payment: {
      subscriptionEnabled: true, topupEnabled: false, paygEnabled: false,
      subscriptions: [
        { id: 'SUB-ORG002-A', name: 'Campus Prime',   price: '₹899',  coins: 120, dailyCoins: 8,  rideTimeLimit: 60, validity: '30 days', status: 'Active', vehicles: ['Cycle','E-Bike'],       coinToRideRatio: '1', description: '' },
      ],
      topups: [], payg: { advanceRows: [], simpleRows: [] },
    },
    stations: [
      { id: 'ST-ORG002-01', name: 'Academic Block',  locationPin: '17.5406,78.5719', city: 'Hyderabad', state: 'Telangana', status: 'Active' },
      { id: 'ST-ORG002-02', name: 'Hostel Zone',     locationPin: '17.5412,78.5731', city: 'Hyderabad', state: 'Telangana', status: 'Active' },
    ],
    users: [
      { id: 'USR-ORG002-01', name: 'Aditya Nair',    employeeId: 'BITS-S001', email: 'aditya.n@bits-hyd.ac.in',  phone: '9912002001', role: 'Student', status: 'Active', mappedPlan: 'Campus Prime',  validation: 'Matched', access: 'Enabled', ridePermission: 'Enabled' },
      { id: 'USR-ORG002-02', name: 'Sneha Patel',    employeeId: 'BITS-S002', email: 'sneha.p@bits-hyd.ac.in',   phone: '9912002002', role: 'Student', status: 'Active', mappedPlan: 'Campus Prime',  validation: 'Matched', access: 'Enabled', ridePermission: 'Enabled' },
      { id: 'USR-ORG002-03', name: 'Harish Reddy',   employeeId: 'BITS-S003', email: 'harish.r@bits-hyd.ac.in',  phone: '9912002003', role: 'Student', status: 'Active', mappedPlan: 'Campus Prime',  validation: 'Matched', access: 'Enabled', ridePermission: 'Enabled' },
      { id: 'USR-ORG002-04', name: 'Divya Krishnan', employeeId: 'BITS-S004', email: 'divya.k@bits-hyd.ac.in',   phone: '9912002004', role: 'Student', status: 'Active', mappedPlan: 'Campus Prime',  validation: 'Matched', access: 'Enabled', ridePermission: 'Enabled' },
      { id: 'USR-ORG002-05', name: 'Kiran Kumar',    employeeId: 'BITS-S005', email: 'kiran.k@bits-hyd.ac.in',   phone: '9912002005', role: 'Student', status: 'Active', mappedPlan: 'Campus Prime',  validation: 'Matched', access: 'Enabled', ridePermission: 'Enabled' },
      { id: 'USR-ORG002-06', name: 'Dr. Meena Pillai',employeeId: 'BITS-F001', email: 'meena.p@bits-hyd.ac.in', phone: '9912002010', role: 'Staff',   status: 'Active', mappedPlan: 'Campus Premium',validation: 'Matched', access: 'Enabled', ridePermission: 'Enabled' },
      { id: 'USR-ORG002-07', name: 'Prof. Sunil Das', employeeId: 'BITS-F002', email: 'sunil.d@bits-hyd.ac.in', phone: '9912002011', role: 'Staff',   status: 'Active', mappedPlan: 'Campus Premium',validation: 'Matched', access: 'Enabled', ridePermission: 'Enabled' },
    ],
  },

  {
    id: 'ORG-003', name: 'Amrita University Coimbatore', businessTypeId: 'bt-campus', businessType: 'Campus Mobility',
    organizationTypeId: 'ot-university', organizationType: 'University',
    city: 'Coimbatore', state: 'Tamil Nadu', zipCode: '641112', address: 'Ettimadai, Coimbatore',
    contactEmail: 'mobility@amrita.edu', contactPhone: '+91-9842003003', status: 'Active',
    revenueOptions: ['Subscription'],
    vehicleSelections: ['Cycle', 'E-Bike'],
    vehicleAllotment: { Cycle: 15, 'E-Bike': 8 },
    vehicleAdjust: {},
    payment: {
      subscriptionEnabled: true, topupEnabled: false, paygEnabled: false,
      subscriptions: [
        { id: 'SUB-ORG003-A', name: 'Campus Starter',  price: '₹499',  coins: 60, dailyCoins: 4, rideTimeLimit: 45, validity: '30 days', status: 'Active', vehicles: ['Cycle'],          coinToRideRatio: '1', description: '' },
        { id: 'SUB-ORG003-B', name: 'Campus Prime',    price: '₹899',  coins: 120, dailyCoins: 8, rideTimeLimit: 60, validity: '30 days', status: 'Active', vehicles: ['Cycle','E-Bike'], coinToRideRatio: '1', description: '' },
      ],
      topups: [], payg: { advanceRows: [], simpleRows: [] },
    },
    stations: [
      { id: 'ST-ORG003-01', name: 'Engineering Block', locationPin: '10.9037,76.9014', city: 'Coimbatore', state: 'Tamil Nadu', status: 'Active' },
      { id: 'ST-ORG003-02', name: 'Students Canteen',  locationPin: '10.9042,76.9020', city: 'Coimbatore', state: 'Tamil Nadu', status: 'Active' },
    ],
    users: [
      { id: 'USR-ORG003-01', name: 'Vikram Subramaniam',employeeId: 'AMR-S001', email: 'vikram.s@amrita.edu',  phone: '9842003001', role: 'Student', status: 'Active', mappedPlan: 'Campus Starter', validation: 'Matched', access: 'Enabled', ridePermission: 'Enabled' },
      { id: 'USR-ORG003-02', name: 'Lakshmi Sundaram',  employeeId: 'AMR-S002', email: 'lakshmi.s@amrita.edu', phone: '9842003002', role: 'Student', status: 'Active', mappedPlan: 'Campus Starter', validation: 'Matched', access: 'Enabled', ridePermission: 'Enabled' },
      { id: 'USR-ORG003-03', name: 'Deepak Menon',      employeeId: 'AMR-S003', email: 'deepak.m@amrita.edu',  phone: '9842003003', role: 'Student', status: 'Active', mappedPlan: 'Campus Prime',   validation: 'Matched', access: 'Enabled', ridePermission: 'Enabled' },
      { id: 'USR-ORG003-04', name: 'Ananya Iyer',       employeeId: 'AMR-S004', email: 'ananya.i@amrita.edu',  phone: '9842003004', role: 'Student', status: 'Active', mappedPlan: 'Campus Prime',   validation: 'Matched', access: 'Enabled', ridePermission: 'Enabled' },
      { id: 'USR-ORG003-05', name: 'Dr. Ravi Shankar',  employeeId: 'AMR-F001', email: 'ravi.sh@amrita.edu',   phone: '9842003010', role: 'Staff',   status: 'Active', mappedPlan: 'Campus Premium', validation: 'Matched', access: 'Enabled', ridePermission: 'Enabled' },
      { id: 'USR-ORG003-06', name: 'Dr. Uma Devi',      employeeId: 'AMR-F002', email: 'uma.d@amrita.edu',     phone: '9842003011', role: 'Staff',   status: 'Active', mappedPlan: 'Campus Premium', validation: 'Matched', access: 'Enabled', ridePermission: 'Enabled' },
    ],
  },

  // ── CAMPUS ── 2 PAYG Universities ─────────────────────────────

  {
    id: 'ORG-004', name: 'VIT Vellore Campus', businessTypeId: 'bt-campus', businessType: 'Campus Mobility',
    organizationTypeId: 'ot-university', organizationType: 'University',
    city: 'Vellore', state: 'Tamil Nadu', zipCode: '632014', address: 'Vellore – Katpadi Rd, Vellore',
    contactEmail: 'mobility@vit.ac.in', contactPhone: '+91-9842004004', status: 'Active',
    revenueOptions: ['Pay as you Go'],
    vehicleSelections: ['Cycle', 'E-Bike', 'E-Scooter'],
    vehicleAllotment: { Cycle: 15, 'E-Bike': 10, 'E-Scooter': 5 },
    vehicleAdjust: {},
    payment: {
      subscriptionEnabled: false, topupEnabled: false, paygEnabled: true,
      subscriptions: [], topups: [],
      payg: {
        advanceRows: [],
        simpleRows: [
          { id: 'PAYG-S-ORG004-01', vehicleType: 'Cycle',     price: '₹2',  unit: 'Per Minute', status: 'Active', appliesTo: 'All Days' },
          { id: 'PAYG-S-ORG004-02', vehicleType: 'E-Bike',    price: '₹5',  unit: 'Per Minute', status: 'Active', appliesTo: 'All Days' },
          { id: 'PAYG-S-ORG004-03', vehicleType: 'E-Scooter', price: '₹4',  unit: 'Per Minute', status: 'Active', appliesTo: 'All Days' },
        ],
      },
    },
    stations: [
      { id: 'ST-ORG004-01', name: 'Tech Tower Gate',  locationPin: '12.9695,79.1559', city: 'Vellore', state: 'Tamil Nadu', status: 'Active' },
      { id: 'ST-ORG004-02', name: 'MG Hostel Block',  locationPin: '12.9701,79.1567', city: 'Vellore', state: 'Tamil Nadu', status: 'Active' },
    ],
    users: [
      { id: 'USR-ORG004-01', name: 'Sajid Khan',       employeeId: 'VIT-S001', email: 'sajid.k@vit.ac.in',   phone: '9842004001', role: 'Student', status: 'Active', mappedPlan: '',  validation: 'Matched', access: 'Enabled', ridePermission: 'Enabled' },
      { id: 'USR-ORG004-02', name: 'Shweta Gupta',     employeeId: 'VIT-S002', email: 'shweta.g@vit.ac.in',  phone: '9842004002', role: 'Student', status: 'Active', mappedPlan: '',  validation: 'Matched', access: 'Enabled', ridePermission: 'Enabled' },
      { id: 'USR-ORG004-03', name: 'Rahul Tiwari',     employeeId: 'VIT-S003', email: 'rahul.t@vit.ac.in',   phone: '9842004003', role: 'Student', status: 'Active', mappedPlan: '',  validation: 'Matched', access: 'Enabled', ridePermission: 'Enabled' },
      { id: 'USR-ORG004-04', name: 'Anjali Roy',       employeeId: 'VIT-S004', email: 'anjali.r@vit.ac.in',  phone: '9842004004', role: 'Student', status: 'Active', mappedPlan: '',  validation: 'Matched', access: 'Enabled', ridePermission: 'Enabled' },
      { id: 'USR-ORG004-05', name: 'Prof. Naresh Babu',employeeId: 'VIT-F001', email: 'naresh.b@vit.ac.in',  phone: '9842004010', role: 'Staff',   status: 'Active', mappedPlan: '',  validation: 'Matched', access: 'Enabled', ridePermission: 'Enabled' },
    ],
  },

  {
    id: 'ORG-005', name: 'Manipal University Jaipur', businessTypeId: 'bt-campus', businessType: 'Campus Mobility',
    organizationTypeId: 'ot-university', organizationType: 'University',
    city: 'Jaipur', state: 'Rajasthan', zipCode: '303007', address: 'Dehmi Kalan, Jaipur',
    contactEmail: 'mobility@muj.manipal.edu', contactPhone: '+91-9829005005', status: 'Active',
    revenueOptions: ['Pay as you Go'],
    vehicleSelections: ['Cycle', 'E-Bike'],
    vehicleAllotment: { Cycle: 12, 'E-Bike': 8 },
    vehicleAdjust: {},
    payment: {
      subscriptionEnabled: false, topupEnabled: false, paygEnabled: true,
      subscriptions: [], topups: [],
      payg: {
        advanceRows: [],
        simpleRows: [
          { id: 'PAYG-S-ORG005-01', vehicleType: 'Cycle',  price: '₹2',  unit: 'Per Minute', status: 'Active', appliesTo: 'All Days' },
          { id: 'PAYG-S-ORG005-02', vehicleType: 'E-Bike', price: '₹4',  unit: 'Per Minute', status: 'Active', appliesTo: 'All Days' },
        ],
      },
    },
    stations: [
      { id: 'ST-ORG005-01', name: 'Main Entrance',    locationPin: '26.8873,75.8056', city: 'Jaipur', state: 'Rajasthan', status: 'Active' },
      { id: 'ST-ORG005-02', name: 'Sports Arena Hub', locationPin: '26.8880,75.8062', city: 'Jaipur', state: 'Rajasthan', status: 'Active' },
    ],
    users: [
      { id: 'USR-ORG005-01', name: 'Chirag Agarwal',  employeeId: 'MUJ-S001', email: 'chirag.a@muj.manipal.edu', phone: '9829005001', role: 'Student', status: 'Active', mappedPlan: '', validation: 'Matched', access: 'Enabled', ridePermission: 'Enabled' },
      { id: 'USR-ORG005-02', name: 'Pooja Bhatt',     employeeId: 'MUJ-S002', email: 'pooja.b@muj.manipal.edu',  phone: '9829005002', role: 'Student', status: 'Active', mappedPlan: '', validation: 'Matched', access: 'Enabled', ridePermission: 'Enabled' },
      { id: 'USR-ORG005-03', name: 'Saurabh Pareek',  employeeId: 'MUJ-S003', email: 'saurabh.p@muj.manipal.edu',phone: '9829005003', role: 'Student', status: 'Active', mappedPlan: '', validation: 'Matched', access: 'Enabled', ridePermission: 'Enabled' },
      { id: 'USR-ORG005-04', name: 'Dr. Kavita Sharma',employeeId: 'MUJ-F001', email: 'kavita.s@muj.manipal.edu',phone: '9829005010', role: 'Staff',   status: 'Active', mappedPlan: '', validation: 'Matched', access: 'Enabled', ridePermission: 'Enabled' },
    ],
  },

  // ── CORPORATE ── 3 Tech Parks ─────────────────────────────────

  {
    id: 'ORG-006', name: 'Cyberabad Tech Park', businessTypeId: 'bt-corporate', businessType: 'Corporate Mobility',
    organizationTypeId: 'ot-tech-park', organizationType: 'Tech Park',
    city: 'Hyderabad', state: 'Telangana', zipCode: '500032', address: 'HITECH City, Madhapur, Hyderabad',
    contactEmail: 'admin@cyberabad-tp.in', contactPhone: '+91-9912006006', status: 'Active',
    revenueOptions: ['Top up'],
    vehicleSelections: ['E-Bike', 'E-Scooter', 'Buggy'],
    vehicleAllotment: { 'E-Bike': 20, 'E-Scooter': 10, Buggy: 4 },
    vehicleAdjust: {},
    payment: {
      subscriptionEnabled: false, topupEnabled: true, paygEnabled: false,
      subscriptions: [],
      topups: [
        { id: 'TOP-ORG006-A', name: 'Corporate Booster', price: '₹299', coins: 350, dailyCoins: 70, rideTimeLimit: 0, validity: '30 days', status: 'Active', vehicles: [], coinToRideRatio: '1', description: '' },
      ],
      payg: { advanceRows: [], simpleRows: [] },
    },
    stations: [
      { id: 'ST-ORG006-01', name: 'HITECH Entry Gate', locationPin: '17.4486,78.3908', city: 'Hyderabad', state: 'Telangana', status: 'Active' },
      { id: 'ST-ORG006-02', name: 'Tower B Lobby',     locationPin: '17.4492,78.3916', city: 'Hyderabad', state: 'Telangana', status: 'Active' },
      { id: 'ST-ORG006-03', name: 'Food Court Hub',    locationPin: '17.4479,78.3924', city: 'Hyderabad', state: 'Telangana', status: 'Active' },
    ],
    users: [
      { id: 'USR-ORG006-01', name: 'Ramana Prasad',   employeeId: 'CYB-E001', email: 'ramana.p@cyberabad-tp.in',  phone: '9912006001', role: 'Employee', status: 'Active', mappedPlan: 'Corporate Booster', validation: 'Matched', access: 'Enabled', ridePermission: 'Enabled' },
      { id: 'USR-ORG006-02', name: 'Swathi Rao',      employeeId: 'CYB-E002', email: 'swathi.r@cyberabad-tp.in',  phone: '9912006002', role: 'Employee', status: 'Active', mappedPlan: 'Corporate Booster', validation: 'Matched', access: 'Enabled', ridePermission: 'Enabled' },
      { id: 'USR-ORG006-03', name: 'Ravi Chandra',    employeeId: 'CYB-E003', email: 'ravi.c@cyberabad-tp.in',    phone: '9912006003', role: 'Employee', status: 'Active', mappedPlan: 'Corporate Booster', validation: 'Matched', access: 'Enabled', ridePermission: 'Enabled' },
      { id: 'USR-ORG006-04', name: 'Manasa Reddy',    employeeId: 'CYB-E004', email: 'manasa.r@cyberabad-tp.in',  phone: '9912006004', role: 'Employee', status: 'Active', mappedPlan: 'Corporate Booster', validation: 'Matched', access: 'Enabled', ridePermission: 'Enabled' },
      { id: 'USR-ORG006-05', name: 'Srinivas Kumar',  employeeId: 'CYB-A001', email: 'srinivas.k@cyberabad-tp.in',phone: '9912006010', role: 'Admin',    status: 'Active', mappedPlan: 'Corporate Booster', validation: 'Matched', access: 'Enabled', ridePermission: 'Enabled' },
    ],
  },

  {
    id: 'ORG-007', name: 'Embassy Tech Village Bengaluru', businessTypeId: 'bt-corporate', businessType: 'Corporate Mobility',
    organizationTypeId: 'ot-tech-park', organizationType: 'Tech Park',
    city: 'Bengaluru', state: 'Karnataka', zipCode: '560103', address: 'Outer Ring Road, Bellandur, Bengaluru',
    contactEmail: 'admin@embassy-tv.in', contactPhone: '+91-9900007007', status: 'Active',
    revenueOptions: ['Top up', 'Pay as you Go'],
    vehicleSelections: ['E-Bike', 'E-Scooter', 'Buggy'],
    vehicleAllotment: { 'E-Bike': 18, 'E-Scooter': 8, Buggy: 3 },
    vehicleAdjust: {},
    payment: {
      subscriptionEnabled: false, topupEnabled: true, paygEnabled: true,
      subscriptions: [],
      topups: [
        { id: 'TOP-ORG007-A', name: 'Corporate Booster', price: '₹299', coins: 350, dailyCoins: 70, rideTimeLimit: 0, validity: '30 days', status: 'Active', vehicles: [], coinToRideRatio: '1', description: '' },
      ],
      payg: {
        advanceRows: [
          { id: 'PAYG-A-ORG007-01', vehicleType: 'Buggy', unlockFee: '₹20', perUnit: '₹6', baseFare: '₹35', waitingCharges: '₹2/min', status: 'Active', appliesTo: 'Weekday', advanceMethod: 'Standard Advance' },
        ],
        simpleRows: [],
      },
    },
    stations: [
      { id: 'ST-ORG007-01', name: 'North Wing Entrance', locationPin: '12.9305,77.6899', city: 'Bengaluru', state: 'Karnataka', status: 'Active' },
      { id: 'ST-ORG007-02', name: 'Shuttle Hub Plaza',   locationPin: '12.9311,77.6912', city: 'Bengaluru', state: 'Karnataka', status: 'Active' },
      { id: 'ST-ORG007-03', name: 'Cafeteria Block',     locationPin: '12.9329,77.6891', city: 'Bengaluru', state: 'Karnataka', status: 'Active' },
    ],
    users: [
      { id: 'USR-ORG007-01', name: 'Naveen Krishnamurthy',employeeId: 'ETV-E001', email: 'naveen.k@embassy-tv.in', phone: '9900007001', role: 'Employee', status: 'Active', mappedPlan: 'Corporate Booster', validation: 'Matched', access: 'Enabled', ridePermission: 'Enabled' },
      { id: 'USR-ORG007-02', name: 'Shilpa Gowda',       employeeId: 'ETV-E002', email: 'shilpa.g@embassy-tv.in', phone: '9900007002', role: 'Employee', status: 'Active', mappedPlan: 'Corporate Booster', validation: 'Matched', access: 'Enabled', ridePermission: 'Enabled' },
      { id: 'USR-ORG007-03', name: 'Prashanth B.V.',     employeeId: 'ETV-E003', email: 'prashanth@embassy-tv.in',phone: '9900007003', role: 'Employee', status: 'Active', mappedPlan: 'Corporate Booster', validation: 'Matched', access: 'Enabled', ridePermission: 'Enabled' },
      { id: 'USR-ORG007-04', name: 'Deepa Subramanyan',  employeeId: 'ETV-E004', email: 'deepa.s@embassy-tv.in',  phone: '9900007004', role: 'Employee', status: 'Active', mappedPlan: 'Corporate Booster', validation: 'Matched', access: 'Enabled', ridePermission: 'Enabled' },
      { id: 'USR-ORG007-05', name: 'Vivek Padmanabhan',  employeeId: 'ETV-A001', email: 'vivek.p@embassy-tv.in',  phone: '9900007010', role: 'Admin',    status: 'Active', mappedPlan: 'Corporate Booster', validation: 'Matched', access: 'Enabled', ridePermission: 'Enabled' },
    ],
  },

  {
    id: 'ORG-008', name: 'Pune IT Hub', businessTypeId: 'bt-corporate', businessType: 'Corporate Mobility',
    organizationTypeId: 'ot-tech-park', organizationType: 'Tech Park',
    city: 'Pune', state: 'Maharashtra', zipCode: '411057', address: 'Hinjewadi Phase II, Pune',
    contactEmail: 'admin@pune-ithub.in', contactPhone: '+91-9890008008', status: 'Active',
    revenueOptions: ['Top up'],
    vehicleSelections: ['Cycle', 'E-Bike', 'E-Scooter'],
    vehicleAllotment: { Cycle: 10, 'E-Bike': 14, 'E-Scooter': 6 },
    vehicleAdjust: {},
    payment: {
      subscriptionEnabled: false, topupEnabled: true, paygEnabled: false,
      subscriptions: [],
      topups: [
        { id: 'TOP-ORG008-A', name: 'Corporate Booster', price: '₹299', coins: 350, dailyCoins: 70, rideTimeLimit: 0, validity: '30 days', status: 'Active', vehicles: [], coinToRideRatio: '1', description: '' },
      ],
      payg: { advanceRows: [], simpleRows: [] },
    },
    stations: [
      { id: 'ST-ORG008-01', name: 'Phase II East Gate',  locationPin: '18.5933,73.7380', city: 'Pune', state: 'Maharashtra', status: 'Active' },
      { id: 'ST-ORG008-02', name: 'Central Food Plaza',  locationPin: '18.5940,73.7392', city: 'Pune', state: 'Maharashtra', status: 'Active' },
    ],
    users: [
      { id: 'USR-ORG008-01', name: 'Amol Deshmukh',    employeeId: 'PIH-E001', email: 'amol.d@pune-ithub.in',  phone: '9890008001', role: 'Employee', status: 'Active', mappedPlan: 'Corporate Booster', validation: 'Matched', access: 'Enabled', ridePermission: 'Enabled' },
      { id: 'USR-ORG008-02', name: 'Prachi Joshi',     employeeId: 'PIH-E002', email: 'prachi.j@pune-ithub.in',phone: '9890008002', role: 'Employee', status: 'Active', mappedPlan: 'Corporate Booster', validation: 'Matched', access: 'Enabled', ridePermission: 'Enabled' },
      { id: 'USR-ORG008-03', name: 'Nikhil Kulkarni',  employeeId: 'PIH-E003', email: 'nikhil.k@pune-ithub.in',phone: '9890008003', role: 'Employee', status: 'Active', mappedPlan: 'Corporate Booster', validation: 'Matched', access: 'Enabled', ridePermission: 'Enabled' },
      { id: 'USR-ORG008-04', name: 'Rashmi Patil',     employeeId: 'PIH-A001', email: 'rashmi.p@pune-ithub.in',phone: '9890008010', role: 'Admin',    status: 'Active', mappedPlan: 'Corporate Booster', validation: 'Matched', access: 'Enabled', ridePermission: 'Enabled' },
    ],
  },

  // ── CORPORATE ── ORR Tie-up Companies ─────────────────────────

  {
    id: 'ORG-009', name: 'Infosys ORR Campus', businessTypeId: 'bt-corporate', businessType: 'Corporate Mobility',
    organizationTypeId: 'ot-company', organizationType: 'Corporate Company',
    city: 'Hyderabad', state: 'Telangana', zipCode: '500032', address: 'Survey No. 38, ORR, Gachibowli, Hyderabad',
    contactEmail: 'mobility@infosys-orr.in', contactPhone: '+91-9912009009', status: 'Active',
    revenueOptions: ['Top up'],
    vehicleSelections: ['Cycle', 'E-Bike'],
    vehicleAllotment: { Cycle: 8, 'E-Bike': 6 },
    vehicleAdjust: {},
    payment: {
      subscriptionEnabled: false, topupEnabled: true, paygEnabled: false,
      subscriptions: [],
      topups: [
        { id: 'TOP-ORG009-A', name: 'Corporate Booster', price: '₹299', coins: 350, dailyCoins: 70, rideTimeLimit: 0, validity: '30 days', status: 'Active', vehicles: [], coinToRideRatio: '1', description: '' },
      ],
      payg: { advanceRows: [], simpleRows: [] },
    },
    stations: [
      { id: 'ST-ORG009-01', name: 'Infy Gate 1 – ORR',  locationPin: '17.4410,78.3484', city: 'Hyderabad', state: 'Telangana', status: 'Active' },
      { id: 'ST-ORG009-02', name: 'Infy Campus South',  locationPin: '17.4418,78.3492', city: 'Hyderabad', state: 'Telangana', status: 'Active' },
    ],
    users: [
      { id: 'USR-ORG009-01', name: 'Santhosh Naidu',  employeeId: 'INF-E001', email: 'santhosh.n@infosys-orr.in', phone: '9912009001', role: 'Employee', status: 'Active', mappedPlan: 'Corporate Booster', validation: 'Matched', access: 'Enabled', ridePermission: 'Enabled' },
      { id: 'USR-ORG009-02', name: 'Archana Bhat',    employeeId: 'INF-E002', email: 'archana.b@infosys-orr.in',  phone: '9912009002', role: 'Employee', status: 'Active', mappedPlan: 'Corporate Booster', validation: 'Matched', access: 'Enabled', ridePermission: 'Enabled' },
      { id: 'USR-ORG009-03', name: 'Karthik Mohan',   employeeId: 'INF-E003', email: 'karthik.m@infosys-orr.in',  phone: '9912009003', role: 'Employee', status: 'Active', mappedPlan: 'Corporate Booster', validation: 'Matched', access: 'Enabled', ridePermission: 'Enabled' },
    ],
  },

  {
    id: 'ORG-010', name: 'TCS ORR Campus', businessTypeId: 'bt-corporate', businessType: 'Corporate Mobility',
    organizationTypeId: 'ot-company', organizationType: 'Corporate Company',
    city: 'Hyderabad', state: 'Telangana', zipCode: '500032', address: 'TCS Campus, Gachibowli, Hyderabad',
    contactEmail: 'mobility@tcs-orr.in', contactPhone: '+91-9912010010', status: 'Active',
    revenueOptions: ['Top up'],
    vehicleSelections: ['Cycle', 'E-Bike'],
    vehicleAllotment: { Cycle: 8, 'E-Bike': 6 },
    vehicleAdjust: {},
    payment: {
      subscriptionEnabled: false, topupEnabled: true, paygEnabled: false,
      subscriptions: [],
      topups: [
        { id: 'TOP-ORG010-A', name: 'Corporate Booster', price: '₹299', coins: 350, dailyCoins: 70, rideTimeLimit: 0, validity: '30 days', status: 'Active', vehicles: [], coinToRideRatio: '1', description: '' },
      ],
      payg: { advanceRows: [], simpleRows: [] },
    },
    stations: [
      { id: 'ST-ORG010-01', name: 'TCS Synergy Block',   locationPin: '17.4432,78.3498', city: 'Hyderabad', state: 'Telangana', status: 'Active' },
      { id: 'ST-ORG010-02', name: 'TCS Sports Arena',    locationPin: '17.4439,78.3502', city: 'Hyderabad', state: 'Telangana', status: 'Active' },
    ],
    users: [
      { id: 'USR-ORG010-01', name: 'Vinay Kasireddy', employeeId: 'TCS-E001', email: 'vinay.k@tcs-orr.in',  phone: '9912010001', role: 'Employee', status: 'Active', mappedPlan: 'Corporate Booster', validation: 'Matched', access: 'Enabled', ridePermission: 'Enabled' },
      { id: 'USR-ORG010-02', name: 'Mounika Varma',   employeeId: 'TCS-E002', email: 'mounika.v@tcs-orr.in', phone: '9912010002', role: 'Employee', status: 'Active', mappedPlan: 'Corporate Booster', validation: 'Matched', access: 'Enabled', ridePermission: 'Enabled' },
      { id: 'USR-ORG010-03', name: 'Aravind Sai',     employeeId: 'TCS-E003', email: 'aravind.s@tcs-orr.in', phone: '9912010003', role: 'Employee', status: 'Active', mappedPlan: 'Corporate Booster', validation: 'Matched', access: 'Enabled', ridePermission: 'Enabled' },
    ],
  },

  {
    id: 'ORG-011', name: 'Wipro ORR Campus', businessTypeId: 'bt-corporate', businessType: 'Corporate Mobility',
    organizationTypeId: 'ot-company', organizationType: 'Corporate Company',
    city: 'Hyderabad', state: 'Telangana', zipCode: '500032', address: 'Wipro Circle, ORR, Gachibowli, Hyderabad',
    contactEmail: 'mobility@wipro-orr.in', contactPhone: '+91-9912011011', status: 'Active',
    revenueOptions: ['Top up'],
    vehicleSelections: ['Cycle', 'E-Bike'],
    vehicleAllotment: { Cycle: 8, 'E-Bike': 6 },
    vehicleAdjust: {},
    payment: {
      subscriptionEnabled: false, topupEnabled: true, paygEnabled: false,
      subscriptions: [],
      topups: [
        { id: 'TOP-ORG011-A', name: 'Corporate Booster', price: '₹299', coins: 350, dailyCoins: 70, rideTimeLimit: 0, validity: '30 days', status: 'Active', vehicles: [], coinToRideRatio: '1', description: '' },
      ],
      payg: { advanceRows: [], simpleRows: [] },
    },
    stations: [
      { id: 'ST-ORG011-01', name: 'Wipro East Lobby',  locationPin: '17.4453,78.3511', city: 'Hyderabad', state: 'Telangana', status: 'Active' },
      { id: 'ST-ORG011-02', name: 'Wipro West Wing',   locationPin: '17.4460,78.3520', city: 'Hyderabad', state: 'Telangana', status: 'Active' },
    ],
    users: [
      { id: 'USR-ORG011-01', name: 'Shiva Prasad',   employeeId: 'WIP-E001', email: 'shiva.p@wipro-orr.in',  phone: '9912011001', role: 'Employee', status: 'Active', mappedPlan: 'Corporate Booster', validation: 'Matched', access: 'Enabled', ridePermission: 'Enabled' },
      { id: 'USR-ORG011-02', name: 'Kavya Reddy',    employeeId: 'WIP-E002', email: 'kavya.r@wipro-orr.in',  phone: '9912011002', role: 'Employee', status: 'Active', mappedPlan: 'Corporate Booster', validation: 'Matched', access: 'Enabled', ridePermission: 'Enabled' },
      { id: 'USR-ORG011-03', name: 'Mahesh Goud',    employeeId: 'WIP-E003', email: 'mahesh.g@wipro-orr.in', phone: '9912011003', role: 'Employee', status: 'Active', mappedPlan: 'Corporate Booster', validation: 'Matched', access: 'Enabled', ridePermission: 'Enabled' },
    ],
  },

  // ── PUBLIC ── ORR Cycling Track ────────────────────────────────

  {
    id: 'ORG-012', name: 'ORR Cycling Track Hyderabad', businessTypeId: 'bt-public', businessType: 'Public / General Mobility',
    organizationTypeId: 'ot-cycle-track', organizationType: 'Cycling Track',
    city: 'Hyderabad', state: 'Telangana', zipCode: '500032', address: 'Outer Ring Road, Gachibowli, Hyderabad',
    contactEmail: 'ops@orr-cycling.in', contactPhone: '+91-9912012012', status: 'Active',
    revenueOptions: ['Pay as you Go'],
    vehicleSelections: ['Cycle', 'E-Bike'],
    vehicleAllotment: { Cycle: 20, 'E-Bike': 10 },
    vehicleAdjust: {},
    payment: {
      subscriptionEnabled: false, topupEnabled: false, paygEnabled: true,
      subscriptions: [], topups: [],
      payg: {
        advanceRows: [],
        simpleRows: [
          { id: 'PAYG-S-ORG012-01', vehicleType: 'Cycle',  price: '₹3',  unit: 'Per Minute', status: 'Active', appliesTo: 'All Days' },
          { id: 'PAYG-S-ORG012-02', vehicleType: 'E-Bike', price: '₹6',  unit: 'Per Minute', status: 'Active', appliesTo: 'All Days' },
        ],
      },
    },
    stations: [
      { id: 'ST-ORG012-01', name: 'ORR Gachibowli Entry',  locationPin: '17.4468,78.3530', city: 'Hyderabad', state: 'Telangana', status: 'Active' },
      { id: 'ST-ORG012-02', name: 'ORR Mid Track Point',   locationPin: '17.4481,78.3547', city: 'Hyderabad', state: 'Telangana', status: 'Active' },
      { id: 'ST-ORG012-03', name: 'ORR East Finish Gate',  locationPin: '17.4496,78.3562', city: 'Hyderabad', state: 'Telangana', status: 'Active' },
    ],
    users: [],
  },

  // ── PUBLIC ── General Public Zone ─────────────────────────────

  {
    id: 'ORG-013', name: 'Public Mobility Zone', businessTypeId: 'bt-public', businessType: 'Public / General Mobility',
    organizationTypeId: 'ot-public-zone', organizationType: 'Public Zone',
    city: 'Hyderabad', state: 'Telangana', zipCode: '500001', address: 'Pan-City Public Access, Hyderabad',
    contactEmail: 'ops@mos-public.in', contactPhone: '+91-9912013013', status: 'Active',
    revenueOptions: ['Pay as you Go'],
    vehicleSelections: ['Cycle', 'E-Bike', 'E-Scooter'],
    vehicleAllotment: { Cycle: 80, 'E-Bike': 50, 'E-Scooter': 20 },
    vehicleAdjust: {},
    payment: {
      subscriptionEnabled: false, topupEnabled: false, paygEnabled: true,
      subscriptions: [], topups: [],
      payg: {
        advanceRows: [],
        simpleRows: [
          { id: 'PAYG-S-ORG013-01', vehicleType: 'Cycle',     price: '₹2', unit: 'Per Minute', status: 'Active', appliesTo: 'All Days' },
          { id: 'PAYG-S-ORG013-02', vehicleType: 'E-Bike',    price: '₹5', unit: 'Per Minute', status: 'Active', appliesTo: 'All Days' },
          { id: 'PAYG-S-ORG013-03', vehicleType: 'E-Scooter', price: '₹4', unit: 'Per Minute', status: 'Active', appliesTo: 'All Days' },
        ],
      },
    },
    stations: [
      { id: 'ST-ORG013-01', name: 'Charminar Public Hub',     locationPin: '17.3616,78.4747', city: 'Hyderabad', state: 'Telangana', status: 'Active' },
      { id: 'ST-ORG013-02', name: 'Hussain Sagar Lakefront',  locationPin: '17.4126,78.4741', city: 'Hyderabad', state: 'Telangana', status: 'Active' },
      { id: 'ST-ORG013-03', name: 'Banjara Hills Station',    locationPin: '17.4150,78.4479', city: 'Hyderabad', state: 'Telangana', status: 'Active' },
      { id: 'ST-ORG013-04', name: 'Jubilee Hills Plaza',      locationPin: '17.4316,78.4080', city: 'Hyderabad', state: 'Telangana', status: 'Active' },
      { id: 'ST-ORG013-05', name: 'Secunderabad Junction',    locationPin: '17.4374,78.4985', city: 'Hyderabad', state: 'Telangana', status: 'Active' },
    ],
    users: [],
  },
];

// ─────────────────────────────────────────────────────────────────
// 4. OPERATIONAL USERS  →  mos.operations.users.v1
//    (flat list — UsersPage reads this directly)
// ─────────────────────────────────────────────────────────────────
function mkUser(id, empId, name, email, role, orgId, orgName, btId, bt, otId, ot, wallet, coins, joinedDays, rides = 0, completedRides = null, cancelledRides = 0, activeRides = 0) {
  return {
    id, empId, name, email,
    businessTypeId: btId, businessType: bt,
    organizationTypeId: otId, organizationType: ot,
    organizationId: orgId, orgName,
    role, status: 'Active',
    wallet, coins,
    rides, activeRides,
    completedRides: completedRides ?? rides, cancelledRides,
    subscriptions: [], groups: [], achievements: [],
    location: '',
    joined: d(joinedDays),
  };
}

// Usage: mkUser(..., rides, completedRides, cancelledRides, activeRides)
// 1 month active riders: ~2 rides/day × 30 days = ~60 rides
// Campus subscription: coins earned daily (4-12/day) minus spent per ride
// PAYG: wallet decreased per ride; topped up periodically
// Corporate top-up: coins from recharges, ~3 top-ups over the month

export const SEED_USERS = [
  // ── IIT Delhi (Campus Prime / Starter / Premium subscription) ─
  mkUser('MU-0001','IIT-S001','Arjun Sharma',      'arjun.s@iitd.ac.in',    'Student',        'ORG-001','IIT Delhi Tech Campus',          'bt-campus','Campus Mobility','ot-university','University',       '₹360', 185, 75,  63, 59, 3, 1),
  mkUser('MU-0002','IIT-S002','Priya Mehta',        'priya.m@iitd.ac.in',    'Student',        'ORG-001','IIT Delhi Tech Campus',          'bt-campus','Campus Mobility','ot-university','University',       '₹180',  90, 62,  54, 50, 3, 1),
  mkUser('MU-0003','IIT-S003','Kabir Singh',        'kabir.s@iitd.ac.in',    'Student',        'ORG-001','IIT Delhi Tech Campus',          'bt-campus','Campus Mobility','ot-university','University',       '₹420', 220, 58,  67, 63, 3, 1),
  mkUser('MU-0004','IIT-S004','Nivedita Rao',       'niv.r@iitd.ac.in',      'Student',        'ORG-001','IIT Delhi Tech Campus',          'bt-campus','Campus Mobility','ot-university','University',       '₹120',  65, 45,  48, 44, 3, 1),
  mkUser('MU-0005','IIT-S005','Rohan Verma',        'rohan.v@iitd.ac.in',    'Student',        'ORG-001','IIT Delhi Tech Campus',          'bt-campus','Campus Mobility','ot-university','University',       '₹290', 160, 52,  61, 57, 3, 1),
  mkUser('MU-0006','IIT-F001','Dr. Suresh Kumar',   'suresh.k@iitd.ac.in',   'Faculty / Staff','ORG-001','IIT Delhi Tech Campus',          'bt-campus','Campus Mobility','ot-university','University',       '₹520', 280, 80,  35, 33, 1, 1),
  mkUser('MU-0007','IIT-F002','Prof. Anita Joshi',  'anita.j@iitd.ac.in',    'Faculty / Staff','ORG-001','IIT Delhi Tech Campus',          'bt-campus','Campus Mobility','ot-university','University',       '₹450', 260, 72,  32, 30, 1, 1),
  // ── BITS Hyderabad (Campus Prime / Premium subscription) ──────
  mkUser('MU-0008','BITS-S001','Aditya Nair',       'aditya.n@bits-hyd.ac.in','Student',       'ORG-002','BITS Hyderabad Campus',          'bt-campus','Campus Mobility','ot-university','University',       '₹265', 145, 55,  58, 54, 3, 1),
  mkUser('MU-0009','BITS-S002','Sneha Patel',       'sneha.p@bits-hyd.ac.in', 'Student',       'ORG-002','BITS Hyderabad Campus',          'bt-campus','Campus Mobility','ot-university','University',       '₹310', 175, 48,  62, 58, 3, 1),
  mkUser('MU-0010','BITS-S003','Harish Reddy',      'harish.r@bits-hyd.ac.in','Student',       'ORG-002','BITS Hyderabad Campus',          'bt-campus','Campus Mobility','ot-university','University',       '₹185',  98, 42,  50, 46, 3, 1),
  mkUser('MU-0011','BITS-S004','Divya Krishnan',    'divya.k@bits-hyd.ac.in', 'Student',       'ORG-002','BITS Hyderabad Campus',          'bt-campus','Campus Mobility','ot-university','University',       '₹240', 138, 36,  57, 53, 3, 1),
  mkUser('MU-0012','BITS-S005','Kiran Kumar',       'kiran.k@bits-hyd.ac.in', 'Student',       'ORG-002','BITS Hyderabad Campus',          'bt-campus','Campus Mobility','ot-university','University',       '₹380', 205, 40,  65, 61, 3, 1),
  mkUser('MU-0013','BITS-F001','Dr. Meena Pillai',  'meena.p@bits-hyd.ac.in', 'Faculty / Staff','ORG-002','BITS Hyderabad Campus',         'bt-campus','Campus Mobility','ot-university','University',       '₹420', 245, 68,  33, 31, 1, 1),
  mkUser('MU-0014','BITS-F002','Prof. Sunil Das',   'sunil.d@bits-hyd.ac.in', 'Faculty / Staff','ORG-002','BITS Hyderabad Campus',         'bt-campus','Campus Mobility','ot-university','University',       '₹380', 215, 61,  30, 28, 1, 1),
  // ── Amrita Coimbatore (Campus Starter / Prime subscription) ───
  mkUser('MU-0015','AMR-S001','Vikram Subramaniam', 'vikram.s@amrita.edu',    'Student',       'ORG-003','Amrita University Coimbatore',   'bt-campus','Campus Mobility','ot-university','University',       '₹140',  78, 50,  46, 43, 2, 1),
  mkUser('MU-0016','AMR-S002','Lakshmi Sundaram',   'lakshmi.s@amrita.edu',   'Student',       'ORG-003','Amrita University Coimbatore',   'bt-campus','Campus Mobility','ot-university','University',       '₹118',  62, 44,  42, 39, 2, 1),
  mkUser('MU-0017','AMR-S003','Deepak Menon',       'deepak.m@amrita.edu',    'Student',       'ORG-003','Amrita University Coimbatore',   'bt-campus','Campus Mobility','ot-university','University',       '₹225', 128, 38,  54, 50, 3, 1),
  mkUser('MU-0018','AMR-S004','Ananya Iyer',        'ananya.i@amrita.edu',    'Student',       'ORG-003','Amrita University Coimbatore',   'bt-campus','Campus Mobility','ot-university','University',       '₹198', 112, 32,  51, 47, 3, 1),
  mkUser('MU-0019','AMR-F001','Dr. Ravi Shankar',   'ravi.sh@amrita.edu',     'Faculty / Staff','ORG-003','Amrita University Coimbatore',  'bt-campus','Campus Mobility','ot-university','University',       '₹340', 195, 58,  28, 26, 1, 1),
  mkUser('MU-0020','AMR-F002','Dr. Uma Devi',       'uma.d@amrita.edu',       'Faculty / Staff','ORG-003','Amrita University Coimbatore',  'bt-campus','Campus Mobility','ot-university','University',       '₹305', 175, 55,  25, 23, 1, 1),
  // ── VIT Vellore (PAYG — wallet-based, cost-conscious riders) ──
  mkUser('MU-0021','VIT-S001','Sajid Khan',         'sajid.k@vit.ac.in',      'Student',       'ORG-004','VIT Vellore Campus',             'bt-campus','Campus Mobility','ot-university','University',       '₹350',   0, 30,  44, 41, 2, 1),
  mkUser('MU-0022','VIT-S002','Shweta Gupta',       'shweta.g@vit.ac.in',     'Student',       'ORG-004','VIT Vellore Campus',             'bt-campus','Campus Mobility','ot-university','University',       '₹280',   0, 28,  49, 46, 2, 1),
  mkUser('MU-0023','VIT-S003','Rahul Tiwari',       'rahul.t@vit.ac.in',      'Student',       'ORG-004','VIT Vellore Campus',             'bt-campus','Campus Mobility','ot-university','University',       '₹420',   0, 25,  52, 49, 2, 1),
  mkUser('MU-0024','VIT-S004','Anjali Roy',         'anjali.r@vit.ac.in',     'Student',       'ORG-004','VIT Vellore Campus',             'bt-campus','Campus Mobility','ot-university','University',       '₹220',   0, 22,  38, 35, 2, 1),
  mkUser('MU-0025','VIT-F001','Prof. Naresh Babu',  'naresh.b@vit.ac.in',     'Faculty / Staff','ORG-004','VIT Vellore Campus',            'bt-campus','Campus Mobility','ot-university','University',       '₹680',   0, 45,  22, 20, 1, 1),
  // ── Manipal Jaipur (PAYG) ─────────────────────────────────────
  mkUser('MU-0026','MUJ-S001','Chirag Agarwal',     'chirag.a@muj.manipal.edu','Student',      'ORG-005','Manipal University Jaipur',      'bt-campus','Campus Mobility','ot-university','University',       '₹310',   0, 20,  40, 37, 2, 1),
  mkUser('MU-0027','MUJ-S002','Pooja Bhatt',        'pooja.b@muj.manipal.edu', 'Student',      'ORG-005','Manipal University Jaipur',      'bt-campus','Campus Mobility','ot-university','University',       '₹250',   0, 18,  35, 32, 2, 1),
  mkUser('MU-0028','MUJ-S003','Saurabh Pareek',     'saurabh.p@muj.manipal.edu','Student',     'ORG-005','Manipal University Jaipur',      'bt-campus','Campus Mobility','ot-university','University',       '₹390',   0, 15,  46, 43, 2, 1),
  mkUser('MU-0029','MUJ-F001','Dr. Kavita Sharma',  'kavita.s@muj.manipal.edu','Faculty / Staff','ORG-005','Manipal University Jaipur',    'bt-campus','Campus Mobility','ot-university','University',       '₹580',   0, 35,  20, 18, 1, 1),
  // ── Cyberabad Tech Park (Corporate top-up, ~3 recharges) ──────
  mkUser('MU-0030','CYB-E001','Ramana Prasad',      'ramana.p@cyberabad-tp.in','Employee',     'ORG-006','Cyberabad Tech Park',            'bt-corporate','Corporate Mobility','ot-tech-park','Tech Park',   '₹580', 180, 60,  60, 56, 3, 1),
  mkUser('MU-0031','CYB-E002','Swathi Rao',         'swathi.r@cyberabad-tp.in','Employee',     'ORG-006','Cyberabad Tech Park',            'bt-corporate','Corporate Mobility','ot-tech-park','Tech Park',   '₹480', 140, 55,  55, 51, 3, 1),
  mkUser('MU-0032','CYB-E003','Ravi Chandra',       'ravi.c@cyberabad-tp.in',  'Employee',     'ORG-006','Cyberabad Tech Park',            'bt-corporate','Corporate Mobility','ot-tech-park','Tech Park',   '₹520', 165, 50,  58, 54, 3, 1),
  mkUser('MU-0033','CYB-E004','Manasa Reddy',       'manasa.r@cyberabad-tp.in','Employee',     'ORG-006','Cyberabad Tech Park',            'bt-corporate','Corporate Mobility','ot-tech-park','Tech Park',   '₹420', 115, 45,  51, 47, 3, 1),
  mkUser('MU-0034','CYB-A001','Srinivas Kumar',     'srinivas.k@cyberabad-tp.in','Corporate Admin','ORG-006','Cyberabad Tech Park',        'bt-corporate','Corporate Mobility','ot-tech-park','Tech Park',   '₹680', 220, 65,  62, 58, 3, 1),
  // ── Embassy Tech Village Bengaluru (top-up) ───────────────────
  mkUser('MU-0035','ETV-E001','Naveen Krishnamurthy','naveen.k@embassy-tv.in', 'Employee',     'ORG-007','Embassy Tech Village Bengaluru', 'bt-corporate','Corporate Mobility','ot-tech-park','Tech Park',   '₹560', 195, 58,  58, 54, 3, 1),
  mkUser('MU-0036','ETV-E002','Shilpa Gowda',       'shilpa.g@embassy-tv.in',  'Employee',     'ORG-007','Embassy Tech Village Bengaluru', 'bt-corporate','Corporate Mobility','ot-tech-park','Tech Park',   '₹435', 145, 52,  52, 48, 3, 1),
  mkUser('MU-0037','ETV-E003','Prashanth B.V.',     'prashanth@embassy-tv.in', 'Employee',     'ORG-007','Embassy Tech Village Bengaluru', 'bt-corporate','Corporate Mobility','ot-tech-park','Tech Park',   '₹505', 175, 48,  56, 52, 3, 1),
  mkUser('MU-0038','ETV-E004','Deepa Subramanyan',  'deepa.s@embassy-tv.in',   'Employee',     'ORG-007','Embassy Tech Village Bengaluru', 'bt-corporate','Corporate Mobility','ot-tech-park','Tech Park',   '₹380', 108, 44,  48, 44, 3, 1),
  // ── Pune IT Hub (top-up) ──────────────────────────────────────
  mkUser('MU-0039','PIH-E001','Amol Deshmukh',      'amol.d@pune-ithub.in',    'Employee',     'ORG-008','Pune IT Hub',                    'bt-corporate','Corporate Mobility','ot-tech-park','Tech Park',   '₹480', 155, 50,  55, 51, 3, 1),
  mkUser('MU-0040','PIH-E002','Prachi Joshi',       'prachi.j@pune-ithub.in',  'Employee',     'ORG-008','Pune IT Hub',                    'bt-corporate','Corporate Mobility','ot-tech-park','Tech Park',   '₹380', 118, 46,  49, 45, 3, 1),
  mkUser('MU-0041','PIH-E003','Nikhil Kulkarni',    'nikhil.k@pune-ithub.in',  'Employee',     'ORG-008','Pune IT Hub',                    'bt-corporate','Corporate Mobility','ot-tech-park','Tech Park',   '₹550', 195, 42,  59, 55, 3, 1),
  // ── ORR Corporate Tie-ups — Infosys / TCS / Wipro (top-up) ───
  mkUser('MU-0042','INF-E001','Santhosh Naidu',     'santhosh.n@infosys-orr.in','Employee',    'ORG-009','Infosys ORR Campus',             'bt-corporate','Corporate Mobility','ot-company','Corporate Company','₹680', 230, 55, 62, 58, 3, 1),
  mkUser('MU-0043','INF-E002','Archana Bhat',       'archana.b@infosys-orr.in', 'Employee',    'ORG-009','Infosys ORR Campus',             'bt-corporate','Corporate Mobility','ot-company','Corporate Company','₹480', 160, 50, 55, 51, 3, 1),
  mkUser('MU-0044','INF-E003','Karthik Mohan',      'karthik.m@infosys-orr.in','Employee',    'ORG-009','Infosys ORR Campus',             'bt-corporate','Corporate Mobility','ot-company','Corporate Company','₹565', 195, 45, 59, 55, 3, 1),
  mkUser('MU-0045','TCS-E001','Vinay Kasireddy',    'vinay.k@tcs-orr.in',       'Employee',    'ORG-010','TCS ORR Campus',                 'bt-corporate','Corporate Mobility','ot-company','Corporate Company','₹640', 215, 52, 63, 59, 3, 1),
  mkUser('MU-0046','TCS-E002','Mounika Varma',      'mounika.v@tcs-orr.in',     'Employee',    'ORG-010','TCS ORR Campus',                 'bt-corporate','Corporate Mobility','ot-company','Corporate Company','₹420', 140, 48, 52, 48, 3, 1),
  mkUser('MU-0047','TCS-E003','Aravind Sai',        'aravind.s@tcs-orr.in',     'Employee',    'ORG-010','TCS ORR Campus',                 'bt-corporate','Corporate Mobility','ot-company','Corporate Company','₹510', 175, 44, 57, 53, 3, 1),
  mkUser('MU-0048','WIP-E001','Shiva Prasad',       'shiva.p@wipro-orr.in',     'Employee',    'ORG-011','Wipro ORR Campus',               'bt-corporate','Corporate Mobility','ot-company','Corporate Company','₹700', 240, 50, 64, 60, 3, 1),
  mkUser('MU-0049','WIP-E002','Kavya Reddy',        'kavya.r@wipro-orr.in',     'Employee',    'ORG-011','Wipro ORR Campus',               'bt-corporate','Corporate Mobility','ot-company','Corporate Company','₹380', 128, 46, 51, 47, 3, 1),
  mkUser('MU-0050','WIP-E003','Mahesh Goud',        'mahesh.g@wipro-orr.in',    'Employee',    'ORG-011','Wipro ORR Campus',               'bt-corporate','Corporate Mobility','ot-company','Corporate Company','₹465', 158, 42, 53, 49, 3, 1),
  // ── Public Riders (PAYG, casual weekend usage) ────────────────
  mkUser('MU-0051','PUB-001', 'Ritu Singh',         'ritu.s@gmail.com',         'Public Rider','',    'Independent',                       'bt-public','Public / General Mobility','ot-public-zone','Public Zone','₹320',  80, 15, 28, 25, 2, 1),
  mkUser('MU-0052','PUB-002', 'Faiz Ahmed',         'faiz.a@gmail.com',         'Public Rider','',    'Independent',                       'bt-public','Public / General Mobility','ot-public-zone','Public Zone','₹180',  45, 12, 21, 18, 2, 1),
  mkUser('MU-0053','PUB-003', 'Sunita Yadav',       'sunita.y@gmail.com',       'Public Rider','',    'Independent',                       'bt-public','Public / General Mobility','ot-public-zone','Public Zone','₹450', 110, 20, 34, 31, 2, 1),
  mkUser('MU-0054','PUB-004', 'Thomas Varkey',      'thomas.v@gmail.com',       'Public Rider','',    'Independent',                       'bt-public','Public / General Mobility','ot-public-zone','Public Zone','₹265',  65, 10, 24, 21, 2, 1),
  mkUser('MU-0055','PUB-005', 'Nirmala Devi',       'nirmala.d@gmail.com',      'Public Rider','',    'Independent',                       'bt-public','Public / General Mobility','ot-public-zone','Public Zone','₹140',  32,  8, 15, 13, 1, 1),
];

// ─────────────────────────────────────────────────────────────────
// 5. STAFF  →  mos.operations.staff.v1
//    Schema from blankStaff():
//    id, staff_id, name, phone, email, role ('manager'|'driver'),
//    status ('active'|'inactive'),
//    assigned_business_type, assigned_organization_id, assigned_location_id
// ── Groups — formed naturally after 1 month of active riding ─────
export const SEED_GROUPS = [
  {
    id: 'GRP-001', name: 'CycleSync IIT Delhi', members: 4,
    org: 'IIT Delhi Tech Campus', type: 'Rider', status: 'Active',
    founder: 'Arjun Sharma', created: 'Mar 7, 2026',
    description: 'Daily campus commuters on Cycle & E-Bike sharing morning and evening ride schedules.',
    ridesTotal: 245, ridesActive: 4, ridesCompleted: 229, ridesCancelled: 12,
    coEmitted: '-18.4kg',
    membersList: ['Arjun Sharma', 'Kabir Singh', 'Rohan Verma', 'Priya Mehta'],
  },
  {
    id: 'GRP-002', name: 'BITS Sustainability Pod', members: 4,
    org: 'BITS Hyderabad Campus', type: 'Rider', status: 'Active',
    founder: 'Kiran Kumar', created: 'Mar 10, 2026',
    description: 'Green commuters reducing carbon footprint through shared e-bike rides across campus.',
    ridesTotal: 235, ridesActive: 4, ridesCompleted: 219, ridesCancelled: 12,
    coEmitted: '-17.6kg',
    membersList: ['Kiran Kumar', 'Sneha Patel', 'Aditya Nair', 'Harish Reddy'],
  },
  {
    id: 'GRP-003', name: 'ORR Corporate Commuters', members: 7,
    org: 'Infosys ORR Campus', type: 'Rider', status: 'Active',
    founder: 'Santhosh Naidu', created: 'Mar 5, 2026',
    description: 'Cross-company ORR corridor daily commuters from Infosys, TCS, and Wipro campuses.',
    ridesTotal: 370, ridesActive: 3, ridesCompleted: 349, ridesCancelled: 18,
    coEmitted: '-27.8kg',
    membersList: ['Santhosh Naidu', 'Vinay Kasireddy', 'Shiva Prasad', 'Archana Bhat', 'Mounika Varma', 'Kavya Reddy', 'Mahesh Goud'],
  },
  {
    id: 'GRP-004', name: 'Embassy Green Commute', members: 4,
    org: 'Embassy Tech Village Bengaluru', type: 'Rider', status: 'Active',
    founder: 'Naveen Krishnamurthy', created: 'Mar 12, 2026',
    description: 'Sustainable daily commuters at Embassy Tech Village promoting zero-emission mobility.',
    ridesTotal: 214, ridesActive: 4, ridesCompleted: 198, ridesCancelled: 12,
    coEmitted: '-16.1kg',
    membersList: ['Naveen Krishnamurthy', 'Shilpa Gowda', 'Prashanth B.V.', 'Deepa Subramanyan'],
  },
  {
    id: 'GRP-005', name: 'Weekend Warriors Hyderabad', members: 5,
    org: 'Independent', type: 'Rider', status: 'Active',
    founder: 'Sunita Yadav', created: 'Mar 15, 2026',
    description: 'Public PAYG riders exploring Hyderabad city routes and heritage trails on weekends.',
    ridesTotal: 122, ridesActive: 1, ridesCompleted: 108, ridesCancelled: 9,
    coEmitted: '-9.2kg',
    membersList: ['Sunita Yadav', 'Ritu Singh', 'Faiz Ahmed', 'Thomas Varkey', 'Nirmala Devi'],
  },
  {
    id: 'GRP-006', name: 'Amrita ECO Cyclists', members: 4,
    org: 'Amrita University Coimbatore', type: 'Rider', status: 'Active',
    founder: 'Deepak Menon', created: 'Mar 18, 2026',
    description: 'Eco-conscious cyclists and e-bike riders promoting green campus mobility at Amrita.',
    ridesTotal: 193, ridesActive: 4, ridesCompleted: 179, ridesCancelled: 9,
    coEmitted: '-14.5kg',
    membersList: ['Deepak Menon', 'Ananya Iyer', 'Vikram Subramaniam', 'Lakshmi Sundaram'],
  },
];

// ─────────────────────────────────────────────────────────────────
function mkStaff(id, staffId, name, email, phone, role, btId, orgId, locId) {
  return { id, staff_id: staffId, name, email, phone, role, status: 'active', assigned_business_type: btId, assigned_organization_id: orgId, assigned_location_id: locId };
}

export const SEED_STAFF = [
  mkStaff('STF-001','STF_0001','Rajan Nair',      'rajan.n@mos.io',      '9811100001','manager','bt-campus',   'ORG-001','LOC-001'),
  mkStaff('STF-002','STF_0002','Geeta Sharma',    'geeta.s@mos.io',      '9811100002','manager','bt-campus',   'ORG-002','LOC-002'),
  mkStaff('STF-003','STF_0003','Muthu Kumar',     'muthu.k@mos.io',      '9842100003','manager','bt-campus',   'ORG-003','LOC-003'),
  mkStaff('STF-004','STF_0004','Pradeep Yadav',   'pradeep.y@mos.io',    '9842100004','manager','bt-campus',   'ORG-004','LOC-004'),
  mkStaff('STF-005','STF_0005','Suneel Babu',     'suneel.b@mos.io',     '9829100005','manager','bt-campus',   'ORG-005','LOC-005'),
  mkStaff('STF-006','STF_0006','Venkat Rao',      'venkat.r@mos.io',     '9912100006','manager','bt-corporate','ORG-006','LOC-006'),
  mkStaff('STF-007','STF_0007','Preethi Iyer',    'preethi.i@mos.io',    '9900100007','manager','bt-corporate','ORG-007','LOC-007'),
  mkStaff('STF-008','STF_0008','Arun Pawar',      'arun.p@mos.io',       '9890100008','manager','bt-corporate','ORG-008','LOC-008'),
  mkStaff('STF-009','STF_0009','Suresh Gupta',    'suresh.g@mos.io',     '9912100009','manager','bt-public',   'ORG-012','LOC-009'),
  mkStaff('STF-010','STF_0010','Bhavani Devi',    'bhavani.d@mos.io',    '9912100010','manager','bt-public',   'ORG-013','LOC-010'),
  // Drivers for Buggy-equipped orgs
  mkStaff('STF-011','STF_0011','Rajiv Kumar',     'rajiv.k@mos.io',      '9811100011','driver','bt-campus',   'ORG-001','LOC-001'),
  mkStaff('STF-012','STF_0012','Murugan S.',      'murugan.s@mos.io',    '9842100012','driver','bt-campus',   'ORG-003','LOC-003'),
  mkStaff('STF-013','STF_0013','Wasim Khan',      'wasim.k@mos.io',      '9912100013','driver','bt-corporate','ORG-006','LOC-006'),
  mkStaff('STF-014','STF_0014','Suresh Naidu',    'suresh.n@mos.io',     '9912100014','driver','bt-corporate','ORG-007','LOC-007'),
];

// ─────────────────────────────────────────────────────────────────
// 6. LOCATIONS  →  mos.operations.locations.v1
//    Schema from defaultLocation(): id, sourceType, businessTypeId,
//    businessType, name, description, state, city, vehicles{},
//    revenue, health, status, stations[], stationDisplayCount
// ─────────────────────────────────────────────────────────────────
function mkLocation(id, btId, bt, name, desc, city, state, stations, vehicleByType) {
  const statusByType = {};
  Object.entries(vehicleByType).forEach(([type, count]) => {
    const running = Math.max(0, Math.floor(count * 0.15));
    const maint   = Math.max(0, Math.floor(count * 0.08));
    const avail   = count - running - maint;
    statusByType[type] = { Available: avail, Running: running, Maintenance: maint };
  });
  const total = Object.values(vehicleByType).reduce((s, c) => s + c, 0);
  return {
    id, sourceType: 'manual', businessTypeId: btId, businessType: bt,
    stateLocationId: '', cityLocationId: '',
    name, description: desc, city, state,
    revenue: '₹0', health: 'Good', status: 'Active',
    stations,
    stationDisplayCount: stations.length,
    vehicles: {
      total,
      byType: vehicleByType,
      statusByType,
      statusTotals: {
        Available: Object.values(statusByType).reduce((s, p) => s + p.Available, 0),
        Running:   Object.values(statusByType).reduce((s, p) => s + p.Running,   0),
        Maintenance: Object.values(statusByType).reduce((s, p) => s + p.Maintenance, 0),
      },
    },
  };
}

export const SEED_LOCATIONS = [
  mkLocation('LOC-001','bt-campus',   'Campus Mobility',           'IIT Delhi Tech Campus',           'Campus mobility hub for IIT Delhi.',                 'New Delhi',  'Delhi',
    [{ id: 'ST-ORG001-01', name: 'Main Gate',       locationPin: '28.5456,77.1926', city: 'New Delhi', state: 'Delhi',      status: 'Active' },
     { id: 'ST-ORG001-02', name: 'Library Hub',     locationPin: '28.5462,77.1935', city: 'New Delhi', state: 'Delhi',      status: 'Active' }],
    { Cycle: 20, 'E-Bike': 10, Buggy: 4 }),

  mkLocation('LOC-002','bt-campus',   'Campus Mobility',           'BITS Hyderabad Campus',           'Campus mobility hub for BITS Pilani Hyderabad.',     'Hyderabad',  'Telangana',
    [{ id: 'ST-ORG002-01', name: 'Academic Block',  locationPin: '17.5406,78.5719', city: 'Hyderabad', state: 'Telangana',  status: 'Active' },
     { id: 'ST-ORG002-02', name: 'Hostel Zone',     locationPin: '17.5412,78.5731', city: 'Hyderabad', state: 'Telangana',  status: 'Active' }],
    { Cycle: 18, 'E-Bike': 10, 'E-Scooter': 6 }),

  mkLocation('LOC-003','bt-campus',   'Campus Mobility',           'Amrita University Coimbatore',    'Campus mobility hub for Amrita University.',          'Coimbatore', 'Tamil Nadu',
    [{ id: 'ST-ORG003-01', name: 'Engineering Block',locationPin: '10.9037,76.9014', city: 'Coimbatore', state: 'Tamil Nadu', status: 'Active' },
     { id: 'ST-ORG003-02', name: 'Students Canteen', locationPin: '10.9042,76.9020', city: 'Coimbatore', state: 'Tamil Nadu', status: 'Active' }],
    { Cycle: 15, 'E-Bike': 8 }),

  mkLocation('LOC-004','bt-campus',   'Campus Mobility',           'VIT Vellore Campus',              'Campus PAYG mobility hub for VIT Vellore.',           'Vellore',    'Tamil Nadu',
    [{ id: 'ST-ORG004-01', name: 'Tech Tower Gate', locationPin: '12.9695,79.1559', city: 'Vellore',    state: 'Tamil Nadu', status: 'Active' },
     { id: 'ST-ORG004-02', name: 'MG Hostel Block', locationPin: '12.9701,79.1567', city: 'Vellore',    state: 'Tamil Nadu', status: 'Active' }],
    { Cycle: 15, 'E-Bike': 10, 'E-Scooter': 5 }),

  mkLocation('LOC-005','bt-campus',   'Campus Mobility',           'Manipal University Jaipur',       'Campus PAYG mobility hub for Manipal Jaipur.',        'Jaipur',     'Rajasthan',
    [{ id: 'ST-ORG005-01', name: 'Main Entrance',   locationPin: '26.8873,75.8056', city: 'Jaipur',     state: 'Rajasthan',  status: 'Active' },
     { id: 'ST-ORG005-02', name: 'Sports Arena Hub',locationPin: '26.8880,75.8062', city: 'Jaipur',     state: 'Rajasthan',  status: 'Active' }],
    { Cycle: 12, 'E-Bike': 8 }),

  mkLocation('LOC-006','bt-corporate','Corporate Mobility',         'Cyberabad Tech Park',             'Multi-company tech park mobility, HITECH City.',     'Hyderabad',  'Telangana',
    [{ id: 'ST-ORG006-01', name: 'HITECH Entry Gate',locationPin: '17.4486,78.3908', city: 'Hyderabad', state: 'Telangana',  status: 'Active' },
     { id: 'ST-ORG006-02', name: 'Tower B Lobby',    locationPin: '17.4492,78.3916', city: 'Hyderabad', state: 'Telangana',  status: 'Active' },
     { id: 'ST-ORG006-03', name: 'Food Court Hub',   locationPin: '17.4479,78.3924', city: 'Hyderabad', state: 'Telangana',  status: 'Active' }],
    { 'E-Bike': 20, 'E-Scooter': 10, Buggy: 4 }),

  mkLocation('LOC-007','bt-corporate','Corporate Mobility',         'Embassy Tech Village Bengaluru',  'ORR-adjacent tech village mobility, Bellandur.',     'Bengaluru',  'Karnataka',
    [{ id: 'ST-ORG007-01', name: 'North Wing Entrance',locationPin: '12.9305,77.6899', city: 'Bengaluru', state: 'Karnataka', status: 'Active' },
     { id: 'ST-ORG007-02', name: 'Shuttle Hub Plaza',  locationPin: '12.9311,77.6912', city: 'Bengaluru', state: 'Karnataka', status: 'Active' },
     { id: 'ST-ORG007-03', name: 'Cafeteria Block',    locationPin: '12.9329,77.6891', city: 'Bengaluru', state: 'Karnataka', status: 'Active' }],
    { 'E-Bike': 18, 'E-Scooter': 8, Buggy: 3 }),

  mkLocation('LOC-008','bt-corporate','Corporate Mobility',         'Pune IT Hub',                     'Hinjewadi Phase II tech park mobility.',             'Pune',       'Maharashtra',
    [{ id: 'ST-ORG008-01', name: 'Phase II East Gate', locationPin: '18.5933,73.7380', city: 'Pune',    state: 'Maharashtra',status: 'Active' },
     { id: 'ST-ORG008-02', name: 'Central Food Plaza', locationPin: '18.5940,73.7392', city: 'Pune',    state: 'Maharashtra',status: 'Active' }],
    { Cycle: 10, 'E-Bike': 14, 'E-Scooter': 6 }),

  mkLocation('LOC-009','bt-public',   'Public / General Mobility', 'ORR Cycling Track Hyderabad',     '3-station dedicated cycling track along ORR.',       'Hyderabad',  'Telangana',
    [{ id: 'ST-ORG012-01', name: 'ORR Gachibowli Entry', locationPin: '17.4468,78.3530', city: 'Hyderabad', state: 'Telangana', status: 'Active' },
     { id: 'ST-ORG012-02', name: 'ORR Mid Track Point',  locationPin: '17.4481,78.3547', city: 'Hyderabad', state: 'Telangana', status: 'Active' },
     { id: 'ST-ORG012-03', name: 'ORR East Finish Gate', locationPin: '17.4496,78.3562', city: 'Hyderabad', state: 'Telangana', status: 'Active' }],
    { Cycle: 20, 'E-Bike': 10 }),

  mkLocation('LOC-010','bt-public',   'Public / General Mobility', 'Hyderabad Public Mobility Zone',  'Pan-city open access zones across Hyderabad.',      'Hyderabad',  'Telangana',
    [{ id: 'ST-ORG013-01', name: 'Charminar Public Hub',   locationPin: '17.3616,78.4747', city: 'Hyderabad', state: 'Telangana', status: 'Active' },
     { id: 'ST-ORG013-02', name: 'Hussain Sagar Lakefront',locationPin: '17.4126,78.4741', city: 'Hyderabad', state: 'Telangana', status: 'Active' },
     { id: 'ST-ORG013-03', name: 'Banjara Hills Station',  locationPin: '17.4150,78.4479', city: 'Hyderabad', state: 'Telangana', status: 'Active' },
     { id: 'ST-ORG013-04', name: 'Jubilee Hills Plaza',    locationPin: '17.4316,78.4080', city: 'Hyderabad', state: 'Telangana', status: 'Active' },
     { id: 'ST-ORG013-05', name: 'Secunderabad Junction',  locationPin: '17.4374,78.4985', city: 'Hyderabad', state: 'Telangana', status: 'Active' }],
    { Cycle: 80, 'E-Bike': 50, 'E-Scooter': 20 }),
];

// ─────────────────────────────────────────────────────────────────
// 7. FLEET ROWS  →  mos-fleet-rows-v1
//    Schema from handleCreate():
//    id, qr, type, seats, driverApplicable, biz, org,
//    location, locationPin, status, locked (bool)
// ─────────────────────────────────────────────────────────────────
const VEHICLE_META = {
  Cycle:      { seats: 1, driverApplicable: false },
  'E-Bike':   { seats: 1, driverApplicable: false },
  'E-Scooter':{ seats: 1, driverApplicable: false },
  Buggy:      { seats: 4, driverApplicable: true  },
  'E-Buggy':  { seats: 6, driverApplicable: true  },
};

function buildFleet(startIdx, type, count, biz, org, locationName, locationPin, statusDist = { Active: 0.75, Maintenance: 0.1, Offline: 0.15 }) {
  return Array.from({ length: count }, (_, i) => {
    const idx = startIdx + i;
    const r = Math.random();
    const status = r < statusDist.Active ? 'Active' : r < statusDist.Active + statusDist.Maintenance ? 'Maintenance' : 'Offline';
    const meta = VEHICLE_META[type] || { seats: 1, driverApplicable: false };
    return {
      id: `VH-${String(idx).padStart(4, '0')}`,
      qr: `QR-${4400 + idx}`,
      type, seats: meta.seats, driverApplicable: meta.driverApplicable,
      biz, org, location: locationName, locationPin,
      status, locked: false,
    };
  });
}

// Build fleet per location/station
const fleetBatches = [
  // IIT Delhi — Main Gate (10 Cycles) + Library Hub (10 Cycles + 5 E-Bikes + 2 Buggies)
  ...buildFleet(  1,'Cycle',  10,'Campus Mobility','IIT Delhi Tech Campus','Main Gate',       '28.5456,77.1926'),
  ...buildFleet( 11,'Cycle',  10,'Campus Mobility','IIT Delhi Tech Campus','Library Hub',     '28.5462,77.1935'),
  ...buildFleet( 21,'E-Bike',  5,'Campus Mobility','IIT Delhi Tech Campus','Library Hub',     '28.5462,77.1935'),
  ...buildFleet( 26,'Buggy',   2,'Campus Mobility','IIT Delhi Tech Campus','Main Gate',       '28.5456,77.1926'),
  // BITS Hyderabad (10 Cycles + 6 E-Bikes + 3 E-Scooters × 2 stations)
  ...buildFleet( 28,'Cycle',  10,'Campus Mobility','BITS Hyderabad Campus','Academic Block',  '17.5406,78.5719'),
  ...buildFleet( 38,'E-Bike',  6,'Campus Mobility','BITS Hyderabad Campus','Academic Block',  '17.5406,78.5719'),
  ...buildFleet( 44,'Cycle',   8,'Campus Mobility','BITS Hyderabad Campus','Hostel Zone',     '17.5412,78.5731'),
  ...buildFleet( 52,'E-Scooter',3,'Campus Mobility','BITS Hyderabad Campus','Hostel Zone',    '17.5412,78.5731'),
  // Amrita Coimbatore (8 Cycles + 4 E-Bikes per station)
  ...buildFleet( 55,'Cycle',   8,'Campus Mobility','Amrita University Coimbatore','Engineering Block','10.9037,76.9014'),
  ...buildFleet( 63,'E-Bike',  4,'Campus Mobility','Amrita University Coimbatore','Engineering Block','10.9037,76.9014'),
  ...buildFleet( 67,'Cycle',   7,'Campus Mobility','Amrita University Coimbatore','Students Canteen', '10.9042,76.9020'),
  ...buildFleet( 74,'E-Bike',  4,'Campus Mobility','Amrita University Coimbatore','Students Canteen', '10.9042,76.9020'),
  // VIT Vellore (8 Cycles + 5 E-Bikes + 3 E-Scooters per station)
  ...buildFleet( 78,'Cycle',   8,'Campus Mobility','VIT Vellore Campus','Tech Tower Gate','12.9695,79.1559'),
  ...buildFleet( 86,'E-Bike',  5,'Campus Mobility','VIT Vellore Campus','Tech Tower Gate','12.9695,79.1559'),
  ...buildFleet( 91,'Cycle',   7,'Campus Mobility','VIT Vellore Campus','MG Hostel Block','12.9701,79.1567'),
  ...buildFleet( 98,'E-Scooter',3,'Campus Mobility','VIT Vellore Campus','MG Hostel Block','12.9701,79.1567'),
  // Manipal Jaipur (6 Cycles + 4 E-Bikes per station)
  ...buildFleet(101,'Cycle',   6,'Campus Mobility','Manipal University Jaipur','Main Entrance',   '26.8873,75.8056'),
  ...buildFleet(107,'E-Bike',  4,'Campus Mobility','Manipal University Jaipur','Main Entrance',   '26.8873,75.8056'),
  ...buildFleet(111,'Cycle',   6,'Campus Mobility','Manipal University Jaipur','Sports Arena Hub','26.8880,75.8062'),
  ...buildFleet(117,'E-Bike',  4,'Campus Mobility','Manipal University Jaipur','Sports Arena Hub','26.8880,75.8062'),
  // Cyberabad Tech Park (7 E-Bikes + 4 E-Scooters per station, 2 Buggies at Entry)
  ...buildFleet(121,'E-Bike',  7,'Corporate Mobility','Cyberabad Tech Park','HITECH Entry Gate','17.4486,78.3908'),
  ...buildFleet(128,'E-Scooter',4,'Corporate Mobility','Cyberabad Tech Park','HITECH Entry Gate','17.4486,78.3908'),
  ...buildFleet(132,'Buggy',   2,'Corporate Mobility','Cyberabad Tech Park','HITECH Entry Gate','17.4486,78.3908'),
  ...buildFleet(134,'E-Bike',  7,'Corporate Mobility','Cyberabad Tech Park','Tower B Lobby',   '17.4492,78.3916'),
  ...buildFleet(141,'E-Scooter',3,'Corporate Mobility','Cyberabad Tech Park','Tower B Lobby',  '17.4492,78.3916'),
  ...buildFleet(144,'E-Bike',  6,'Corporate Mobility','Cyberabad Tech Park','Food Court Hub',  '17.4479,78.3924'),
  ...buildFleet(150,'E-Scooter',3,'Corporate Mobility','Cyberabad Tech Park','Food Court Hub', '17.4479,78.3924'),
  // Embassy Tech Village BLR (6 E-Bikes + 3 E-Scooters per station)
  ...buildFleet(153,'E-Bike',  6,'Corporate Mobility','Embassy Tech Village Bengaluru','North Wing Entrance','12.9305,77.6899'),
  ...buildFleet(159,'E-Scooter',3,'Corporate Mobility','Embassy Tech Village Bengaluru','North Wing Entrance','12.9305,77.6899'),
  ...buildFleet(162,'Buggy',   2,'Corporate Mobility','Embassy Tech Village Bengaluru','Shuttle Hub Plaza', '12.9311,77.6912'),
  ...buildFleet(164,'E-Bike',  6,'Corporate Mobility','Embassy Tech Village Bengaluru','Shuttle Hub Plaza', '12.9311,77.6912'),
  ...buildFleet(170,'E-Bike',  6,'Corporate Mobility','Embassy Tech Village Bengaluru','Cafeteria Block',   '12.9329,77.6891'),
  ...buildFleet(176,'E-Scooter',2,'Corporate Mobility','Embassy Tech Village Bengaluru','Cafeteria Block',  '12.9329,77.6891'),
  // Pune IT Hub (5 Cycles + 5 E-Bikes + 3 E-Scooters per station)
  ...buildFleet(178,'Cycle',   5,'Corporate Mobility','Pune IT Hub','Phase II East Gate','18.5933,73.7380'),
  ...buildFleet(183,'E-Bike',  5,'Corporate Mobility','Pune IT Hub','Phase II East Gate','18.5933,73.7380'),
  ...buildFleet(188,'E-Scooter',3,'Corporate Mobility','Pune IT Hub','Phase II East Gate','18.5933,73.7380'),
  ...buildFleet(191,'Cycle',   5,'Corporate Mobility','Pune IT Hub','Central Food Plaza','18.5940,73.7392'),
  ...buildFleet(196,'E-Bike',  5,'Corporate Mobility','Pune IT Hub','Central Food Plaza','18.5940,73.7392'),
  ...buildFleet(201,'E-Scooter',3,'Corporate Mobility','Pune IT Hub','Central Food Plaza','18.5940,73.7392'),
  // Infosys ORR (5 Cycles + 5 E-Bikes per station)
  ...buildFleet(204,'Cycle',   5,'Corporate Mobility','Infosys ORR Campus','Infy Gate 1 – ORR', '17.4410,78.3484'),
  ...buildFleet(209,'E-Bike',  5,'Corporate Mobility','Infosys ORR Campus','Infy Gate 1 – ORR', '17.4410,78.3484'),
  ...buildFleet(214,'Cycle',   3,'Corporate Mobility','Infosys ORR Campus','Infy Campus South', '17.4418,78.3492'),
  ...buildFleet(217,'E-Bike',  3,'Corporate Mobility','Infosys ORR Campus','Infy Campus South', '17.4418,78.3492'),
  // TCS ORR (5 Cycles + 5 E-Bikes per station)
  ...buildFleet(220,'Cycle',   5,'Corporate Mobility','TCS ORR Campus','TCS Synergy Block','17.4432,78.3498'),
  ...buildFleet(225,'E-Bike',  5,'Corporate Mobility','TCS ORR Campus','TCS Synergy Block','17.4432,78.3498'),
  ...buildFleet(230,'Cycle',   3,'Corporate Mobility','TCS ORR Campus','TCS Sports Arena','17.4439,78.3502'),
  ...buildFleet(233,'E-Bike',  3,'Corporate Mobility','TCS ORR Campus','TCS Sports Arena','17.4439,78.3502'),
  // Wipro ORR (5 Cycles + 5 E-Bikes per station)
  ...buildFleet(236,'Cycle',   5,'Corporate Mobility','Wipro ORR Campus','Wipro East Lobby','17.4453,78.3511'),
  ...buildFleet(241,'E-Bike',  5,'Corporate Mobility','Wipro ORR Campus','Wipro East Lobby','17.4453,78.3511'),
  ...buildFleet(246,'Cycle',   3,'Corporate Mobility','Wipro ORR Campus','Wipro West Wing', '17.4460,78.3520'),
  ...buildFleet(249,'E-Bike',  3,'Corporate Mobility','Wipro ORR Campus','Wipro West Wing', '17.4460,78.3520'),
  // ORR Cycling Track (10 Cycles per station = 30 bikes)
  ...buildFleet(252,'Cycle',  10,'Public / General Mobility','ORR Cycling Track Hyderabad','ORR Gachibowli Entry','17.4468,78.3530'),
  ...buildFleet(262,'Cycle',  10,'Public / General Mobility','ORR Cycling Track Hyderabad','ORR Mid Track Point', '17.4481,78.3547'),
  ...buildFleet(272,'Cycle',  10,'Public / General Mobility','ORR Cycling Track Hyderabad','ORR East Finish Gate','17.4496,78.3562'),
  // Public Zone Hyderabad (10 Cycles + 5 E-Bikes + 3 E-Scooters per station × 5 stations)
  ...buildFleet(282,'Cycle',  10,'Public / General Mobility','Hyderabad Public Mobility Zone','Charminar Public Hub',   '17.3616,78.4747'),
  ...buildFleet(292,'E-Bike',  5,'Public / General Mobility','Hyderabad Public Mobility Zone','Charminar Public Hub',   '17.3616,78.4747'),
  ...buildFleet(297,'E-Scooter',3,'Public / General Mobility','Hyderabad Public Mobility Zone','Charminar Public Hub',  '17.3616,78.4747'),
  ...buildFleet(300,'Cycle',  10,'Public / General Mobility','Hyderabad Public Mobility Zone','Hussain Sagar Lakefront','17.4126,78.4741'),
  ...buildFleet(310,'E-Bike',  5,'Public / General Mobility','Hyderabad Public Mobility Zone','Hussain Sagar Lakefront','17.4126,78.4741'),
  ...buildFleet(315,'E-Scooter',3,'Public / General Mobility','Hyderabad Public Mobility Zone','Hussain Sagar Lakefront','17.4126,78.4741'),
  ...buildFleet(318,'Cycle',  10,'Public / General Mobility','Hyderabad Public Mobility Zone','Banjara Hills Station',  '17.4150,78.4479'),
  ...buildFleet(328,'E-Bike',  5,'Public / General Mobility','Hyderabad Public Mobility Zone','Banjara Hills Station',  '17.4150,78.4479'),
  ...buildFleet(333,'Cycle',  10,'Public / General Mobility','Hyderabad Public Mobility Zone','Jubilee Hills Plaza',    '17.4316,78.4080'),
  ...buildFleet(343,'E-Bike',  5,'Public / General Mobility','Hyderabad Public Mobility Zone','Jubilee Hills Plaza',    '17.4316,78.4080'),
  ...buildFleet(348,'Cycle',  10,'Public / General Mobility','Hyderabad Public Mobility Zone','Secunderabad Junction',  '17.4374,78.4985'),
  ...buildFleet(358,'E-Bike',  5,'Public / General Mobility','Hyderabad Public Mobility Zone','Secunderabad Junction',  '17.4374,78.4985'),
  ...buildFleet(363,'E-Scooter',5,'Public / General Mobility','Hyderabad Public Mobility Zone','Secunderabad Junction', '17.4374,78.4985'),
];

export const SEED_FLEET = fleetBatches;

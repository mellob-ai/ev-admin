/* ──────────────────────────────────────────────────────────────
 * Backend Model Types — mirror the Go structs
 * ────────────────────────────────────────────────────────────── */

// ── User ────────────────────────────────────────────────────
export interface ApiUser {
  uid: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  avatar: string;
  type: string;
  organization_id: string;
  weight: string;
  points: number;
  status?: string;
  created_at?: string;
}

// ── Bike ────────────────────────────────────────────────────
export interface ApiBike {
  id: string;
  frame_number: string;
  name: string;
  images: string[];
  station_id: string;
  top_speed: number;
  range: number;
  time_to_station: number;
  bike_type: string;
  status?: string;
}

// ── Subscription ────────────────────────────────────────────
export interface ApiSubscription {
  id: string;
  name: string;
  description: string;
  target_type: string;
  pricing_model: string;
  organization_id: string;
  price: number;
  coins_included: number;
  daily_time_limit_mins: number;
  duration_days: number;
  security_deposit: number;
  carry_forward_coins: boolean;
  carry_forward_time: boolean;
  location: string;
  features: string[];
  included_modes: string[];
  popular: boolean;
  is_active: boolean;
  created_at?: string;
}

// ── Trip ────────────────────────────────────────────────────
export interface ApiTrip {
  id: string;
  user_id: string;
  bike_id: string;
  station_id: string;
  access_mode: string;
  subscription_id: string;
  start_timestamp: string;
  end_timestamp: string;
  distance: number;
  duration: number;
  average_speed: number;
  path: Array<{ lat: number; long: number; elevation?: number }>;
  max_elevation: number;
  kcal: number;
  status: string;
}

// ── Station ─────────────────────────────────────────────────
export interface ApiStation {
  id: string;
  name: string;
  location_latitude: string;
  location_longitude: string;
  capacity: number;
  current_capacity: number;
  subscription_ids: Record<string, unknown>;
}

// ── B2B (Organization) ──────────────────────────────────────
export interface ApiB2B {
  id: string;
  name: string;
  description: string;
  city: string;
  logo: string;
  banner: string;
  is_active: boolean;
  created_at?: string;
  type: string;
}

// ── Group ───────────────────────────────────────────────────
export interface ApiGroup {
  id: string;
  name: string;
  description: string;
  created_at: string;
  created_by: string;
  group_image: string;
  category: string;
  visibility: string;
  member_count?: number;
}

// ── Wallet ──────────────────────────────────────────────────
export interface ApiWallet {
  user_id: string;
  balance: number;
}

// ── Transaction ─────────────────────────────────────────────
export interface ApiTransaction {
  id: string;
  user_id: string;
  amount: number;
  description: string;
  type: 'CREDIT' | 'DEBIT';
  timestamp: string;
}

// ── Pricing Rule ────────────────────────────────────────────
export interface ApiPricingRule {
  id: string;
  subscription_id: string;
  rule_type: string;
  min_minutes: number;
  max_minutes: number;
  rate_per_minute: number;
  flat_charge: number;
  charge_percent: number;
  buffer_minutes: number;
  priority: number;
  is_active: boolean;
}

/* ──────────────────────────────────────────────────────────────
 * Frontend Row Types — used by pages / tables
 * ────────────────────────────────────────────────────────────── */

export interface UserRow {
  id: string;
  apiId: string;
  empId: string;
  name: string;
  phone: string;
  email: string;
  avatar: string;
  role: string;
  status: string;
  joined: string;
  businessType: string;
  orgType: string;
  orgName: string;
  organizationId: string;
  wallet: string;
  coins: number;
  rides: number;
  activeRides: number;
  completedRides: number;
  cancelledRides: number;
  subscriptions: string[];
  groups: string[];
  location: string;
  achievements: string[];
  weight: string;
  points: number;
}

export interface VehicleRow {
  id: string;
  apiId: string;
  qr: string;
  type: string;
  biz: string;
  org: string;
  location: string;
  locationPin: string;
  status: string;
  locked: boolean;
  seats: number;
  name: string;
  frameNumber: string;
  topSpeed: number;
  range: number;
  timeToStation: number;
  stationId: string;
  images: string[];
}

export interface SubscriptionRow {
  id: string;
  apiId: string;
  type: string;
  name: string;
  description: string;
  price: string;
  priceRaw: number;
  validity: string;
  validityDays: number;
  vehicles: string[];
  coins: number;
  daily: number;
  limit: number;
  status: string;
  targetType: string;
  organizationId: string;
  securityDeposit: number;
  carryForwardCoins: boolean;
  carryForwardTime: boolean;
  location: string;
  features: string[];
  popular: boolean;
}

export interface RideRow {
  id: string;
  apiId: string;
  user: string;
  vehicle: string;
  start: string;
  duration: string;
  org: string;
  status: string;
  rideDate: string;
  pickupLoc: string;
  dropoffLoc: string;
  distance: string;
  fare: string;
  paymentMethod: string;
  startTime: string;
  endTime: string;
  estimatedEnd: string;
  temperature: string;
  co2Saved: string;
  rating: number;
  vehicleType: string;
  licensePlate: string;
  driverName: string;
  driverRating: number | null;
  route: string;
  stops: number;
  notes: string;
  feedback: string;
  averageSpeed: number;
  maxElevation: number;
  kcal: number;
  userId: string;
  bikeId: string;
  stationId: string;
  subscriptionId: string;
}

export interface TripRow {
  id: string;
  apiId: string;
  userId: string;
  bikeId: string;
  stationId: string;
  status: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: string;
  durationHrs: number;
  distance: string;
  distanceKm: number;
  averageSpeed: number;
  maxElevation: number;
  kcal: number;
  accessMode: string;
  subscriptionId: string;
}

export interface GroupRow {
  id: string;
  apiId: string;
  name: string;
  description: string;
  category: string;
  visibility: string;
  createdAt: string;
  createdBy: string;
  groupImage: string;
  memberCount: number;
}

export interface StationRow {
  id: string;
  apiId: string;
  name: string;
  latitude: string;
  longitude: string;
  coordinates: string;
  capacity: number;
  currentCapacity: number;
  subscriptionIds: Record<string, unknown>;
}

export interface OrganizationRow {
  id: string;
  apiId: string;
  name: string;
  description: string;
  city: string;
  logo: string;
  banner: string;
  type: string;
  status: string;
  createdAt: string;
}

export interface WalletRow {
  userId: string;
  balance: number;
  balanceLabel: string;
}

export interface TransactionRow {
  id: string;
  userId: string;
  amount: number;
  amountLabel: string;
  description: string;
  type: string;
  timestamp: string;
  dateLabel: string;
}

export interface PricingRow {
  id: string;
  apiId: string;
  name: string;
  type: string;
  ruleType: string;
  subscriptionId: string;
  minMinutes: number;
  maxMinutes: number;
  ratePerMinute: number;
  flatCharge: number;
  chargePercent: number;
  bufferMinutes: number;
  priority: number;
  status: string;
  simpleRates?: Record<string, Record<string, string>>;
  advanceRates?: Record<string, Record<string, string>>;
}

export interface StaffRow {
  id: string;
  staff_id: string;
  name: string;
  phone: string;
  email: string;
  role: string;
  status: string;
  assigned_business_type: string;
  assigned_organization_id: string;
  assigned_location_id: string;
  created_at: string;
  updated_at: string;
  apiId: string;
}

export interface DashboardStats {
  totalUsers: number;
  totalTrips: number;
  activeTrips: number;
  completedTrips: number;
  totalDistanceKm: number;
  totalDurationHrs: number;
  totalVehicles: number;
  totalStations: number;
  totalGroups: number;
  totalSubscriptions: number;
  totalOrganizations: number;
}

/* ──────────────────────────────────────────────────────────────
 * Form Types
 * ────────────────────────────────────────────────────────────── */

export interface CreateUserForm {
  name: string;
  email: string;
  phone?: string;
  empId?: string;
  businessTypeId?: string;
  organizationTypeId?: string;
  organizationId?: string;
  role?: string;
  status?: string;
}

/* ──────────────────────────────────────────────────────────────
 * Achievement Types
 * ────────────────────────────────────────────────────────────── */

export interface AchievementRow {
  id: string;
  apiId: string;
  title: string;
  description: string;
  category: string;
  icon: string;
  colorHex: string;
  thresholdLabel: string;
  active: boolean;
}


export const FEATURE_NAV_ITEMS = [
  // ── Overview ──
  { section: 'Overview' },
  { page: 'dashboard',    label: 'Dashboard',  icon: 'fa-gauge-high' },
  { page: 'analytics',   label: 'Analytics',  icon: 'fa-chart-line' },
  { page: 'reports',     label: 'Reports',    icon: 'fa-file-lines' },
  { page: 'activity',    label: 'Activity',   icon: 'fa-chart-area' },

  // ── Operations ──
  { section: 'Operations' },
  { page: 'rides',       label: 'Rides',      icon: 'fa-route' },
  { page: 'trips',       label: 'Trip History', icon: 'fa-road' },
  { page: 'vehicles',    label: 'Vehicles',   icon: 'fa-bicycle' },

  // ── Users & Community ──
  { section: 'Users & Community' },
  { page: 'users',        label: 'Users',        icon: 'fa-users' },
  { page: 'staff',        label: 'Staff',        icon: 'fa-id-card' },
  { page: 'groups',       label: 'Groups',       icon: 'fa-people-group' },
  { page: 'messages',     label: 'Messages',     icon: 'fa-envelope', badge: '3' },
  { page: 'achievements', label: 'Achievements', icon: 'fa-trophy' },

  // ── Finance ──
  { section: 'Finance' },
  { page: 'wallet',        label: 'Wallet',       icon: 'fa-wallet' },
  { page: 'subscriptions', label: 'Subscriptions',icon: 'fa-id-card' },
  { page: 'pricing',       label: 'PAYG Pricing', icon: 'fa-tags' },

  // ── Platform ──
  { section: 'Platform' },
  { page: 'organizations', label: 'Organizations', icon: 'fa-building' },
  { page: 'locations',     label: 'Locations',     icon: 'fa-map-location-dot' },

  // ── System ──
  { section: 'System' },
  { page: 'settings',        label: 'Settings',        icon: 'fa-gear' },
  { page: 'security',        label: 'Security',         icon: 'fa-shield-halved' },
  { page: 'audit-logs',      label: 'Audit Logs',       icon: 'fa-clipboard-list' },
  { page: 'api-integration', label: 'API Integration',  icon: 'fa-plug' },
];

export const FEATURE_PAGE_META = {
  dashboard: 'Real-time command center for mobility operations, fleet health, and demand signals.',
  analytics: 'Platform-wide behavior, growth trends, device mix, and funnel performance insights.',
  users: 'Manage user lifecycle, access controls, subscriptions, and engagement operations.',
  reports: 'Generate and download reports for sales, users, inventory, and audit logs.',
  settings: 'Platform governance for business types, organization types, user roles, and profiles.',
  security: 'Manage access control, password updates, and recent login activity.',
  vehicles: 'Create, allocate, track and manage your fleet with QR and lock workflows.',
  organizations: 'Configure organizations with independent access mapping and policy controls.',
  rides: 'Live ride monitor across global, business type and organization scopes.',
  trips: 'Completed trip history with detailed user, route, and vehicle insights.',
  activity: 'Admin analytics for trips, CO2 savings, calories and mobility feed.',
  groups: 'Rider communities, report handling, and moderation workflows.',
  wallet: 'Refund queues, transaction history, reconciliation and balance safeguards.',
  subscriptions: 'Create and assign plans to organizations and locations.',
  pricing: 'Manage PAYG pricing with global and scoped overrides.',
  achievements: 'Create reward templates with coins and trigger conditions.',
  locations: 'Franchise city/location summaries and payout health.',
  'audit-logs': 'Read-only audit trail for governance and compliance.',
  'api-integration': 'Manage API keys, endpoints and integration status.',
  messages: 'Inbox and sent message workflows for operations and support.',
  staff: 'Manage managers and drivers, including assignment scope and operational accountability.'
};

export const CORE_FEATURE_COMPONENTS = ['dashboard', 'users', 'analytics'];

export function getPageLabel(page) {
  return FEATURE_NAV_ITEMS.find((item) => item.page === page)?.label ?? 'Dashboard';
}

export function getPageSubtitle(page) {
  return FEATURE_PAGE_META[page] ?? 'This module is available in the React shell and ready for customization.';
}

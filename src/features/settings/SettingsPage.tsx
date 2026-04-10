import { useEffect, useState } from 'react';
import Modal from '../../components/Modal';
import { useFilterPanel, FilterPanel } from '../../components/ColumnFilter';
import { loadOrganizationSettings, saveOrganizationSettings } from '../../config/organization-settings';
import { FEATURE_NAV_ITEMS } from '../../config/feature-config';
import { loadOperationalLocations, loadOperationalOrganizations } from '../../config/operations-store';
import { loadFleetRows } from '../../utils/fleetSync';
import { loadSubscriptionPlans } from '../../config/subscription-plans';

const TABS = [
  { id: 'business', label: 'Business Types', icon: 'fa-briefcase', accent: '#00d4a0', category: 'Business Setup' },
  { id: 'orgtype', label: 'Organization Types', icon: 'fa-building', accent: '#22d3ee', category: 'Business Setup' },
  { id: 'locations', label: 'Locations', icon: 'fa-map-pin', accent: '#ec4899', category: 'Business Setup' },
  { id: 'usertype', label: 'User Types', icon: 'fa-user-tag', accent: '#a78bfa', category: 'Business Setup' },
  { id: 'vehicletype', label: 'Vehicle Types', icon: 'fa-car-side', accent: '#38bdf8', category: 'Business Setup' },
  { id: 'roles', label: 'Create Roles', icon: 'fa-user-gear', accent: '#f97316', category: 'System Administration' },
  { id: 'access', label: 'Access Management', icon: 'fa-shield-halved', accent: '#f59e0b', category: 'System Administration' },
  { id: 'profile', label: 'Profile & Brand', icon: 'fa-user-circle', accent: '#00d4a0', category: 'System Administration' },
];

const WEBSITE_FEATURE_OPTIONS = (() => {
  let currentSection = 'General';
  const features = [];

  FEATURE_NAV_ITEMS.forEach((item) => {
    if (item.section) {
      currentSection = item.section;
      return;
    }
    if (!item.page) return;
    features.push({ id: `page:${item.page}`, label: item.label, category: `Website • ${currentSection}` });
  });

  return features;
})();

const SETTINGS_FEATURE_OPTIONS = TABS.map((item) => ({ id: `settings:${item.id}`, label: item.label, category: 'Settings' }));

const INIT_ROLES    = [];
const ROLE_TEMPLATES_STORAGE_KEY = 'mos.settings.role.templates.v1';
const ROLE_TEMPLATE_SEED = [];
const ROLE_COLUMNS = [
  { key: 'email',  label: 'Email',  type: 'text' },
  { key: 'role',   label: 'Role' },
  { key: 'organizationsDisplay', label: 'Organizations' },
  { key: 'locationsDisplay', label: 'Locations' },
  { key: 'status', label: 'Status' },
];

const HIERARCHY_STORAGE_KEY = 'mos.settings.hierarchy.v1';
const PAYG_ALLOCATION_STORAGE_KEY = 'mos.settings.payg.allocations.v1';
const LOCATIONS_STORAGE_KEY = 'mos.settings.locations.v1';
const LOCATION_TYPES = ['Global', 'State', 'City', 'Station'];
const LOCATION_PARENT_TYPE = {
  Global: null,
  State: 'Global',
  City: 'State',
  Station: 'City',
};
const LOCATION_LEVEL_STEPS = [
  { type: 'Global', icon: 'fa-earth-asia' },
  { type: 'State', icon: 'fa-map' },
  { type: 'City', icon: 'fa-city' },
  { type: 'Station', icon: 'fa-train-subway' },
];
const LOCATIONS_SEED = {
  locations: [
    { id: 'loc-global', type: 'Global', name: 'Global', parentId: null, description: 'Global coverage across all regions', status: 'active', createdAt: new Date().toISOString() },
  ]
};

const HIERARCHY_SEED = {
  businessTypes: [
    {
      id: 'bt-public',
      name: 'Public / General Mobility',
      description: 'Open for any user, no organization required.',
      isPublic: true,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'bt-campus',
      name: 'Campus Mobility',
      description: 'Restricted to students and staff.',
      isPublic: false,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'bt-corporate',
      name: 'Corporate Mobility',
      description: 'Restricted to employees.',
      isPublic: false,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  organizationTypes: [
    { id: 'ot-college', businessTypeId: 'bt-campus', locationId: 'loc-global', name: 'College', description: 'College mobility setup', status: 'active', createdAt: new Date().toISOString() },
    { id: 'ot-university', businessTypeId: 'bt-campus', locationId: 'loc-global', name: 'University', description: 'Campus university setup', status: 'active', createdAt: new Date().toISOString() },
    { id: 'ot-research', businessTypeId: 'bt-campus', locationId: 'loc-global', name: 'Research Institute', description: 'Research campus setup', status: 'active', createdAt: new Date().toISOString() },
    { id: 'ot-it', businessTypeId: 'bt-corporate', locationId: 'loc-global', name: 'IT Company', description: 'Technology and IT organizations', status: 'active', createdAt: new Date().toISOString() },
    { id: 'ot-manufacturing', businessTypeId: 'bt-corporate', locationId: 'loc-global', name: 'Manufacturing Company', description: 'Manufacturing organizations', status: 'active', createdAt: new Date().toISOString() },
  ],
  userTypes: [
    { id: 'ut-general', businessTypeId: 'bt-public', organizationTypeId: null, name: 'General User', description: 'Public rider', status: 'active', createdAt: new Date().toISOString() },
    { id: 'ut-student', businessTypeId: 'bt-campus', organizationTypeId: 'ot-university', name: 'Student', description: 'Campus student', status: 'active', createdAt: new Date().toISOString() },
    { id: 'ut-staff', businessTypeId: 'bt-campus', organizationTypeId: 'ot-university', name: 'Staff', description: 'Campus staff', status: 'active', createdAt: new Date().toISOString() },
    { id: 'ut-employee', businessTypeId: 'bt-corporate', organizationTypeId: 'ot-it', name: 'Employee', description: 'Corporate employee', status: 'active', createdAt: new Date().toISOString() },
    { id: 'ut-admin', businessTypeId: 'bt-corporate', organizationTypeId: 'ot-it', name: 'Admin', description: 'Corporate admin', status: 'active', createdAt: new Date().toISOString() },
  ],
  vehicleTypes: [
    { id: 'vt-cycle', name: 'Cycle', seatCount: 1, driverApplicable: false, description: 'Standard self-ride cycle', status: 'active', createdAt: new Date().toISOString() },
    { id: 'vt-ebike', name: 'E-Bike', seatCount: 1, driverApplicable: false, description: 'Electric bike for self-ride use', status: 'active', createdAt: new Date().toISOString() },
    { id: 'vt-escooter', name: 'E-Scooter', seatCount: 1, driverApplicable: false, description: 'Compact electric scooter', status: 'active', createdAt: new Date().toISOString() },
    { id: 'vt-buggy', name: 'Buggy', seatCount: 4, driverApplicable: true, description: 'Driver-managed buggy', status: 'active', createdAt: new Date().toISOString() },
    { id: 'vt-bus', name: 'Bus', seatCount: 24, driverApplicable: true, description: 'Driver-managed bus or shuttle', status: 'active', createdAt: new Date().toISOString() },
  ],
};

function loadHierarchySettings() {
  if (typeof window === 'undefined') return HIERARCHY_SEED;
  try {
    const raw = window.localStorage.getItem(HIERARCHY_STORAGE_KEY);
    if (!raw) return HIERARCHY_SEED;
    const parsed = JSON.parse(raw);
    const normalizedOrgTypes = Array.isArray(parsed?.organizationTypes)
      ? parsed.organizationTypes.map((item) => ({ ...item, locationId: item.locationId || 'loc-global' }))
      : [];
    const mergedOrgTypes = [...normalizedOrgTypes];
    HIERARCHY_SEED.organizationTypes.forEach((seedItem) => {
      if (!mergedOrgTypes.some((item) => item.id === seedItem.id)) {
        mergedOrgTypes.push(seedItem);
      }
    });
    const normalizedVehicleTypes = Array.isArray(parsed?.vehicleTypes)
      ? parsed.vehicleTypes.map((item) => ({ ...item, seatCount: Math.max(1, Number(item?.seatCount) || 1), driverApplicable: Boolean(item?.driverApplicable) }))
      : [];
    const mergedVehicleTypes = [...normalizedVehicleTypes];
    HIERARCHY_SEED.vehicleTypes.forEach((seedItem) => {
      if (!mergedVehicleTypes.some((item) => String(item.name || '').toLowerCase() === seedItem.name.toLowerCase())) {
        mergedVehicleTypes.push(seedItem);
      }
    });

    return {
      businessTypes: Array.isArray(parsed?.businessTypes) ? parsed.businessTypes : HIERARCHY_SEED.businessTypes,
      organizationTypes: mergedOrgTypes.length ? mergedOrgTypes : HIERARCHY_SEED.organizationTypes,
      userTypes: Array.isArray(parsed?.userTypes) ? parsed.userTypes : HIERARCHY_SEED.userTypes,
      vehicleTypes: mergedVehicleTypes.length
        ? mergedVehicleTypes
        : HIERARCHY_SEED.vehicleTypes,
    };
  } catch {
    return HIERARCHY_SEED;
  }
}

function saveHierarchySettings(payload) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(HIERARCHY_STORAGE_KEY, JSON.stringify(payload));
    window.dispatchEvent(new Event('mos:business-setup-updated'));
  } catch {
    return;
  }
}

function loadPaygAllocations() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(PAYG_ALLOCATION_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function savePaygAllocations(payload) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PAYG_ALLOCATION_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    return;
  }
}

function loadLocations() {
  if (typeof window === 'undefined') return LOCATIONS_SEED.locations;
  try {
    const raw = window.localStorage.getItem(LOCATIONS_STORAGE_KEY);
    if (!raw) return LOCATIONS_SEED.locations;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return LOCATIONS_SEED.locations;
    const normalized = parsed.map((item) => ({
      ...item,
      parentId: item.parentId || null,
    }));
    if (!normalized.some((item) => item.id === 'loc-global')) {
      normalized.unshift(LOCATIONS_SEED.locations[0]);
    }
    return normalized;
  } catch {
    return LOCATIONS_SEED.locations;
  }
}

function saveLocations(payload) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LOCATIONS_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    return;
  }
}

function loadRoleTemplates() {
  if (typeof window === 'undefined') return ROLE_TEMPLATE_SEED;
  try {
    const raw = window.localStorage.getItem(ROLE_TEMPLATES_STORAGE_KEY);
    if (!raw) return ROLE_TEMPLATE_SEED;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return ROLE_TEMPLATE_SEED;

    const tabIds = new Set(TABS.map((item) => item.id));
    const pageIds = new Set(WEBSITE_FEATURE_OPTIONS.map((item) => item.id.replace('page:', '')));
    return parsed.map((role) => ({
      ...role,
      featureIds: Array.isArray(role.featureIds)
        ? role.featureIds.map((featureId) => {
          if (typeof featureId !== 'string') return featureId;
          if (featureId.startsWith('page:') || featureId.startsWith('settings:')) return featureId;
          if (tabIds.has(featureId)) return `settings:${featureId}`;
          if (pageIds.has(featureId)) return `page:${featureId}`;
          return featureId;
        })
        : [],
    }));
  } catch {
    return ROLE_TEMPLATE_SEED;
  }
}

function saveRoleTemplates(payload) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(ROLE_TEMPLATES_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    return;
  }
}
const MOBILITY_TEMPLATES = [
  {
    id: 'public-general',
    title: 'Public / General Mobility',
    subtitle: 'Open for any user, no organization required.',
    businessType: 'Public / General Mobility',
    organizationType: 'Open Public Zone',
    userTypes: ['Public Rider'],
    pricingMethods: ['Pay-per-ride (PAYG)', 'Wallet', 'Global Subscription'],
    useCases: ['Parks', 'Tourist areas', 'City mobility'],
  },
  {
    id: 'campus',
    title: 'Campus Mobility (University)',
    subtitle: 'Restricted to students and staff with ID validation.',
    businessType: 'Campus Mobility',
    organizationType: 'University',
    userTypes: ['Student', 'Staff'],
    pricingMethods: ['Campus Subscription'],
    useCases: ['ICRISAT', 'Colleges', 'Research campuses'],
  },
  {
    id: 'corporate',
    title: 'Corporate Mobility',
    subtitle: 'Restricted to employees with corporate access control.',
    businessType: 'Corporate Mobility',
    organizationType: 'Company',
    userTypes: ['Employee'],
    pricingMethods: ['Corporate Subscription'],
    useCases: ['Tech parks (Mindspace, etc.)', 'Offices'],
  },
];

const PAYG_SCOPE_OPTIONS = [
  { value: 'global', label: 'Global' },
  { value: 'state', label: 'State' },
  { value: 'city', label: 'City' },
  { value: 'station', label: 'Station' },
];

function addUniqueItems(current, additions) {
  const existing = new Set(current.map((item) => item.toLowerCase()));
  const next = [...current];
  additions.forEach((item) => {
    const normalized = item.trim();
    if (!normalized) return;
    const key = normalized.toLowerCase();
    if (!existing.has(key)) {
      existing.add(key);
      next.push(normalized);
    }
  });
  return next;
}

function CollectionEditor({ title, items, placeholder, onAdd, onRemove }) {
  const [inputVal, setInputVal] = useState('');
  const [error, setError] = useState('');

  const handleAdd = () => {
    const trimmed = inputVal.trim();
    if (!trimmed) {
      setError('This field is required — please enter a name.');
      return;
    }
    if (items.some((item) => item.toLowerCase() === trimmed.toLowerCase())) {
      setError(`"${trimmed}" already exists. Try a different name.`);
      return;
    }
    onAdd(trimmed);
    setInputVal('');
    setError('');
  };

  const handleChange = (e) => {
    setInputVal(e.target.value);
    if (error) setError('');
  };

  return (
    <div className="settings-group">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h3 className="!mb-0 !pb-0 !border-none" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {title}
          <span style={{ color: 'var(--accent-red)', fontSize: '0.9em', lineHeight: 1 }} aria-hidden="true">*</span>
        </h3>
        <span style={{ fontSize: '0.7rem', fontWeight: 700, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '99px', padding: '1px 8px', color: 'var(--text-2)' }}>{items.length}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '4px' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <input
            className={`setting-input${error ? ' input-error' : ''}`}
            value={inputVal}
            onChange={handleChange}
            placeholder={placeholder}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
            aria-required="true"
            aria-describedby={error ? `err-${title.replace(/\s/g, '')}` : undefined}
          />
          {error && (
            <span id={`err-${title.replace(/\s/g, '')}`} style={{ fontSize: '0.74rem', color: 'var(--accent-red)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <i className="fa fa-circle-exclamation"></i> {error}
            </span>
          )}
        </div>
        <button type="button" className="btn-primary flex-shrink-0" onClick={handleAdd} style={{ marginTop: '0' }}>
          <i className="fa fa-plus"></i> Add
        </button>
      </div>

      <div className="settings-list" style={{ marginTop: '10px' }}>
        {items.length === 0 && (
          <p style={{ fontSize: '0.8rem', padding: '16px 0', textAlign: 'center', color: 'var(--text-3)' }}>No entries yet. Add one above.</p>
        )}
        {items.map((item, idx) => (
          <div key={item} className="settings-list-row">
            <div className="flex items-center gap-2 min-w-0">
              <span className="settings-index-chip">{String(idx + 1).padStart(2, '0')}</span>
              <span style={{ fontSize: '0.86rem', fontWeight: 500, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item}</span>
            </div>
            <button type="button" className="act-btn red" onClick={() => onRemove(idx)} title={`Remove ${item}`}>
              <i className="fa fa-trash"></i>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const initialSettings = loadOrganizationSettings();
  const initialHierarchy = loadHierarchySettings();
  const [activeTab, setActiveTab] = useState('business');
  const [businessTypes, setBusinessTypes] = useState(initialHierarchy.businessTypes);
  const [organizationTypes, setOrganizationTypes] = useState(initialHierarchy.organizationTypes);
  const [hierUserTypes, setHierUserTypes] = useState(initialHierarchy.userTypes);
  const [vehicleTypes, setVehicleTypes] = useState(initialHierarchy.vehicleTypes || HIERARCHY_SEED.vehicleTypes);
  const [pricingMethods, setPricingMethods] = useState(initialSettings.pricingMethods);
  const [advancePricingMethods, setAdvancePricingMethods] = useState(initialSettings.advancePricingMethods);
  const [paygAllocations, setPaygAllocations] = useState(loadPaygAllocations());
    const [locations, setLocations] = useState(loadLocations());
    const [newLocation, setNewLocation] = useState({ type: 'City', parentId: '', name: '', description: '' });
  const [paygAllocationForm, setPaygAllocationForm] = useState({ businessTypeId: '', organizationTypeId: '', userTypeId: '', userTypeIds: [], pricingMethod: 'Simple', pricingMethods: [], scopeLevel: 'global', scopeLevels: [], scopeValue: '', status: 'active' });
  const [roleTemplates, setRoleTemplates] = useState(loadRoleTemplates());
  const [roleTemplateForm, setRoleTemplateForm] = useState({ id: '', name: '', description: '', featureIds: [], organizationTypeIds: [], locationIds: [], status: 'active' });
  const [roles,     setRoles]     = useState(INIT_ROLES);
  const [hierarchyError, setHierarchyError] = useState('');
  const [newBusiness, setNewBusiness] = useState({ name: '', description: '', isPublic: false });
  const [newOrgType, setNewOrgType] = useState({ businessTypeId: '', locationId: '', name: '', description: '' });
  const [newUserType, setNewUserType] = useState({ businessTypeId: '', organizationTypeId: '', name: '', description: '' });
  const [newVehicleType, setNewVehicleType] = useState({ name: '', seatCount: 1, driverApplicable: false, description: '' });
  const [orgName, setOrgName] = useState('MOS Mobility');
  const [supportEmail, setSupportEmail] = useState('support@mjollnir.io');
  const [platformUrl, setPlatformUrl] = useState('https://console.mjollnir.io');
  const fpRoles = useFilterPanel();
  const [showInvite, setShowInvite] = useState(false);
  const [invite,    setInvite]    = useState({ email: '', role: ROLE_TEMPLATE_SEED[1]?.name || 'Operator', organizationTypeIds: [], locationIds: [] });
  const [inviteError, setInviteError] = useState('');
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifSms,   setNotifSms]   = useState(false);
  const [twoFa,      setTwoFa]      = useState(true);
  const [profileSaveState, setProfileSaveState] = useState('idle');
  const [templateNotice, setTemplateNotice] = useState('');

  const bizTypes = businessTypes.filter((item) => item.status === 'active').map((item) => item.name);
  const orgTypes = organizationTypes.filter((item) => item.status === 'active').map((item) => item.name);
  const userTypes = hierUserTypes.filter((item) => item.status === 'active').map((item) => item.name);
  const activeVehicleTypes = vehicleTypes.filter((item) => item.status === 'active');

  const handleInvite = () => {
    const emailTrimmed = invite.email.trim();
    if (!emailTrimmed) { setInviteError('Email address is required.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) { setInviteError('Please enter a valid email address.'); return; }
    if (!invite.role) { setInviteError('Select a role template.'); return; }
    const selectedRole = roleTemplates.find((item) => item.name === invite.role && item.status === 'active');
    if (!selectedRole) { setInviteError('Selected role is not active. Choose another role.'); return; }
    if (!invite.organizationTypeIds.length) { setInviteError('Assign at least one organization.'); return; }
    if (!invite.locationIds.length) { setInviteError('Assign at least one location.'); return; }
    if (roles.some((r) => r.email.toLowerCase() === emailTrimmed.toLowerCase())) { setInviteError('This email already has a role assigned.'); return; }
    setRoles((p) => [...p, {
      email: emailTrimmed,
      role: invite.role,
      status: 'Pending',
      organizationTypeIds: invite.organizationTypeIds,
      locationIds: invite.locationIds,
    }]);
    const nextActiveRole = roleTemplates.find((item) => item.status === 'active') || null;
    setInvite({
      email: '',
      role: nextActiveRole?.name || '',
      organizationTypeIds: nextActiveRole?.organizationTypeIds || [],
      locationIds: nextActiveRole?.locationIds || [],
    });
    setInviteError('');
    setShowInvite(false);
  };

  useEffect(() => {
    saveHierarchySettings({
      businessTypes,
      organizationTypes,
      userTypes: hierUserTypes,
      vehicleTypes,
    });
  }, [businessTypes, organizationTypes, hierUserTypes, vehicleTypes]);

  useEffect(() => {
    savePaygAllocations(paygAllocations);
  }, [paygAllocations]);

  useEffect(() => {
    saveLocations(locations);
  }, [locations]);

  useEffect(() => {
    saveRoleTemplates(roleTemplates);
  }, [roleTemplates]);

  useEffect(() => {
    if (!roleTemplates.some((item) => item.name === invite.role)) {
      const activeRole = roleTemplates.find((item) => item.status === 'active') || null;
      setInvite((prev) => ({
        ...prev,
        role: activeRole?.name || '',
        organizationTypeIds: activeRole?.organizationTypeIds || [],
        locationIds: activeRole?.locationIds || [],
      }));
    }
  }, [roleTemplates, invite.role]);

  useEffect(() => {
    const selectedRole = roleTemplates.find((item) => item.name === invite.role && item.status === 'active') || null;
    if (!selectedRole) return;
    setInvite((prev) => ({
      ...prev,
      organizationTypeIds: prev.organizationTypeIds.length ? prev.organizationTypeIds : (selectedRole.organizationTypeIds || []),
      locationIds: prev.locationIds.length ? prev.locationIds : (selectedRole.locationIds || []),
    }));
  }, [invite.role, roleTemplates]);

  useEffect(() => {
    setInvite((prev) => {
      const availableOrgIds = organizationTypes
        .filter((item) => item.status === 'active' && prev.locationIds.includes(item.locationId || 'loc-global'))
        .map((item) => item.id);
      const nextOrgIds = prev.organizationTypeIds.filter((id) => availableOrgIds.includes(id));
      const unchanged = nextOrgIds.length === prev.organizationTypeIds.length
        && nextOrgIds.every((id, idx) => id === prev.organizationTypeIds[idx]);
      if (unchanged) return prev;
      return { ...prev, organizationTypeIds: nextOrgIds };
    });
  }, [invite.locationIds, organizationTypes]);

  useEffect(() => {
    saveOrganizationSettings({
      businessTypes: bizTypes,
      organizationTypes: orgTypes,
      userTypes,
      pricingMethods,
      advancePricingMethods,
      paygAllocations,
    });
  }, [businessTypes, organizationTypes, hierUserTypes, pricingMethods, advancePricingMethods, paygAllocations]);

  // Reset PAYG scope values when business type is cleared
  useEffect(() => {
    if (!paygAllocationForm.businessTypeId) {
      setPaygAllocationForm((prev) => ({ ...prev, scopeLevel: 'global', scopeValue: '' }));
    }
  }, [paygAllocationForm.businessTypeId, businessTypes]);

  const handleSaveProfile = () => {
    localStorage.setItem('mos-profile-toggle-settings', JSON.stringify({ notifEmail, notifSms, twoFa, orgName, supportEmail, platformUrl }));
    setProfileSaveState('saved');
    window.setTimeout(() => setProfileSaveState('idle'), 2000);
  };

  const handleResetProfile = () => {
    setNotifEmail(true);
    setNotifSms(false);
    setTwoFa(true);
    setOrgName('MOS Mobility');
    setSupportEmail('support@mjollnir.io');
    setPlatformUrl('https://console.mjollnir.io');
    localStorage.removeItem('mos-profile-toggle-settings');
    setProfileSaveState('idle');
  };

  const createLocation = () => {
    const name = newLocation.name.trim();
    const type = newLocation.type || 'City';
    const requiredParentType = LOCATION_PARENT_TYPE[type];
    const selectedParentId = newLocation.parentId || null;
    const selectedParent = selectedParentId ? locations.find((item) => item.id === selectedParentId) : null;
    
    if (!name) {
      setHierarchyError('Location name is required.');
      return;
    }

    if (type === 'Global' && locations.some((item) => item.type === 'Global')) {
      setHierarchyError('Only one Global location is allowed.');
      return;
    }

    if (requiredParentType) {
      if (!selectedParent) {
        setHierarchyError(`${type} must be created under a ${requiredParentType}.`);
        return;
      }
      if (selectedParent.type !== requiredParentType) {
        setHierarchyError(`${type} can only be created under a ${requiredParentType}.`);
        return;
      }
    }
    
    if (locations.some((item) => item.name.toLowerCase() === name.toLowerCase() && item.type === type && (item.parentId || null) === selectedParentId)) {
      setHierarchyError('Location already exists under the selected parent.');
      return;
    }
    
    const now = new Date().toISOString();
    setLocations((prev) => [...prev, {
      id: `loc-${now}`,
      type,
      name,
      parentId: requiredParentType ? selectedParentId : null,
      description: newLocation.description.trim(),
      status: 'active',
      createdAt: now,
    }]);
    setNewLocation({ type: 'City', parentId: '', name: '', description: '' });
    setHierarchyError('');
  };

  const toggleLocationStatus = (id) => {
    setLocations((prev) => prev.map((item) => item.id === id ? { ...item, status: item.status === 'active' ? 'inactive' : 'active' } : item));
  };

  const deleteLocation = (id) => {
    const target = locations.find((item) => item.id === id);
    if (!target) return;

    const hasChildren = locations.some((item) => item.parentId === id);
    if (hasChildren) {
      setHierarchyError('Cannot delete location that has child locations. Delete children first.');
      return;
    }

    const locationInUse = paygAllocations.some((item) => {
      if (item.locationId && item.locationId === id) return true;
      return (item.scopeLevel || '').toLowerCase() === target.type.toLowerCase()
        && (item.scopeValue || '').toLowerCase() === target.name.toLowerCase();
    });

    if (locationInUse) {
      setHierarchyError('Cannot delete location linked to PAYG allocations. Delete those allocations first.');
      return;
    }

    const scopedToOrganizationType = organizationTypes.some((item) => item.locationId === id);
    if (scopedToOrganizationType) {
      setHierarchyError('Cannot delete location linked to Organization Types. Re-assign their scope first.');
      return;
    }

    setLocations((prev) => prev.filter((item) => item.id !== id));
    setHierarchyError('');
  };

  const createBusinessType = () => {
    const name = newBusiness.name.trim();
    if (!name) {
      setHierarchyError('Business Type name is required.');
      return;
    }
    if (businessTypes.some((item) => item.name.toLowerCase() === name.toLowerCase())) {
      setHierarchyError('Business Type already exists.');
      return;
    }
    const now = new Date().toISOString();
    setBusinessTypes((prev) => [...prev, {
      id: `bt-${now}`,
      name,
      description: newBusiness.description.trim(),
      isPublic: newBusiness.isPublic,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    }]);
    setNewBusiness({ name: '', description: '', isPublic: false });
    setHierarchyError('');
  };

  const saveRoleTemplate = () => {
    const roleName = roleTemplateForm.name.trim();
    if (!roleName) {
      setHierarchyError('Role name is required.');
      return;
    }

    if (roleTemplateForm.featureIds.length === 0) {
      setHierarchyError('Select at least one feature for the role.');
      return;
    }

    const duplicate = roleTemplates.some((item) => item.name.toLowerCase() === roleName.toLowerCase() && item.id !== roleTemplateForm.id);
    if (duplicate) {
      setHierarchyError('Role name already exists.');
      return;
    }

    const now = new Date().toISOString();
    if (roleTemplateForm.id) {
      setRoleTemplates((prev) => prev.map((item) => item.id === roleTemplateForm.id ? {
        ...item,
        name: roleName,
        description: roleTemplateForm.description.trim(),
        featureIds: roleTemplateForm.featureIds,
        organizationTypeIds: roleTemplateForm.organizationTypeIds,
        locationIds: roleTemplateForm.locationIds,
        status: roleTemplateForm.status,
      } : item));
      setRoles((prev) => prev.map((item) => item.role === roleTemplates.find((r) => r.id === roleTemplateForm.id)?.name ? { ...item, role: roleName } : item));
    } else {
      setRoleTemplates((prev) => [...prev, {
        id: `rt-${now}`,
        name: roleName,
        description: roleTemplateForm.description.trim(),
        featureIds: roleTemplateForm.featureIds,
        organizationTypeIds: roleTemplateForm.organizationTypeIds,
        locationIds: roleTemplateForm.locationIds,
        status: roleTemplateForm.status,
        createdAt: now,
      }]);
    }

    setRoleTemplateForm({ id: '', name: '', description: '', featureIds: [], organizationTypeIds: [], locationIds: [], status: 'active' });
    setHierarchyError('');
  };

  const editRoleTemplate = (id) => {
    const role = roleTemplates.find((item) => item.id === id);
    if (!role) return;
    setRoleTemplateForm({
      id: role.id,
      name: role.name,
      description: role.description || '',
      featureIds: role.featureIds || [],
      organizationTypeIds: role.organizationTypeIds || [],
      locationIds: role.locationIds || [],
      status: role.status || 'active',
    });
    setHierarchyError('');
  };

  const toggleRoleTemplateStatus = (id) => {
    setRoleTemplates((prev) => prev.map((item) => item.id === id ? { ...item, status: item.status === 'active' ? 'inactive' : 'active' } : item));
  };

  const deleteRoleTemplate = (id) => {
    const target = roleTemplates.find((item) => item.id === id);
    if (!target) return;

    const inUse = roles.some((item) => item.role === target.name);
    if (inUse) {
      setHierarchyError('Cannot delete role assigned to users in Access Management.');
      return;
    }

    setRoleTemplates((prev) => prev.filter((item) => item.id !== id));
    if (roleTemplateForm.id === id) {
      setRoleTemplateForm({ id: '', name: '', description: '', featureIds: [], organizationTypeIds: [], locationIds: [], status: 'active' });
    }
    setHierarchyError('');
  };

  const createOrganizationType = () => {
    const name = newOrgType.name.trim();
    if (!newOrgType.businessTypeId) {
      setHierarchyError('Select Business Type for Organization Type.');
      return;
    }
    if (!name) {
      setHierarchyError('Organization Type name is required.');
      return;
    }
    const normalizedLocationId = newOrgType.locationId || 'loc-global';
    if (organizationTypes.some((item) => item.businessTypeId === newOrgType.businessTypeId && (item.locationId || 'loc-global') === normalizedLocationId && item.name.toLowerCase() === name.toLowerCase())) {
      setHierarchyError('Organization Type already exists for selected Business + Location scope.');
      return;
    }
    const now = new Date().toISOString();
    setOrganizationTypes((prev) => [...prev, {
      id: `ot-${now}`,
      businessTypeId: newOrgType.businessTypeId,
      locationId: normalizedLocationId,
      name,
      description: newOrgType.description.trim(),
      status: 'active',
      createdAt: now,
    }]);
    setNewOrgType((prev) => ({ ...prev, locationId: '', name: '', description: '' }));
    setHierarchyError('');
  };

  const createUserType = () => {
    const business = businessTypes.find((item) => item.id === newUserType.businessTypeId);
    if (!business) {
      setHierarchyError('Select Business Type for User Type.');
      return;
    }

    const isPublic = Boolean(business.isPublic);
    const organizationTypeId = isPublic ? null : newUserType.organizationTypeId || null;
    const name = (isPublic ? (newUserType.name.trim() || 'General User') : newUserType.name.trim());

    if (!name) {
      setHierarchyError('User Type name is required.');
      return;
    }
    if (!isPublic && !organizationTypeId) {
      setHierarchyError('Select Organization Type for selected Business Type.');
      return;
    }
    if (hierUserTypes.some((item) => item.businessTypeId === business.id && (item.organizationTypeId || null) === organizationTypeId && item.name.toLowerCase() === name.toLowerCase())) {
      setHierarchyError('User Type already exists for this mapping.');
      return;
    }

    const now = new Date().toISOString();
    setHierUserTypes((prev) => [...prev, {
      id: `ut-${now}`,
      businessTypeId: business.id,
      organizationTypeId,
      name,
      description: newUserType.description.trim(),
      status: 'active',
      createdAt: now,
    }]);
    setNewUserType((prev) => ({ ...prev, organizationTypeId: '', name: '', description: '' }));
    setHierarchyError('');
  };

  const createVehicleType = () => {
    const name = newVehicleType.name.trim();
    if (!name) {
      setHierarchyError('Vehicle Type name is required.');
      return;
    }
    if (vehicleTypes.some((item) => item.name.toLowerCase() === name.toLowerCase())) {
      setHierarchyError('Vehicle Type already exists.');
      return;
    }
    const seatCount = Math.max(1, Number(newVehicleType.seatCount) || 1);
    const now = new Date().toISOString();
    setVehicleTypes((prev) => [...prev, {
      id: `vt-${now}`,
      name,
      seatCount,
      driverApplicable: Boolean(newVehicleType.driverApplicable),
      description: newVehicleType.description.trim(),
      status: 'active',
      createdAt: now,
    }]);
    setNewVehicleType({ name: '', seatCount: 1, driverApplicable: false, description: '' });
    setHierarchyError('');
  };

  const toggleBusinessStatus = (id) => {
    setBusinessTypes((prev) => prev.map((item) => item.id === id ? { ...item, status: item.status === 'active' ? 'inactive' : 'active', updatedAt: new Date().toISOString() } : item));
  };

  const toggleOrgStatus = (id) => {
    setOrganizationTypes((prev) => prev.map((item) => item.id === id ? { ...item, status: item.status === 'active' ? 'inactive' : 'active' } : item));
  };

  const toggleUserStatus = (id) => {
    setHierUserTypes((prev) => prev.map((item) => item.id === id ? { ...item, status: item.status === 'active' ? 'inactive' : 'active' } : item));
  };

  const toggleVehicleTypeStatus = (id) => {
    setVehicleTypes((prev) => prev.map((item) => item.id === id ? { ...item, status: item.status === 'active' ? 'inactive' : 'active' } : item));
  };

  const deleteBusinessType = (id) => {
    const hasLinkedOrgs = organizationTypes.some((item) => item.businessTypeId === id);
    if (hasLinkedOrgs) {
      setHierarchyError('Cannot delete Business Type linked to Organization Types.');
      return;
    }
    const hasLinkedUsers = hierUserTypes.some((item) => item.businessTypeId === id);
    if (hasLinkedUsers) {
      setHierarchyError('Cannot delete Business Type linked to User Types.');
      return;
    }
    setBusinessTypes((prev) => prev.filter((item) => item.id !== id));
    setHierarchyError('');
  };

  const deleteOrganizationType = (id) => {
    const hasLinkedUsers = hierUserTypes.some((item) => item.organizationTypeId === id);
    if (hasLinkedUsers) {
      setHierarchyError('Cannot delete Organization Type linked to User Types.');
      return;
    }
    setOrganizationTypes((prev) => prev.filter((item) => item.id !== id));
    setHierarchyError('');
  };

  const deleteUserType = (id) => {
    setHierUserTypes((prev) => prev.filter((item) => item.id !== id));
    setHierarchyError('');
  };

  const deleteVehicleType = (id) => {
    const target = vehicleTypes.find((item) => item.id === id);
    if (!target) return;

    const inOrganizations = loadOperationalOrganizations([]).some((item) => Array.isArray(item.vehicleSelections) && item.vehicleSelections.includes(target.name));
    if (inOrganizations) {
      setHierarchyError('Cannot delete Vehicle Type linked to Organizations. Remove it from organizations first.');
      return;
    }
    const inLocations = loadOperationalLocations([]).some((item) => Boolean(item?.vehicles?.byType?.[target.name]));
    if (inLocations) {
      setHierarchyError('Cannot delete Vehicle Type linked to Locations. Remove those allocations first.');
      return;
    }
    const inFleet = loadFleetRows([]).some((item) => item.type === target.name);
    if (inFleet) {
      setHierarchyError('Cannot delete Vehicle Type linked to Vehicles. Reassign fleet vehicles first.');
      return;
    }
    const inSubscriptions = loadSubscriptionPlans().some((item) => Array.isArray(item.vehicles) && item.vehicles.includes(target.name));
    if (inSubscriptions) {
      setHierarchyError('Cannot delete Vehicle Type linked to subscription plans. Update plans first.');
      return;
    }

    setVehicleTypes((prev) => prev.filter((item) => item.id !== id));
    setHierarchyError('');
  };

  const selectedBusinessForOrg = businessTypes.find((item) => item.id === newOrgType.businessTypeId) || null;
  const selectedBusinessForUser = businessTypes.find((item) => item.id === newUserType.businessTypeId) || null;
  const filteredOrgOptionsForUser = organizationTypes.filter((item) => item.businessTypeId === newUserType.businessTypeId && item.status === 'active');
  const selectedBusinessForPayg = businessTypes.find((item) => item.id === paygAllocationForm.businessTypeId) || null;
  const filteredOrgOptionsForPayg = organizationTypes.filter((item) => item.businessTypeId === paygAllocationForm.businessTypeId && item.status === 'active');
  const filteredUserOptionsForPayg = hierUserTypes.filter((item) => {
    if (item.status !== 'active') return false;
    if (!paygAllocationForm.businessTypeId) return false;
    if (item.businessTypeId !== paygAllocationForm.businessTypeId) return false;
    if (selectedBusinessForPayg?.isPublic) return item.organizationTypeId === null;
    if (!paygAllocationForm.organizationTypeId) return false;
    return item.organizationTypeId === paygAllocationForm.organizationTypeId;
  });

  const roleFeatureOptions = [...WEBSITE_FEATURE_OPTIONS, ...SETTINGS_FEATURE_OPTIONS];
  const groupedRoleFeatureOptions = roleFeatureOptions.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});
  const websiteFeatureIds = roleFeatureOptions.filter((item) => item.category.startsWith('Website')).map((item) => item.id);
  const settingsFeatureIds = roleFeatureOptions.filter((item) => item.category === 'Settings').map((item) => item.id);
  const activeOrganizationOptions = organizationTypes.filter((item) => item.status === 'active');

  const activeLocations = locations.filter((item) => item.status === 'active');
  const getLocationPath = (location, allLocations = locations) => {
    const chain = [];
    let cursor = location;
    let guard = 0;

    while (cursor && guard < 10) {
      chain.unshift(cursor.name);
      cursor = cursor.parentId ? allLocations.find((item) => item.id === cursor.parentId) : null;
      guard += 1;
    }

    return chain.join(' > ');
  };

  const selectedInviteRoleTemplate = roleTemplates.find((item) => item.name === invite.role && item.status === 'active') || null;
  const filteredInviteOrganizationOptions = activeOrganizationOptions.filter((item) => {
    if (!invite.locationIds.length) return false;
    return invite.locationIds.includes(item.locationId || 'loc-global');
  });
  const roleRows = roles.map((item, index) => ({
    ...item,
    _rowIndex: index,
    organizationsDisplay: item.organizationTypeIds?.length
      ? item.organizationTypeIds
        .map((id) => activeOrganizationOptions.find((org) => org.id === id)?.name)
        .filter(Boolean)
        .join(', ')
      : 'All',
    locationsDisplay: item.locationIds?.length
      ? item.locationIds
        .map((id) => {
          const location = locations.find((loc) => loc.id === id);
          return location ? `${location.type} • ${getLocationPath(location)}` : '';
        })
        .filter(Boolean)
        .join(', ')
      : 'All',
  }));
  const visibleRoles = roleRows.filter((r) => ROLE_COLUMNS.every((c) => fpRoles.match(c.key, r[c.key])));

  const getInviteChildren = (parentId) => activeLocations.filter((item) => (item.parentId || null) === (parentId || null));

  const getInviteSubtreeIds = (locationId) => {
    const children = getInviteChildren(locationId);
    return [
      locationId,
      ...children.flatMap((child) => getInviteSubtreeIds(child.id)),
    ];
  };

  const getInviteAncestorIds = (locationId) => {
    const ancestors = [];
    let cursor = activeLocations.find((item) => item.id === locationId) || null;
    let guard = 0;

    while (cursor?.parentId && guard < 12) {
      ancestors.push(cursor.parentId);
      cursor = activeLocations.find((item) => item.id === cursor.parentId) || null;
      guard += 1;
    }

    return ancestors;
  };

  const toggleInviteLocationSelection = (locationId, checked) => {
    setInvite((prev) => {
      const next = new Set(prev.locationIds || []);
      const subtreeIds = getInviteSubtreeIds(locationId);

      if (checked) {
        subtreeIds.forEach((id) => next.add(id));
        getInviteAncestorIds(locationId).forEach((id) => next.add(id));
      } else {
        subtreeIds.forEach((id) => next.delete(id));

        // Walk up and clear parent if no child remains selected.
        getInviteAncestorIds(locationId).forEach((ancestorId) => {
          const childIds = getInviteChildren(ancestorId).flatMap((child) => getInviteSubtreeIds(child.id));
          const hasAnySelectedChild = childIds.some((id) => next.has(id));
          if (!hasAnySelectedChild) next.delete(ancestorId);
        });
      }

      return { ...prev, locationIds: Array.from(next) };
    });
    if (inviteError) setInviteError('');
  };

  const isInviteLocationChecked = (locationId) => {
    const subtreeIds = getInviteSubtreeIds(locationId);
    return subtreeIds.every((id) => invite.locationIds.includes(id));
  };

  const isInviteLocationIndeterminate = (locationId) => {
    const subtreeIds = getInviteSubtreeIds(locationId);
    const selectedCount = subtreeIds.filter((id) => invite.locationIds.includes(id)).length;
    return selectedCount > 0 && selectedCount < subtreeIds.length;
  };

  const renderInviteLocationTree = (parentId = null, depth = 0) => {
    const children = getInviteChildren(parentId).sort((a, b) => {
      const typeDiff = LOCATION_TYPES.indexOf(a.type) - LOCATION_TYPES.indexOf(b.type);
      if (typeDiff !== 0) return typeDiff;
      return a.name.localeCompare(b.name);
    });

    return children.map((item) => {
      const checked = isInviteLocationChecked(item.id);
      const indeterminate = isInviteLocationIndeterminate(item.id);
      return (
        <div key={item.id} style={{ marginLeft: `${depth * 14}px`, display: 'grid', gap: '3px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', padding: '4px 0' }}>
            <input
              type="checkbox"
              checked={checked}
              ref={(el) => {
                if (el) el.indeterminate = indeterminate;
              }}
              onChange={(e) => toggleInviteLocationSelection(item.id, e.target.checked)}
            />
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', minWidth: 0 }}>
              <span style={{ color: 'var(--text-1)', fontWeight: 600 }}>{item.name}</span>
              <span style={{ color: 'var(--text-3)', fontSize: '0.66rem', textTransform: 'uppercase', letterSpacing: '0.05em', border: '1px solid var(--border-1)', borderRadius: '999px', padding: '1px 7px' }}>{item.type}</span>
            </span>
          </label>
          {renderInviteLocationTree(item.id, depth + 1)}
        </div>
      );
    });
  };

  const getParentOptionsForType = (type) => {
    const parentType = LOCATION_PARENT_TYPE[type];
    if (!parentType) return [];
    return activeLocations.filter((item) => item.type === parentType);
  };

  const parentOptionsForNewLocation = getParentOptionsForType(newLocation.type);
  const locationCountByType = LOCATION_TYPES.reduce((acc, type) => {
    acc[type] = locations.filter((item) => item.type === type).length;
    return acc;
  }, {});
  const sortedLocations = [...locations].sort((a, b) => {
    const typeOrderDiff = LOCATION_TYPES.indexOf(a.type) - LOCATION_TYPES.indexOf(b.type);
    if (typeOrderDiff !== 0) return typeOrderDiff;
    return getLocationPath(a).localeCompare(getLocationPath(b));
  });

  const paygPublicLocationOptions = activeLocations.map((item) => ({
    id: item.id,
    type: item.type,
    name: item.name,
    value: `${item.type.toUpperCase()} • ${getLocationPath(item, activeLocations)}`,
  }));
  const paygPublicLocationOptionsByType = LOCATION_TYPES.reduce((acc, type) => {
    acc[type] = paygPublicLocationOptions.filter((item) => item.type === type);
    return acc;
  }, {});

  const hasActiveBusinessTypes = businessTypes.some((item) => item.status === 'active');
  const hasActiveOrganizationTypes = organizationTypes.some((item) => item.status === 'active');
  const hasActiveLocations = locations.some((item) => item.status === 'active');
  const tabBlockedReason = {
    orgtype: hasActiveBusinessTypes ? '' : 'Create Business Type first',
    locations: hasActiveOrganizationTypes ? '' : 'Create Organization Type first',
    usertype: hasActiveLocations ? '' : 'Create Locations first',
  };

  const renderLocationTree = (parentId = null, depth = 0) => {
    const children = locations.filter((item) => (item.parentId || null) === parentId);
    const indentPx = depth * 24;

    return children.map((item) => (
      <div key={item.id} style={{ marginLeft: `${indentPx}px` }}>
        <div className="settings-list-row" style={{ marginBottom: 0 }}>
          <div style={{ display: 'grid', gap: '2px', minWidth: 0 }}>
            <strong style={{ color: 'var(--text-1)', fontSize: '0.86rem' }}>
              <i className="fa fa-chevron-right" style={{ marginRight: '6px', fontSize: '0.7rem', opacity: 0.6 }}></i>
              {item.name}
              <span style={{ marginLeft: '8px', fontSize: '0.76rem', color: 'var(--text-3)', fontWeight: 400 }}>({item.type})</span>
            </strong>
            {item.description && (
              <span style={{ color: 'var(--text-3)', fontSize: '0.72rem' }}>{item.description}</span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className={`status ${item.status === 'active' ? 'completed' : 'pending'}`}>{item.status}</span>
            <button type="button" className="act-btn" title="Enable/Disable" onClick={() => toggleLocationStatus(item.id)}><i className="fa fa-power-off"></i></button>
            <button type="button" className="act-btn red" title="Delete" onClick={() => deleteLocation(item.id)}><i className="fa fa-trash"></i></button>
          </div>
        </div>
        {renderLocationTree(item.id, depth + 1)}
      </div>
    ));
  };

  // Scope selector is used in non-public flow
  const paygScopeOptionsForBusiness = selectedBusinessForPayg?.isPublic
    ? PAYG_SCOPE_OPTIONS
    : PAYG_SCOPE_OPTIONS;

  const createPaygAllocation = () => {
    if (!paygAllocationForm.businessTypeId) {
      setHierarchyError('Select Business Type for PAYG allocation.');
      return;
    }

    const isPublic = Boolean(selectedBusinessForPayg?.isPublic);

    if (isPublic) {
      // For Public business: Location → User Type → Pricing Method (multi-select)
      const selectedLocationIds = paygAllocationForm.scopeLevels || [];
      const selectedUserTypes = paygAllocationForm.userTypeIds || [];
      const selectedMethods = paygAllocationForm.pricingMethods || [];

      if (selectedLocationIds.length === 0) {
        setHierarchyError('Select at least one location.');
        return;
      }
      if (selectedUserTypes.length === 0) {
        setHierarchyError('Select at least one user type.');
        return;
      }
      if (selectedMethods.length === 0) {
        setHierarchyError('Select at least one pricing method.');
        return;
      }

      const now = new Date().toISOString();
      const newAllocations = [];

      // Create allocation for each combination of Location × User Type × Pricing Method
      selectedLocationIds.forEach((locationId) => {
        const location = activeLocations.find((item) => item.id === locationId);
        if (!location) return;
        const scopeLevel = location.type.toLowerCase();
        const scopeValue = location.name;

        selectedUserTypes.forEach((userTypeId) => {
          selectedMethods.forEach((pricingMethod) => {
            const exists = paygAllocations.some((item) => (
              item.businessTypeId === paygAllocationForm.businessTypeId
              && item.userTypeId === userTypeId
              && item.pricingMethod.toLowerCase() === pricingMethod.toLowerCase()
              && (item.scopeLevel || 'global') === scopeLevel
              && (item.scopeValue || '').toLowerCase() === scopeValue.toLowerCase()
            ));

            if (!exists) {
              newAllocations.push({
                id: `payg-alloc-${now}-${locationId}-${userTypeId}-${pricingMethod}`,
                businessTypeId: paygAllocationForm.businessTypeId,
                organizationTypeId: null,
                userTypeId,
                pricingMethod,
                scopeLevel,
                scopeValue,
                locationId,
                status: paygAllocationForm.status,
                createdAt: now,
              });
            }
          });
        });
      });

      if (newAllocations.length === 0) {
        setHierarchyError('All selected combinations already exist.');
        return;
      }

      setPaygAllocations((prev) => [...prev, ...newAllocations]);
      setPaygAllocationForm((prev) => ({ ...prev, userTypeIds: [], pricingMethods: [], scopeLevels: [] }));
      setHierarchyError('');
    } else {
      // For Private business: Business → Org → User → Pricing (single select)
      const organizationTypeId = paygAllocationForm.organizationTypeId || null;

      if (!organizationTypeId) {
        setHierarchyError('Select Organization Type for PAYG allocation.');
        return;
      }
      if (!paygAllocationForm.userTypeId) {
        setHierarchyError('Select User Type for PAYG allocation.');
        return;
      }

      const scopeLevel = paygAllocationForm.scopeLevel || 'global';
      const scopeValue = paygAllocationForm.scopeValue.trim();
      if (scopeLevel !== 'global' && !scopeValue) {
        setHierarchyError(`Enter ${scopeLevel} name for scoped PAYG allocation.`);
        return;
      }

      const exists = paygAllocations.some((item) => (
        item.businessTypeId === paygAllocationForm.businessTypeId
        && (item.organizationTypeId || null) === organizationTypeId
        && item.userTypeId === paygAllocationForm.userTypeId
        && item.pricingMethod.toLowerCase() === paygAllocationForm.pricingMethod.toLowerCase()
        && (item.scopeLevel || 'global') === scopeLevel
        && (item.scopeValue || '').toLowerCase() === scopeValue.toLowerCase()
      ));

      if (exists) {
        setHierarchyError('PAYG allocation already exists for this mapping.');
        return;
      }

      const now = new Date().toISOString();
      setPaygAllocations((prev) => [...prev, {
        id: `payg-alloc-${now}`,
        businessTypeId: paygAllocationForm.businessTypeId,
        organizationTypeId,
        userTypeId: paygAllocationForm.userTypeId,
        pricingMethod: paygAllocationForm.pricingMethod,
        scopeLevel,
        scopeValue: scopeLevel === 'global' ? '' : scopeValue,
        status: paygAllocationForm.status,
        createdAt: now,
      }]);
      setPaygAllocationForm((prev) => ({ ...prev, organizationTypeId: '', userTypeId: '', scopeLevel: 'global', scopeValue: '' }));
      setHierarchyError('');
    }
  };

  const togglePaygAllocationStatus = (id) => {
    setPaygAllocations((prev) => prev.map((item) => item.id === id ? { ...item, status: item.status === 'active' ? 'inactive' : 'active' } : item));
  };

  const deletePaygAllocation = (id) => {
    setPaygAllocations((prev) => prev.filter((item) => item.id !== id));
  };

  const activeTabMeta = TABS.find((t) => t.id === activeTab);

  const applyMobilityTemplate = (template) => {
    const now = new Date().toISOString();

    let businessId = businessTypes.find((item) => item.name.toLowerCase() === template.businessType.toLowerCase())?.id;
    if (!businessId) {
      businessId = `bt-template-${now}`;
      setBusinessTypes((prev) => [...prev, {
        id: businessId,
        name: template.businessType,
        description: template.subtitle,
        isPublic: template.id === 'public-general',
        status: 'active',
        createdAt: now,
        updatedAt: now,
      }]);
    }

    const targetBusinessId = businessId;
    let orgId = null;
    if (template.id !== 'public-general') {
      orgId = organizationTypes.find((item) => item.businessTypeId === targetBusinessId && item.name.toLowerCase() === template.organizationType.toLowerCase())?.id || null;
      if (!orgId) {
        orgId = `ot-template-${now}`;
        setOrganizationTypes((prev) => [...prev, {
          id: orgId,
          businessTypeId: targetBusinessId,
          locationId: 'loc-global',
          name: template.organizationType,
          description: `Template: ${template.title}`,
          status: 'active',
          createdAt: now,
        }]);
      }
    }

    const orgForUsers = template.id === 'public-general' ? null : orgId;
    setHierUserTypes((prev) => {
      let next = [...prev];
      template.userTypes.forEach((name) => {
        const exists = next.some((item) => item.businessTypeId === targetBusinessId && (item.organizationTypeId || null) === orgForUsers && item.name.toLowerCase() === name.toLowerCase());
        if (!exists) {
          next = [...next, {
            id: `ut-template-${now}-${name.toLowerCase().replace(/\s+/g, '-')}`,
            businessTypeId: targetBusinessId,
            organizationTypeId: orgForUsers,
            name,
            description: `Template: ${template.title}`,
            status: 'active',
            createdAt: now,
          }];
        }
      });
      return next;
    });

    setPricingMethods((prev) => addUniqueItems(prev, template.pricingMethods));
    setTemplateNotice(`${template.title} template applied.`);
    window.setTimeout(() => setTemplateNotice(''), 2000);
  };

  return (
    <section className="page active space-y-4 settings-admin-page" id="page-settings">
      <div className="page-hero ph-settings">
        <div className="page-hero-left">
          <div className="page-hero-icon"><i className="fa fa-sliders"></i></div>
          <div className="page-hero-text">
            <h1>System Settings</h1>
            <p>Configure business taxonomy, user access, location structure, and profile governance.</p>
          </div>
        </div>
        <div className="page-hero-right">
          <div className="page-hero-chips">
            <span className="page-hero-chip"><i className="fa fa-sitemap"></i> {bizTypes.length + orgTypes.length} Taxonomy Entries</span>
            <span className="page-hero-chip"><i className="fa fa-user-shield"></i> {roles.length} Admin Roles</span>
          </div>
        </div>
      </div>

      <div className="settings-two-pane settings-admin-layout">
        {/* Settings Sub-Sidebar */}
        <aside className="settings-config-pane">
          <div className="settings-side-card !p-0 overflow-hidden">
            <div className="settings-nav-head px-5 py-4 border-b border-white/5">
              <span className="settings-nav-title text-[10px] uppercase tracking-widest font-bold text-white/40">Configuration</span>
            </div>
            <nav className="settings-tab-nav flex flex-col p-2 gap-1.5" aria-label="Settings categories">
              {(() => {
                const categories = {};
                TABS.forEach((tab) => {
                  const cat = tab.category || 'Other';
                  if (!categories[cat]) categories[cat] = [];
                  categories[cat].push(tab);
                });

                return Object.entries(categories).map(([category, tabs]) => (
                  <div key={category}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', padding: '8px 16px 4px', marginTop: category === 'Business Setup' ? 0 : '8px' }}>
                      {category}
                    </div>
                    {tabs.map((tab) => {
                      const isActive = activeTab === tab.id;
                      const disabledReason = tabBlockedReason[tab.id] || '';
                      const isDisabled = Boolean(disabledReason);
                      const count = tab.id === 'business' ? bizTypes.length
                        : tab.id === 'orgtype' ? orgTypes.length
                        : tab.id === 'locations' ? locations.length
                        : tab.id === 'usertype' ? userTypes.length
                        : tab.id === 'roles' ? roleTemplates.length
                        : tab.id === 'access' ? roles.length
                        : 4;

                      return (
                        <button
                          key={tab.id}
                          type="button"
                          className={`settings-tab-btn ${isActive ? 'is-active' : ''}`}
                          onClick={() => !isDisabled && setActiveTab(tab.id)}
                          disabled={isDisabled}
                          title={isDisabled ? disabledReason : ''}
                          style={isDisabled ? { opacity: 0.45, cursor: 'not-allowed' } : undefined}
                          aria-current={isActive ? 'page' : undefined}
                        >
                          <div className="settings-tab-icon-wrap">
                            <i className={`fa ${tab.icon} settings-tab-icon`}></i>
                          </div>
                          <span className="settings-tab-label flex-1 text-left text-[13px] font-bold tracking-tight">{tab.label}</span>
                          <span className="settings-tab-count text-[10px] font-bold px-2 py-0.5 rounded-full border transition-colors">
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ));
              })()}
            </nav>
          </div>
        </aside>

        <div className="settings-pane settings-content-pane min-w-0 w-full space-y-6">
          <div className="settings-pane-head settings-content-head !mb-0">
            <h3 className="settings-content-title !text-[1.1rem] !font-extrabold !tracking-tight">{activeTabMeta?.label}</h3>
            <p className="settings-content-subtitle text-[0.8rem] opacity-60">Manage your system's {activeTabMeta?.label.toLowerCase()} framework.</p>
          </div>


          {activeTab === 'business' && (
            <>
              <div className="settings-group">
                <h3 className="!mb-3 !pb-0 !border-none">Mobility Setup Templates</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-2)', marginBottom: '10px' }}>
                  Use these templates to quickly create standard mobility models.
                </p>
                <div style={{ display: 'grid', gap: '10px' }}>
                  {MOBILITY_TEMPLATES.map((template) => (
                    <div key={template.id} className="settings-list-row" style={{ alignItems: 'flex-start' }}>
                      <div style={{ display: 'grid', gap: '4px', minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                          <strong style={{ color: 'var(--text-1)', fontSize: '0.9rem' }}>{template.title}</strong>
                          <button type="button" className="btn-primary" onClick={() => applyMobilityTemplate(template)}>
                            <i className="fa fa-plus"></i> Apply
                          </button>
                        </div>
                        <span style={{ color: 'var(--text-2)', fontSize: '0.78rem' }}>{template.subtitle}</span>
                        <span style={{ color: 'var(--text-3)', fontSize: '0.74rem' }}>
                          Use cases: {template.useCases.join(', ')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                {templateNotice && (
                  <p style={{ marginTop: '10px', fontSize: '0.78rem', color: 'var(--brand-2)' }}>
                    <i className="fa fa-circle-check" style={{ marginRight: '4px' }}></i>{templateNotice}
                  </p>
                )}
              </div>

              <div className="settings-group">
                <h3 className="!mb-3 !pb-0 !border-none">Business Types</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '8px', marginBottom: '8px' }}>
                  <input
                    className="setting-input"
                    placeholder="Business type name"
                    value={newBusiness.name}
                    onChange={(e) => { setNewBusiness((p) => ({ ...p, name: e.target.value })); setHierarchyError(''); }}
                  />
                  <input
                    className="setting-input"
                    placeholder="Description"
                    value={newBusiness.description}
                    onChange={(e) => { setNewBusiness((p) => ({ ...p, description: e.target.value })); setHierarchyError(''); }}
                  />
                  <button type="button" className="btn-primary" onClick={createBusinessType}>
                    <i className="fa fa-plus"></i> Add
                  </button>
                </div>
                <label className="toggle-item" style={{ marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-2)' }}>Public type (organization optional)</span>
                  <input
                    type="checkbox"
                    checked={newBusiness.isPublic}
                    onChange={(e) => setNewBusiness((p) => ({ ...p, isPublic: e.target.checked }))}
                  />
                </label>
                <div className="settings-list">
                  {businessTypes.map((item) => (
                    <div key={item.id} className="settings-list-row">
                      <div style={{ display: 'grid', gap: '2px', minWidth: 0 }}>
                        <strong style={{ color: 'var(--text-1)', fontSize: '0.86rem' }}>{item.name}</strong>
                        <span style={{ color: 'var(--text-3)', fontSize: '0.74rem' }}>{item.description || 'No description'}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className={`status ${item.status === 'active' ? 'completed' : 'pending'}`}>{item.status}</span>
                        <button type="button" className="act-btn" title="Enable/Disable" onClick={() => toggleBusinessStatus(item.id)}><i className="fa fa-power-off"></i></button>
                        <button type="button" className="act-btn red" title="Delete" onClick={() => deleteBusinessType(item.id)}><i className="fa fa-trash"></i></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {activeTab === 'orgtype' && (
            <div className="settings-group">
              <h3 className="!mb-3 !pb-0 !border-none">Organization Types</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: '8px', marginBottom: '10px' }}>
                <select
                  className="setting-input"
                  value={newOrgType.businessTypeId}
                  onChange={(e) => { setNewOrgType((p) => ({ ...p, businessTypeId: e.target.value })); setHierarchyError(''); }}
                >
                  <option value="">Select Business Type</option>
                  {businessTypes.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
                <select
                  className="setting-input"
                  value={newOrgType.locationId}
                  onChange={(e) => { setNewOrgType((p) => ({ ...p, locationId: e.target.value })); setHierarchyError(''); }}
                >
                  <option value="">Default Scope: Global</option>
                  {activeLocations.map((item) => (
                    <option key={item.id} value={item.id}>{item.type} • {getLocationPath(item)}</option>
                  ))}
                </select>
                <input
                  className="setting-input"
                  placeholder="Organization type name"
                  value={newOrgType.name}
                  onChange={(e) => { setNewOrgType((p) => ({ ...p, name: e.target.value })); setHierarchyError(''); }}
                />
                <input
                  className="setting-input"
                  placeholder="Description"
                  value={newOrgType.description}
                  onChange={(e) => { setNewOrgType((p) => ({ ...p, description: e.target.value })); setHierarchyError(''); }}
                />
                <button type="button" className="btn-primary" onClick={createOrganizationType}><i className="fa fa-plus"></i> Add</button>
              </div>
              {selectedBusinessForOrg?.isPublic && (
                <p style={{ fontSize: '0.76rem', color: 'var(--text-3)', marginBottom: '8px' }}>
                  Selected Business Type is public. If needed, create organization types with explicit location scope.
                </p>
              )}
              <div className="settings-list">
                {organizationTypes.map((item) => {
                  const businessName = businessTypes.find((b) => b.id === item.businessTypeId)?.name || 'Unknown Business';
                  const scopedLocation = item.locationId ? locations.find((loc) => loc.id === item.locationId) : null;
                  return (
                    <div key={item.id} className="settings-list-row">
                      <div style={{ display: 'grid', gap: '2px', minWidth: 0 }}>
                        <strong style={{ color: 'var(--text-1)', fontSize: '0.86rem' }}>{item.name}</strong>
                        <span style={{ color: 'var(--text-2)', fontSize: '0.74rem' }}>Business: {businessName}</span>
                        <span style={{ color: 'var(--text-3)', fontSize: '0.72rem' }}>
                          Location Scope: {scopedLocation ? `${scopedLocation.type} • ${getLocationPath(scopedLocation)}` : 'Global • Global'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className={`status ${item.status === 'active' ? 'completed' : 'pending'}`}>{item.status}</span>
                        <button type="button" className="act-btn" title="Enable/Disable" onClick={() => toggleOrgStatus(item.id)}><i className="fa fa-power-off"></i></button>
                        <button type="button" className="act-btn red" title="Delete" onClick={() => deleteOrganizationType(item.id)}><i className="fa fa-trash"></i></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'locations' && (
            <div className="settings-group">
              <h3 className="!mb-3 !pb-0 !border-none">Locations</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-2)', marginBottom: '8px' }}>
                Build location hierarchy in order: Global to State to City to Station.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '8px', marginBottom: '10px' }}>
                {LOCATION_LEVEL_STEPS.map((step, index) => (
                  <div key={step.type} style={{ border: '1px solid var(--border-1)', borderRadius: '8px', padding: '8px 10px', background: 'var(--bg-2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        <i className={`fa ${step.icon}`} style={{ marginRight: '5px' }}></i>
                        Step {index + 1}
                      </span>
                      <span style={{ fontSize: '0.68rem', border: '1px solid var(--border)', borderRadius: '999px', padding: '1px 7px', color: 'var(--text-2)' }}>
                        {locationCountByType[step.type] || 0}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-1)' }}>{step.type}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>
                      {LOCATION_PARENT_TYPE[step.type] ? `Under ${LOCATION_PARENT_TYPE[step.type]}` : 'Root level'}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr 1.5fr 2fr auto', gap: '8px', marginBottom: '10px' }}>
                <select
                  className="setting-input"
                  value={newLocation.type}
                    onChange={(e) => { setNewLocation((p) => ({ ...p, type: e.target.value, parentId: '' })); setHierarchyError(''); }}
                >
                  {LOCATION_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                <select
                  className="setting-input"
                  value={newLocation.parentId}
                  onChange={(e) => { setNewLocation((p) => ({ ...p, parentId: e.target.value })); setHierarchyError(''); }}
                  disabled={!LOCATION_PARENT_TYPE[newLocation.type]}
                >
                  <option value="">
                    {LOCATION_PARENT_TYPE[newLocation.type]
                      ? `Select ${LOCATION_PARENT_TYPE[newLocation.type]}`
                      : 'No parent required'}
                  </option>
                  {parentOptionsForNewLocation.map((item) => (
                    <option key={item.id} value={item.id}>{getLocationPath(item)}</option>
                  ))}
                </select>
                <input
                  className="setting-input"
                  placeholder={`${newLocation.type} name`}
                  value={newLocation.name}
                  onChange={(e) => { setNewLocation((p) => ({ ...p, name: e.target.value })); setHierarchyError(''); }}
                />
                <input
                  className="setting-input"
                  placeholder={`Description for ${newLocation.type} (optional)`}
                  value={newLocation.description}
                  onChange={(e) => { setNewLocation((p) => ({ ...p, description: e.target.value })); setHierarchyError(''); }}
                />
                <button type="button" className="btn-primary" onClick={createLocation}><i className="fa fa-plus"></i> Add Location</button>
              </div>

              <div className="settings-list">
                {locations.length === 0 && (
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-3)', padding: '10px 0' }}>No locations yet.</p>
                )}
                {renderLocationTree()}
              </div>
            </div>
          )}

          {activeTab === 'pricing' && (
            <div style={{ display: 'grid', gap: '14px' }}>
              <div className="settings-group" style={{ background: 'linear-gradient(135deg, rgba(96,165,250,0.1), rgba(34,211,238,0.06))' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', flexWrap: 'wrap' }}>
                  <div style={{ minWidth: 0 }}>
                    <h3 className="!mb-1 !pb-0 !border-none">Pricing Control Center</h3>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-2)', marginBottom: 0 }}>
                      Manage base methods, advanced methods, and PAYG allocation from one place.
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <span className="page-hero-chip"><i className="fa fa-tag"></i> Base: {pricingMethods.length}</span>
                    <span className="page-hero-chip"><i className="fa fa-layer-group"></i> Advanced: {advancePricingMethods.length}</span>
                    <span className="page-hero-chip"><i className="fa fa-map-location-dot"></i> PAYG: {paygAllocations.length}</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '12px' }}>
                <div className="settings-group" style={{ marginBottom: 0 }}>
                  <h3 className="!mb-3 !pb-0 !border-none">Base Pricing Methods</h3>
                  <CollectionEditor
                    title="Price Methods"
                    items={pricingMethods}
                    placeholder="Add price method e.g. Simple..."
                    onAdd={(v) => setPricingMethods((p) => [...p, v])}
                    onRemove={(i) => setPricingMethods((p) => p.filter((_, ri) => ri !== i))}
                  />
                </div>

                <div className="settings-group" style={{ marginBottom: 0 }}>
                  <h3 className="!mb-3 !pb-0 !border-none">Advanced Pricing Methods</h3>
                  <CollectionEditor
                    title="Advance Price Methods"
                    items={advancePricingMethods}
                    placeholder="Add advance method e.g. Peak Advance..."
                    onAdd={(v) => setAdvancePricingMethods((p) => [...p, v])}
                    onRemove={(i) => setAdvancePricingMethods((p) => p.filter((_, ri) => ri !== i))}
                  />
                </div>
              </div>

              <div className="settings-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '6px' }}>
                  <h3 className="!mb-0 !pb-0 !border-none">PAYG Allocation</h3>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-3)' }}>
                    {selectedBusinessForPayg?.isPublic ? 'Public: select locations → user types → pricing methods' : 'Private: select org type → user type → pricing method → scope'}
                  </span>
                </div>

                {/* Business Type Selector */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px', marginBottom: '10px' }}>
                  <select
                    className="setting-input"
                    value={paygAllocationForm.businessTypeId}
                    onChange={(e) => {
                      setPaygAllocationForm((prev) => ({ ...prev, businessTypeId: e.target.value, organizationTypeId: '', userTypeId: '', scopeLevel: 'global', scopeValue: '', userTypeIds: [], pricingMethods: [], scopeLevels: [] }));
                      setHierarchyError('');
                    }}
                  >
                    <option value="">-- Select Business Type --</option>
                    {businessTypes.filter((item) => item.status === 'active').map((item) => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </select>
                </div>

                {/* Public Business Flow: Location → User Type → Pricing Method (inline checkbox panels) */}
                {selectedBusinessForPayg?.isPublic && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                    {/* Locations */}
                    <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border-1)', borderRadius: '8px', padding: '10px' }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                        <i className="fa fa-location-dot" style={{ marginRight: '4px' }}></i>Locations
                        {paygAllocationForm.scopeLevels.length > 0 && <span style={{ marginLeft: '6px', color: 'var(--brand-1)' }}>({paygAllocationForm.scopeLevels.length} selected)</span>}
                      </div>
                      {paygPublicLocationOptions.length === 0 ? (
                        <p style={{ margin: 0, fontSize: '0.74rem', color: 'var(--text-3)' }}>No active locations. Add them in the Locations tab first.</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '140px', overflowY: 'auto' }}>
                          {LOCATION_TYPES.map((type) => (
                            <div key={type} style={{ borderTop: '1px solid var(--border-1)', paddingTop: '4px', marginTop: '2px' }}>
                              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '3px' }}>
                                {type} ({paygPublicLocationOptionsByType[type]?.length || 0})
                              </div>
                              {(paygPublicLocationOptionsByType[type] || []).map((location) => (
                                <label key={location.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 6px', cursor: 'pointer', borderRadius: '5px', fontSize: '0.8rem', background: paygAllocationForm.scopeLevels.includes(location.id) ? 'rgba(0,212,160,0.08)' : 'transparent' }}>
                                  <input
                                    type="checkbox"
                                    checked={paygAllocationForm.scopeLevels.includes(location.id)}
                                    onChange={(e) => {
                                      setPaygAllocationForm((prev) => ({
                                        ...prev,
                                        scopeLevels: e.target.checked
                                          ? [...prev.scopeLevels, location.id]
                                          : prev.scopeLevels.filter((s) => s !== location.id)
                                      }));
                                      setHierarchyError('');
                                    }}
                                  />
                                  {location.value}
                                </label>
                              ))}
                              {(paygPublicLocationOptionsByType[type] || []).length === 0 && (
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-3)', paddingLeft: '6px' }}>No active {type.toLowerCase()}.</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* User Types */}
                    <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border-1)', borderRadius: '8px', padding: '10px' }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                        <i className="fa fa-users" style={{ marginRight: '4px' }}></i>User Types
                        {paygAllocationForm.userTypeIds.length > 0 && <span style={{ marginLeft: '6px', color: 'var(--brand-1)' }}>({paygAllocationForm.userTypeIds.length} selected)</span>}
                      </div>
                      {filteredUserOptionsForPayg.length === 0 ? (
                        <p style={{ margin: 0, fontSize: '0.74rem', color: 'var(--text-3)' }}>No user types for this business.</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '140px', overflowY: 'auto' }}>
                          {filteredUserOptionsForPayg.map((item) => (
                            <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 6px', cursor: 'pointer', borderRadius: '5px', fontSize: '0.8rem', background: paygAllocationForm.userTypeIds.includes(item.id) ? 'rgba(0,212,160,0.08)' : 'transparent' }}>
                              <input
                                type="checkbox"
                                checked={paygAllocationForm.userTypeIds.includes(item.id)}
                                onChange={(e) => {
                                  setPaygAllocationForm((prev) => ({
                                    ...prev,
                                    userTypeIds: e.target.checked
                                      ? [...prev.userTypeIds, item.id]
                                      : prev.userTypeIds.filter((id) => id !== item.id)
                                  }));
                                  setHierarchyError('');
                                }}
                              />
                              {item.name}
                            </label>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Pricing Methods */}
                    <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border-1)', borderRadius: '8px', padding: '10px' }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                        <i className="fa fa-tags" style={{ marginRight: '4px' }}></i>Pricing Methods
                        {paygAllocationForm.pricingMethods.length > 0 && <span style={{ marginLeft: '6px', color: 'var(--brand-1)' }}>({paygAllocationForm.pricingMethods.length} selected)</span>}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '140px', overflowY: 'auto' }}>
                        {pricingMethods.map((method) => (
                          <label key={method} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 6px', cursor: 'pointer', borderRadius: '5px', fontSize: '0.8rem', background: paygAllocationForm.pricingMethods.includes(method) ? 'rgba(0,212,160,0.08)' : 'transparent' }}>
                            <input
                              type="checkbox"
                              checked={paygAllocationForm.pricingMethods.includes(method)}
                              onChange={(e) => {
                                setPaygAllocationForm((prev) => ({
                                  ...prev,
                                  pricingMethods: e.target.checked
                                    ? [...prev.pricingMethods, method]
                                    : prev.pricingMethods.filter((m) => m !== method)
                                }));
                                setHierarchyError('');
                              }}
                            />
                            {method}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                {selectedBusinessForPayg?.isPublic && (
                  <button type="button" className="btn-primary" onClick={createPaygAllocation} style={{ marginBottom: '12px' }}>
                    <i className="fa fa-plus"></i> Allocate Selected Combinations
                  </button>
                )}

                {/* Private Business Flow: Business → Org → User → Pricing */}
                {!selectedBusinessForPayg?.isPublic && paygAllocationForm.businessTypeId && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr auto', gap: '8px', marginBottom: '10px' }}>
                    <select
                      className="setting-input"
                      value={paygAllocationForm.organizationTypeId}
                      onChange={(e) => {
                        setPaygAllocationForm((prev) => ({ ...prev, organizationTypeId: e.target.value, userTypeId: '' }));
                        setHierarchyError('');
                      }}
                    >
                      <option value="">Organization Type</option>
                      {filteredOrgOptionsForPayg.map((item) => (
                        <option key={item.id} value={item.id}>{item.name}</option>
                      ))}
                    </select>

                    <select
                      className="setting-input"
                      value={paygAllocationForm.userTypeId}
                      onChange={(e) => {
                        setPaygAllocationForm((prev) => ({ ...prev, userTypeId: e.target.value }));
                        setHierarchyError('');
                      }}
                    >
                      <option value="">User Type</option>
                      {filteredUserOptionsForPayg.map((item) => (
                        <option key={item.id} value={item.id}>{item.name}</option>
                      ))}
                    </select>

                    <select
                      className="setting-input"
                      value={paygAllocationForm.pricingMethod}
                      onChange={(e) => setPaygAllocationForm((prev) => ({ ...prev, pricingMethod: e.target.value }))}
                    >
                      {pricingMethods.map((method) => (
                        <option key={method} value={method}>{method}</option>
                      ))}
                    </select>

                    <select
                      className="setting-input"
                      value={paygAllocationForm.scopeLevel}
                      onChange={(e) => {
                        const scope = e.target.value;
                        setPaygAllocationForm((prev) => ({ ...prev, scopeLevel: scope, scopeValue: (scope === 'global' || scope === '') ? '' : prev.scopeValue }));
                      }}
                    >
                      {paygScopeOptionsForBusiness.map((scope) => (
                        <option key={scope.value} value={scope.value}>{scope.label}</option>
                      ))}
                    </select>

                    {paygAllocationForm.scopeLevel === 'global' ? (
                      <input className="setting-input" value="All Locations" disabled />
                    ) : (
                      <input
                        className="setting-input"
                        value={paygAllocationForm.scopeValue}
                        onChange={(e) => setPaygAllocationForm((prev) => ({ ...prev, scopeValue: e.target.value }))}
                        placeholder={`Enter ${paygAllocationForm.scopeLevel} name`}
                      />
                    )}

                    <button type="button" className="btn-primary" onClick={createPaygAllocation}>
                      <i className="fa fa-plus"></i> Allocate
                    </button>
                  </div>
                )}

                <div className="settings-list" style={{ marginTop: '14px', position: 'relative', zIndex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', paddingBottom: '6px', borderBottom: '1px solid var(--border)' }}>
                    <strong style={{ fontSize: '0.8rem', color: 'var(--text-1)' }}>Configured Allocations</strong>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-3)', background: 'var(--bg-elevated)', padding: '2px 8px', borderRadius: '99px', border: '1px solid var(--border)' }}>
                      {paygAllocations.filter((item) => item.businessTypeId === paygAllocationForm.businessTypeId).length} record(s)
                    </span>
                  </div>
                  {!paygAllocationForm.businessTypeId && (
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-3)', padding: '10px 0' }}>Select a business type above to view allocations.</p>
                  )}
                  {paygAllocationForm.businessTypeId && paygAllocations.filter((item) => item.businessTypeId === paygAllocationForm.businessTypeId).length === 0 && (
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-3)', padding: '10px 0' }}>No allocations yet for this business type.</p>
                  )}
                  {paygAllocations.filter((item) => item.businessTypeId === paygAllocationForm.businessTypeId).map((item) => {
                    const business = businessTypes.find((b) => b.id === item.businessTypeId);
                    const organization = item.organizationTypeId ? organizationTypes.find((o) => o.id === item.organizationTypeId) : null;
                    const userType = hierUserTypes.find((u) => u.id === item.userTypeId);
                    const linkedLocation = item.locationId ? locations.find((loc) => loc.id === item.locationId) : null;
                    return (
                      <div key={item.id} className="settings-list-row">
                        <div style={{ display: 'grid', gap: '2px', minWidth: 0 }}>
                          <strong style={{ color: 'var(--text-1)', fontSize: '0.84rem' }}>
                            {business?.isPublic ? `${business.name}` : `${business?.name} • ${organization?.name || 'No Org'}`} • {userType?.name || 'Unknown User'}
                          </strong>
                          <span style={{ color: 'var(--text-2)', fontSize: '0.74rem' }}>Pricing Method: {item.pricingMethod}</span>
                          <span style={{ color: 'var(--text-3)', fontSize: '0.72rem' }}>
                            Location: {linkedLocation ? `${linkedLocation.type.toUpperCase()} • ${getLocationPath(linkedLocation)}` : `${(item.scopeLevel || 'global').toUpperCase()}${item.scopeValue ? ` • ${item.scopeValue}` : ''}`}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span className={`status ${item.status === 'active' ? 'completed' : 'pending'}`}>{item.status}</span>
                          <button type="button" className="act-btn" title="Enable/Disable" onClick={() => togglePaygAllocationStatus(item.id)}><i className="fa fa-power-off"></i></button>
                          <button type="button" className="act-btn red" title="Delete" onClick={() => deletePaygAllocation(item.id)}><i className="fa fa-trash"></i></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'usertype' && (
            <div className="settings-group">
              <h3 className="!mb-3 !pb-0 !border-none">User Types</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: '8px', marginBottom: '10px' }}>
                <select
                  className="setting-input"
                  value={newUserType.businessTypeId}
                  onChange={(e) => {
                    setNewUserType((p) => ({ ...p, businessTypeId: e.target.value, organizationTypeId: '' }));
                    setHierarchyError('');
                  }}
                >
                  <option value="">Select Business Type</option>
                  {businessTypes.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
                <select
                  className="setting-input"
                  value={newUserType.organizationTypeId}
                  onChange={(e) => { setNewUserType((p) => ({ ...p, organizationTypeId: e.target.value })); setHierarchyError(''); }}
                  disabled={Boolean(selectedBusinessForUser?.isPublic)}
                >
                  <option value="">{selectedBusinessForUser?.isPublic ? 'No organization required' : 'Select Organization Type'}</option>
                  {filteredOrgOptionsForUser.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
                <input
                  className="setting-input"
                  placeholder={selectedBusinessForUser?.isPublic ? 'General User (default)' : 'User type name'}
                  value={newUserType.name}
                  onChange={(e) => { setNewUserType((p) => ({ ...p, name: e.target.value })); setHierarchyError(''); }}
                />
                <input
                  className="setting-input"
                  placeholder="Description"
                  value={newUserType.description}
                  onChange={(e) => { setNewUserType((p) => ({ ...p, description: e.target.value })); setHierarchyError(''); }}
                />
                <button type="button" className="btn-primary" onClick={createUserType}><i className="fa fa-plus"></i> Add</button>
              </div>
              <div className="settings-list">
                {hierUserTypes.map((item) => {
                  const businessName = businessTypes.find((b) => b.id === item.businessTypeId)?.name || 'Unknown Business';
                  const orgName = item.organizationTypeId
                    ? organizationTypes.find((o) => o.id === item.organizationTypeId)?.name || 'Unknown Org'
                    : 'No Organization';
                  return (
                    <div key={item.id} className="settings-list-row">
                      <div style={{ display: 'grid', gap: '2px', minWidth: 0 }}>
                        <strong style={{ color: 'var(--text-1)', fontSize: '0.86rem' }}>{item.name}</strong>
                        <span style={{ color: 'var(--text-2)', fontSize: '0.74rem' }}>{businessName} • {orgName}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className={`status ${item.status === 'active' ? 'completed' : 'pending'}`}>{item.status}</span>
                        <button type="button" className="act-btn" title="Enable/Disable" onClick={() => toggleUserStatus(item.id)}><i className="fa fa-power-off"></i></button>
                        <button type="button" className="act-btn red" title="Delete" onClick={() => deleteUserType(item.id)}><i className="fa fa-trash"></i></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'vehicletype' && (
            <div className="settings-group">
              <h3 className="!mb-3 !pb-0 !border-none">Vehicle Types</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-2)', marginBottom: '10px' }}>
                Define master vehicle categories with seat capacity and whether a driver is required. These settings are used across fleet, pricing, ride logic, and allocations.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 120px 160px 1.4fr auto', gap: '8px', marginBottom: '10px' }}>
                <input
                  className="setting-input"
                  placeholder="Vehicle type name"
                  value={newVehicleType.name}
                  onChange={(e) => { setNewVehicleType((prev) => ({ ...prev, name: e.target.value })); setHierarchyError(''); }}
                />
                <input
                  type="number"
                  min="1"
                  className="setting-input"
                  placeholder="Seats"
                  value={newVehicleType.seatCount}
                  onChange={(e) => { setNewVehicleType((prev) => ({ ...prev, seatCount: e.target.value })); setHierarchyError(''); }}
                />
                <label className="toggle-item" style={{ margin: 0, padding: '0 10px', border: '1px solid var(--border)', borderRadius: '8px', minHeight: '40px', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-2)' }}>Driver applicable</span>
                  <input
                    type="checkbox"
                    checked={newVehicleType.driverApplicable}
                    onChange={(e) => { setNewVehicleType((prev) => ({ ...prev, driverApplicable: e.target.checked })); setHierarchyError(''); }}
                  />
                </label>
                <input
                  className="setting-input"
                  placeholder="Description"
                  value={newVehicleType.description}
                  onChange={(e) => { setNewVehicleType((prev) => ({ ...prev, description: e.target.value })); setHierarchyError(''); }}
                />
                <button type="button" className="btn-primary" onClick={createVehicleType}><i className="fa fa-plus"></i> Add</button>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
                <span className="page-hero-chip"><i className="fa fa-layer-group"></i> {activeVehicleTypes.length} Active Types</span>
                <span className="page-hero-chip"><i className="fa fa-id-card"></i> Seats defined per type</span>
                <span className="page-hero-chip"><i className="fa fa-steering-wheel"></i> Driver rule managed centrally</span>
              </div>

              <div className="settings-list">
                {vehicleTypes.map((item) => (
                  <div key={item.id} className="settings-list-row">
                    <div style={{ display: 'grid', gap: '2px', minWidth: 0 }}>
                      <strong style={{ color: 'var(--text-1)', fontSize: '0.86rem' }}>{item.name}</strong>
                      <span style={{ color: 'var(--text-2)', fontSize: '0.74rem' }}>
                        Seats: {item.seatCount} • {item.driverApplicable ? 'Driver Applicable' : 'Self Ride'}
                      </span>
                      <span style={{ color: 'var(--text-3)', fontSize: '0.72rem' }}>{item.description || 'No description'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="status completed">{item.seatCount} seats</span>
                      <span className={`status ${item.driverApplicable ? 'processing' : 'pending'}`}>{item.driverApplicable ? 'Driver' : 'Self Ride'}</span>
                      <span className={`status ${item.status === 'active' ? 'completed' : 'pending'}`}>{item.status}</span>
                      <button type="button" className="act-btn" title="Enable/Disable" onClick={() => toggleVehicleTypeStatus(item.id)}><i className="fa fa-power-off"></i></button>
                      <button type="button" className="act-btn red" title="Delete" onClick={() => deleteVehicleType(item.id)}><i className="fa fa-trash"></i></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'roles' && (
            <div style={{ display: 'grid', gap: '12px' }}>
              <div className="settings-group" style={{ padding: '0', overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '320px minmax(0, 1fr)' }}>
                  <div style={{ borderRight: '1px solid var(--border-1)', background: 'var(--bg-2)', padding: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <h3 className="!mb-0 !pb-0 !border-none" style={{ fontSize: '0.95rem' }}>Role Library</h3>
                      <button
                        type="button"
                        className="btn-outline"
                        onClick={() => setRoleTemplateForm({ id: '', name: '', description: '', featureIds: [], organizationTypeIds: [], locationIds: [], status: 'active' })}
                      >
                        <i className="fa fa-plus"></i> New
                      </button>
                    </div>
                    <p style={{ fontSize: '0.74rem', color: 'var(--text-3)', marginBottom: '10px' }}>
                      Select a role to edit or create a fresh template.
                    </p>
                    <div style={{ display: 'grid', gap: '6px', maxHeight: '560px', overflowY: 'auto', paddingRight: '2px' }}>
                      {roleTemplates.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => editRoleTemplate(item.id)}
                          style={{
                            border: roleTemplateForm.id === item.id ? '1px solid var(--brand-1)' : '1px solid var(--border-1)',
                            background: roleTemplateForm.id === item.id ? 'rgba(0,212,160,0.08)' : 'var(--bg-1)',
                            borderRadius: '8px',
                            padding: '8px',
                            textAlign: 'left',
                            display: 'grid',
                            gap: '3px',
                            cursor: 'pointer',
                          }}
                        >
                          <strong style={{ fontSize: '0.8rem', color: 'var(--text-1)' }}>{item.name}</strong>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>{item.featureIds?.length || 0} features • {item.organizationTypeIds?.length || 0} orgs • {item.locationIds?.length || 0} locations</span>
                          <span className={`status ${item.status === 'active' ? 'completed' : 'pending'}`} style={{ justifySelf: 'start' }}>{item.status}</span>
                        </button>
                      ))}
                      {roleTemplates.length === 0 && (
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>No role templates yet.</p>
                      )}
                    </div>
                  </div>

                  <div style={{ padding: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
                      <div>
                        <h3 className="!mb-1 !pb-0 !border-none">Role Composer</h3>
                        <p style={{ marginBottom: 0, fontSize: '0.76rem', color: 'var(--text-3)' }}>Configure profile, website/settings permissions, organization visibility, and location scope.</p>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <span className="page-hero-chip"><i className="fa fa-shield"></i> Selected: {roleTemplateForm.featureIds.length + roleTemplateForm.organizationTypeIds.length + roleTemplateForm.locationIds.length}</span>
                        <span className="page-hero-chip"><i className="fa fa-layer-group"></i> Active Roles: {roleTemplates.filter((item) => item.status === 'active').length}</span>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 180px auto', gap: '8px', marginBottom: '10px' }}>
                      <input
                        className="setting-input"
                        placeholder="Role name"
                        value={roleTemplateForm.name}
                        onChange={(e) => { setRoleTemplateForm((prev) => ({ ...prev, name: e.target.value })); setHierarchyError(''); }}
                      />
                      <input
                        className="setting-input"
                        placeholder="Short description"
                        value={roleTemplateForm.description}
                        onChange={(e) => { setRoleTemplateForm((prev) => ({ ...prev, description: e.target.value })); setHierarchyError(''); }}
                      />
                      <select className="setting-input" value={roleTemplateForm.status} onChange={(e) => setRoleTemplateForm((prev) => ({ ...prev, status: e.target.value }))}>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                      <button type="button" className="btn-primary" onClick={saveRoleTemplate}>
                        <i className={`fa ${roleTemplateForm.id ? 'fa-pen' : 'fa-plus'}`}></i> {roleTemplateForm.id ? 'Update' : 'Create'}
                      </button>
                    </div>

                    <div style={{ display: 'grid', gap: '10px' }}>
                      <div style={{ border: '1px solid var(--border-1)', borderRadius: '8px', padding: '10px', background: 'var(--bg-2)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                          <strong style={{ fontSize: '0.8rem', color: 'var(--text-1)' }}>Feature Matrix</strong>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            <button type="button" className="btn-outline" onClick={() => setRoleTemplateForm((prev) => ({ ...prev, featureIds: [...new Set([...prev.featureIds, ...websiteFeatureIds])] }))}>Website All</button>
                            <button type="button" className="btn-outline" onClick={() => setRoleTemplateForm((prev) => ({ ...prev, featureIds: [...new Set([...prev.featureIds, ...settingsFeatureIds])] }))}>Settings All</button>
                            <button type="button" className="btn-outline" onClick={() => setRoleTemplateForm((prev) => ({ ...prev, featureIds: [] }))}>Clear</button>
                          </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '8px', maxHeight: '280px', overflowY: 'auto' }}>
                          {Object.entries(groupedRoleFeatureOptions).map(([category, items]) => (
                            <div key={category} style={{ border: '1px solid var(--border-1)', borderRadius: '8px', padding: '7px', background: 'var(--bg-1)' }}>
                              <div style={{ fontSize: '0.68rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>{category}</div>
                              <div style={{ display: 'grid', gap: '3px' }}>
                                {items.map((item) => (
                                  <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '0.77rem' }}>
                                    <input
                                      type="checkbox"
                                      checked={roleTemplateForm.featureIds.includes(item.id)}
                                      onChange={(e) => setRoleTemplateForm((prev) => ({
                                        ...prev,
                                        featureIds: e.target.checked
                                          ? [...prev.featureIds, item.id]
                                          : prev.featureIds.filter((id) => id !== item.id),
                                      }))}
                                    />
                                    <span>{item.label}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div style={{ border: '1px solid var(--border-1)', borderRadius: '8px', padding: '10px', background: 'var(--bg-2)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <strong style={{ fontSize: '0.8rem', color: 'var(--text-1)' }}>Organization Access</strong>
                            <button type="button" className="btn-outline" onClick={() => setRoleTemplateForm((prev) => ({ ...prev, organizationTypeIds: prev.organizationTypeIds.length === activeOrganizationOptions.length ? [] : activeOrganizationOptions.map((item) => item.id) }))}>
                              {roleTemplateForm.organizationTypeIds.length === activeOrganizationOptions.length ? 'Clear' : 'Select All'}
                            </button>
                          </div>
                          <div style={{ display: 'grid', gap: '4px', maxHeight: '180px', overflowY: 'auto' }}>
                            {activeOrganizationOptions.length === 0 && <span style={{ fontSize: '0.74rem', color: 'var(--text-3)' }}>No active organizations.</span>}
                            {activeOrganizationOptions.map((item) => {
                              const scopedLocation = item.locationId ? locations.find((loc) => loc.id === item.locationId) : null;
                              return (
                                <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '0.77rem' }}>
                                  <input
                                    type="checkbox"
                                    checked={roleTemplateForm.organizationTypeIds.includes(item.id)}
                                    onChange={(e) => setRoleTemplateForm((prev) => ({
                                      ...prev,
                                      organizationTypeIds: e.target.checked
                                        ? [...prev.organizationTypeIds, item.id]
                                        : prev.organizationTypeIds.filter((id) => id !== item.id),
                                    }))}
                                  />
                                  <span>{item.name} <span style={{ color: 'var(--text-3)' }}>• {scopedLocation ? `${scopedLocation.type} • ${getLocationPath(scopedLocation)}` : 'No location scope'}</span></span>
                                </label>
                              );
                            })}
                          </div>
                        </div>

                        <div style={{ border: '1px solid var(--border-1)', borderRadius: '8px', padding: '10px', background: 'var(--bg-2)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <strong style={{ fontSize: '0.8rem', color: 'var(--text-1)' }}>Location Access</strong>
                            <button type="button" className="btn-outline" onClick={() => setRoleTemplateForm((prev) => ({ ...prev, locationIds: prev.locationIds.length === activeLocations.length ? [] : activeLocations.map((item) => item.id) }))}>
                              {roleTemplateForm.locationIds.length === activeLocations.length ? 'Clear' : 'Select All'}
                            </button>
                          </div>
                          <div style={{ display: 'grid', gap: '4px', maxHeight: '180px', overflowY: 'auto' }}>
                            {activeLocations.length === 0 && <span style={{ fontSize: '0.74rem', color: 'var(--text-3)' }}>No active locations.</span>}
                            {activeLocations.map((item) => (
                              <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '0.77rem' }}>
                                <input
                                  type="checkbox"
                                  checked={roleTemplateForm.locationIds.includes(item.id)}
                                  onChange={(e) => setRoleTemplateForm((prev) => ({
                                    ...prev,
                                    locationIds: e.target.checked
                                      ? [...prev.locationIds, item.id]
                                      : prev.locationIds.filter((id) => id !== item.id),
                                  }))}
                                />
                                <span>{item.type} • {getLocationPath(item)}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {hierarchyError && (
            <div className="settings-group" style={{ borderColor: 'rgba(251,113,133,0.4)' }}>
              <p style={{ color: 'var(--accent-red)', fontSize: '0.8rem' }}>
                <i className="fa fa-circle-exclamation" style={{ marginRight: '6px' }}></i>{hierarchyError}
              </p>
            </div>
          )}

          {/* Access Management */}
          {activeTab === 'access' && (
            <div className="settings-group">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <h3 className="!mb-0 !pb-0 !border-none">Access Management</h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" className={`btn-outline${fpRoles.anyFiltered ? ' filter-btn-active' : ''}`} onClick={() => fpRoles.setOpen(true)}>
                    <i className="fa fa-filter"></i> Filter{fpRoles.anyFiltered ? ` (${fpRoles.filterCount})` : ''}
                  </button>
                  <button type="button" className="btn-primary" onClick={() => setShowInvite(true)} disabled={roleTemplates.filter((item) => item.status === 'active').length === 0}>
                    <i className="fa fa-envelope"></i> Invite
                  </button>
                </div>
              </div>

              {roleTemplates.filter((item) => item.status === 'active').length === 0 && (
                <p style={{ fontSize: '0.76rem', color: 'var(--text-3)', marginBottom: '10px' }}>
                  No active role templates found. Create roles in Create Roles tab before inviting users.
                </p>
              )}

              <div className="table-card">
                <div className="table-wrap overflow-x-auto">
                  <table className="data-table" style={{ width: '100%', tableLayout: 'fixed', minWidth: 0 }}>
                    <thead>
                      <tr>
                        <th style={{ width: '20%' }}>Email</th>
                        <th style={{ width: '16%' }}>Role</th>
                        <th style={{ width: '22%' }}>Organizations</th>
                        <th style={{ width: '22%' }}>Locations</th>
                        <th style={{ width: '10%' }}>Status</th>
                        <th style={{ width: '10%' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleRoles.map((r, i) => (
                        <tr key={i}>
                          <td style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={r.email}>{r.email}</td>
                          <td style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={r.role}>{r.role}</td>
                          <td style={{ whiteSpace: 'normal', overflowWrap: 'anywhere', lineHeight: 1.35 }} title={r.organizationsDisplay}>{r.organizationsDisplay}</td>
                          <td style={{ whiteSpace: 'normal', overflowWrap: 'anywhere', lineHeight: 1.35 }} title={r.locationsDisplay}>{r.locationsDisplay}</td>
                          <td style={{ whiteSpace: 'nowrap' }}><span className={`status ${r.status === 'Active' ? 'completed' : 'pending'}`}>{r.status}</span></td>
                          <td style={{ textAlign: 'center', paddingRight: '10px' }}>
                            <button type="button" className="act-btn red" title="Remove assignment" onClick={() => setRoles((p) => p.filter((_, ri) => ri !== r._rowIndex))}>
                              <i className="fa fa-trash"></i>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <FilterPanel hook={fpRoles} columns={ROLE_COLUMNS} data={roleRows} />
            </div>
          )}

          {/* Profile & Brand */}
          {activeTab === 'profile' && (
            <>
              <div className="settings-group">
                <h3><i className="fa fa-building"></i> Organization</h3>
                <div className="form-grid">
                  <div className="form-field">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>Platform Name <span style={{ color: 'var(--accent-red)' }}>*</span></label>
                    <input className="setting-input" value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="e.g. MOS Mobility" required />
                  </div>
                  <div className="form-field">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>Support Email <span style={{ color: 'var(--accent-red)' }}>*</span></label>
                    <input className="setting-input" type="email" value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} placeholder="support@example.com" required />
                  </div>
                  <div className="form-field full">
                    <label>Platform URL</label>
                    <input className="setting-input" value={platformUrl} onChange={(e) => setPlatformUrl(e.target.value)} placeholder="https://console.example.com" />
                  </div>
                </div>
              </div>

              <div className="settings-group">
                <h3><i className="fa fa-bell"></i> Notifications</h3>
                <div className="setting-item toggle-item">
                  <div>
                    <div className="text-[0.83rem] font-medium" style={{ color: 'var(--text-1)' }}>Email alerts</div>
                    <div className="text-[0.72rem]" style={{ color: 'var(--text-2)' }}>Receive alerts via email for critical events</div>
                  </div>
                  <label className="toggle"><input type="checkbox" checked={notifEmail} onChange={(e) => setNotifEmail(e.target.checked)} /><span className="slider"></span></label>
                </div>
                <div className="setting-item toggle-item">
                  <div>
                    <div className="text-[0.83rem] font-medium" style={{ color: 'var(--text-1)' }}>SMS alerts</div>
                    <div className="text-[0.72rem]" style={{ color: 'var(--text-2)' }}>Receive SMS for critical alerts only</div>
                  </div>
                  <label className="toggle"><input type="checkbox" checked={notifSms} onChange={(e) => setNotifSms(e.target.checked)} /><span className="slider"></span></label>
                </div>
                <div className="setting-item toggle-item">
                  <div>
                    <div className="text-[0.83rem] font-medium" style={{ color: 'var(--text-1)' }}>Two-factor authentication</div>
                    <div className="text-[0.72rem]" style={{ color: 'var(--text-2)' }}>Require 2FA for all admin accounts</div>
                  </div>
                  <label className="toggle"><input type="checkbox" checked={twoFa} onChange={(e) => setTwoFa(e.target.checked)} /><span className="slider"></span></label>
                </div>
                <div className="settings-save mt-2">
                  <button className="btn-primary" onClick={handleSaveProfile}><i className="fa fa-check"></i> {profileSaveState === 'saved' ? 'Saved' : 'Save Changes'}</button>
                  <button className="btn-outline" onClick={handleResetProfile}>Reset</button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Invite modal */}
      <Modal
        open={showInvite}
        title="Invite Admin User"
        onClose={() => { setShowInvite(false); setInviteError(''); }}
        size="md"
        footer={
          <>
            <button className="btn-outline" type="button" onClick={() => { setShowInvite(false); setInviteError(''); }}>Cancel</button>
            <button className="btn-primary" type="button" onClick={handleInvite}>Send Invite</button>
          </>
        }
      >
        <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div className="form-field" style={{ gridColumn: 'span 1' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              Email Address
              <span style={{ color: 'var(--accent-red)' }} aria-hidden="true">*</span>
            </label>
            <input
              className={`setting-input${inviteError ? ' input-error' : ''}`}
              type="email"
              placeholder="user@example.com"
              value={invite.email}
              onChange={(e) => { setInvite((p) => ({ ...p, email: e.target.value })); if (inviteError) setInviteError(''); }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleInvite(); } }}
              aria-required="true"
            />
            {inviteError && (
              <span style={{ fontSize: '0.74rem', color: 'var(--accent-red)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '3px' }}>
                <i className="fa fa-circle-exclamation"></i> {inviteError}
              </span>
            )}
          </div>
          <div className="form-field" style={{ gridColumn: 'span 1' }}>
            <label>Role</label>
            <select className="setting-input" value={invite.role} onChange={(e) => setInvite((p) => ({ ...p, role: e.target.value, organizationTypeIds: [], locationIds: [] }))}>
              {roleTemplates.filter((item) => item.status === 'active').length === 0 && <option value="">No active roles</option>}
              {roleTemplates.filter((item) => item.status === 'active').map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
            </select>
          </div>

          <div className="form-field" style={{ gridColumn: 'span 1' }}>
            <label>Locations</label>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>Global → State → City → Station</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn-outline"
                  style={{ padding: '2px 8px', fontSize: '0.68rem' }}
                  onClick={() => {
                    setInvite((prev) => ({ ...prev, locationIds: activeLocations.map((item) => item.id) }));
                    if (inviteError) setInviteError('');
                  }}
                >
                  Select All
                </button>
                <button
                  type="button"
                  className="btn-outline"
                  style={{ padding: '2px 8px', fontSize: '0.68rem' }}
                  onClick={() => {
                    setInvite((prev) => ({ ...prev, locationIds: [] }));
                    if (inviteError) setInviteError('');
                  }}
                >
                  Clear
                </button>
              </div>
            </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>Choose location scope first</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--brand-1)' }}>{invite.locationIds.length} selected</span>
              </div>
              <div style={{ display: 'grid', gap: '4px', maxHeight: '240px', overflowY: 'auto', border: '1px solid var(--border-1)', borderRadius: '10px', padding: '10px', background: 'var(--bg-2)' }}>
              {activeLocations.length === 0 && <span style={{ fontSize: '0.74rem', color: 'var(--text-3)' }}>No active locations.</span>}
              {renderInviteLocationTree()}
            </div>
          </div>

            <div className="form-field" style={{ gridColumn: 'span 1' }}>
            <label>Organizations</label>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>Organizations from selected locations</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--brand-1)' }}>{invite.organizationTypeIds.length} selected</span>
              </div>
              <div style={{ display: 'grid', gap: '5px', maxHeight: '240px', overflowY: 'auto', border: '1px solid var(--border-1)', borderRadius: '10px', padding: '10px', background: 'var(--bg-2)' }}>
              {!invite.locationIds.length && <span style={{ fontSize: '0.74rem', color: 'var(--text-3)' }}>Select locations first.</span>}
              {invite.locationIds.length > 0 && filteredInviteOrganizationOptions.length === 0 && (
                <span style={{ fontSize: '0.74rem', color: 'var(--text-3)' }}>No organizations mapped to selected locations.</span>
              )}
              {filteredInviteOrganizationOptions.map((item) => (
                  <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '0.8rem', padding: '3px 0' }}>
                  <input
                    type="checkbox"
                    checked={invite.organizationTypeIds.includes(item.id)}
                    onChange={(e) => {
                      setInvite((prev) => ({
                        ...prev,
                        organizationTypeIds: e.target.checked
                          ? [...prev.organizationTypeIds, item.id]
                          : prev.organizationTypeIds.filter((id) => id !== item.id),
                      }));
                      if (inviteError) setInviteError('');
                    }}
                  />
                  <span style={{ color: 'var(--text-1)', fontWeight: 600 }}>{item.name}</span>
                </label>
              ))}
            </div>
            {selectedInviteRoleTemplate && (
              <span style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginTop: '4px' }}>
                Defaulted from role template. You can customize per invite.
              </span>
            )}
          </div>
        </div>
      </Modal>
    </section>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import Modal from '../../components/Modal';
import { StationMap, LocationPickerMap } from '../../components/StationMap';
import { loadOrganizationSettings } from '../../config/organization-settings';
import { BUSINESS_SETUP_UPDATED_EVENT, getActiveBusinessTypes, getActiveOrganizationTypes, getActiveSetupLocations, getActiveVehicleTypes, loadBusinessSetup } from '../../config/business-setup';
import { loadOperationalLocations, loadOperationalOrganizations, saveOperationalLocations, saveOperationalOrganizations } from '../../config/operations-store';
import { isApiIntegrationEnabled } from '../../api/runtime';
import { createOrganization as createOrganizationApi, deleteOrganization as deleteOrganizationApi, listOrganizations } from '../../api/services/organizationsService';

const VEHICLE_INVENTORY_BASE = {
  Cycle: 210,
  'E-Bike': 170,
  'E-Scooter': 120,
  Buggy: 90,
  Bus: 32,
  'E-Buggy': 90,
  'Shuttle Bus': 32,
};

const PAYMENT_OPTIONS = ['Subscription', 'Pay as you Go', 'Top up'];
const WIZARD_STEPS = ['Organization Details', 'Vehicles Allocation', 'Payment Structure', 'Creation Stations', 'Users'];

const defaultPlan = () => ({
  name: '', description: '', vehicles: [], price: '', coins: '', dailyCoins: '', rideTimeLimit: '', validity: '30 days', status: 'Active', coinToRideRatio: '1',
});

const defaultPayg = (vehicleType = 'Cycle') => ({
  vehicleType,
  pricingMethod: 'Advance',
  advanceMethod: 'Standard Advance',
  unlockFee: '',
  perUnit: '',
  baseFare: '',
  waitingCharges: '',
  simplePrice: '',
  unit: 'Per Minute',
  appliesTo: 'Weekday',
  status: 'Active',
});

function getVehicleTypeNames(businessSetup, fallback = []) {
  const configured = getActiveVehicleTypes(businessSetup).map((item) => item.name);
  const merged = [...configured];
  fallback.forEach((name) => {
    if (name && !merged.includes(name)) merged.push(name);
  });
  return merged.length ? merged : ['Cycle', 'E-Bike', 'Buggy', 'Bus'];
}

function buildMasterVehicles(businessSetup, fallback = []) {
  return getVehicleTypeNames(businessSetup, fallback).map((type) => ({
    type,
    totalInventory: VEHICLE_INVENTORY_BASE[type] ?? 48,
  }));
}

function pickAvailableVehicleType(vehicleTypeNames, preferredNames, fallbackIndex = 0) {
  const names = Array.isArray(vehicleTypeNames) ? vehicleTypeNames : [];
  const preferred = preferredNames.find((name) => names.some((item) => item.toLowerCase() === name.toLowerCase()));
  if (preferred) return names.find((item) => item.toLowerCase() === preferred.toLowerCase()) || preferred;
  return names[fallbackIndex] || names[0] || 'Cycle';
}

const defaultStation = () => ({
  id: '',
  name: '',
  locationPin: '',
  city: '',
  state: '',
  status: 'Active',
});

const defaultUser = () => ({
  name: '',
  employeeId: '',
  email: '',
  phone: '',
  role: 'Operator',
  status: 'Active',
  mappedPlan: '',
});

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

function parseAmount(value) {
  const n = Number(String(value || '').replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function formatAmount(value) {
  return `₹${Number(value || 0).toLocaleString()}`;
}

function buildOrgMetrics(org) {
  const vehicleSelections = org.vehicleSelections || [];
  const vehicleAllotment  = org.vehicleAllotment  || {};
  const payment           = org.payment           || {};
  const totalVehicles = vehicleSelections.reduce((acc, type) => acc + (vehicleAllotment[type] || 0), 0);
  const totalVehicleTypes = vehicleSelections.filter((type) => (vehicleAllotment[type] || 0) > 0).length;
  const subscriptionRevenue = (payment.subscriptions || []).reduce((acc, item) => acc + parseAmount(item.price), 0);
  const topupRevenue = (payment.topups || []).reduce((acc, item) => acc + parseAmount(item.price), 0);
  const paygRevenueSimple = (payment.payg?.simpleRows || []).reduce((acc, item) => acc + parseAmount(item.price), 0);
  const paygRevenueAdvance = (payment.payg?.advanceRows || []).reduce((acc, item) => acc + parseAmount(item.baseFare) + parseAmount(item.unlockFee), 0);
  const totalRevenue = subscriptionRevenue + topupRevenue + paygRevenueSimple + paygRevenueAdvance;

  return {
    totalVehicles,
    totalVehicleTypes,
    totalStations: (org.stations || []).length,
    totalUsers: (org.users || []).length,
    totalRevenue,
  };
}

function createBlankOrganization(id, settings, businessSetup) {
  const businessTypes = getActiveBusinessTypes(businessSetup);
  const organizationTypes = getActiveOrganizationTypes(businessSetup);
  const vehicleTypeNames = getVehicleTypeNames(businessSetup);
  const defaultBusiness = businessTypes[0] || null;
  const defaultOrganizationType = organizationTypes.find((item) => item.businessTypeId === defaultBusiness?.id) || null;
  const defaultVehicleSelections = vehicleTypeNames.slice(0, Math.min(2, vehicleTypeNames.length));

  return {
    id,
    name: '',
    businessTypeId: defaultBusiness?.id || '',
    businessType: defaultBusiness?.name || settings.businessTypes[0] || 'General',
    organizationTypeId: defaultOrganizationType?.id || '',
    organizationType: defaultOrganizationType?.name || settings.organizationTypes[0] || 'Campus',
    stateLocationId: '',
    cityLocationId: '',
    status: 'Active',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    contactEmail: '',
    contactPhone: '',
    revenueOptions: ['Subscription'],
    vehicleSelections: defaultVehicleSelections,
    vehicleAllotment: Object.fromEntries(defaultVehicleSelections.map((type) => [type, 0])),
    vehicleAdjust: {},
    payment: {
      subscriptionEnabled: true,
      topupEnabled: false,
      paygEnabled: false,
      subscriptions: [],
      topups: [],
      payg: {
        advanceRows: [],
        simpleRows: [],
      },
    },
    stations: [],
    users: [],
    logo: '',
  };
}

function seedOrganizations(settings, businessSetup) {
  const businessTypes = getActiveBusinessTypes(businessSetup);
  const organizationTypes = getActiveOrganizationTypes(businessSetup);
  const vehicleTypeNames = getVehicleTypeNames(businessSetup);
  const campusBusiness = businessTypes.find((item) => item.name.toLowerCase().includes('campus')) || businessTypes[0] || null;
  const corporateBusiness = businessTypes.find((item) => item.name.toLowerCase().includes('corporate')) || businessTypes[1] || businessTypes[0] || null;
  const universityOrg = organizationTypes.find((item) => item.name.toLowerCase().includes('university')) || organizationTypes[0] || null;
  const companyOrg = organizationTypes.find((item) => item.name.toLowerCase().includes('company')) || organizationTypes[1] || organizationTypes[0] || null;

  const a = createBlankOrganization('ORG-001', settings, businessSetup);
  a.name = 'North Campus Mobility';
  a.city = 'Noida';
  a.state = 'UP';
  a.contactEmail = 'ops@northcampus.io';
  a.contactPhone = '+91-9876543210';
  a.businessTypeId = campusBusiness?.id || a.businessTypeId;
  a.businessType = campusBusiness?.name || a.businessType;
  a.organizationTypeId = universityOrg?.id || a.organizationTypeId;
  a.organizationType = universityOrg?.name || a.organizationType;
  a.revenueOptions = ['Subscription', 'Pay as you Go'];
  const cycleType = pickAvailableVehicleType(vehicleTypeNames, ['Cycle']);
  const ebikeType = pickAvailableVehicleType(vehicleTypeNames, ['E-Bike']);
  const buggyType = pickAvailableVehicleType(vehicleTypeNames, ['Buggy', 'E-Buggy'], 2);
  const busType = pickAvailableVehicleType(vehicleTypeNames, ['Bus', 'Shuttle Bus'], 3);
  a.vehicleSelections = [cycleType, ebikeType, buggyType];
  a.vehicleAllotment = { [cycleType]: 40, [ebikeType]: 24, [buggyType]: 8 };
  a.payment.subscriptionEnabled = true;
  a.payment.paygEnabled = true;
  a.payment.subscriptions = [
    { id: 'SUB-ORG-001', ...defaultPlan(), name: 'Campus Prime', price: '₹899', coins: 120, dailyCoins: 8, rideTimeLimit: 60, status: 'Active', vehicles: [cycleType, ebikeType] },
  ];
  a.payment.payg.simpleRows = [{ id: 'PAYG-S-001', vehicleType: ebikeType, price: '₹15', unit: 'Per Minute', status: 'Active', appliesTo: 'Weekday' }];
  a.stations = [
    { id: 'ST-001', name: 'North Gate', locationPin: '28.6202,77.3665', city: 'Noida', state: 'UP', status: 'Active' },
    { id: 'ST-002', name: 'Library Hub', locationPin: '28.6198,77.3671', city: 'Noida', state: 'UP', status: 'Active' },
  ];
  a.users = [
    { id: 'USR-001', name: 'Nisha Kumar', employeeId: 'NC-1022', email: 'nisha@northcampus.io', phone: '9876000001', role: 'Operator', status: 'Active', mappedPlan: 'Campus Prime', validation: 'Matched', access: 'Enabled', ridePermission: 'Enabled' },
  ];

  const b = createBlankOrganization('ORG-002', settings, businessSetup);
  b.name = 'City Corporate Towers';
  b.city = 'Bengaluru';
  b.state = 'KA';
  b.contactEmail = 'admin@citycorp.io';
  b.contactPhone = '+91-9988776655';
  b.businessTypeId = corporateBusiness?.id || b.businessTypeId;
  b.businessType = corporateBusiness?.name || b.businessType;
  b.organizationTypeId = companyOrg?.id || b.organizationTypeId;
  b.organizationType = companyOrg?.name || b.organizationType;
  b.revenueOptions = ['Top up', 'Pay as you Go'];
  b.vehicleSelections = [ebikeType, busType];
  b.vehicleAllotment = { [ebikeType]: 30, [busType]: 6 };
  b.payment.topupEnabled = true;
  b.payment.paygEnabled = true;
  b.payment.topups = [
    { id: 'TOP-ORG-001', ...defaultPlan(), name: 'Corporate Booster', price: '₹299', coins: 350, dailyCoins: 70, rideTimeLimit: 0, status: 'Active', vehicles: [] },
  ];
  b.payment.payg.advanceRows = [
    { id: 'PAYG-A-001', vehicleType: busType, unlockFee: '₹20', perUnit: '₹6', baseFare: '₹35', waitingCharges: '₹2/min', status: 'Active', appliesTo: 'Weekend', advanceMethod: 'Peak Advance' },
  ];
  b.stations = [{ id: 'ST-003', name: 'Tower Plaza', locationPin: '12.9716,77.5946', city: 'Bengaluru', state: 'KA', status: 'Active' }];
  b.users = [
    { id: 'USR-002', name: 'Aman Verma', employeeId: 'CT-390', email: 'aman@citycorp.io', phone: '9988771100', role: 'Admin', status: 'Active', mappedPlan: 'Corporate Booster', validation: 'Matched', access: 'Enabled', ridePermission: 'Enabled' },
  ];

  return [a, b];
}

function cloneOrganization(org) {
  return JSON.parse(JSON.stringify(org));
}

function makeId(prefix, length) {
  return `${prefix}-${String(length + 1).padStart(3, '0')}`;
}

function mapApiOrganization(raw, settings, businessSetup) {
  const id = String(raw.id || raw.organization_id || makeId('ORG', 0));
  const next = createBlankOrganization(id, settings, businessSetup);
  next.name = raw.organization_name || raw.name || next.name;
  next.businessTypeId = raw.business_type_id || next.businessTypeId;
  next.businessType = raw.business_type_name || raw.business_type || next.businessType;
  next.organizationTypeId = raw.organization_type_id || next.organizationTypeId;
  next.organizationType = raw.organization_type_name || raw.organization_type || next.organizationType;
  next.address = raw.address || '';
  next.state = raw.state || '';
  next.city = raw.city || '';
  next.zipCode = raw.zip_code || '';
  next.contactEmail = raw.contact_email || '';
  next.contactPhone = raw.contact_phone || '';
  next.status = String(raw.status || 'active').toLowerCase() === 'active' ? 'Active' : 'Inactive';
  return next;
}

export default function OrganizationsPage() {
  const usingApi = isApiIntegrationEnabled();
  const [orgSettings, setOrgSettings] = useState(loadOrganizationSettings);
  const [businessSetup, setBusinessSetup] = useState(loadBusinessSetup);
  const [organizations, setOrganizations] = useState(() => loadOperationalOrganizations([]));
  const [organizationsMode, setOrganizationsMode] = useState(usingApi ? 'API' : 'Local');
  const [organizationsSyncError, setOrganizationsSyncError] = useState('');
  const [isOrganizationsLoading, setIsOrganizationsLoading] = useState(false);
  const [selectedRows, setSelectedRows] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ search: '', status: 'All', businessType: 'All', organizationType: 'All' });

  const [showCreate, setShowCreate] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [draftOrg, setDraftOrg] = useState(() => createBlankOrganization('ORG-003', loadOrganizationSettings(), loadBusinessSetup()));

  const [detailOrgId, setDetailOrgId] = useState(null);
  const [detailTab, setDetailTab] = useState('dashboard');

  const [planForm, setPlanForm] = useState(defaultPlan());
  const [topupForm, setTopupForm] = useState(defaultPlan());
  const [paygForm, setPaygForm] = useState(defaultPayg());
  const [paygFilters, setPaygFilters] = useState({ advance: 'All', simple: 'All' });

  const [stationForm, setStationForm] = useState(defaultStation());
  const [editingStationId, setEditingStationId] = useState('');
  const [showStationModal, setShowStationModal] = useState(false);

  const [userForm, setUserForm] = useState(defaultUser());
  const [editingUserId, setEditingUserId] = useState('');
  const [bulkUsersRaw, setBulkUsersRaw] = useState('');
  const masterVehicles = useMemo(() => buildMasterVehicles(businessSetup, organizations.flatMap((org) => org.vehicleSelections || [])), [businessSetup, organizations]);
  const masterVehicleTypes = useMemo(() => masterVehicles.map((item) => item.type), [masterVehicles]);

  useEffect(() => {
    const reload = () => {
      setOrgSettings(loadOrganizationSettings());
      setBusinessSetup(loadBusinessSetup());
    };
    window.addEventListener('mos:organization-settings-updated', reload);
    window.addEventListener('mos:operations-locations-updated', reload);
    window.addEventListener(BUSINESS_SETUP_UPDATED_EVENT, reload);
    return () => {
      window.removeEventListener('mos:organization-settings-updated', reload);
      window.removeEventListener('mos:operations-locations-updated', reload);
      window.removeEventListener(BUSINESS_SETUP_UPDATED_EVENT, reload);
    };
  }, []);

  // Keep the latest settings in refs so the fetch effect can map with current
  // values WITHOUT depending on them. Depending on orgSettings/businessSetup
  // here caused an infinite refetch loop: fetch → setOrganizations → the persist
  // effect saves locations → dispatches 'mos:operations-locations-updated' → the
  // reload handler calls setOrgSettings/setBusinessSetup (new object refs) → this
  // effect re-fetches → … (observed as 40+ rapid /v1/b2b calls per page open).
  const orgSettingsRef = useRef(orgSettings);
  const businessSetupRef = useRef(businessSetup);
  useEffect(() => { orgSettingsRef.current = orgSettings; }, [orgSettings]);
  useEffect(() => { businessSetupRef.current = businessSetup; }, [businessSetup]);

  useEffect(() => {
    if (!usingApi) return;
    let mounted = true;

    const hydrateOrganizations = async () => {
      setIsOrganizationsLoading(true);
      setOrganizationsSyncError('');
      try {
        const remoteRows = await listOrganizations({ page: 1, limit: 200 });
        if (!mounted) return;
        if (Array.isArray(remoteRows) && remoteRows.length) {
          const mapped = remoteRows.map((row) => mapApiOrganization(row, orgSettingsRef.current, businessSetupRef.current));
          setOrganizations(mapped);
          setOrganizationsMode('API');
        } else {
          setOrganizationsMode('Local');
        }
      } catch (error) {
        if (!mounted) return;
        setOrganizationsMode('Local');
        setOrganizationsSyncError(error?.message || 'Unable to sync organizations from backend.');
      } finally {
        if (mounted) setIsOrganizationsLoading(false);
      }
    };

    hydrateOrganizations();
    return () => {
      mounted = false;
    };
  }, [usingApi]);

  const reportOrganizationsApiError = (actionLabel, error) => {
    setOrganizationsSyncError(`${actionLabel} failed in API mode: ${error?.message || 'Unknown error'}. Local state was updated.`);
  };

  useEffect(() => {
    setPaygForm((prev) => {
      if (masterVehicleTypes.includes(prev.vehicleType)) return prev;
      return defaultPayg(masterVehicleTypes[0] || 'Cycle');
    });
  }, [masterVehicleTypes]);

  useEffect(() => {
    saveOperationalOrganizations(organizations);

    const currentLocations = loadOperationalLocations([]);
    const manualLocations = currentLocations.filter((item) => item.sourceType !== 'organization');
    const derivedOrganizationLocations = organizations.map((org, index) => ({
      id: `ORGLOC-${org.id || index + 1}`,
      organizationId: org.id,
      sourceType: 'organization',
      businessTypeId: org.businessTypeId || '',
      businessType: org.businessType,
      name: org.name,
      description: org.address || `${org.organizationType || 'Organization'} mapped from Organizations module`,
      status: org.status === 'Active' ? 'Active' : 'Inactive',
      state: org.state,
      city: org.city,
      stateLocationId: org.stateLocationId || '',
      cityLocationId: org.cityLocationId || '',
      organizationTypeId: org.organizationTypeId || '',
      organizationType: org.organizationType,
      vehicles: org.vehicleSelections
        ? {
            total: org.vehicleSelections.reduce((sum, type) => sum + Number(org.vehicleAllotment?.[type] || 0), 0),
            statusTotals: { Available: 0, Maintenance: 0, Running: 0 },
            byType: org.vehicleAllotment || {},
            statusByType: {},
          }
        : { total: 0, statusTotals: { Available: 0, Maintenance: 0, Running: 0 }, byType: {}, statusByType: {} },
      revenue: '₹0',
      health: 'Good',
      stations: org.stations || [],
      stationDisplayCount: (org.stations || []).length,
    }));

    saveOperationalLocations([...manualLocations, ...derivedOrganizationLocations]);
  }, [organizations]);

  const totalAllocatedByType = useMemo(() => {
    const map = {};
    organizations.forEach((org) => {
      (org.vehicleSelections || []).forEach((type) => {
        map[type] = (map[type] || 0) + ((org.vehicleAllotment || {})[type] || 0);
      });
    });
    return map;
  }, [organizations]);

  const allOrgRows = useMemo(() => {
    return organizations.map((org) => {
      const metrics = buildOrgMetrics(org);
      return {
        id: org.id,
        name: org.name,
        businessType: org.businessType,
        organizationType: org.organizationType,
        city: org.city,
        email: org.contactEmail,
        status: org.status,
        totalRevenue: metrics.totalRevenue,
        totalVehicles: metrics.totalVehicles,
        totalVehicleTypes: metrics.totalVehicleTypes,
        totalStations: metrics.totalStations,
      };
    });
  }, [organizations]);

  const visibleRows = useMemo(() => {
    return allOrgRows.filter((row) => {
      const search = filters.search.trim().toLowerCase();
      const inSearch = !search
        || row.name.toLowerCase().includes(search)
        || (row.city || '').toLowerCase().includes(search)
        || (row.email || '').toLowerCase().includes(search);
      const inStatus = filters.status === 'All' || row.status === filters.status;
      const inBiz = filters.businessType === 'All' || row.businessType === filters.businessType;
      const inType = filters.organizationType === 'All' || row.organizationType === filters.organizationType;
      return inSearch && inStatus && inBiz && inType;
    });
  }, [allOrgRows, filters]);

  const dashboard = useMemo(() => {
    const activeCount = allOrgRows.filter((org) => org.status === 'Active').length;
    const suspendedCount = allOrgRows.filter((org) => org.status === 'Suspended').length;
    const inactiveCount = allOrgRows.filter((org) => org.status === 'Inactive').length;
    const revenue = allOrgRows.reduce((acc, org) => acc + org.totalRevenue, 0);
    const vehicles = allOrgRows.reduce((acc, org) => acc + org.totalVehicles, 0);
    const stations = allOrgRows.reduce((acc, org) => acc + org.totalStations, 0);
    return { activeCount, suspendedCount, inactiveCount, revenue, vehicles, stations };
  }, [allOrgRows]);

  const currentOrg = useMemo(() => organizations.find((org) => org.id === detailOrgId) || null, [organizations, detailOrgId]);
  const activeOrg = currentOrg || draftOrg;
  const activeOrgIsDraft = !currentOrg;
  const activeOrgMetrics = buildOrgMetrics(activeOrg);

  const activeBusinessTypeOptions = useMemo(() => getActiveBusinessTypes(businessSetup), [businessSetup]);
  const activeOrganizationTypeOptions = useMemo(() => getActiveOrganizationTypes(businessSetup), [businessSetup]);
  const activeSetupLocations = useMemo(() => getActiveSetupLocations(businessSetup), [businessSetup]);
  const stateLocationOptions = useMemo(() => activeSetupLocations.filter((item) => item.type === 'State'), [activeSetupLocations]);
  const cityLocationOptions = useMemo(() => {
    const selectedStateId = activeOrg.stateLocationId || '';
    return activeSetupLocations.filter((item) => item.type === 'City' && (!selectedStateId || item.parentId === selectedStateId));
  }, [activeSetupLocations, activeOrg.stateLocationId]);
  const doesOrgTypeScopeMatch = (scopeId, stateLocationId, cityLocationId) => {
    if (!scopeId) return false;
    const scopeLocation = activeSetupLocations.find((item) => item.id === scopeId);
    if (!scopeLocation) return false;
    if (scopeLocation.type === 'Global') return true;
    if (scopeLocation.type === 'State') return Boolean(stateLocationId) && scopeLocation.id === stateLocationId;
    if (scopeLocation.type === 'City') return Boolean(cityLocationId) && scopeLocation.id === cityLocationId;
    if (scopeLocation.type === 'Station') return Boolean(cityLocationId) && scopeLocation.parentId === cityLocationId;
    return false;
  };
  const organizationTypeOptionsForBusiness = useMemo(() => (
    activeOrganizationTypeOptions.filter((item) => item.businessTypeId === activeOrg.businessTypeId && item.locationId)
  ), [activeOrganizationTypeOptions, activeOrg.businessTypeId]);
  const organizationTypeOptionsForLocation = useMemo(() => (
    organizationTypeOptionsForBusiness.filter((item) => doesOrgTypeScopeMatch(item.locationId, activeOrg.stateLocationId, activeOrg.cityLocationId))
  ), [organizationTypeOptionsForBusiness, activeOrg.stateLocationId, activeOrg.cityLocationId]);

  const updateOrganization = (id, updater) => {
    setOrganizations((prev) => prev.map((org) => (org.id === id ? updater(cloneOrganization(org)) : org)));
  };

  const updateDraft = (updater) => setDraftOrg((prev) => updater(cloneOrganization(prev)));

  const updateActiveOrg = (updater) => {
    if (currentOrg) {
      updateOrganization(currentOrg.id, updater);
      return;
    }
    updateDraft(updater);
  };

  const getAvailableInventoryForOrg = (org, type) => {
    const total = masterVehicles.find((item) => item.type === type)?.totalInventory || 0;
    const allocatedToThisOrg = (org.vehicleAllotment || {})[type] || 0;
    const allocatedToOthers = (totalAllocatedByType[type] || 0) - allocatedToThisOrg;
    return Math.max(0, total - allocatedToOthers - allocatedToThisOrg);
  };

  const handleOpenCreate = () => {
    const nextId = makeId('ORG', organizations.length + 1);
    setDraftOrg(createBlankOrganization(nextId, orgSettings, businessSetup));
    setWizardStep(0);
    setShowCreate(true);
    setPlanForm(defaultPlan());
    setTopupForm(defaultPlan());
    setPaygForm(defaultPayg());
    setUserForm((prev) => ({ ...defaultUser(), role: orgSettings.userTypes[2] || orgSettings.userTypes[0] || prev.role || 'Operator' }));
    setBulkUsersRaw('');
  };

  const deleteOrganization = async (id) => {
    if (!window.confirm('Delete this organization?')) return;
    if (usingApi) {
      try {
        await deleteOrganizationApi(id);
      } catch (error) {
        reportOrganizationsApiError('Delete organization', error);
      }
    }
    setOrganizations((prev) => prev.filter((org) => org.id !== id));
    setSelectedRows((prev) => prev.filter((rowId) => rowId !== id));
    if (detailOrgId === id) setDetailOrgId(null);
  };

  const toggleSelectAll = (checked) => {
    setSelectedRows(checked ? visibleRows.map((row) => row.id) : []);
  };

  const toggleSelectRow = (id, checked) => {
    setSelectedRows((prev) => (checked ? [...prev, id] : prev.filter((item) => item !== id)));
  };

  const toggleRevenueOption = (value) => {
    updateActiveOrg((org) => {
      org.revenueOptions = org.revenueOptions.includes(value)
        ? org.revenueOptions.filter((item) => item !== value)
        : [...org.revenueOptions, value];
      org.payment.subscriptionEnabled = org.revenueOptions.includes('Subscription');
      org.payment.paygEnabled = org.revenueOptions.includes('Pay as you Go');
      org.payment.topupEnabled = org.revenueOptions.includes('Top up');
      return org;
    });
  };

  const toggleVehicleSelection = (type) => {
    updateActiveOrg((org) => {
      if (org.vehicleSelections.includes(type)) {
        org.vehicleSelections = org.vehicleSelections.filter((item) => item !== type);
        delete org.vehicleAllotment[type];
        delete org.vehicleAdjust[type];
        return org;
      }

      org.vehicleSelections = [...org.vehicleSelections, type];
      org.vehicleAllotment[type] = org.vehicleAllotment[type] || 0;
      return org;
    });
  };

  const setVehicleAdjust = (type, value) => {
    updateActiveOrg((org) => {
      org.vehicleAdjust[type] = Number(value) || 0;
      return org;
    });
  };

  const allocateVehicleRow = (type) => {
    updateActiveOrg((org) => {
      const adjust = Number(org.vehicleAdjust[type] || 0);
      if (!adjust) return org;
      const available = getAvailableInventoryForOrg(org, type);
      const add = Math.min(available, adjust);
      org.vehicleAllotment[type] = (org.vehicleAllotment[type] || 0) + add;
      org.vehicleAdjust[type] = 0;
      return org;
    });
  };

  const deallocateVehicleRow = (type) => {
    updateActiveOrg((org) => {
      const adjust = Number(org.vehicleAdjust[type] || 0);
      if (!adjust) return org;
      const current = org.vehicleAllotment[type] || 0;
      const remove = Math.min(current, adjust);
      org.vehicleAllotment[type] = current - remove;
      org.vehicleAdjust[type] = 0;
      return org;
    });
  };

  const addSubscriptionPlan = (isTopup = false) => {
    const form = isTopup ? topupForm : planForm;
    if (!form.name.trim() || !form.price.trim()) return;

    updateActiveOrg((org) => {
      const next = {
        ...form,
        id: makeId(isTopup ? 'TOP' : 'SUB', isTopup ? org.payment.topups.length : org.payment.subscriptions.length),
        vehicles: isTopup ? [] : form.vehicles,
      };
      if (isTopup) {
        org.payment.topups.push(next);
      } else {
        org.payment.subscriptions.push(next);
      }
      return org;
    });

    if (isTopup) setTopupForm(defaultPlan());
    else setPlanForm(defaultPlan());
  };

  const deletePlan = (id, isTopup = false) => {
    updateActiveOrg((org) => {
      if (isTopup) {
        org.payment.topups = org.payment.topups.filter((item) => item.id !== id);
      } else {
        org.payment.subscriptions = org.payment.subscriptions.filter((item) => item.id !== id);
      }
      return org;
    });
  };

  const addPaygRow = () => {
    if (!paygForm.vehicleType) return;

    updateActiveOrg((org) => {
      if (paygForm.pricingMethod === 'Advance') {
        org.payment.payg.advanceRows.push({
          id: makeId('PAYG-A', org.payment.payg.advanceRows.length),
          vehicleType: paygForm.vehicleType,
          unlockFee: paygForm.unlockFee,
          perUnit: paygForm.perUnit,
          baseFare: paygForm.baseFare,
          waitingCharges: paygForm.waitingCharges,
          status: paygForm.status,
          appliesTo: paygForm.appliesTo,
          advanceMethod: paygForm.advanceMethod,
          unit: paygForm.unit,
        });
      } else {
        org.payment.payg.simpleRows.push({
          id: makeId('PAYG-S', org.payment.payg.simpleRows.length),
          vehicleType: paygForm.vehicleType,
          price: paygForm.simplePrice,
          perUnit: paygForm.perUnit,
          unit: paygForm.unit,
          status: paygForm.status,
          appliesTo: paygForm.appliesTo,
        });
      }
      return org;
    });

    setPaygForm(defaultPayg());
  };

  const editPaygRow = (row, isAdvance) => {
    if (isAdvance) {
      setPaygForm({
        ...defaultPayg(),
        vehicleType: row.vehicleType,
        pricingMethod: 'Advance',
        advanceMethod: row.advanceMethod,
        unlockFee: row.unlockFee,
        perUnit: row.perUnit,
        baseFare: row.baseFare,
        waitingCharges: row.waitingCharges,
        status: row.status,
        appliesTo: row.appliesTo,
        unit: row.unit || 'Per Minute',
      });
    } else {
      setPaygForm({
        ...defaultPayg(),
        vehicleType: row.vehicleType,
        pricingMethod: 'Simple',
        simplePrice: row.price,
        perUnit: row.perUnit,
        status: row.status,
        appliesTo: row.appliesTo,
        unit: row.unit || 'Per Minute',
      });
    }
    removePaygRow(row.id, isAdvance);
  };

  const removePaygRow = (id, isAdvance) => {
    updateActiveOrg((org) => {
      if (isAdvance) {
        org.payment.payg.advanceRows = org.payment.payg.advanceRows.filter((item) => item.id !== id);
      } else {
        org.payment.payg.simpleRows = org.payment.payg.simpleRows.filter((item) => item.id !== id);
      }
      return org;
    });
  };

  const togglePaygStatus = (id, isAdvance) => {
    updateActiveOrg((org) => {
      const rows = isAdvance ? org.payment.payg.advanceRows : org.payment.payg.simpleRows;
      const row = rows.find((item) => item.id === id);
      if (row) row.status = row.status === 'Active' ? 'Inactive' : 'Active';
      return org;
    });
  };

  const openStationModal = (station = null) => {
    if (!station) {
      setStationForm({ ...defaultStation(), city: activeOrg.city || '', state: activeOrg.state || '' });
      setEditingStationId('');
    } else {
      setStationForm({ ...station });
      setEditingStationId(station.id);
    }
    setShowStationModal(true);
  };

  const saveStation = () => {
    if (!stationForm.name.trim() || !isValidLocationPin(stationForm.locationPin)) return;
    updateActiveOrg((org) => {
      const payload = {
        ...stationForm,
        city: stationForm.city || org.city || '',
        state: stationForm.state || org.state || '',
      };
      if (editingStationId) {
        org.stations = org.stations.map((s) => (s.id === editingStationId ? { ...payload, id: editingStationId } : s));
      } else {
        org.stations.push({ ...payload, id: makeId('ST', org.stations.length) });
      }
      return org;
    });
    setShowStationModal(false);
    setStationForm(defaultStation());
    setEditingStationId('');
  };

  const canSaveStation = stationForm.name.trim() && isValidLocationPin(stationForm.locationPin);

  const removeStation = (stationId) => {
    updateActiveOrg((org) => {
      org.stations = org.stations.filter((station) => station.id !== stationId);
      return org;
    });
  };

  const saveUser = () => {
    if (!userForm.name.trim() || !userForm.employeeId.trim()) return;
    updateActiveOrg((org) => {
      const payload = {
        ...userForm,
        id: editingUserId || makeId('USR', org.users.length),
        validation: 'Matched',
        access: userForm.status === 'Active' ? 'Enabled' : 'Disabled',
        ridePermission: userForm.status === 'Active' && !!userForm.mappedPlan ? 'Enabled' : 'Restricted',
      };

      if (editingUserId) {
        org.users = org.users.map((u) => (u.id === editingUserId ? payload : u));
      } else {
        org.users.push(payload);
      }

      return org;
    });

    setUserForm(defaultUser());
    setEditingUserId('');
  };

  const editUser = (user) => {
    setEditingUserId(user.id);
    setUserForm({
      name: user.name,
      employeeId: user.employeeId,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
      mappedPlan: user.mappedPlan,
    });
  };

  const removeUser = (id) => {
    updateActiveOrg((org) => {
      org.users = org.users.filter((u) => u.id !== id);
      return org;
    });
  };

  const bulkUploadUsers = () => {
    const lines = bulkUsersRaw
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    if (!lines.length) return;

    updateActiveOrg((org) => {
      const next = lines.map((line, index) => {
        const [employeeId, name, email, phone, role, mappedPlan] = line.split(',').map((v) => (v || '').trim());
        return {
          id: makeId('USR', org.users.length + index),
          employeeId,
          name: name || `Employee ${index + 1}`,
          email: email || `${(employeeId || `user${index + 1}`).toLowerCase()}@org.io`,
          phone: phone || '',
          role: role || (orgSettings.userTypes[2] || orgSettings.userTypes[0] || 'Operator'),
          status: 'Active',
          mappedPlan: mappedPlan || org.payment.subscriptions[0]?.name || '',
          validation: employeeId ? 'Matched' : 'Pending',
          access: employeeId ? 'Enabled' : 'Disabled',
          ridePermission: employeeId ? 'Enabled' : 'Restricted',
        };
      });

      org.users.push(...next);
      return org;
    });

    setBulkUsersRaw('');
  };

  const nextStep = () => setWizardStep((prev) => Math.min(prev + 1, WIZARD_STEPS.length - 1));
  const prevStep = () => setWizardStep((prev) => Math.max(prev - 1, 0));

  const finalizeCreateOrganization = async () => {
    if (!draftOrg.name.trim() || !draftOrg.businessTypeId || !draftOrg.organizationTypeId || !draftOrg.stateLocationId || !draftOrg.cityLocationId) return;
    const selectedOrgType = activeOrganizationTypeOptions.find((item) => item.id === draftOrg.organizationTypeId) || null;
    if (!selectedOrgType || !doesOrgTypeScopeMatch(selectedOrgType.locationId, draftOrg.stateLocationId, draftOrg.cityLocationId)) {
      window.alert('Selected Organization Type is outside the chosen location scope. Choose a location-matching organization type.');
      return;
    }

    if (usingApi) {
      try {
        const createdRaw = await createOrganizationApi({
          organization_name: draftOrg.name,
          business_type_id: draftOrg.businessTypeId,
          organization_type_id: draftOrg.organizationTypeId,
          address: draftOrg.address,
          state: draftOrg.state,
          city: draftOrg.city,
          zip_code: draftOrg.zipCode,
          contact_email: draftOrg.contactEmail,
          contact_phone: draftOrg.contactPhone,
          status: String(draftOrg.status || 'Active').toLowerCase(),
        });
        const created = mapApiOrganization(createdRaw, orgSettings, businessSetup);
        setOrganizations((prev) => [...prev, created]);
        setShowCreate(false);
        setDetailOrgId(created.id);
        setDetailTab('dashboard');
        return;
      } catch (error) {
        reportOrganizationsApiError('Create organization', error);
      }
    }

    setOrganizations((prev) => [...prev, cloneOrganization(draftOrg)]);
    setShowCreate(false);
    setDetailOrgId(draftOrg.id);
    setDetailTab('dashboard');
  };

  const assignMappedPlans = [
    ...activeOrg.payment.subscriptions.map((item) => item.name),
    ...activeOrg.payment.topups.map((item) => item.name),
  ];

  const renderOrganizationDetailsStep = () => (
    <div className="form-grid">
      {!activeOrgIsDraft && (
        <>
          <div className="form-field"><label>Organization ID</label><input className="setting-input" value={activeOrg.id} readOnly /></div>
          <div className="form-field"><label>Status</label>
            <select className="setting-input" value={activeOrg.status} onChange={(e) => updateActiveOrg((org) => ({ ...org, status: e.target.value }))}>
              <option>Active</option>
              <option>Suspended</option>
              <option>Inactive</option>
            </select>
          </div>
        </>
      )}
      <div className="form-field full">
        <label>Organization Logo</label>
        <div className="org-logo-upload-row">
          {activeOrg.logo ? (
            <img src={activeOrg.logo} alt="logo" className="org-logo-preview" />
          ) : (
            <div className="org-logo-placeholder"><i className="fa fa-building"></i></div>
          )}
          <div className="org-logo-upload-actions">
            <label className="btn-outline" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <i className="fa fa-upload"></i> {activeOrg.logo ? 'Change Logo' : 'Upload Logo'}
              <input
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 500 * 1024) { alert('Logo must be under 500 KB.'); return; }
                  const reader = new FileReader();
                  reader.onload = (ev) => updateActiveOrg((org) => ({ ...org, logo: ev.target.result }));
                  reader.readAsDataURL(file);
                }}
              />
            </label>
            {activeOrg.logo && (
              <button className="btn-outline" style={{ color: 'var(--red)' }} onClick={() => updateActiveOrg((org) => ({ ...org, logo: '' }))}>
                <i className="fa fa-trash"></i> Remove
              </button>
            )}
          </div>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-3)', margin: '4px 0 0' }}>PNG, JPG, SVG · max 500 KB · Shown in org cards, table, and detail view.</p>
        </div>
      </div>
      <div className="form-field full">
        <label>Organization Name</label>
        <input className="setting-input" value={activeOrg.name} onChange={(e) => updateActiveOrg((org) => ({ ...org, name: e.target.value }))} placeholder="Organization name" />
      </div>
      <div className="form-field"><label>Business Type</label>
        <select className="setting-input" value={activeOrg.businessTypeId} onChange={(e) => updateActiveOrg((org) => {
          const nextBusiness = activeBusinessTypeOptions.find((item) => item.id === e.target.value) || null;
          const nextOrgType = activeOrganizationTypeOptions.find((item) => item.businessTypeId === e.target.value && doesOrgTypeScopeMatch(item.locationId, org.stateLocationId, org.cityLocationId)) || null;
          return {
            ...org,
            businessTypeId: e.target.value,
            businessType: nextBusiness?.name || '',
            organizationTypeId: nextOrgType?.id || '',
            organizationType: nextOrgType?.name || '',
          };
        })}>
          {activeBusinessTypeOptions.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
        </select>
      </div>
      <div className="form-field"><label>Organization Type</label>
        <select className="setting-input" value={activeOrg.organizationTypeId} onChange={(e) => updateActiveOrg((org) => {
          const nextOrgType = organizationTypeOptionsForLocation.find((item) => item.id === e.target.value) || null;
          return {
            ...org,
            organizationTypeId: e.target.value,
            organizationType: nextOrgType?.name || '',
          };
        })}>
          <option value="">Select Organization Type</option>
          {organizationTypeOptionsForLocation.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
        </select>
      </div>
      <div className="form-field full"><label>Basic Address</label>
        <input className="setting-input" value={activeOrg.address} onChange={(e) => updateActiveOrg((org) => ({ ...org, address: e.target.value }))} placeholder="Address" />
      </div>
      <div className="form-field"><label>State</label>
        <select className="setting-input" value={activeOrg.stateLocationId || ''} onChange={(e) => updateActiveOrg((org) => {
          const nextState = stateLocationOptions.find((item) => item.id === e.target.value) || null;
          const nextOrgType = activeOrganizationTypeOptions.find((item) => item.businessTypeId === org.businessTypeId && doesOrgTypeScopeMatch(item.locationId, e.target.value, '')) || null;
          return {
            ...org,
            stateLocationId: e.target.value,
            state: nextState?.name || '',
            cityLocationId: '',
            city: '',
            organizationTypeId: nextOrgType?.id || '',
            organizationType: nextOrgType?.name || '',
          };
        })}>
          <option value="">Select State</option>
          {stateLocationOptions.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
        </select>
      </div>
      <div className="form-field"><label>City</label>
        <select className="setting-input" value={activeOrg.cityLocationId || ''} onChange={(e) => updateActiveOrg((org) => {
          const nextCity = cityLocationOptions.find((item) => item.id === e.target.value) || null;
          const nextOrgType = activeOrganizationTypeOptions.find((item) => item.businessTypeId === org.businessTypeId && doesOrgTypeScopeMatch(item.locationId, org.stateLocationId, e.target.value)) || null;
          return {
            ...org,
            cityLocationId: e.target.value,
            city: nextCity?.name || '',
            organizationTypeId: nextOrgType?.id || '',
            organizationType: nextOrgType?.name || '',
          };
        })} disabled={!activeOrg.stateLocationId}>
          <option value="">Select City</option>
          {cityLocationOptions.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
        </select>
      </div>
      <div className="form-field"><label>Zip Code</label>
        <input className="setting-input" value={activeOrg.zipCode} onChange={(e) => updateActiveOrg((org) => ({ ...org, zipCode: e.target.value }))} placeholder="Zip Code" />
      </div>
      <div className="form-field"><label>Contact Email</label>
        <input className="setting-input" type="email" value={activeOrg.contactEmail} onChange={(e) => updateActiveOrg((org) => ({ ...org, contactEmail: e.target.value }))} placeholder="email@org.com" />
      </div>
      <div className="form-field"><label>Contact Phone</label>
        <input className="setting-input" value={activeOrg.contactPhone} onChange={(e) => updateActiveOrg((org) => ({ ...org, contactPhone: e.target.value }))} placeholder="Phone" />
      </div>
      <div className="form-field full">
        <label>Revenue Model (Subscription / Pay as you go / Top up)</label>
        <div className="check-group">
          {PAYMENT_OPTIONS.map((option) => (
            <label key={option} className="check-item">
              <input type="checkbox" checked={activeOrg.revenueOptions.includes(option)} onChange={() => toggleRevenueOption(option)} /> {option}
            </label>
          ))}
        </div>
      </div>
    </div>
  );

  const renderVehicleAllocationStep = () => (
    (() => {
      const businessName = activeOrg.businessType || 'Business';
      const businessDescriptor = businessName.toLowerCase().includes('campus')
        ? 'Campus fleet allocation'
        : businessName.toLowerCase().includes('corporate')
          ? 'Corporate fleet allocation'
          : 'Business fleet allocation';
      const totalSelectedInventory = activeOrg.vehicleSelections.reduce((sum, type) => {
        const vehicle = masterVehicles.find((item) => item.type === type);
        return sum + Number(vehicle?.totalInventory || 0);
      }, 0);
      const totalAllocatedInventory = activeOrg.vehicleSelections.reduce((sum, type) => sum + Number(activeOrg.vehicleAllotment[type] || 0), 0);

      return (
        <>
          <div className="settings-group" style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
              <div>
                <h3><i className="fa fa-car"></i> Vehicles</h3>
                <p style={{ margin: '6px 0 0', color: 'var(--text-2)', fontSize: '0.78rem' }}>
                  Select the vehicle categories available for this {businessName.toLowerCase()} operation.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <span className="page-hero-chip"><i className="fa fa-briefcase"></i> {businessDescriptor}</span>
                <span className="page-hero-chip"><i className="fa fa-cubes"></i> Selected Fleet: {activeOrg.vehicleSelections.length}</span>
              </div>
            </div>
            <div className="check-group">
              {masterVehicles.map((vehicle) => (
                <label key={vehicle.type} className="check-item">
                  <input type="checkbox" checked={activeOrg.vehicleSelections.includes(vehicle.type)} onChange={() => toggleVehicleSelection(vehicle.type)} /> {vehicle.type}
                </label>
              ))}
            </div>
          </div>

          <div className="settings-group" style={{ marginBottom: '12px', background: 'linear-gradient(135deg, rgba(15,118,110,0.14), rgba(16,185,129,0.06))' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
              <div style={{ border: '1px solid var(--border-1)', borderRadius: '10px', padding: '10px', background: 'var(--bg-2)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Business</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-1)' }}>{businessName}</div>
              </div>
              <div style={{ border: '1px solid var(--border-1)', borderRadius: '10px', padding: '10px', background: 'var(--bg-2)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Selected Inventory</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-1)' }}>{totalSelectedInventory}</div>
              </div>
              <div style={{ border: '1px solid var(--border-1)', borderRadius: '10px', padding: '10px', background: 'var(--bg-2)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Allocated to Org</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-1)' }}>{totalAllocatedInventory}</div>
              </div>
              <div style={{ border: '1px solid var(--border-1)', borderRadius: '10px', padding: '10px', background: 'var(--bg-2)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Control Mode</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-1)' }}>Allocate / Release</div>
              </div>
            </div>
          </div>

          <div className="table-card full">
            <div className="card-header">
              <h3>Vehicle Allocation Console</h3>
              <span className="status pending">Available stock and assigned stock are tracked live</span>
            </div>
            <div className="table-wrap">
              <table className="data-table" style={{ width: '100%', tableLayout: 'fixed' }}>
                <thead>
                  <tr>
                    <th style={{ width: '18%' }}>Vehicle Type</th>
                    <th style={{ width: '12%' }}>Total</th>
                    <th style={{ width: '14%' }}>Available</th>
                    <th style={{ width: '14%' }}>Assigned</th>
                    <th style={{ width: '14%' }}>Quantity</th>
                    <th style={{ width: '28%' }}>Allocation Action</th>
                  </tr>
                </thead>
                <tbody>
                  {activeOrg.vehicleSelections.length === 0 && (
                    <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-2)' }}>Select vehicles above to start business allocation.</td></tr>
                  )}
                  {activeOrg.vehicleSelections.map((type) => {
                    const total = masterVehicles.find((item) => item.type === type)?.totalInventory || 0;
                    const available = getAvailableInventoryForOrg(activeOrg, type);
                    const allocated = activeOrg.vehicleAllotment[type] || 0;
                    const adjustValue = Number(activeOrg.vehicleAdjust[type] || 0);
                    return (
                      <tr key={type}>
                        <td style={{ fontWeight: 700 }}>{type}</td>
                        <td>{total}</td>
                        <td>
                          <span className={`status ${available > 0 ? 'completed' : 'pending'}`}>{available}</span>
                        </td>
                        <td>
                          <span className="status pending">{allocated}</span>
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            className="setting-input"
                            style={{ minWidth: '84px' }}
                            value={activeOrg.vehicleAdjust[type] || ''}
                            onChange={(e) => setVehicleAdjust(type, e.target.value)}
                            placeholder="0"
                          />
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <button
                              className="btn-primary"
                              onClick={() => allocateVehicleRow(type)}
                              disabled={!adjustValue || available === 0}
                              title={`Assign ${type} to ${businessName}`}
                            >
                              <i className="fa fa-plus"></i> Assign to {businessName.split(' ')[0] || 'Business'}
                            </button>
                            <button
                              className="btn-outline"
                              onClick={() => deallocateVehicleRow(type)}
                              disabled={!adjustValue || allocated === 0}
                              title={`Release ${type} from ${businessName}`}
                            >
                              <i className="fa fa-minus"></i> Release
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      );
    })()
  );

  const renderPaymentStructureStep = () => {
    const availableVehicles = activeOrg.vehicleSelections;
    const advanceRows = activeOrg.payment.payg.advanceRows.filter((row) => paygFilters.advance === 'All' || row.status === paygFilters.advance);
    const simpleRows = activeOrg.payment.payg.simpleRows.filter((row) => paygFilters.simple === 'All' || row.status === paygFilters.simple);

    return (
      <>
        <div className="settings-group" style={{ marginBottom: '12px' }}>
          <h3><i className="fa fa-wallet"></i> Payment Structure</h3>
          <div className="check-group">
            <label className="check-item"><input type="checkbox" checked={activeOrg.payment.subscriptionEnabled} onChange={() => updateActiveOrg((org) => {
              org.payment.subscriptionEnabled = !org.payment.subscriptionEnabled;
              if (org.payment.subscriptionEnabled && !org.revenueOptions.includes('Subscription')) org.revenueOptions.push('Subscription');
              if (!org.payment.subscriptionEnabled) org.revenueOptions = org.revenueOptions.filter((item) => item !== 'Subscription');
              return org;
            })} /> Subscription</label>
            <label className="check-item"><input type="checkbox" checked={activeOrg.payment.paygEnabled} onChange={() => updateActiveOrg((org) => {
              org.payment.paygEnabled = !org.payment.paygEnabled;
              if (org.payment.paygEnabled && !org.revenueOptions.includes('Pay as you Go')) org.revenueOptions.push('Pay as you Go');
              if (!org.payment.paygEnabled) org.revenueOptions = org.revenueOptions.filter((item) => item !== 'Pay as you Go');
              return org;
            })} /> Pay as you Go</label>
            <label className="check-item"><input type="checkbox" checked={activeOrg.payment.topupEnabled} onChange={() => updateActiveOrg((org) => {
              org.payment.topupEnabled = !org.payment.topupEnabled;
              if (org.payment.topupEnabled && !org.revenueOptions.includes('Top up')) org.revenueOptions.push('Top up');
              if (!org.payment.topupEnabled) org.revenueOptions = org.revenueOptions.filter((item) => item !== 'Top up');
              return org;
            })} /> Top up</label>
          </div>
        </div>

        {activeOrg.payment.subscriptionEnabled && (
          <div className="settings-group" style={{ marginBottom: '12px' }}>
            <h3><i className="fa fa-file-circle-plus"></i> Create Subscription</h3>
            <div className="form-grid">
              <div className="form-field"><label>Subscription Name</label><input className="setting-input" value={planForm.name} onChange={(e) => setPlanForm((p) => ({ ...p, name: e.target.value }))} /></div>
              <div className="form-field"><label>Price</label><input className="setting-input" value={planForm.price} onChange={(e) => setPlanForm((p) => ({ ...p, price: e.target.value }))} /></div>
              <div className="form-field"><label>Coins Allocated</label><input type="number" className="setting-input" value={planForm.coins} onChange={(e) => setPlanForm((p) => ({ ...p, coins: e.target.value }))} /></div>
              <div className="form-field"><label>Daily Redeemable Coins</label><input type="number" className="setting-input" value={planForm.dailyCoins} onChange={(e) => setPlanForm((p) => ({ ...p, dailyCoins: e.target.value }))} /></div>
              <div className="form-field"><label>Ride Time Limit (min)</label><input type="number" className="setting-input" value={planForm.rideTimeLimit} onChange={(e) => setPlanForm((p) => ({ ...p, rideTimeLimit: e.target.value }))} /></div>
              <div className="form-field"><label>Validity</label><input className="setting-input" value={planForm.validity} onChange={(e) => setPlanForm((p) => ({ ...p, validity: e.target.value }))} /></div>
              <div className="form-field"><label>Status</label><select className="setting-input" value={planForm.status} onChange={(e) => setPlanForm((p) => ({ ...p, status: e.target.value }))}><option>Active</option><option>Inactive</option></select></div>
              <div className="form-field"><label>1 coin = rides (customizable)</label><input className="setting-input" value={planForm.coinToRideRatio} onChange={(e) => setPlanForm((p) => ({ ...p, coinToRideRatio: e.target.value }))} /></div>
              <div className="form-field full"><label>Description</label><input className="setting-input" value={planForm.description} onChange={(e) => setPlanForm((p) => ({ ...p, description: e.target.value }))} /></div>
              <div className="form-field full"><label>Applicable Vehicle Types</label>
                <div className="check-group">
                  {availableVehicles.map((vehicle) => (
                    <label key={vehicle} className="check-item">
                      <input type="checkbox" checked={planForm.vehicles.includes(vehicle)} onChange={() => setPlanForm((prev) => ({
                        ...prev,
                        vehicles: prev.vehicles.includes(vehicle) ? prev.vehicles.filter((v) => v !== vehicle) : [...prev.vehicles, vehicle],
                      }))} /> {vehicle}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="settings-save" style={{ marginTop: '10px' }}>
              <button className="btn-primary" onClick={() => addSubscriptionPlan(false)}>Create Subscription</button>
            </div>

            <div className="table-wrap" style={{ marginTop: '12px' }}>
              <table className="data-table">
                <thead><tr><th>ID</th><th>Name</th><th>Price</th><th>Vehicles</th><th>Coins</th><th>Status</th><th>Delete</th></tr></thead>
                <tbody>
                  {activeOrg.payment.subscriptions.map((plan) => (
                    <tr key={plan.id}>
                      <td>{plan.id}</td><td>{plan.name}</td><td>{plan.price}</td><td>{plan.vehicles.join(', ') || '-'}</td><td>{plan.coins}</td>
                      <td><span className={`status ${plan.status === 'Active' ? 'completed' : 'cancelled'}`}>{plan.status}</span></td>
                      <td><button className="act-btn red" onClick={() => deletePlan(plan.id, false)}><i className="fa fa-trash"></i></button></td>
                    </tr>
                  ))}
                  {!activeOrg.payment.subscriptions.length && <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-2)' }}>No subscriptions available.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeOrg.payment.topupEnabled && (
          <div className="settings-group" style={{ marginBottom: '12px' }}>
            <h3><i className="fa fa-bolt"></i> Create Top up Plan</h3>
            <div className="form-grid">
              <div className="form-field"><label>Top up Name</label><input className="setting-input" value={topupForm.name} onChange={(e) => setTopupForm((p) => ({ ...p, name: e.target.value }))} /></div>
              <div className="form-field"><label>Price</label><input className="setting-input" value={topupForm.price} onChange={(e) => setTopupForm((p) => ({ ...p, price: e.target.value }))} /></div>
              <div className="form-field"><label>Coins Allocated</label><input type="number" className="setting-input" value={topupForm.coins} onChange={(e) => setTopupForm((p) => ({ ...p, coins: e.target.value }))} /></div>
              <div className="form-field"><label>Daily Redeemable Coins</label><input type="number" className="setting-input" value={topupForm.dailyCoins} onChange={(e) => setTopupForm((p) => ({ ...p, dailyCoins: e.target.value }))} /></div>
              <div className="form-field"><label>Ride Time Limit</label><input type="number" className="setting-input" value={topupForm.rideTimeLimit} onChange={(e) => setTopupForm((p) => ({ ...p, rideTimeLimit: e.target.value }))} /></div>
              <div className="form-field"><label>Validity</label><input className="setting-input" value={topupForm.validity} onChange={(e) => setTopupForm((p) => ({ ...p, validity: e.target.value }))} /></div>
              <div className="form-field"><label>Status</label><select className="setting-input" value={topupForm.status} onChange={(e) => setTopupForm((p) => ({ ...p, status: e.target.value }))}><option>Active</option><option>Inactive</option></select></div>
              <div className="form-field"><label>1 coin = rides</label><input className="setting-input" value={topupForm.coinToRideRatio} onChange={(e) => setTopupForm((p) => ({ ...p, coinToRideRatio: e.target.value }))} /></div>
              <div className="form-field full"><label>Description</label><input className="setting-input" value={topupForm.description} onChange={(e) => setTopupForm((p) => ({ ...p, description: e.target.value }))} /></div>
            </div>
            <div className="settings-save" style={{ marginTop: '10px' }}>
              <button className="btn-primary" onClick={() => addSubscriptionPlan(true)}>Create Top up</button>
            </div>

            <div className="table-wrap" style={{ marginTop: '12px' }}>
              <table className="data-table">
                <thead><tr><th>ID</th><th>Name</th><th>Price</th><th>Coins</th><th>Status</th><th>Delete</th></tr></thead>
                <tbody>
                  {activeOrg.payment.topups.map((plan) => (
                    <tr key={plan.id}>
                      <td>{plan.id}</td><td>{plan.name}</td><td>{plan.price}</td><td>{plan.coins}</td>
                      <td><span className={`status ${plan.status === 'Active' ? 'completed' : 'cancelled'}`}>{plan.status}</span></td>
                      <td><button className="act-btn red" onClick={() => deletePlan(plan.id, true)}><i className="fa fa-trash"></i></button></td>
                    </tr>
                  ))}
                  {!activeOrg.payment.topups.length && <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-2)' }}>No top up plans available.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeOrg.payment.paygEnabled && (
          <div className="settings-group" style={{ marginBottom: '12px' }}>
            <h3><i className="fa fa-money-bill"></i> Pay as you Go Pricing</h3>
            <div className="form-grid">
              <div className="form-field"><label>Vehicle Type</label>
                <select className="setting-input" value={paygForm.vehicleType} onChange={(e) => setPaygForm((p) => ({ ...p, vehicleType: e.target.value }))}>
                  {availableVehicles.map((vehicle) => <option key={vehicle}>{vehicle}</option>)}
                </select>
              </div>
              <div className="form-field"><label>Select Price Method</label>
                <select className="setting-input" value={paygForm.pricingMethod} onChange={(e) => setPaygForm((p) => ({ ...p, pricingMethod: e.target.value }))}>
                  {orgSettings.pricingMethods.map((method) => <option key={method}>{method}</option>)}
                </select>
              </div>
              {paygForm.pricingMethod === 'Advance' && (
                <div className="form-field"><label>Advance Price Method</label>
                  <select className="setting-input" value={paygForm.advanceMethod} onChange={(e) => setPaygForm((p) => ({ ...p, advanceMethod: e.target.value }))}>
                    {orgSettings.advancePricingMethods.map((method) => <option key={method}>{method}</option>)}
                  </select>
                </div>
              )}
              <div className="form-field"><label>Per Minute/Hour</label><input className="setting-input" value={paygForm.perUnit} onChange={(e) => setPaygForm((p) => ({ ...p, perUnit: e.target.value }))} placeholder="₹ / unit" /></div>
              <div className="form-field"><label>Unit</label><select className="setting-input" value={paygForm.unit} onChange={(e) => setPaygForm((p) => ({ ...p, unit: e.target.value }))}><option>Per Minute</option><option>Per Hour</option></select></div>
              <div className="form-field"><label>Weekend/Weekday</label><select className="setting-input" value={paygForm.appliesTo} onChange={(e) => setPaygForm((p) => ({ ...p, appliesTo: e.target.value }))}><option>Weekday</option><option>Weekend</option><option>Both</option></select></div>
              <div className="form-field"><label>Status</label><select className="setting-input" value={paygForm.status} onChange={(e) => setPaygForm((p) => ({ ...p, status: e.target.value }))}><option>Active</option><option>Inactive</option></select></div>

              {paygForm.pricingMethod === 'Advance' ? (
                <>
                  <div className="form-field"><label>Unlock Fee (Optional)</label><input className="setting-input" value={paygForm.unlockFee} onChange={(e) => setPaygForm((p) => ({ ...p, unlockFee: e.target.value }))} /></div>
                  <div className="form-field"><label>Base Fare (Optional)</label><input className="setting-input" value={paygForm.baseFare} onChange={(e) => setPaygForm((p) => ({ ...p, baseFare: e.target.value }))} /></div>
                  <div className="form-field"><label>Waiting Charges (Optional)</label><input className="setting-input" value={paygForm.waitingCharges} onChange={(e) => setPaygForm((p) => ({ ...p, waitingCharges: e.target.value }))} /></div>
                </>
              ) : (
                <div className="form-field"><label>Price</label><input className="setting-input" value={paygForm.simplePrice} onChange={(e) => setPaygForm((p) => ({ ...p, simplePrice: e.target.value }))} /></div>
              )}
            </div>

            <div className="settings-save" style={{ marginTop: '10px' }}>
              <button className="btn-primary" onClick={addPaygRow}>Create Pricing</button>
              <button className="btn-outline" onClick={() => setPaygForm(defaultPayg())}>Reset</button>
            </div>

            <div className="table-card full" style={{ marginTop: '12px' }}>
              <div className="card-header">
                <h3>Table 1 (Advance)</h3>
                <select className="filter-select" value={paygFilters.advance} onChange={(e) => setPaygFilters((p) => ({ ...p, advance: e.target.value }))}>
                  <option>All</option><option>Active</option><option>Inactive</option>
                </select>
              </div>
              <div className="table-wrap">
                <table className="data-table">
                  <thead><tr><th>Vehicle Type</th><th>Unlock Fee</th><th>Per Min</th><th>Base Fare</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>
                    {advanceRows.map((row) => (
                      <tr key={row.id}>
                        <td>{row.vehicleType}</td><td>{row.unlockFee || '-'}</td><td>{row.perUnit || '-'}</td><td>{row.baseFare || '-'}</td>
                        <td><span className={`status ${row.status === 'Active' ? 'completed' : 'cancelled'}`}>{row.status}</span></td>
                        <td className="actions">
                          <button className="act-btn" onClick={() => editPaygRow(row, true)}><i className="fa fa-pen"></i></button>
                          <button className="act-btn" onClick={() => togglePaygStatus(row.id, true)}><i className="fa fa-toggle-on"></i></button>
                          <button className="act-btn red" onClick={() => removePaygRow(row.id, true)}><i className="fa fa-trash"></i></button>
                        </td>
                      </tr>
                    ))}
                    {!advanceRows.length && <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-2)' }}>No advance pricing rows.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="table-card full" style={{ marginTop: '12px' }}>
              <div className="card-header">
                <h3>Table 2 (Simple)</h3>
                <select className="filter-select" value={paygFilters.simple} onChange={(e) => setPaygFilters((p) => ({ ...p, simple: e.target.value }))}>
                  <option>All</option><option>Active</option><option>Inactive</option>
                </select>
              </div>
              <div className="table-wrap">
                <table className="data-table">
                  <thead><tr><th>Vehicle Type</th><th>Price</th><th>Per Min/Hour</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>
                    {simpleRows.map((row) => (
                      <tr key={row.id}>
                        <td>{row.vehicleType}</td><td>{row.price || '-'}</td><td>{row.perUnit || '-'} ({row.unit})</td>
                        <td><span className={`status ${row.status === 'Active' ? 'completed' : 'cancelled'}`}>{row.status}</span></td>
                        <td className="actions">
                          <button className="act-btn" onClick={() => editPaygRow(row, false)}><i className="fa fa-pen"></i></button>
                          <button className="act-btn" onClick={() => togglePaygStatus(row.id, false)}><i className="fa fa-toggle-on"></i></button>
                          <button className="act-btn red" onClick={() => removePaygRow(row.id, false)}><i className="fa fa-trash"></i></button>
                        </td>
                      </tr>
                    ))}
                    {!simpleRows.length && <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-2)' }}>No simple pricing rows.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </>
    );
  };

  const renderStationsStep = () => (
    <>
      {activeOrg.stations.length > 0 && (
        <div style={{ marginBottom: '14px' }}>
          <StationMap
            stations={activeOrg.stations}
            height="340px"
            onMarkerClick={(station) => openStationModal(station)}
          />
        </div>
      )}
      <div className="table-card full">
        <div className="card-header">
          <h3>Stations</h3>
          <button className="btn-primary" onClick={() => openStationModal()}><i className="fa fa-plus"></i> Add Station</button>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Station ID</th><th>Station Name</th><th>Location Pin</th><th>City</th><th>State</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {activeOrg.stations.map((station) => (
                <tr key={station.id}>
                  <td>{station.id}</td><td>{station.name}</td><td>{station.locationPin}</td><td>{station.city}</td><td>{station.state}</td>
                  <td><span className={`status ${station.status === 'Active' ? 'completed' : 'cancelled'}`}>{station.status}</span></td>
                  <td className="actions">
                    <button className="act-btn" onClick={() => openStationModal(station)}><i className="fa fa-pen"></i></button>
                    <button className="act-btn red" onClick={() => removeStation(station.id)}><i className="fa fa-trash"></i></button>
                  </td>
                </tr>
              ))}
              {!activeOrg.stations.length && <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-2)' }}>No stations created yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );

  const renderUsersStep = () => (
    <>
      <div className="settings-group" style={{ marginBottom: '12px' }}>
        <h3><i className="fa fa-shield"></i> MJOLLNIR Validation System</h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>
          Admin-uploaded employee IDs control registration validation. On successful match, subscriptions, access and ride permissions are auto-assigned.
        </p>
      </div>

      <div className="settings-group" style={{ marginBottom: '12px' }}>
        <h3><i className="fa fa-upload"></i> Bulk Upload Users</h3>
        <label style={{ fontSize: '0.74rem', color: 'var(--text-2)' }}>Format: EmployeeID,Name,Email,Phone,Role,MappedPlan (one user per line)</label>
        <textarea className="setting-input" rows={4} value={bulkUsersRaw} onChange={(e) => setBulkUsersRaw(e.target.value)} placeholder="EMP-1001,Riya,riya@org.com,9991112233,Operator,Campus Prime" />
        <div className="settings-save" style={{ marginTop: '10px' }}>
          <button className="btn-primary" onClick={bulkUploadUsers}><i className="fa fa-file-import"></i> Upload Users</button>
        </div>
      </div>

      <div className="settings-group" style={{ marginBottom: '12px' }}>
        <h3><i className="fa fa-user-plus"></i> Create User</h3>
        <div className="form-grid">
          <div className="form-field"><label>Name</label><input className="setting-input" value={userForm.name} onChange={(e) => setUserForm((p) => ({ ...p, name: e.target.value }))} /></div>
          <div className="form-field"><label>ID Number (Employee ID)</label><input className="setting-input" value={userForm.employeeId} onChange={(e) => setUserForm((p) => ({ ...p, employeeId: e.target.value }))} /></div>
          <div className="form-field"><label>Email</label><input className="setting-input" value={userForm.email} onChange={(e) => setUserForm((p) => ({ ...p, email: e.target.value }))} /></div>
          <div className="form-field"><label>Phone</label><input className="setting-input" value={userForm.phone} onChange={(e) => setUserForm((p) => ({ ...p, phone: e.target.value }))} /></div>
          <div className="form-field"><label>Role</label>
            <select className="setting-input" value={userForm.role} onChange={(e) => setUserForm((p) => ({ ...p, role: e.target.value }))}>
              {orgSettings.userTypes.map((role) => <option key={role}>{role}</option>)}
            </select>
          </div>
          <div className="form-field"><label>User Status</label><select className="setting-input" value={userForm.status} onChange={(e) => setUserForm((p) => ({ ...p, status: e.target.value }))}><option>Active</option><option>Suspended</option><option>Inactive</option></select></div>
          <div className="form-field full"><label>Mapped Plan</label>
            <select className="setting-input" value={userForm.mappedPlan} onChange={(e) => setUserForm((p) => ({ ...p, mappedPlan: e.target.value }))}>
              <option value="">Select Plan</option>
              {assignMappedPlans.map((plan) => <option key={plan}>{plan}</option>)}
            </select>
          </div>
        </div>
        <div className="settings-save" style={{ marginTop: '10px' }}>
          <button className="btn-primary" onClick={saveUser}>{editingUserId ? 'Update User' : 'Create User'}</button>
          {editingUserId && <button className="btn-outline" onClick={() => { setEditingUserId(''); setUserForm(defaultUser()); }}>Cancel Edit</button>}
        </div>
      </div>

      <div className="table-card full">
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Name</th><th>Employee ID</th><th>Email</th><th>Phone</th><th>Role</th><th>Status</th><th>Mapped Plan</th><th>Validation</th><th>Access</th><th>Ride Permission</th><th>Actions</th></tr></thead>
            <tbody>
              {activeOrg.users.map((user) => (
                <tr key={user.id}>
                  <td>{user.name}</td><td>{user.employeeId}</td><td>{user.email}</td><td>{user.phone}</td><td>{user.role}</td>
                  <td><span className={`status ${user.status === 'Active' ? 'completed' : user.status === 'Suspended' ? 'pending' : 'cancelled'}`}>{user.status}</span></td>
                  <td>{user.mappedPlan || '-'}</td><td>{user.validation}</td><td>{user.access}</td><td>{user.ridePermission}</td>
                  <td className="actions">
                    <button className="act-btn" onClick={() => editUser(user)}><i className="fa fa-pen"></i></button>
                    <button className="act-btn red" onClick={() => removeUser(user.id)}><i className="fa fa-trash"></i></button>
                  </td>
                </tr>
              ))}
              {!activeOrg.users.length && <tr><td colSpan={11} style={{ textAlign: 'center', color: 'var(--text-2)' }}>No users added yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );

  const renderWizardStep = () => {
    if (wizardStep === 0) return renderOrganizationDetailsStep();
    if (wizardStep === 1) return renderVehicleAllocationStep();
    if (wizardStep === 2) return renderPaymentStructureStep();
    if (wizardStep === 3) return renderStationsStep();
    return renderUsersStep();
  };

  if (currentOrg) {
    const detailMetrics = buildOrgMetrics(currentOrg);

    return (
      <section className="page active space-y-4" id="page-organizations">
        <button className="back-btn" onClick={() => setDetailOrgId(null)}>
          <i className="fa fa-arrow-left"></i> Back to Organizations
        </button>

        <div className="cards-grid">
          <div className="kpi-card">
            <div className="kpi-icon blue" style={currentOrg.logo ? { padding: 0, overflow: 'hidden', background: 'transparent', border: '1px solid var(--border)' } : {}}>
              {currentOrg.logo
                ? <img src={currentOrg.logo} alt={currentOrg.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                : <i className="fa fa-building"></i>}
            </div>
            <div className="kpi-info"><span className="kpi-label">Organization</span><span className="kpi-value">{currentOrg.name || currentOrg.id}</span></div>
          </div>
          <div className="kpi-card"><div className="kpi-icon green"><i className="fa fa-indian-rupee-sign"></i></div><div className="kpi-info"><span className="kpi-label">Total Revenue</span><span className="kpi-value">{formatAmount(detailMetrics.totalRevenue)}</span></div></div>
          <div className="kpi-card"><div className="kpi-icon gold"><i className="fa fa-car"></i></div><div className="kpi-info"><span className="kpi-label">Total Vehicles</span><span className="kpi-value">{detailMetrics.totalVehicles}</span></div></div>
          <div className="kpi-card"><div className="kpi-icon red"><i className="fa fa-map-pin"></i></div><div className="kpi-info"><span className="kpi-label">Total Stations</span><span className="kpi-value">{detailMetrics.totalStations}</span></div></div>
        </div>

        <div className="page-tabs">
          {['dashboard', 'organization', 'vehicles', 'payment', 'stations', 'users'].map((tab) => (
            <button key={tab} className={`page-tab${detailTab === tab ? ' active' : ''}`} onClick={() => setDetailTab(tab)}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {detailTab === 'dashboard' && (
          <div className="cards-grid">
            <div className="kpi-card"><div className="kpi-icon cyan"><i className="fa fa-layer-group"></i></div><div className="kpi-info"><span className="kpi-label">Vehicle Types</span><span className="kpi-value">{detailMetrics.totalVehicleTypes}</span></div></div>
            <div className="kpi-card"><div className="kpi-icon purple"><i className="fa fa-users"></i></div><div className="kpi-info"><span className="kpi-label">Users</span><span className="kpi-value">{detailMetrics.totalUsers}</span></div></div>
            <div className="kpi-card"><div className="kpi-icon gold"><i className="fa fa-credit-card"></i></div><div className="kpi-info"><span className="kpi-label">Revenue Options</span><span className="kpi-value">{currentOrg.revenueOptions.join(', ') || '-'}</span></div></div>
            <div className="kpi-card"><div className="kpi-icon red"><i className="fa fa-info-circle"></i></div><div className="kpi-info"><span className="kpi-label">Status</span><span className="kpi-value">{currentOrg.status}</span></div></div>
          </div>
        )}
        {detailTab === 'organization' && renderOrganizationDetailsStep()}
        {detailTab === 'vehicles' && renderVehicleAllocationStep()}
        {detailTab === 'payment' && renderPaymentStructureStep()}
        {detailTab === 'stations' && renderStationsStep()}
        {detailTab === 'users' && renderUsersStep()}

        <Modal
          open={showStationModal}
          title={editingStationId ? 'Edit Station' : 'Add Station'}
          onClose={() => setShowStationModal(false)}
          size="lg"
          footer={<><button className="btn-outline" onClick={() => setShowStationModal(false)}>Cancel</button><button className="btn-primary" onClick={saveStation} disabled={!canSaveStation}>Save</button></>}
        >
          <div className="form-grid">
            <div className="form-field full"><label>Station Name</label><input className="setting-input" value={stationForm.name} onChange={(e) => setStationForm((p) => ({ ...p, name: e.target.value }))} /></div>
            <div className="form-field full">
              <label>Location Pin</label>
              <LocationPickerMap
                locationPin={stationForm.locationPin}
                onLocationChange={(pin) => setStationForm((p) => ({ ...p, locationPin: pin }))}
                onLocationResolved={(location) => setStationForm((p) => ({
                  ...p,
                  locationPin: location.locationPin,
                  city: location.city || p.city,
                  state: location.state || p.state,
                }))}
                height="260px"
              />
            </div>
            <div className="form-field"><label>City</label><input className="setting-input" value={stationForm.city} onChange={(e) => setStationForm((p) => ({ ...p, city: e.target.value }))} /></div>
            <div className="form-field"><label>State</label><input className="setting-input" value={stationForm.state} onChange={(e) => setStationForm((p) => ({ ...p, state: e.target.value }))} /></div>
            <div className="form-field"><label>Status</label><select className="setting-input" value={stationForm.status} onChange={(e) => setStationForm((p) => ({ ...p, status: e.target.value }))}><option>Active</option><option>Inactive</option></select></div>
          </div>
        </Modal>
      </section>
    );
  }

  return (
    <section className="page active space-y-4" id="page-organizations">
      <div className="page-hero ph-organizations">
        <div className="page-hero-left">
          <div className="page-hero-icon"><i className="fa fa-building"></i></div>
          <div className="page-hero-text">
            <h1>Organization Matrix</h1>
            <p>Oversee multi-org mobility operations, financial output, vehicle allocation, and station footprint.</p>
          </div>
        </div>
        <div className="page-hero-right">
          <div className="page-hero-chips">
            <span className="page-hero-chip"><i className="fa fa-building-circle-check"></i> {allOrgRows.length} Orgs</span>
            <span className="page-hero-chip"><i className="fa fa-indian-rupee-sign"></i> {formatAmount(dashboard.revenue)}</span>
          </div>
          <button className="btn-primary" onClick={handleOpenCreate}><i className="fa fa-plus"></i> Create Organization</button>
        </div>
      </div>

      <div className="cards-grid">
        <div className="kpi-card"><div className="kpi-icon blue"><i className="fa fa-building"></i></div><div className="kpi-info"><span className="kpi-label">Total Organizations</span><span className="kpi-value">{allOrgRows.length}</span></div></div>
        <div className="kpi-card"><div className="kpi-icon green"><i className="fa fa-indian-rupee-sign"></i></div><div className="kpi-info"><span className="kpi-label">Total Revenue</span><span className="kpi-value">{formatAmount(dashboard.revenue)}</span></div></div>
        <div className="kpi-card"><div className="kpi-icon gold"><i className="fa fa-car"></i></div><div className="kpi-info"><span className="kpi-label">Total Vehicles</span><span className="kpi-value">{dashboard.vehicles}</span></div></div>
        <div className="kpi-card"><div className="kpi-icon red"><i className="fa fa-map-pin"></i></div><div className="kpi-info"><span className="kpi-label">Total Stations</span><span className="kpi-value">{dashboard.stations}</span></div></div>
      </div>

      <div className="cards-grid" style={{ marginBottom: '12px' }}>
        <div className="kpi-card"><div className="kpi-icon green"><i className="fa fa-circle-check"></i></div><div className="kpi-info"><span className="kpi-label">Active</span><span className="kpi-value">{dashboard.activeCount}</span></div></div>
        <div className="kpi-card"><div className="kpi-icon gold"><i className="fa fa-pause-circle"></i></div><div className="kpi-info"><span className="kpi-label">Suspended</span><span className="kpi-value">{dashboard.suspendedCount}</span></div></div>
        <div className="kpi-card"><div className="kpi-icon red"><i className="fa fa-circle-xmark"></i></div><div className="kpi-info"><span className="kpi-label">Inactive</span><span className="kpi-value">{dashboard.inactiveCount}</span></div></div>
      </div>

      <div className="org-cards-grid">
        {visibleRows.slice(0, 6).map((row) => (
          <div className="org-card-p rounded-2xl p-4 md:p-5" key={`org-card-${row.id}`}>
            <div className="org-card-header">
          <div className="org-card-icon">
              {row.logo
                ? <img src={row.logo} alt={row.name} style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 'inherit' }} />
                : <i className="fa fa-building"></i>}
            </div>
              <div>
                <div className="org-card-name">{row.name}</div>
                <div className="org-card-type">{row.businessType} • {row.organizationType}</div>
              </div>
            </div>
            <div className="org-card-stats">
              <div className="org-stat"><span>Revenue</span><strong>{formatAmount(row.totalRevenue)}</strong></div>
              <div className="org-stat"><span>Vehicles</span><strong>{row.totalVehicles}</strong></div>
              <div className="org-stat"><span>Stations</span><strong>{row.totalStations}</strong></div>
            </div>
            <div className="flex items-center justify-between gap-2 mt-2">
              <span className={`status ${row.status === 'Active' ? 'completed' : row.status === 'Suspended' ? 'pending' : 'cancelled'}`}>{row.status}</span>
              <button className="btn-outline" onClick={() => { setDetailOrgId(row.id); setDetailTab('dashboard'); }}><i className="fa fa-eye"></i> Open</button>
            </div>
          </div>
        ))}
      </div>

      <div className="toolbar">
        <div className="toolbar-left">
          <button className="btn-outline" onClick={() => { if (visibleRows[0]) setDetailOrgId(visibleRows[0].id); setDetailTab('dashboard'); }}><i className="fa fa-gauge"></i> Dashboard</button>
        </div>
        <div className="toolbar-right">
          <button className="btn-outline" onClick={() => setShowFilters(true)}><i className="fa fa-filter"></i> Filters (Form)</button>
        </div>
      </div>

      <div className="table-card full">
        <div className="table-wrap overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th><input type="checkbox" checked={selectedRows.length === visibleRows.length && visibleRows.length > 0} onChange={(e) => toggleSelectAll(e.target.checked)} /></th>
                <th>Organization ID</th>
                <th>Name of Organization</th>
                <th>Total Revenue</th>
                <th>Total Vehicle</th>
                <th>Total Type of Vehicles</th>
                <th>Total Stations</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => (
                <tr key={row.id}>
                  <td><input type="checkbox" checked={selectedRows.includes(row.id)} onChange={(e) => toggleSelectRow(row.id, e.target.checked)} /></td>
                  <td>{row.id}</td>
                  <td>
                    <button className="cell-link" style={{ display: 'inline-flex', alignItems: 'center', gap: '7px' }} onClick={() => { setDetailOrgId(row.id); setDetailTab('dashboard'); }}>
                      {row.logo
                        ? <img src={row.logo} alt="" style={{ width: '22px', height: '22px', borderRadius: '4px', objectFit: 'contain', flexShrink: 0 }} />
                        : <i className="fa fa-building" style={{ opacity: 0.45, fontSize: '0.82rem' }}></i>}
                      {row.name}
                    </button>
                  </td>
                  <td>{formatAmount(row.totalRevenue)}</td>
                  <td>{row.totalVehicles}</td>
                  <td>{row.totalVehicleTypes}</td>
                  <td>{row.totalStations}</td>
                  <td><span className={`status ${row.status === 'Active' ? 'completed' : row.status === 'Suspended' ? 'pending' : 'cancelled'}`}>{row.status}</span></td>
                  <td className="actions">
                    <button className="act-btn" onClick={() => { setDetailOrgId(row.id); setDetailTab('organization'); }} title="Edit"><i className="fa fa-pen"></i></button>
                    <button className="act-btn" onClick={() => { setDetailOrgId(row.id); setDetailTab('dashboard'); }} title="View"><i className="fa fa-eye"></i></button>
                    <button className="act-btn red" onClick={() => deleteOrganization(row.id)} title="Delete"><i className="fa fa-trash"></i></button>
                  </td>
                </tr>
              ))}
              {!visibleRows.length && <tr><td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-2)' }}>No organizations match selected filters.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={showFilters}
        title="Filters"
        onClose={() => setShowFilters(false)}
        footer={<><button className="btn-outline" onClick={() => { setFilters({ search: '', status: 'All', businessType: 'All', organizationType: 'All' }); }}>Reset</button><button className="btn-primary" onClick={() => setShowFilters(false)}>Apply</button></>}
      >
        <div className="form-grid">
          <div className="form-field full"><label>Search (name / city / email)</label><input className="setting-input" value={filters.search} onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))} /></div>
          <div className="form-field"><label>Status</label><select className="setting-input" value={filters.status} onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}><option>All</option><option>Active</option><option>Suspended</option><option>Inactive</option></select></div>
          <div className="form-field"><label>Business Type</label><select className="setting-input" value={filters.businessType} onChange={(e) => setFilters((p) => ({ ...p, businessType: e.target.value }))}><option>All</option>{orgSettings.businessTypes.map((item) => <option key={item}>{item}</option>)}</select></div>
          <div className="form-field"><label>Organization Type</label><select className="setting-input" value={filters.organizationType} onChange={(e) => setFilters((p) => ({ ...p, organizationType: e.target.value }))}><option>All</option>{orgSettings.organizationTypes.map((item) => <option key={item}>{item}</option>)}</select></div>
        </div>
      </Modal>

      <Modal
        open={showCreate}
        title="Create Organization (5 Steps)"
        onClose={() => setShowCreate(false)}
        size="large"
        footer={
          <>
            <button className="btn-outline" onClick={() => setShowCreate(false)}>Cancel</button>
            <button className="btn-outline" onClick={prevStep} disabled={wizardStep === 0}>Back</button>
            {wizardStep < WIZARD_STEPS.length - 1 ? (
              <button className="btn-primary" onClick={nextStep}>Next</button>
            ) : (
              <button className="btn-primary" onClick={finalizeCreateOrganization}>Create Organization</button>
            )}
          </>
        }
      >
        <div className="page-tabs sticky -top-4 z-10 -mx-4 mb-6 px-4 py-3 bg-slate-900/95 backdrop-blur border-b border-slate-800">
          {WIZARD_STEPS.map((step, index) => (
            <button key={step} className={`page-tab${wizardStep === index ? ' active' : ''}`} onClick={() => setWizardStep(index)}>
              {index + 1}. {step}
            </button>
          ))}
        </div>
        <div className="px-1">
          {renderWizardStep()}
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
          <div className="form-field full"><label>Station Name</label><input className="setting-input" value={stationForm.name} onChange={(e) => setStationForm((p) => ({ ...p, name: e.target.value }))} /></div>
          <div className="form-field full">
            <label>Location Pin</label>
            <LocationPickerMap
              locationPin={stationForm.locationPin}
              onLocationChange={(pin) => setStationForm((p) => ({ ...p, locationPin: pin }))}
              onLocationResolved={(location) => setStationForm((p) => ({
                ...p,
                locationPin: location.locationPin,
                city: location.city || p.city,
                state: location.state || p.state,
              }))}
              height="260px"
            />
          </div>
          <div className="form-field"><label>City</label><input className="setting-input" value={stationForm.city} onChange={(e) => setStationForm((p) => ({ ...p, city: e.target.value }))} /></div>
          <div className="form-field"><label>State</label><input className="setting-input" value={stationForm.state} onChange={(e) => setStationForm((p) => ({ ...p, state: e.target.value }))} /></div>
          <div className="form-field"><label>Status</label><select className="setting-input" value={stationForm.status} onChange={(e) => setStationForm((p) => ({ ...p, status: e.target.value }))}><option>Active</option><option>Inactive</option></select></div>
        </div>
      </Modal>
    </section>
  );
}

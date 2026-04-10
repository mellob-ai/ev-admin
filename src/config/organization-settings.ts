export const ORG_SETTINGS_SEED = {
  businessTypes: ['General', 'University', 'Corporate', 'Tourist', 'Event'],
  organizationTypes: ['Campus', 'Corporate Park', 'Public Space', 'Government', 'Franchise'],
  userTypes: ['Super Admin', 'Admin', 'Operator', 'Finance', 'Editor', 'Viewer'],
  pricingMethods: ['Simple', 'Advance'],
  advancePricingMethods: ['Standard Advance', 'Peak Advance', 'Dynamic Advance'],
  paygAllocations: [],
};

const STORAGE_KEY = 'mos.organizationSettings';

function normalizeSettings(settings) {
  return {
    businessTypes: Array.isArray(settings?.businessTypes) && settings.businessTypes.length
      ? settings.businessTypes
      : ORG_SETTINGS_SEED.businessTypes,
    organizationTypes: Array.isArray(settings?.organizationTypes) && settings.organizationTypes.length
      ? settings.organizationTypes
      : ORG_SETTINGS_SEED.organizationTypes,
    userTypes: Array.isArray(settings?.userTypes) && settings.userTypes.length
      ? settings.userTypes
      : ORG_SETTINGS_SEED.userTypes,
    pricingMethods: Array.isArray(settings?.pricingMethods) && settings.pricingMethods.length
      ? settings.pricingMethods
      : ORG_SETTINGS_SEED.pricingMethods,
    advancePricingMethods: Array.isArray(settings?.advancePricingMethods) && settings.advancePricingMethods.length
      ? settings.advancePricingMethods
      : ORG_SETTINGS_SEED.advancePricingMethods,
    paygAllocations: Array.isArray(settings?.paygAllocations)
      ? settings.paygAllocations
      : ORG_SETTINGS_SEED.paygAllocations,
  };
}

export function loadOrganizationSettings() {
  if (typeof window === 'undefined') return ORG_SETTINGS_SEED;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return ORG_SETTINGS_SEED;
    const parsed = JSON.parse(raw);
    return normalizeSettings(parsed);
  } catch {
    return ORG_SETTINGS_SEED;
  }
}

export function saveOrganizationSettings(settings) {
  if (typeof window === 'undefined') return;

  try {
    const normalized = normalizeSettings(settings);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    window.dispatchEvent(new Event('mos:organization-settings-updated'));
  } catch {
    return;
  }
}

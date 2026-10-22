const key = value => String(value || '').trim().toLowerCase();
export function applianceIdentity(appliance) {
  if (!appliance.brandRef) return undefined;
  return appliance.serialNumber?.trim()
    ? JSON.stringify(['serial', key(appliance.serialNumber)])
    : appliance.registryKey ? JSON.stringify(['unit', appliance.registryKey])
    : JSON.stringify(['model', key(appliance.category), key(appliance.modelNumber || appliance.model)]);
}

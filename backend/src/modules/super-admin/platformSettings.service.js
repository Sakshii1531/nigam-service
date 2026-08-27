import { PlatformSettings } from './platformSettings.model.js';
import { logAudit } from '../shared/auditLog.js';

export async function getSettings() {
  let settings = await PlatformSettings.findOne();
  if (!settings) settings = await PlatformSettings.create({});
  return settings;
}

export async function getPublicSettings() {
  const settings = await getSettings();
  return {
    platformName: settings.platformName,
    logoUrl: settings.logoUrl || null,
    maintenanceMode: !!settings.maintenanceMode,
    supportEmail: settings.supportEmail || null,
  };
}

const EDITABLE_FIELDS = [
  'platformName',
  'logoUrl',
  'supportEmail',
  'maintenanceMode',
  'emailNotifications',
  'smsNotifications',
  'pushNotifications',
  'twoFactorEnabled',
  'razorpayKeyId',
  'defaultGstPercent',
  'coinConversionRate',
  'referralBonusAmount',
];

export async function updateSettings(updates, actingUserId) {
  const settings = await getSettings();
  for (const field of EDITABLE_FIELDS) {
    if (updates[field] !== undefined) settings[field] = updates[field];
  }
  await settings.save();
  await logAudit({ user: actingUserId, action: `Updated platform settings: ${Object.keys(updates).join(', ')}`, type: 'System' });
  return settings;
}

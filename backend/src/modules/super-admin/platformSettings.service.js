import { PlatformSettings } from './platformSettings.model.js';
import { ReferralCampaign } from '../rewards-loyalty/referralCampaign.model.js';
import { logAudit } from '../shared/auditLog.js';

export async function getSettings() {
  let settings = await PlatformSettings.findOne();
  if (!settings) settings = await PlatformSettings.create({});
  return settings;
}

export async function getPublicSettings() {
  const settings = await getSettings();
  // Same "an Active campaign overrides the default" rule signupVerify's
  // reward credit follows (auth.service.js) — the copy the customer app
  // shows before signing up must match what they'd actually get, not just
  // the platform-wide fallback.
  const activeCampaign = await ReferralCampaign.findOne({ status: 'Active' }).sort({ createdAt: -1 });
  return {
    platformName: settings.platformName,
    logoUrl: settings.logoUrl || null,
    maintenanceMode: !!settings.maintenanceMode,
    supportEmail: settings.supportEmail || null,
    referralBonusAmount: activeCampaign ? activeCampaign.bonus : settings.referralBonusAmount,
    refereeDiscountPercent: activeCampaign ? activeCampaign.discount : settings.refereeDiscountPercent,
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
  'refereeDiscountPercent',
  'bookingAdvancePercent',
  'visitFeeAmount',
  'defaultSparePartMarkupPercent',
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

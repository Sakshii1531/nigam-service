import { NotificationPreference } from './notificationPreference.model.js';

export async function getPreferences(userId) {
  let prefs = await NotificationPreference.findOne({ user: userId });
  if (!prefs) prefs = await NotificationPreference.create({ user: userId });
  return prefs;
}

export async function updatePreferences(userId, updateData) {
  const prefs = await getPreferences(userId);
  
  const fields = [
    'push',
    'sms',
    'whatsapp',
    'email',
    'pushNotifications',
    'bookingUpdates',
    'whatsAppPromo',
    'emailPromo',
    'securityAlerts',
  ];

  fields.forEach((field) => {
    if (updateData[field] !== undefined) {
      prefs[field] = updateData[field];
    }
  });

  if (updateData.pushNotifications !== undefined) prefs.push = updateData.pushNotifications;
  if (updateData.whatsAppPromo !== undefined) prefs.whatsapp = updateData.whatsAppPromo;
  if (updateData.emailPromo !== undefined) prefs.email = updateData.emailPromo;

  await prefs.save();
  return prefs;
}


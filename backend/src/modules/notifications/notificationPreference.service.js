import { NotificationPreference } from './notificationPreference.model.js';

export async function getPreferences(userId) {
  let prefs = await NotificationPreference.findOne({ user: userId });
  if (!prefs) prefs = await NotificationPreference.create({ user: userId });
  return prefs;
}

export async function updatePreferences(userId, { push, sms, whatsapp, email }) {
  const prefs = await getPreferences(userId);
  if (push !== undefined) prefs.push = push;
  if (sms !== undefined) prefs.sms = sms;
  if (whatsapp !== undefined) prefs.whatsapp = whatsapp;
  if (email !== undefined) prefs.email = email;
  await prefs.save();
  return prefs;
}


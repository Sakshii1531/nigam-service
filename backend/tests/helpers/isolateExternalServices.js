// Runs before each test file (jest.config.js setupFiles), ahead of env.js's
// `dotenv/config`. dotenv never overrides a variable that is already set, so
// blanking these here keeps a developer's real .env credentials out of the
// test run — otherwise the suite uploads to their Cloudinary account and can
// send real push/WhatsApp messages, and the local-disk upload tests fail.
for (const key of [
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
  'FCM_SERVICE_ACCOUNT_JSON',
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_WHATSAPP_FROM',
  'TWILIO_VOICE_NUMBER',
]) {
  process.env[key] = '';
}

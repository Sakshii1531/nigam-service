/**
 * Transactional (non-OTP) SMS via SMSIndiaHub.
 *
 * Reads credentials from process.env directly at call time so Jest per-test
 * env overrides work correctly (env.js is cached at import time).
 *
 * DLT template: register a template in the DLT portal with {message} as the
 * variable slot. Set SMSINDIAHUB_NOTIFICATION_TEMPLATE and
 * SMSINDIAHUB_NOTIFICATION_DLT_TEMPLATE_ID in .env (or per-deploy env vars).
 */
export async function sendSms({ to, body, templateId }) {
  if (!to || !body) return;
  if (process.env.NOTIFICATION_SMS_ENABLED === 'false') return;

  const username = process.env.SMSINDIAHUB_USERNAME;
  const password = process.env.SMSINDIAHUB_PASSWORD;
  const senderId = process.env.SMSINDIAHUB_SENDER_ID;
  const configured = Boolean(username && password && senderId);

  if (!configured) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[sms:notification] SMSIndiaHub not configured — dropping notification SMS in production');
    } else {
      console.log(`[sms:notification:stub] To: ${to} | ${body}`);
    }
    return;
  }

  const number = to.replace(/\D/g, '');
  if (!number) return;

  // Build DLT-compliant message text
  const template =
    process.env.SMSINDIAHUB_NOTIFICATION_TEMPLATE || 'Dear Customer, {message} - Nigam Care';
  const text = template.replace('{message}', body);

  const dltTemplateId =
    templateId ||
    process.env.SMSINDIAHUB_NOTIFICATION_DLT_TEMPLATE_ID ||
    process.env.SMSINDIAHUB_DLT_TEMPLATE_ID ||
    '';

  const baseUrl =
    process.env.SMSINDIAHUB_BASE_URL || 'https://cloud.smsindiahub.in/api/mt/SendSMS';

  const params = new URLSearchParams({
    user: username,
    password,
    senderid: senderId,
    channel: process.env.SMSINDIAHUB_CHANNEL || '2',
    DCS: '0',
    flashsms: '0',
    number,
    text,
    route: 'clickhere',
    EntityId: process.env.SMSINDIAHUB_ENTITY_ID || '',
    dlttemplateid: dltTemplateId,
  });

  try {
    const res = await fetch(`${baseUrl}?${params.toString()}`);
    if (!res.ok) {
      console.error(`[sms:notification] SMSIndiaHub HTTP ${res.status}`);
      return;
    }
    const responseBody = await res.text();
    if (/error|invalid|fail/i.test(responseBody)) {
      console.error(`[sms:notification] SMSIndiaHub rejected: ${responseBody.slice(0, 300)}`);
    }
  } catch (err) {
    console.error(`[sms:notification] Fetch error: ${err.message}`);
  }
}

import { ApiError } from '../../middleware/errorHandler.js';

/** Indian mobile identity: ten digits, with optional +91 or trunk prefix. */
export function normalisePhone(value) {
  let phone = String(value ?? '').trim().replace(/\s+/g, '');
  if (phone.startsWith('+91')) phone = phone.slice(3);
  else if (/^0\d{10}$/.test(phone)) phone = phone.slice(1);
  if (!/^\d{10}$/.test(phone)) throw new ApiError(400, 'Phone must contain exactly 10 digits');
  return phone;
}

export function normaliseCustomerIdentifier(role, identifier) {
  const value = String(identifier ?? '').trim();
  if (role !== 'customer' || value.includes('@') || /^CUST-/i.test(value)) return value;
  return normalisePhone(value);
}

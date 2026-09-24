import { ApiError } from '../../middleware/errorHandler.js';

// Machine-readable reasons a selection can't be priced or booked. The error
// handler already emits `err.code` in the response envelope, so the customer
// app can react to the reason (hide the option, show "price updated", clamp
// the quantity) instead of parsing messages.
export const CATALOG_ERROR_CODES = Object.freeze({
  OFFERING_NOT_BOOKABLE: 'OFFERING_NOT_BOOKABLE',
  VARIANT_REQUIRED: 'VARIANT_REQUIRED',
  VARIANT_MISMATCH: 'VARIANT_MISMATCH',
  QUANTITY_OUT_OF_RANGE: 'QUANTITY_OUT_OF_RANGE',
  EXPRESS_NOT_AVAILABLE: 'EXPRESS_NOT_AVAILABLE',
  COUPON_INVALID: 'COUPON_INVALID',
});

export function catalogError(code, message, statusCode = 400, details = undefined) {
  const err = new ApiError(statusCode, message, details);
  err.code = code;
  return err;
}

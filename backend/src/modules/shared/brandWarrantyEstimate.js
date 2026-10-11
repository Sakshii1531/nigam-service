import { brandWarrantyMonths } from './brandWarranty.js';
import { addMonths } from './warrantyEngine.js';

/** Manufacturer cover only; NCC AMC/EW purchases do not change brand liability. */
export async function estimateBrandWarranty(brandName, purchaseDate) {
  const months = await brandWarrantyMonths(brandName);
  if (!purchaseDate) return { status: 'Verification Required', reasons: ['NO_PURCHASE_DATE'], months };
  const expiresOn = addMonths(purchaseDate, months);
  if (Number.isNaN(expiresOn.getTime())) return { status: 'Verification Required', reasons: ['INVALID_PURCHASE_DATE'], months };
  const covered = Date.now() <= expiresOn.getTime();
  return { status: covered ? 'In Warranty' : 'Out of Warranty', reasons: covered ? [] : ['EXPIRED'], months, expiresOn };
}

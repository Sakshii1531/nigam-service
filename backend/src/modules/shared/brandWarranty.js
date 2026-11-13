import { Brand } from '../super-admin/brand.model.js';
import { CatalogueBrand } from '../catalog/catalogueBrand.model.js';
import { DEFAULT_BRAND_WARRANTY_MONTHS } from './warrantyEngine.js';

const escapeRegex = (text) => String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * How many months of manufacturer warranty an appliance of this brand gets.
 * A partner brand's own figure (Brand Partners) wins; otherwise the catalogue
 * brand's (Categories & Brands → Catalogue Brands); otherwise the platform
 * default. Before Phase 19 every customer-side check used the default, so a
 * 24-month brand's appliance showed "Out of Warranty" after a year.
 */
export async function brandWarrantyMonths(brandName) {
  const name = String(brandName || '').trim();
  if (!name) return DEFAULT_BRAND_WARRANTY_MONTHS;
  const [partner, catalogue] = await Promise.all([
    Brand.findOne({ name }).collation({ locale: 'en', strength: 2 }).select('warrantyMonths').lean(),
    CatalogueBrand.findOne({ nameKey: name.toLowerCase() }).select('warrantyMonths').lean(),
  ]);
  return partner?.warrantyMonths || catalogue?.warrantyMonths || DEFAULT_BRAND_WARRANTY_MONTHS;
}

/** `months` after `date`, keeping the day of month (31 Jan + 1 month = 28/29 Feb). */
function addMonthsClamped(date, months) {
  const end = new Date(date); const day = end.getDate();
  end.setDate(1); end.setMonth(end.getMonth() + months);
  const last = new Date(end.getFullYear(), end.getMonth() + 1, 0).getDate();
  end.setDate(Math.min(day, last));
  return end;
}

/**
 * The period an extended warranty covers. It *extends* the manufacturer's
 * warranty ("1 year from its current expiry"), so it starts when the brand
 * warranty ends — or on the day it is bought if that has already passed (or
 * the purchase date is unknown). It used to start on the payment date, so the
 * customer lost the overlap and spent paid claims on repairs the brand owed.
 */
export async function extendedWarrantyWindow({ brand, purchaseDate, months, from = new Date() }) {
  let validFrom = new Date(from);
  if (purchaseDate) {
    const brandEnds = addMonthsClamped(purchaseDate, await brandWarrantyMonths(brand));
    if (brandEnds > validFrom) validFrom = brandEnds;
  }
  return { validFrom, validTill: addMonthsClamped(validFrom, months) };
}

// General text-search helper retained for ticket/customer filters. Tenant joins
// use ObjectIds and do not use this helper.
export { escapeRegex };

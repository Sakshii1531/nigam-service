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
    Brand.findOne({ name: new RegExp(`^${escapeRegex(name)}$`, 'i') }).select('warrantyMonths').lean(),
    CatalogueBrand.findOne({ nameKey: name.toLowerCase() }).select('warrantyMonths').lean(),
  ]);
  return partner?.warrantyMonths || catalogue?.warrantyMonths || DEFAULT_BRAND_WARRANTY_MONTHS;
}

export { escapeRegex };

import { BrandSettings } from './brandSettings.model.js';
import { Brand } from '../super-admin/brand.model.js';
import { ApiError } from '../../middleware/errorHandler.js';

// Settings are created on first read rather than at brand-creation time, so a
// brand that predates this model still gets defaults instead of a 404.
export async function getBrandSettings(brandId) {
  const brand = await Brand.findById(brandId).select('name status category').lean();
  if (!brand) throw new ApiError(404, 'Brand not found');

  let settings = await BrandSettings.findOne({ brand: brandId });
  if (!settings) settings = await BrandSettings.create({ brand: brandId });

  // The brand's identity is owned by super-admin (Brand), its operational
  // config by the brand itself (BrandSettings) — returned together so the
  // console can render one page without knowing that split.
  return { ...settings.toJSON(), brandName: brand.name, brandStatus: brand.status, category: brand.category };
}

const EDITABLE_FIELDS = [
  'supportEmail',
  'supportPhone',
  'website',
  'autoAssignTechnician',
  'requireCompletionPhoto',
  'emailNotifications',
  'smsAlerts',
];

export async function updateBrandSettings(brandId, updates) {
  await getBrandSettings(brandId); // ensures the document exists
  const settings = await BrandSettings.findOne({ brand: brandId });

  for (const field of EDITABLE_FIELDS) {
    if (updates[field] !== undefined) settings[field] = updates[field];
  }
  await settings.save();

  return getBrandSettings(brandId);
}

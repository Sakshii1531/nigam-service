import mongoose from 'mongoose';
import { Brand } from '../../src/modules/super-admin/brand.model.js';
import { OwnedAppliance } from '../../src/modules/service-requests/ownedAppliance.model.js';

/**
 * A saved appliance that genuinely qualifies for a free brand-warranty visit:
 * its brand is an onboarded partner brand (someone NCC can bill) and it has a
 * purchase invoice on file. A purchase date alone no longer grants coverage.
 */
export async function brandWarrantyAppliance({ user, category = 'AC', brand = 'LG', purchaseDate = new Date(Date.now() - 30 * 86400000), invoice = true, partner = true } = {}) {
  if (partner && !(await Brand.exists({ name: brand }))) {
    await Brand.create({ name: brand, category: 'Appliances', status: 'Active' });
  }
  return OwnedAppliance.create({
    user, category, brand, modelNumber: `${brand}-MODEL`, serialNumber: `SN-${new mongoose.Types.ObjectId()}`, purchaseDate,
    documents: invoice ? [{ fileId: new mongoose.Types.ObjectId(), name: 'invoice.pdf', kind: 'invoice', mimeType: 'application/pdf', size: 10, uploadedAt: new Date() }] : [],
  });
}

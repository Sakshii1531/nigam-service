import { MasterService } from './masterService.model.js';
import { SubBrand } from './subBrand.model.js';
import { BrandProduct } from './brandProduct.model.js';
import { ApiError } from '../../middleware/errorHandler.js';

// 3-level hierarchy: Brand -> MasterService (flat, brand-owned) and
// Brand -> SubBrand -> BrandProduct -> mapped MasterServices (Catalog.jsx).

export async function listMasterServices(brandId) {
  return MasterService.find({ brand: brandId }).sort({ name: 1 });
}

export async function createMasterService(brandId, { name, type, charge }) {
  return MasterService.create({ brand: brandId, name, type, charge });
}

async function findOwnedMasterService(brandId, id) {
  const service = await MasterService.findOne({ _id: id, brand: brandId });
  if (!service) throw new ApiError(403, 'Not authorized to access this master service');
  return service;
}

export async function updateMasterService(brandId, id, updates) {
  const service = await findOwnedMasterService(brandId, id);
  for (const field of ['name', 'type', 'charge']) {
    if (updates[field] !== undefined) service[field] = updates[field];
  }
  await service.save();
  return service;
}

export async function deleteMasterService(brandId, id) {
  await findOwnedMasterService(brandId, id);
  await MasterService.deleteOne({ _id: id, brand: brandId });
}

export async function listSubBrands(brandId) {
  return SubBrand.find({ brand: brandId }).sort({ name: 1 });
}

export async function createSubBrand(brandId, { name, category }) {
  return SubBrand.create({ brand: brandId, name, category });
}

async function findOwnedSubBrand(brandId, id) {
  const subBrand = await SubBrand.findOne({ _id: id, brand: brandId });
  if (!subBrand) throw new ApiError(403, 'Not authorized to access this sub-brand');
  return subBrand;
}

export async function updateSubBrand(brandId, id, updates) {
  const subBrand = await findOwnedSubBrand(brandId, id);
  for (const field of ['name', 'category']) {
    if (updates[field] !== undefined) subBrand[field] = updates[field];
  }
  await subBrand.save();
  return subBrand;
}

export async function deleteSubBrand(brandId, id) {
  await findOwnedSubBrand(brandId, id);
  await SubBrand.deleteOne({ _id: id, brand: brandId });
}

export async function listBrandProducts(brandId, subBrandId) {
  await findOwnedSubBrand(brandId, subBrandId);
  return BrandProduct.find({ brand: brandId, subBrand: subBrandId })
    .sort({ name: 1 })
    .populate({ path: 'services', match: { brand: brandId } });
}

export async function createBrandProduct(brandId, subBrandId, { name, model, services = [] }) {
  await findOwnedSubBrand(brandId, subBrandId);
  const product = await BrandProduct.create({ brand: brandId, subBrand: subBrandId, name, model, services });
  return product.populate({ path: 'services', match: { brand: brandId } });
}

async function findOwnedBrandProduct(brandId, id) {
  const product = await BrandProduct.findOne({ _id: id, brand: brandId })
    .populate({ path: 'subBrand', match: { brand: brandId } });
  if (!product) throw new ApiError(403, 'Not authorized to access this brand product');
  return product;
}

export async function updateBrandProduct(brandId, id, updates) {
  const product = await findOwnedBrandProduct(brandId, id);
  for (const field of ['name', 'model', 'services']) {
    if (updates[field] !== undefined) product[field] = updates[field];
  }
  await product.save();
  return product.populate({ path: 'services', match: { brand: brandId } });
}

export async function deleteBrandProduct(brandId, id) {
  await findOwnedBrandProduct(brandId, id);
  await BrandProduct.deleteOne({ _id: id, brand: brandId });
}

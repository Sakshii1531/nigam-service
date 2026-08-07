import { City } from './city.model.js';
import { ApiError } from '../../middleware/errorHandler.js';

export async function listCities() {
  return City.find().sort({ createdAt: -1 });
}

export async function listActiveCities() {
  return City.find({ status: 'Active' }).sort({ name: 1 }).select('cityId name state district coverageAreaSqkm status');
}

async function findOr404(id) {
  const city = await City.findById(id);
  if (!city) throw new ApiError(404, 'City not found');
  return city;
}

export async function getCity(id) {
  return findOr404(id);
}

export async function createCity(data) {
  const nameClean = (data.name || '').trim();
  const stateClean = (data.state || '').trim();
  
  if (!nameClean) {
    throw new ApiError(400, 'City name is required.');
  }

  // Case-insensitive duplicate check for city name
  const existing = await City.findOne({
    name: { $regex: new RegExp(`^${nameClean.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}$`, 'i') }
  });
  if (existing) {
    throw new ApiError(409, `City "${nameClean}" already exists in operational cities (${existing.state || 'Active'}).`);
  }

  return City.create({
    ...data,
    name: nameClean,
    state: stateClean,
    district: (data.district || nameClean).trim()
  });
}

const EDITABLE_FIELDS = ['name', 'state', 'district', 'coverageAreaSqkm', 'status'];

export async function updateCity(id, updates) {
  const city = await findOr404(id);

  if (updates.name && updates.name.trim().toLowerCase() !== city.name.toLowerCase()) {
    const nameClean = updates.name.trim();
    const existing = await City.findOne({
      _id: { $ne: id },
      name: { $regex: new RegExp(`^${nameClean.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}$`, 'i') }
    });
    if (existing) {
      throw new ApiError(409, `City "${nameClean}" already exists in operational cities.`);
    }
  }

  for (const field of EDITABLE_FIELDS) {
    if (updates[field] !== undefined) {
      city[field] = typeof updates[field] === 'string' ? updates[field].trim() : updates[field];
    }
  }
  await city.save();
  return city;
}

export async function deleteCity(id) {
  const city = await findOr404(id);
  await city.deleteOne();
  return { deleted: true, cityId: city.cityId, name: city.name };
}

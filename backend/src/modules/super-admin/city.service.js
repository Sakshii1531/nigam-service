import { City } from './city.model.js';
import { ApiError } from '../../middleware/errorHandler.js';

export async function listCities() {
  return City.find().sort({ name: 1 });
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
  const existing = await City.findOne({ name: data.name, state: data.state });
  if (existing) throw new ApiError(409, `City "${data.name}, ${data.state}" already exists`);
  return City.create(data);
}

const EDITABLE_FIELDS = ['name', 'state', 'district', 'coverageAreaSqkm', 'status'];

export async function updateCity(id, updates) {
  const city = await findOr404(id);
  for (const field of EDITABLE_FIELDS) {
    if (updates[field] !== undefined) city[field] = updates[field];
  }
  await city.save();
  return city;
}

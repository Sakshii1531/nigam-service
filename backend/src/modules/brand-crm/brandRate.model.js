import { applyStandardPlugins } from '../shared/plugins.js';
import { brandScopeGuard } from '../shared/brandScopeGuard.js';
export { lockRates } from './brandRateLock.model.js';
import mongoose from 'mongoose';
import { City } from '../super-admin/city.model.js';
import { Category } from '../catalog/category.model.js';
import { SERVICE_TYPES } from '../partner-warranty/ticketConstants.js';
import { ApiError } from '../../middleware/errorHandler.js';
const O = mongoose.Schema.Types.ObjectId;
const schema = new mongoose.Schema({
  brand: {
    type: O,
    ref: 'Brand',
    required: true,
    index: true
  },
  category: {
    type: O,
    ref: 'Category',
    required: true
  },
  categoryKey: {
    type: String,
    required: true
  },
  serviceType: {
    type: String,
    enum: SERVICE_TYPES,
    required: true
  },
  state: {
    type: String,
    default: null
  },
  city: {
    type: String,
    default: null
  },
  brandRate: {
    type: Number,
    min: 0,
    required: true
  },
  partnerPayout: {
    type: Number,
    min: 0,
    default: null,
    select: false
  },
  visitOnlyRate: {
    type: Number,
    min: 0,
    default: null
  },
  effectiveFrom: {
    type: Date,
    required: true,
    default: Date.now
  },
  effectiveTo: {
    type: Date,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  usageCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  optimisticConcurrency: true
});
schema.index({
  brand: 1,
  category: 1,
  serviceType: 1,
  state: 1,
  city: 1,
  effectiveFrom: 1
}, {
  unique: true
});
const literal = s => new RegExp(`^${s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
export async function canonicalRate(data, session = null) {
  if (data.city && !data.state) throw new ApiError(400, 'City requires a state');
  const category = await Category.findById(data.category).session(session).lean();
  if (!category) throw new ApiError(400, 'Unknown category');
  data.categoryKey = category.key;
  if (data.state) {
    const cities = await City.find({
      state: literal(data.state)
    }).session(session).lean();
    if (!cities.length) throw new ApiError(400, 'Unknown state');
    data.state = cities[0].state;
    if (data.city) {
      const city = cities.find(c => c.name.toLowerCase() === data.city.toLowerCase());
      if (!city) throw new ApiError(400, 'Unknown city in this state');
      data.city = city.name;
    }
  }
  data.state ||= null;
  data.city ||= null;
  if (data.effectiveTo && +new Date(data.effectiveTo) <= +new Date(data.effectiveFrom)) throw new ApiError(400, 'Effective end must follow start');
  return data;
}
schema.pre('validate', async function () {
  await canonicalRate(this, this.$session());
});
schema.pre('save', async function () {
  const overlap = await this.constructor.exists({
    _id: {
      $ne: this._id
    },
    $expr: { $or: [{ $eq: ['$effectiveTo', null] }, { $gt: ['$effectiveTo', '$effectiveFrom'] }] },
    brand: this.brand,
    category: this.category,
    serviceType: this.serviceType,
    state: this.state,
    city: this.city,
    effectiveFrom: {
      $lt: this.effectiveTo || new Date('9999-12-31')
    },
    $or: [{
      effectiveTo: null
    }, {
      effectiveTo: {
        $gt: this.effectiveFrom
      }
    }]
  }).session(this.$session());
  if (overlap) throw new ApiError(409, 'Effective dates overlap an existing rate for this scope');
});
brandScopeGuard(schema);
applyStandardPlugins(schema);
export const BrandRate = mongoose.models.BrandRate || mongoose.model('BrandRate', schema);

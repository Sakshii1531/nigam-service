import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';
import { ID_PREFIXES } from '../../config/constants.js';

const courseSchema = new mongoose.Schema(
  {
    // Null means platform-wide content owned by super-admin; a brand id means
    // the brand authored it for technicians servicing its own appliances.
    // Technicians read both — they work across brands.
    brand: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand', default: null, index: true },
    name: { type: String, required: true },
    modules: [String],
    testRequired: { type: Boolean, default: false },
    minScore: Number,
    status: { type: String, enum: ['Active', 'Draft'], default: 'Draft', index: true },
  },
  { timestamps: true },
);

applyStandardPlugins(courseSchema, { prefix: ID_PREFIXES.COURSE });

export const Course = mongoose.models.Course || mongoose.model('Course', courseSchema);

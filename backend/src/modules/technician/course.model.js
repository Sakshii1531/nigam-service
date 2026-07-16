import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';
import { ID_PREFIXES } from '../../config/constants.js';

const courseSchema = new mongoose.Schema(
  {
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

import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';

// The catalogue of skills a service provider can be certified in, maintained by
// super-admin. ServiceProvider.specs holds free-text strings today; this gives the
// console a controlled vocabulary to pick from rather than inventing one per
// service provider.
const serviceProviderSkillSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    // Short operational code, e.g. 'AC-SPLIT-INST'.
    code: { type: String, required: true, unique: true, index: true },
    group: { type: String, index: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

applyStandardPlugins(serviceProviderSkillSchema);

export const ServiceProviderSkill =
  mongoose.models.ServiceProviderSkill || mongoose.model('ServiceProviderSkill', serviceProviderSkillSchema);

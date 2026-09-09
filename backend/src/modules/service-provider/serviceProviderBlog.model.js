import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';

const serviceProviderBlogSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    category: String,
    readTime: String,
    author: String,
    body: String,
  },
  { timestamps: true },
);

applyStandardPlugins(serviceProviderBlogSchema);

export const ServiceProviderBlog = mongoose.models.ServiceProviderBlog || mongoose.model('ServiceProviderBlog', serviceProviderBlogSchema);

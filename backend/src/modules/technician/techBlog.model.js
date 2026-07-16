import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';

const techBlogSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    category: String,
    readTime: String,
    author: String,
    body: String,
  },
  { timestamps: true },
);

applyStandardPlugins(techBlogSchema);

export const TechBlog = mongoose.models.TechBlog || mongoose.model('TechBlog', techBlogSchema);

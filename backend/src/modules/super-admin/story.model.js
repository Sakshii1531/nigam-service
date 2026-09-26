import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';

const storySchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    type: { type: String, enum: ['Promo Banner', 'Customer Help Slider', 'Informational'], required: true },
    mediaUrl: String,
    // A story is a sequence of full-screen slides in the customer app's viewer,
    // not a single image — mediaUrl is only the cover shown in the rail.
    slides: [
      {
        _id: false,
        image: String,
        caption: String,
        subCaption: String,
      },
    ],
    aspectRatio: String,
    // Optional "Book now" on the story: the catalogue service it promotes
    // (docs/master-catalogue Phase 22). Resolved to a booking link on read,
    // and left out while that service isn't bookable.
    target: {
      type: new mongoose.Schema(
        {
          productType: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductType', default: null },
          service: { type: mongoose.Schema.Types.ObjectId, ref: 'CatalogService', required: true },
        },
        { _id: false },
      ),
      default: undefined,
    },
    clicks: { type: Number, default: 0 },
    status: { type: String, enum: ['Active', 'Scheduled'], default: 'Active', index: true },
  },
  { timestamps: true },
);

applyStandardPlugins(storySchema);

export const Story = mongoose.models.Story || mongoose.model('Story', storySchema);

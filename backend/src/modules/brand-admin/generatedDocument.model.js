import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';
import { ID_PREFIXES } from '../../config/constants.js';

const generatedDocumentSchema = new mongoose.Schema(
  {
    brand: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand', required: true, index: true },
    type: {
      type: String,
      enum: [
        'Service Completion Letter',
        'Warranty Certificate',
        'FOC Approval Letter',
        'Replacement Authorization',
        'Customer Bill Copy',
      ],
      required: true,
    },
    serviceRequest: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceRequest', required: true },
    generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    pdfUrl: String,
  },
  { timestamps: true },
);

applyStandardPlugins(generatedDocumentSchema, { prefix: ID_PREFIXES.DOCUMENT });

export const GeneratedDocument = mongoose.models.GeneratedDocument || mongoose.model('GeneratedDocument', generatedDocumentSchema);

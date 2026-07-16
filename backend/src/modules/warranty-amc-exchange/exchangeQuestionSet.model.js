import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';

const questionSchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
    type: { type: String, enum: ['Yes/No', 'Radio', 'Toggle'], required: true },
    options: [String],
    // deductions: Map<option, fraction of base value to deduct> — matches
    // frontend/src/data/exchangeMockData.js defaultQuestionSets shape exactly.
    deductions: { type: Map, of: Number, default: {} },
  },
  { _id: false },
);

const exchangeQuestionSetSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    category: { type: String, required: true, index: true },
    questions: [questionSchema],
  },
  { timestamps: true },
);

applyStandardPlugins(exchangeQuestionSetSchema);

export const ExchangeQuestionSet =
  mongoose.models.ExchangeQuestionSet || mongoose.model('ExchangeQuestionSet', exchangeQuestionSetSchema);

import mongoose from 'mongoose';

// What a set of Variant rows varies by — `{ key: 'capacity', label: 'Capacity' }`
// on a product type, `{ key: 'tank_capacity', label: 'Tank Capacity' }` on a
// standalone service. Shared so both parents describe it identically.
export const dimensionSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
  },
  { _id: false },
);

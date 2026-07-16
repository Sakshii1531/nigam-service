import mongoose from 'mongoose';

// Embedded in User — always read/written with the parent, never queried independently.
export const addressSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['Home', 'Work', 'Other'], default: 'Home' },
    house: String,
    landmark: String,
    city: String,
    pincode: String,
    name: String,
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true },
);

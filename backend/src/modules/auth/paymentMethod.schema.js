import mongoose from 'mongoose';

// Embedded in User — stores PCI-DSS tokenized references only.
// Raw card numbers and CVV codes are NEVER stored.
export const paymentMethodSchema = new mongoose.Schema(
  {
    kind: { type: String, enum: ['card', 'upi'], required: true },
    token: { type: String, required: true }, // e.g. tok_card_... or tok_upi_...
    cardType: { type: String, enum: ['Visa', 'Mastercard', 'RuPay', 'Amex', 'Other'], default: 'Visa' },
    last4: { type: String, trim: true }, // 4 digits only (e.g. '4321')
    expiry: { type: String, trim: true }, // MM/YY
    upiAddress: { type: String, trim: true }, // e.g. user@okaxis
    upiBank: { type: String, trim: true }, // e.g. Axis Bank
    isPrimary: { type: Boolean, default: false },
  },
  { timestamps: true },
);

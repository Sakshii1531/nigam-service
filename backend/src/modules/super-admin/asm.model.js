import mongoose from 'mongoose';
import { applyStandardPlugins } from '../shared/plugins.js';

// Area Service Manager — oversees one zone (City). A service provider falls
// under whichever ASM's `city` matches their own (asm.service.js's
// findAsmForCity), so a city maps to at most one ASM — enforced here rather
// than left to the create/update service logic, since a stray duplicate
// would silently make "which ASM owns this provider" ambiguous.
const asmSchema = new mongoose.Schema(
  {
    // Set by createAsm alongside a User(role: ROLES.ASM) — this is how the ASM
    // logs in (same password+OTP flow as every other role).
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    name: { type: String, required: true },
    email: String,
    phone: String,
    city: { type: mongoose.Schema.Types.ObjectId, ref: 'City', required: true, unique: true },
    rating: { type: Number, default: 0 },
  },
  { timestamps: true },
);

applyStandardPlugins(asmSchema);

export const ASM = mongoose.models.ASM || mongoose.model('ASM', asmSchema);

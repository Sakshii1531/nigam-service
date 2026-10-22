import { z } from 'zod';
import { canonicalStateName } from '../shared/indianStates.js';
export const GST_STATES = { '01':'Jammu and Kashmir','02':'Himachal Pradesh','03':'Punjab','04':'Chandigarh','05':'Uttarakhand','06':'Haryana','07':'Delhi','08':'Rajasthan','09':'Uttar Pradesh','10':'Bihar','11':'Sikkim','12':'Arunachal Pradesh','13':'Nagaland','14':'Manipur','15':'Mizoram','16':'Tripura','17':'Meghalaya','18':'Assam','19':'West Bengal','20':'Jharkhand','21':'Odisha','22':'Chhattisgarh','23':'Madhya Pradesh','24':'Gujarat','26':'Dadra and Nagar Haveli and Daman and Diu','27':'Maharashtra','28':'Andhra Pradesh (legacy)','29':'Karnataka','30':'Goa','31':'Lakshadweep','32':'Kerala','33':'Tamil Nadu','34':'Puducherry','35':'Andaman and Nicobar Islands','36':'Telangana','37':'Andhra Pradesh','38':'Ladakh' };
export function validGstin(value) {
  if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(value || '') || !GST_STATES[value.slice(0,2)]) return false;
  let sum = 0, factor = 2;
  for (let i = 13; i >= 0; i--) { const n = parseInt(value[i], 36) * factor; sum += Math.floor(n / 36) + n % 36; factor = factor === 2 ? 1 : 2; }
  return ((36 - sum % 36) % 36).toString(36).toUpperCase() === value[14];
}
export const gstinSchema = z.string().trim().toUpperCase().refine(validGstin, 'Enter a valid 15-character GSTIN, including its check digit');
export const businessBillingSchema = z.object({
  gstin: gstinSchema, legalName: z.string().trim().min(2).max(160),
  address: z.string().trim().min(5).max(500), city: z.string().trim().min(2).max(100),
  pincode: z.string().regex(/^[1-9][0-9]{5}$/, 'Enter a valid billing pincode'),
}).strict();
export function serviceStateCode(name) {
  const canonical = canonicalStateName(name);
  return Object.entries(GST_STATES).find(([, label]) => label === canonical)?.[0] || null;
}

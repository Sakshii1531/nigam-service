import { z } from 'zod';
import { VISIT_SLOTS } from '../partner-warranty/ticketConstants.js';
export function visitDateRange() {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  return { min: today, max: new Date(new Date(`${today}T00:00:00Z`).getTime() + 7 * 86400000).toISOString().slice(0,10) };
}
export const preferredVisitSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
    const parsed = new Date(`${value}T00:00:00Z`);
    if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0,10) !== value) return false;
    const {min,max} = visitDateRange();
    return value >= min && value <= max;
  }, 'Choose a visit date within the next 7 days'),
  slot: z.enum(VISIT_SLOTS), notes: z.string().trim().max(500).optional(),
}).strict();

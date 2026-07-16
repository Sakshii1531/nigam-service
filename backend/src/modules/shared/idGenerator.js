import { Counter } from './counter.model.js';
import { ID_SCHEMES } from '../../config/constants.js';

function dateSegmentValue(kind) {
  if (!kind) return null;
  const now = new Date();
  if (kind === 'YYYY') return String(now.getFullYear());
  if (kind === 'YYMMDD') {
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yy}${mm}${dd}`;
  }
  throw new Error(`idGenerator: unknown dateSegment kind "${kind}"`);
}

/**
 * Atomically allocates the next human-readable ID for a given prefix (e.g. "NCC",
 * "SR", "INV"), formatted per ID_SCHEMES. Daily/yearly-reset prefixes get a
 * separate counter per date segment (`Counter._id` = `${prefix}:${segment}`),
 * so e.g. bookings restart at 0001 each day without clashing with yesterday's.
 */
export async function generateHumanId(prefix) {
  const scheme = ID_SCHEMES[prefix];
  if (!scheme) throw new Error(`idGenerator: no ID_SCHEMES entry for prefix "${prefix}"`);

  const segment = dateSegmentValue(scheme.dateSegment);
  const counterKey = segment ? `${prefix}:${segment}` : prefix;

  const counter = await Counter.findOneAndUpdate(
    { _id: counterKey },
    { $inc: { seq: 1 } },
    { upsert: true, new: true },
  );

  const seq = String(counter.seq).padStart(scheme.digits, '0');
  return [prefix, segment, seq].filter(Boolean).join(scheme.separator);
}

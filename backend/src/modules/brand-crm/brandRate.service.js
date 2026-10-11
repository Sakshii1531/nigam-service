import { recordAction } from '../shared/auditLog.js';
import { z } from 'zod';
import mongoose from 'mongoose';
import { BrandRate, canonicalRate, lockRates } from './brandRate.model.js';
import { Brand } from '../super-admin/brand.model.js';
import { Category } from '../catalog/category.model.js';
import { City } from '../super-admin/city.model.js';
import { SERVICE_TYPES } from '../partner-warranty/ticketConstants.js';
import { runInTransaction } from '../../utils/transaction.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { AuditLog } from '../super-admin/auditLog.model.js';
import { parseCsv } from './warrantyPolicy.service.js';
const id = z.string().refine(mongoose.isValidObjectId, 'Invalid ID');
const money = z.number().finite().min(0).max(100000000).refine(n => Math.abs(n * 100 - Math.round(n * 100)) < 0.00001, 'Use at most two decimal places');
const fields = {
  category: id,
  serviceType: z.enum(SERVICE_TYPES),
  state: z.string().trim().max(100).nullable().optional(),
  city: z.string().trim().max(100).nullable().optional(),
  brandRate: money,
  effectiveFrom: z.coerce.date().optional(),
  effectiveTo: z.coerce.date().nullable().optional()
};
export function parseRate(input, admin = false, partial = false) {
  const s = z.object({
    ...fields,
    ...(admin ? {
      partnerPayout: money.nullable().optional(),
      visitOnlyRate: money.nullable().optional()
    } : {})
  }).strict();
  return (partial ? s.partial() : s).parse(input);
}
export function rateView(row, admin = false) {
  if (!row) return null;
  const r = row.toObject ? row.toObject() : row;
  return Object.fromEntries(['brand', 'category', 'categoryKey', 'serviceType', 'state', 'city', 'brandRate', 'visitOnlyRate', 'effectiveFrom', 'effectiveTo', 'isActive', 'usageCount', ...(admin ? ['partnerPayout'] : [])].map(k => [k, r[k] ?? null]).concat([['id', String(r._id)]]));
}
export async function options(brand) {
  const b = brand ? await Brand.findById(brand).lean() : null;
  return {
    categories: await Category.find(b ? {
      _id: {
        $in: b.coverage
      }
    } : {
      isActive: true
    }).select('key name').lean(),
    cities: await City.find({
      status: 'Active'
    }).select('name state').sort({
      state: 1,
      name: 1
    }).lean(),
    serviceTypes: SERVICE_TYPES,
    ...(!brand ? {
      brands: await Brand.find().select('name coverage').lean()
    } : {})
  };
}
export async function listRates(brand, q = {}) {
  const filter = {
    ...(brand ? {
      brand
    } : {})
  };
  for (const k of ['category', 'serviceType', 'state', 'city']) if (q[k]) filter[k] = q[k];
  if (q.active !== undefined) filter.isActive = q.active === 'true';
  return BrandRate.find(filter).select('+partnerPayout').sort({
    categoryKey: 1,
    serviceType: 1,
    state: 1,
    city: 1,
    effectiveFrom: -1
  });
}
async function audit(brand, actor, action, before, row, session) {
  const changes = {};
  for (const k of Object.keys(fields).concat(['visitOnlyRate', 'isActive'])) if (String(before?.[k] ?? '') !== String(row[k] ?? '')) changes[k] = [before?.[k] ?? null, row[k] ?? null];
  await AuditLog.create([{
    brand,
    actor,
    user: actor.user,
    type: 'Finance',
    entityType: 'BrandRate',
    entityId: row._id,
    action,
    meta: {
      changes
    }
  }], {
    session
  });
  if (String(before?.partnerPayout ?? '') !== String(row.partnerPayout ?? '')) await AuditLog.create([{
    brand: null,
    actor,
    user: actor.user,
    type: 'Finance',
    entityType: 'BrandRate',
    entityId: row._id,
    action,
    meta: {
      changes: {
        partnerPayout: [before?.partnerPayout ?? null, row.partnerPayout ?? null]
      }
    }
  }], {
    session
  });
}
async function scope(brand, data, session) {
  const b = await Brand.findById(brand).session(session).lean();
  if (!b) throw new ApiError(404, 'Brand not found');
  if (!b.coverage.some(c => String(c) === String(data.category))) throw new ApiError(400, 'Category must belong to brand coverage');
  return canonicalRate(data, session);
}
export async function mutateRate(brand, actor, input, {
  id: rowId,
  admin = false,
  deactivate = false,
  session: external
} = {}) {
  const data = deactivate ? {} : parseRate(input, admin, !!rowId);
  const work = async session => {
    await lockRates(brand, session);
    let previous = null;
    if (rowId) {
      previous = await BrandRate.findOne({
        _id: rowId,
        brand
      }).select('+partnerPayout').session(session);
      if (!previous) throw new ApiError(404, 'Rate not found');
      if (!previous.isActive || previous.effectiveTo && previous.effectiveTo <= new Date()) throw new ApiError(409, 'Historical rates cannot be edited');
    }
    if (deactivate) {
      const before = previous.toObject();
      const now = new Date();
      if (+previous.effectiveFrom >= +now) {
        previous.isActive = false; /* Future row is retained as cancelled history. */
        previous.effectiveTo = previous.effectiveFrom;
        await BrandRate.updateOne({
          _id: previous._id,
          brand
        }, {
          $set: {
            isActive: false,
            effectiveTo: previous.effectiveFrom
          }
        }, {
          session
        });
      } else {
        previous.effectiveTo = now;
        previous.isActive = false;
        await previous.save({
          session
        });
      }
      await audit(brand, actor, 'rate.deactivated', before, previous, session);
      return previous;
    }
    let next = {
      ...(previous ? previous.toObject() : {}),
      ...data,
      brand
    };
    delete next._id;
    delete next.__v;
    delete next.createdAt;
    delete next.updatedAt;
    const before = previous?.toObject();
    if (previous?.usageCount) {
      const now = new Date();
      previous.effectiveTo = now;
      previous.isActive = false;
      await previous.save({
        session
      });
      next.effectiveFrom = now;
      next.effectiveTo = data.effectiveTo ?? null;
      next.usageCount = 0;
    }
    next.effectiveFrom ??= new Date();
    next.isActive = true;
    await scope(brand, next, session);
    let row;
    if (previous && !before.usageCount) {
      Object.assign(previous, next);
      row = await previous.save({
        session
      });
    } else {
      [row] = await BrandRate.create([next], {
        session
      });
    }
    await audit(brand, actor, rowId ? 'rate.updated' : 'rate.created', before, row, session);
    return row;
  };
  return external !== undefined ? work(external) : runInTransaction(work);
}
const csvFields = ['category', 'serviceType', 'state', 'city', 'brandRate', 'effectiveFrom', 'effectiveTo'];
export async function exportRates(brand, q, admin) {
  const rows = await listRates(brand, q),
    keys = [...csvFields, ...(admin ? ['partnerPayout', 'visitOnlyRate'] : [])];
  const quote = v => `"${String(v ?? '').replaceAll('"', '""')}"`;
  return [keys, ...rows.map(r => keys.map(k => r[k] instanceof Date ? r[k].toISOString() : r[k]))].map(r => r.map(quote).join(',')).join('\r\n');
}
export async function importRates(brand, actor, {
  csv,
  dryRun = true
}, admin = false) {
  if (typeof csv !== 'string' || csv.length > 1000000) throw new ApiError(400, 'Supply CSV text (maximum 1 MB)');
  const rows = parseCsv(csv),
    headers = rows.shift() || [];
  if (!rows.length || !['category', 'serviceType', 'brandRate'].every(k => headers.includes(k))) throw new ApiError(400, 'CSV requires category, serviceType and brandRate columns and at least one row');
  const allowed = [...csvFields, ...(admin ? ['partnerPayout', 'visitOnlyRate'] : [])];
  if (headers.some(h => !allowed.includes(h))) throw new ApiError(400, 'CSV contains unsupported columns');
  if (rows.length > 500) throw new ApiError(400, 'Import at most 500 rows');
  const valid = [],
    errors = [];
  for (const [index, cells] of rows.entries()) {
    try {
      const raw = Object.fromEntries(headers.map((k, i) => [k, cells[i] || null]).filter(([, v]) => v !== null));
      for (const k of ['brandRate', 'partnerPayout', 'visitOnlyRate']) if (raw[k] != null) raw[k] = Number(raw[k]);
      const data = parseRate(raw, admin);
      data.brand = brand;
      data.effectiveFrom ??= new Date();
      await scope(brand, data, null);
      const existing = await listRates(brand, {
        category: data.category,
        serviceType: data.serviceType
      });
      const overlap = r => String(r.category) === String(data.category) && r.serviceType === data.serviceType && (!r.effectiveTo || +r.effectiveTo > +r.effectiveFrom) && r.state === (data.state || null) && r.city === (data.city || null) && +r.effectiveFrom < +(data.effectiveTo || new Date('9999-12-31')) && +data.effectiveFrom < +(r.effectiveTo || new Date('9999-12-31'));
      if (existing.some(overlap) || valid.some(overlap)) throw new ApiError(409, 'Overlapping effective dates');
      valid.push(data);
    } catch (e) {
      errors.push({
        row: index + 2,
        message: e.message
      });
    }
  }
  if (!dryRun && errors.length) throw new ApiError(400, 'Fix CSV errors before importing', {
    errors
  });
  if (!dryRun) await runInTransaction(async session => {
    for (const data of valid) {
      const payload = Object.fromEntries(Object.keys({
        ...fields,
        partnerPayout: 1,
        visitOnlyRate: 1
      }).filter(k => data[k] !== undefined).map(k => [k, data[k]]));
      await mutateRate(brand, actor, payload, {
        admin,
        session
      });
    }
  });
  if (!dryRun) await recordAction({brand,actor,entityType:'BrandRate',action:'rate.imported',meta:{rows:valid.length}});
  return {
    dryRun,
    total: rows.length,
    ok: valid.length,
    errors,
    imported: dryRun ? 0 : valid.length
  };
}

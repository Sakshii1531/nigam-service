import { ReverseLogisticsReturn } from './reverseLogisticsReturn.model.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { parsePagination, paginationMeta } from '../../utils/pagination.js';
import { ServiceRequest } from '../service-requests/serviceRequest.model.js';
import { ServiceProvider } from '../service-provider/serviceProvider.model.js';
import { Job } from '../service-provider/job.model.js';

async function assertReferences(brandId, serviceRequest, serviceProvider) {
  if (serviceRequest) {
    const job = await ServiceRequest.findOne({ _id: serviceRequest, brand: brandId }).select('serviceProvider').lean();
    if (!job) throw new ApiError(404, 'Service request not found');
    if (String(job.serviceProvider) !== String(serviceProvider) && !await Job.exists({ serviceRequest, serviceProvider })) throw new ApiError(400, 'Service partner must be assigned to this job');
  } else {
    const known = await ServiceProvider.exists({ _id: serviceProvider, authorizedBrands: brandId });
    if (!known && !await ServiceRequest.exists({ brand: brandId, serviceProvider })) throw new ApiError(404, 'Service partner not found for this brand');
  }
}

export async function listReturns(brandId, { status, page, limit, sort } = {}) {
  const jobs = await ServiceRequest.find({ brand: brandId }).select('_id serviceProvider').lean();
  const historicalJobs = await Job.find({ serviceRequest: { $in: jobs.map(job => job._id) } }).select('serviceRequest serviceProvider').lean();
  const authorized = await ServiceProvider.find({ authorizedBrands: brandId }).distinct('_id');
  const query = { brand: brandId, $or: [
    ...jobs.filter(job => job.serviceProvider).map(job => ({ serviceRequest: job._id, serviceProvider: job.serviceProvider })),
    ...historicalJobs.map(job => ({ serviceRequest: job.serviceRequest, serviceProvider: job.serviceProvider })),
    { serviceRequest: null, serviceProvider: { $in: [...authorized, ...jobs.map(job => job.serviceProvider).filter(Boolean)] } },
  ] };
  if (status) query.status = status;

  const { skip, limit: lim, page: pg, sort: sortObj } = parsePagination({ page, limit, sort });
  const [items, total] = await Promise.all([
    // The returns table names the service provider who sent the part back and the
    // ticket it came off, so resolve both refs here.
    ReverseLogisticsReturn.find(query)
      .populate('serviceProvider', 'name')
      .populate({ path: 'serviceRequest', select: 'humanId', match: { brand: brandId } })
      .sort(sortObj)
      .skip(skip)
      .limit(lim),
    ReverseLogisticsReturn.countDocuments(query),
  ]);
  return { items, meta: paginationMeta({ page: pg, limit: lim, total }) };
}

async function findOwnedOr404(brandId, id) {
  const record = await ReverseLogisticsReturn.findOne({ _id: id, brand: brandId });
  if (!record) throw new ApiError(404, 'Return record not found');
  try { await assertReferences(brandId, record.serviceRequest, record.serviceProvider); }
  catch (error) { if ([400, 404].includes(error.statusCode)) throw new ApiError(404, 'Return record not found'); throw error; }
  return record;
}

export async function getReturn(brandId, id) {
  return findOwnedOr404(brandId, id);
}

/** Same reasoning as replacementApproval.service.js's createReplacementApproval:
 * no service provider-side "log a returned part" trigger exists yet, so this is the
 * entry point for now, logged by brand-admin/ops. */
export async function createReturn(brandId, { serviceProvider, partName, sku, serviceRequest, replaceDate }) {
  await assertReferences(brandId, serviceRequest, serviceProvider);
  return ReverseLogisticsReturn.create({ brand: brandId, serviceProvider, partName, sku, serviceRequest: serviceRequest || null, replaceDate });
}

export async function updateReturn(brandId, id, updates) {
  const record = await findOwnedOr404(brandId, id);
  const EDITABLE_FIELDS = ['status', 'transitStatus', 'trackingNo', 'damageFlag'];
  for (const field of EDITABLE_FIELDS) {
    if (updates[field] !== undefined) record[field] = updates[field];
  }
  await record.save();
  return record;
}

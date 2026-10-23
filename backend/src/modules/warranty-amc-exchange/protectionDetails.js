import mongoose from 'mongoose';
import { AMCSubscription } from './amcSubscription.model.js';
import { ExtendedWarrantyOrder } from './extendedWarrantyOrder.model.js';
import { AMCVisit } from './amcVisit.model.js';
import { ServiceRequest } from '../service-requests/serviceRequest.model.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { Job } from '../service-provider/job.model.js';

export async function protectionDetails(userId, kind, id, query = {}) {
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, 'Invalid protection plan id');
  const isAmc = kind === 'amc';
  const model = isAmc ? AMCSubscription : ExtendedWarrantyOrder;
  let find = model.findOne({ _id:id, user:userId });
  if (isAmc) find = find.populate('plan');
  const purchase = await find.populate({ path:'appliance', select:'nickname category brand model modelNumber serialNumber purchaseDate deletedAt' });
  if (!purchase) throw new ApiError(404, 'Protection plan not found');
  const legacyJobs = await Job.find({ [isAmc ? 'amc.amcSubscription' : 'ew.extendedWarrantyOrder']:id }).distinct('serviceRequest');
  const filter = { user:userId, $and:[{ $or:[{ [isAmc ? 'amcSubscription' : 'extendedWarrantyOrder']:id }, { _id:{ $in:legacyJobs } }] }] };
  if (query.before || query.beforeId) {
    const before = new Date(query.before);
    if (!query.before || !mongoose.isValidObjectId(query.beforeId) || Number.isNaN(before.getTime())) throw new ApiError(400, 'Invalid history cursor');
    filter.$and.push({ $or:[{ createdAt:{ $lt:before } }, { createdAt:before, _id:{ $lt:query.beforeId } }] });
  }
  const rows = await ServiceRequest.find(filter).sort({ createdAt:-1, _id:-1 }).limit(101)
    .select('humanId category description status createdAt booking')
    .populate({ path:'booking', select:'humanId serviceTitle status scheduledDate timeSlot completedAt commercial.coverage' });
  const page = rows.slice(0,100);
  const last = page.at(-1);
  // Older requests sometimes carried both policy references. Only include the
  // policy which actually paid for that booking; new bookings save one reference.
  const expectedType = isAmc ? 'AMC Visit' : 'NCC Extended Warranty';
  const jobs = await Job.find({ serviceRequest:{ $in:page.map(row => row._id) } }).select('serviceRequest type').lean();
  const jobType = new Map(jobs.map(job => [String(job.serviceRequest),job.type]));
  const history = page.filter(row => { const applied = jobType.get(row.id) || row.booking?.commercial?.coverage?.type; return !applied || applied === expectedType; }).map(row => ({
    id:row.id, number:row.booking?.humanId || row.humanId, title:row.booking?.serviceTitle || row.category,
    status:row.booking?.status === 'Cancelled' ? 'Cancelled' : row.status,
    createdAt:row.createdAt, scheduledDate:row.booking?.scheduledDate, timeSlot:row.booking?.timeSlot,
    completedAt:row.booking?.completedAt, bookingId:row.booking?.id, description:row.description,
  }));
  const expiry = isAmc ? purchase.expiryDate : purchase.validTill;
  const remaining = isAmc ? purchase.visitsRemaining : purchase.claimsRemaining;
  const state = !purchase.paid ? 'Payment pending' : isAmc && !purchase.plan ? 'Plan unavailable' : !isAmc && purchase.verificationStatus === 'Rejected' ? 'Verification rejected'
    : !expiry || new Date(expiry) <= new Date() || purchase.status === 'Expired' ? 'Expired' : remaining <= 0 ? 'Allowance used' : 'Active';
  const recordedVisits = isAmc ? await AMCVisit.find({ subscription:id }).sort({ visitNumber:-1 }).select('visitNumber scheduledDate status tasks.label tasks.done notes createdAt').limit(100) : [];
  return { kind, purchase, state, eligible:state === 'Active', history, recordedVisits,
    nextCursor:rows.length > 100 ? { before:last.createdAt, beforeId:last.id } : null,
  };
}

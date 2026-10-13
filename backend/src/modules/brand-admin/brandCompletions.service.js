import mongoose from 'mongoose';
import { ServiceRequest } from '../service-requests/serviceRequest.model.js';
import { Job } from '../service-provider/job.model.js';
import { Review } from '../reviews/review.model.js';
import { User } from '../auth/user.model.js';
import { ServiceProvider } from '../service-provider/serviceProvider.model.js';
import { Escalation } from '../super-admin/escalation.model.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { parsePagination, paginationMeta } from '../../utils/pagination.js';

export async function listBrandCompletions(brandId, filters = {}, now = new Date()) {
  const brand = new mongoose.Types.ObjectId(String(brandId));
  const { skip, limit, page } = parsePagination(filters);
  const indiaNow = new Date(+now + 330 * 60000);
  const today = new Date(Date.UTC(indiaNow.getUTCFullYear(), indiaNow.getUTCMonth(), indiaNow.getUTCDate()) - 330 * 60000);
  const tabMatch = filters.tab === 'today' ? { completedAt: { $gte: today, $lt: new Date(+today + 86400000) } }
    : filters.tab === 'pending_qc' ? { qcStatus: 'Pending QC' }
      : filters.tab === 'feedback_pending' ? { feedbackStatus: 'Pending' } : {};
  const pipeline = [
    { $match: { brand, status: { $in: ['Repair Completed', 'Customer Confirmation', 'Closed'] } } },
    { $lookup: { from: Job.collection.name, localField: '_id', foreignField: 'serviceRequest', as: '_jobs', pipeline: [{ $sort: { 'completion.at': -1 } }, { $project: { 'completion.at': 1 } }] } },
    { $lookup: { from: Review.collection.name, localField: '_id', foreignField: 'serviceRequest', as: '_reviews', pipeline: [{ $project: { rating: 1 } }] } },
    { $lookup: { from: User.collection.name, localField: 'user', foreignField: '_id', as: '_users', pipeline: [{ $project: { name: 1 } }] } },
    { $lookup: { from: ServiceProvider.collection.name, localField: 'serviceProvider', foreignField: '_id', as: '_providers', pipeline: [{ $project: { name: 1 } }] } },
    { $lookup: { from: Escalation.collection.name, let: { sr: '$_id', claim: '$warrantyClaim' }, as: '_qc', pipeline: [
      { $match: { brand, scope: 'brand', status: { $ne: 'Resolved' }, reason: /^Re-QC:/, $expr: { $or: [
        { $eq: ['$serviceRequest', '$$sr'] },
        { $and: [{ $ne: [{ $ifNull: ['$$claim', null] }, null] }, { $eq: ['$warrantyClaim', '$$claim'] }] },
      ] } } }, { $limit: 1 }, { $project: { _id: 1 } },
    ] } },
    { $set: {
      completedAt: { $ifNull: [{ $arrayElemAt: ['$_jobs.completion.at', 0] }, { $let: {
        vars: { steps: { $filter: { input: '$timeline', as: 'step', cond: { $and: [{ $eq: ['$$step.stepLabel', 'Repair Completed'] }, { $eq: ['$$step.done', true] }] } } } },
        in: { $arrayElemAt: ['$$steps.timestamp', -1] },
      } }] },
      user: { $arrayElemAt: ['$_users', 0] }, serviceProvider: { $arrayElemAt: ['$_providers', 0] },
      rating: { $ifNull: [{ $arrayElemAt: ['$_reviews.rating', 0] }, null] },
      feedbackStatus: { $cond: [{ $gt: [{ $size: '$_reviews' }, 0] }, 'Received', 'Pending'] },
      qcStatus: { $cond: [{ $and: [{ $eq: ['$status', 'Closed'] }, { $eq: [{ $size: '$_qc' }, 0] }] }, 'QC Passed', 'Pending QC'] },
      reQcRequested: { $gt: [{ $size: '$_qc' }, 0] },
    } },
  ];
  if (filters.q) {
    const rx = new RegExp(filters.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    pipeline.push({ $match: { $or: [{ humanId: rx }, { 'user.name': rx }] } });
  }
  const [result] = await ServiceRequest.aggregate([...pipeline, { $facet: {
    summary: [{ $group: { _id: null, total: { $sum: 1 }, pendingQc: { $sum: { $cond: [{ $eq: ['$qcStatus', 'Pending QC'] }, 1, 0] } }, feedbackPending: { $sum: { $cond: [{ $eq: ['$feedbackStatus', 'Pending'] }, 1, 0] } }, averageRating: { $avg: '$rating' } } }],
    count: [{ $match: tabMatch }, { $count: 'total' }],
    items: [{ $match: tabMatch }, { $sort: { completedAt: -1, _id: -1 } }, ...(filters.format ? [{ $limit: 10001 }] : [{ $skip: skip }, { $limit: limit }]),
      { $project: { humanId: 1, category: 1, status: 1, warrantyClaim: 1, user: 1, serviceProvider: 1, completedAt: 1, rating: 1, feedbackStatus: 1, qcStatus: 1, reQcRequested: 1 } }],
  } }]);
  if (filters.format && result.items.length > 10000) throw new ApiError(400, 'Narrow filters to export at most 10000 completions');
  return { items: result.items.map(r => ({ ...r, id: String(r._id) })), meta: {
    ...paginationMeta({ page, limit, total: result.count[0]?.total || 0 }),
    summary: result.summary[0] || { total: 0, pendingQc: 0, feedbackPending: 0, averageRating: null },
  } };
}

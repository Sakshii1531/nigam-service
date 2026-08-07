import { Review } from './review.model.js';
import { ServiceRequest } from '../service-requests/serviceRequest.model.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { parsePagination, paginationMeta } from '../../utils/pagination.js';

/** One review per ServiceRequest, left by the customer who owns it. `tip` is
 * recorded but not yet paid out — no tip-settlement flow exists anywhere in
 * this codebase yet (same class of gap as the payment gateway/OTP provider
 * stubs), so this is data capture only for now, not a real transfer. */
export async function createReview(userId, { serviceRequest, rating, categoryRatings, tags, photos, tip, comment }) {
  const sr = await ServiceRequest.findById(serviceRequest);
  if (!sr) throw new ApiError(404, 'Service request not found');
  if (String(sr.user) !== userId) throw new ApiError(403, 'Not authorized to review this service request');

  const existing = await Review.findOne({ serviceRequest });
  if (existing) throw new ApiError(409, 'This service request has already been reviewed');

  return Review.create({
    serviceRequest,
    user: userId,
    technician: sr.technician,
    rating,
    categoryRatings,
    tags,
    photos,
    tip,
    comment,
  });
}

export async function getReview(id) {
  const review = await Review.findById(id);
  if (!review) throw new ApiError(404, 'Review not found');
  return review;
}

export async function listTechnicianReviews(technicianId, { page, limit, sort } = {}) {
  const query = { technician: technicianId };
  const { skip, limit: lim, page: pg, sort: sortObj } = parsePagination({ page, limit, sort });
  const [items, total] = await Promise.all([
    Review.find(query).sort(sortObj).skip(skip).limit(lim),
    Review.countDocuments(query),
  ]);
  return { items, meta: paginationMeta({ page: pg, limit: lim, total }) };
}

/**
 * Every review a brand can see: those left on its own service requests.
 *
 * Review has no direct brand ref — ownership runs through
 * ServiceRequest.brand, the same link respondToReview authorises against — so
 * this resolves the brand's requests first and matches reviews against them.
 */
export async function listBrandReviews(brandId, { status, page, limit, sort } = {}) {
  const brandRequests = await ServiceRequest.find({ brand: brandId }).select('_id').lean();
  if (brandRequests.length === 0) {
    return { items: [], meta: paginationMeta({ page: 1, limit: 20, total: 0 }) };
  }

  const query = { serviceRequest: { $in: brandRequests.map((sr) => sr._id) } };
  if (status) query.status = status;

  const { skip, limit: lim, page: pg, sort: sortObj } = parsePagination({ page, limit, sort });
  const [items, total] = await Promise.all([
    Review.find(query)
      .populate('user', 'name')
      .populate('technician', 'name')
      .populate('serviceRequest', 'humanId applianceCategory')
      .sort(sortObj)
      .skip(skip)
      .limit(lim),
    Review.countDocuments(query),
  ]);
  return { items, meta: paginationMeta({ page: pg, limit: lim, total }) };
}

/** Brand-admin responds to a review left on one of their brand's service
 * requests. Same cross-tenant check pattern as invoice.service.js: 403 if the
 * review's underlying ServiceRequest.brand doesn't match the caller's brand. */
export async function respondToReview(brandId, id, response) {
  const review = await getReview(id);
  const sr = await ServiceRequest.findById(review.serviceRequest);
  if (!sr || !sr.brand || String(sr.brand) !== brandId) {
    throw new ApiError(403, 'Not authorized to respond to this review');
  }

  review.brandResponse = response;
  review.status = 'Responded';
  await review.save();
  return review;
}

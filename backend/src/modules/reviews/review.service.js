import { Review } from './review.model.js';
import { FeaturedReview } from './featuredReview.model.js';
import { ServiceRequest } from '../service-requests/serviceRequest.model.js';
import { Booking } from '../booking/booking.model.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { parsePagination, paginationMeta } from '../../utils/pagination.js';

export const COMPLETED_SERVICE_STATUSES = [
  'Completed',
  'COMPLETED',
  'Closed',
  'Repair Completed',
  'Customer Confirmation',
];

export function isServiceCompleted(status) {
  if (!status) return false;
  return COMPLETED_SERVICE_STATUSES.some(
    (s) => s.toLowerCase() === String(status).trim().toLowerCase()
  );
}

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

export async function getFeaturedPlatformReviews() {
  const fallbackReviews = [
    {
      id: 'rev_f1',
      title: 'Very time convenient!',
      comment: 'Very happy with the salon service. Professional came on time & completed her work with perfection. Overall a great relaxing experience.',
      rating: 5.0,
      authorName: 'Priyanka',
      theme: 'pink',
    },
    {
      id: 'rev_f2',
      title: 'Spotless. Advance tools',
      comment: 'Amazing! Professional used the scrubbing machine to remove all the hard water stains. Now my bathroom is spotless.',
      rating: 5.0,
      authorName: 'Atharva Singh',
      theme: 'purple',
    },
    {
      id: 'rev_f3',
      title: 'Expert Professional',
      comment: 'Professional was very knowledgeable about AC repair. He had all the necessary spare parts for faster & easier service.',
      rating: 4.7,
      authorName: 'Aman',
      theme: 'teal',
    },
    {
      id: 'rev_f4',
      title: 'Superb Quality & Quick Fix!',
      comment: 'Replaced defective water purifier filter in under 30 minutes. Extremely polite behavior and reasonable price.',
      rating: 5.0,
      authorName: 'Rajesh Sharma',
      theme: 'amber',
    },
    {
      id: 'rev_f5',
      title: 'Hassle-free Booking',
      comment: 'Great doorstep service for refrigerator cooling issues. Transparent billing and genuine replacement parts.',
      rating: 4.9,
      authorName: 'Sneha Patel',
      theme: 'pink',
    },
    {
      id: 'rev_f6',
      title: 'Punctual & Thorough',
      comment: 'Deep cleaning service was done meticulously. Used high grade eco-friendly materials and left zero mess behind.',
      rating: 5.0,
      authorName: 'Vikas Verma',
      theme: 'purple',
    },
  ];

  try {
    // Prefer admin-curated FeaturedReview entries if any visible ones exist
    const adminReviews = await FeaturedReview.find({ isVisible: true })
      .sort({ sortOrder: 1, createdAt: -1 })
      .lean();

    if (adminReviews.length >= 3) {
      return adminReviews.map((r) => ({
        id: String(r._id),
        title: r.title,
        comment: r.comment,
        rating: r.rating,
        authorName: r.authorName,
        theme: r.theme,
      }));
    }

    // Merge admin entries with fallback to ensure at least 6 cards
    const merged = adminReviews.map((r) => ({
      id: String(r._id),
      title: r.title,
      comment: r.comment,
      rating: r.rating,
      authorName: r.authorName,
      theme: r.theme,
    }));
    for (const fb of fallbackReviews) {
      if (merged.length < 6) merged.push(fb);
    }
    return merged;
  } catch (err) {
    console.warn('[review.service] Error in getFeaturedPlatformReviews:', err.message);
    return fallbackReviews.slice(0, 3);
  }
}

// ─── Super Admin: Admin-curated FeaturedReview CRUD ─────────────────────────

export async function listAdminFeaturedReviews() {
  return FeaturedReview.find().sort({ sortOrder: 1, createdAt: -1 }).lean();
}

export async function createAdminFeaturedReview({ title, comment, rating, authorName, theme, isVisible, sortOrder }) {
  return FeaturedReview.create({ title, comment, rating, authorName, theme, isVisible, sortOrder });
}

export async function updateAdminFeaturedReview(id, updates) {
  const doc = await FeaturedReview.findById(id);
  if (!doc) throw new ApiError(404, 'Featured review not found');
  Object.assign(doc, updates);
  return doc.save();
}

export async function deleteAdminFeaturedReview(id) {
  const doc = await FeaturedReview.findByIdAndDelete(id);
  if (!doc) throw new ApiError(404, 'Featured review not found');
  return { deleted: true };
}

// ─── Customer Service Rating ────────────────────────────────────────────────

export async function submitServiceRating(userId, { serviceId, bookingId, serviceRequestId, technicianRating, platformRating, rating, comment }) {
  const techRatingNum = Number(technicianRating);
  const platRatingNum = Number(platformRating);

  if (!techRatingNum || techRatingNum < 1 || techRatingNum > 5) {
    throw new ApiError(400, 'Technician rating must be between 1 and 5');
  }
  if (!platRatingNum || platRatingNum < 1 || platRatingNum > 5) {
    throw new ApiError(400, 'Platform rating must be between 1 and 5');
  }

  const id = serviceId || bookingId || serviceRequestId;
  if (!id) {
    throw new ApiError(400, 'Service identifier is required');
  }

  // 1. Try to find in Booking collection
  let booking = await Booking.findById(id).populate('serviceRequest');
  let serviceRequest = null;

  if (booking) {
    serviceRequest = booking.serviceRequest;
  } else {
    // 2. Try to find in ServiceRequest collection
    serviceRequest = await ServiceRequest.findById(id).populate('booking');
    if (serviceRequest && serviceRequest.booking) {
      booking = serviceRequest.booking;
    }
  }

  const serviceDoc = booking || serviceRequest;
  if (!serviceDoc) {
    throw new ApiError(404, 'Service not found');
  }

  // Ownership validation
  if (String(serviceDoc.user) !== String(userId)) {
    throw new ApiError(403, 'Not authorized to rate this service');
  }

  // Completion validation
  const bookingCompleted = booking && (isServiceCompleted(booking.status) || isServiceCompleted(booking.instantStatus));
  const srCompleted = serviceRequest && (isServiceCompleted(serviceRequest.status) || isServiceCompleted(serviceRequest.instantStatus));

  if (!bookingCompleted && !srCompleted) {
    throw new ApiError(400, 'Service rating can only be submitted for completed services');
  }

  // Duplicate validation
  const queryConditions = [];
  if (booking?._id) queryConditions.push({ booking: booking._id });
  if (serviceRequest?._id) queryConditions.push({ serviceRequest: serviceRequest._id });

  const existingReview = await Review.findOne({
    user: userId,
    $or: queryConditions,
  });

  if (existingReview) {
    throw new ApiError(409, 'Rating has already been submitted for this service');
  }

  const technicianId = serviceDoc.technician?._id || serviceDoc.technician || null;
  const overallRating = Number(rating) || Number(((techRatingNum + platRatingNum) / 2).toFixed(1));

  const newReview = await Review.create({
    user: userId,
    booking: booking?._id || null,
    serviceRequest: serviceRequest?._id || null,
    technician: technicianId,
    technicianRating: techRatingNum,
    platformRating: platRatingNum,
    rating: overallRating,
    comment: (comment || '').trim(),
    status: 'Reviewed',
  });

  return newReview;
}

export async function getServiceRatingStatus(userId, serviceId) {
  if (!serviceId) return { rated: false };

  let bookingId = null;
  let srId = null;

  try {
    const booking = await Booking.findById(serviceId).select('_id serviceRequest').lean();
    if (booking) {
      bookingId = booking._id;
      srId = booking.serviceRequest;
    } else {
      const sr = await ServiceRequest.findById(serviceId).select('_id booking').lean();
      if (sr) {
        srId = sr._id;
        bookingId = sr.booking;
      }
    }
  } catch {
    // If not a valid ObjectId, search by conditions
  }

  const conditions = [];
  if (bookingId) conditions.push({ booking: bookingId });
  if (srId) conditions.push({ serviceRequest: srId });
  if (!bookingId && !srId) conditions.push({ booking: serviceId }, { serviceRequest: serviceId });

  const review = await Review.findOne({
    user: userId,
    $or: conditions,
  }).lean();

  if (!review) {
    return { rated: false };
  }

  return {
    rated: true,
    rating: {
      id: String(review._id),
      technicianRating: review.technicianRating || review.rating || 5,
      platformRating: review.platformRating || review.rating || 5,
      rating: review.rating || 5,
      comment: review.comment || '',
      createdAt: review.createdAt,
    },
  };
}



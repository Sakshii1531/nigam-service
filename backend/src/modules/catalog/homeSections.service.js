import { HomeTile } from '../super-admin/homeTile.model.js';
import { Booking } from '../booking/booking.model.js';
import { Review } from '../reviews/review.model.js';
import { Category } from './category.model.js';
import { listServiceGroups, serviceGroupId } from './offeringSearch.service.js';
import { cachedValue } from './catalogCache.js';

// The customer home's "Most Booked Services" and "Appliance repair & service"
// rows (docs/master-catalogue Phase 22). Every card is a bookable catalogue
// service group; nothing on it is typed in by hand:
//   - title      the tile's own label, else the service's name
//   - price      the group's lowest current rate ("from ₹…", before GST)
//   - Instant    shown only when the service can be booked as an express visit
//   - rating     the average of real customer reviews of bookings of that service
//   - link       the booking flow for that service
// A tile whose service isn't bookable where the customer is simply isn't shown.

export const MOST_BOOKED_LIMIT = 8;
export const MOST_BOOKED_WINDOW_DAYS = 90;
const CACHE_MS = 60 * 1000;

const groupKeyExpr = {
  productTypeId: { $ifNull: ['$commercial.productType.id', null] },
  serviceId: '$commercial.service.id',
};

/** Bookings per service group in the last 90 days (cancelled ones excluded). */
async function bookingCounts() {
  const since = new Date(Date.now() - MOST_BOOKED_WINDOW_DAYS * 86400000);
  const rows = await Booking.aggregate([
    { $match: { createdAt: { $gte: since }, status: { $ne: 'Cancelled' }, 'commercial.service.id': { $ne: null } } },
    { $group: { _id: groupKeyExpr, count: { $sum: 1 } } },
  ]);
  return new Map(rows.map((r) => [serviceGroupId(r._id), r.count]));
}

/** Average customer rating per service group, from reviews of its bookings. */
async function ratings() {
  const rows = await Review.aggregate([
    { $match: { booking: { $type: 'objectId' } } },
    { $lookup: { from: Booking.collection.name, localField: 'booking', foreignField: '_id', as: 'b' } },
    { $unwind: '$b' },
    { $match: { 'b.commercial.service.id': { $ne: null } } },
    {
      $group: {
        _id: { productTypeId: { $ifNull: ['$b.commercial.productType.id', null] }, serviceId: '$b.commercial.service.id' },
        average: { $avg: '$rating' },
        count: { $sum: 1 },
      },
    },
  ]);
  return new Map(rows.map((r) => [serviceGroupId(r._id), { average: Math.round(r.average * 10) / 10, count: r.count }]));
}

const targetGroupId = (tile) =>
  serviceGroupId({ productTypeId: tile.target?.productType ? String(tile.target.productType) : null, serviceId: String(tile.target?.service) });

async function build(loc) {
  const [groups, tiles, counts, rated, categories] = await Promise.all([
    listServiceGroups(loc),
    HomeTile.find({ placement: { $in: ['most-booked', 'appliance-service'] }, isActive: true, 'target.service': { $exists: true } })
      .sort({ sortOrder: 1, createdAt: 1 })
      .lean(),
    bookingCounts(),
    ratings(),
    Category.find({ imageUrl: { $ne: null } }).select('key imageUrl').lean(),
  ]);
  const byId = new Map(groups.map((g) => [g.groupId, g]));
  const categoryImage = new Map(categories.map((c) => [c.key, c.imageUrl]));

  const card = (group, tile = null) => {
    const rating = rated.get(group.groupId) || null;
    return {
      id: tile ? String(tile._id) : `auto-${group.groupId}`,
      groupId: group.groupId,
      title: tile?.title || group.title,
      imageUrl: tile?.imageUrl || group.imageUrl || categoryImage.get(group.category.key) || null,
      category: group.category,
      fromPrice: group.fromPrice,
      instant: group.instant,
      rating: rating?.average ?? null,
      reviewCount: rating?.count ?? 0,
      bookingCount: counts.get(group.groupId) || 0,
      deepLink: group.deepLink,
      pinned: Boolean(tile),
    };
  };
  const curated = (placement) =>
    tiles
      .filter((t) => t.placement === placement)
      .map((t) => ({ tile: t, group: byId.get(targetGroupId(t)) }))
      .filter((x) => x.group)
      .map(({ tile, group }) => card(group, tile));

  // Most Booked: the admin's pinned tiles first, then the services customers
  // actually booked most in the last 90 days.
  const pinned = curated('most-booked');
  const taken = new Set(pinned.map((c) => c.groupId));
  const popular = groups
    .filter((g) => !taken.has(g.groupId) && (counts.get(g.groupId) || 0) > 0)
    .sort((a, b) => counts.get(b.groupId) - counts.get(a.groupId) || a.fromPrice - b.fromPrice)
    .map((g) => card(g));

  return {
    mostBooked: [...pinned, ...popular].slice(0, Math.max(MOST_BOOKED_LIMIT, pinned.length)),
    applianceServices: curated('appliance-service'),
  };
}

export function getHomeSections({ city = null, pincode = null } = {}) {
  const key = `home-sections|${(city || '').toLowerCase()}|${pincode || ''}`;
  return cachedValue(key, () => build({ city, pincode }), CACHE_MS);
}

/** For the admin tile editor: every bookable group with its live figures. */
export async function describeGroupsForAdmin() {
  const [groups, counts, rated] = await Promise.all([listServiceGroups({}), bookingCounts(), ratings()]);
  return groups.map((g) => ({
    groupId: g.groupId,
    productTypeId: g.productTypeId,
    serviceId: g.serviceId,
    title: g.title,
    category: g.category,
    fromPrice: g.fromPrice,
    instant: g.instant,
    imageUrl: g.imageUrl,
    rating: rated.get(g.groupId)?.average ?? null,
    reviewCount: rated.get(g.groupId)?.count ?? 0,
    bookingCount: counts.get(g.groupId) || 0,
    deepLink: g.deepLink,
  }));
}

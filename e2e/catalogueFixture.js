// Master-catalogue fixtures for the e2e specs (docs/master-catalogue Phase 4).
//
// Bookings are made for ONE catalogue offering and must carry the final amount
// the customer was quoted, so specs can no longer book "category + serviceSlug".
// Isolated-category specs create their own offering through the super-admin
// catalogue API; specs on the seeded catalogue book a seeded offering by code.

const offeringByCategory = new Map();

async function json(res) {
  const body = await res.json();
  if (!res.ok()) throw new Error(`${res.url()} → ${res.status()}: ${body?.error?.message}`);
  return body.data;
}

/**
 * A standalone offering at `price` (GST 0 by default, so the booking total
 * equals the price) in an existing category. Remembered per category key for
 * offeringBookingBody({ categoryKey }).
 */
export async function createTestOffering(request, adminToken, categoryKey, { price = 299, gstPercent = 0, serviceName = 'Repair', api = '/api/v1' } = {}) {
  const headers = { Authorization: `Bearer ${adminToken}` };
  const categories = await json(await request.get(`${api}/super-admin/catalogue/categories`, { headers }));
  const category = categories.find((c) => c.key === categoryKey);
  if (!category) throw new Error(`createTestOffering: no category ${categoryKey}`);

  const service = await json(
    await request.post(`${api}/super-admin/catalogue/services`, { headers, data: { category: category.id, name: serviceName } }),
  );
  const offering = await json(
    await request.post(`${api}/super-admin/catalogue/offerings`, {
      headers,
      data: {
        name: serviceName,
        bookingType: 'STANDALONE',
        category: category.id,
        service: service.id,
        pricingUnit: 'PER_UNIT',
        unitLabel: 'per unit',
        minQty: 1,
        maxQty: 5,
        express: { enabled: true },
        tax: { gstPercent },
        initialRate: { customerPrice: price, spPayout: Math.round(price * 0.3), expressFee: 0, expressSpIncentive: 0 },
      },
    }),
  );
  offeringByCategory.set(categoryKey, offering.id);
  return offering.id;
}

/**
 * A POST /bookings body for an offering — by the category's test offering
 * (`categoryKey`), a seeded offering (`offeringCode`) or an id — with the
 * expected final amount taken from a real POST /catalog/quote. Pass
 * `covered: true` for a warranty/AMC-covered booking (the customer pays ₹0,
 * which the quote endpoint can't know — coverage is decided at booking).
 */
export async function offeringBookingBody(
  request,
  { categoryKey, offeringCode, offeringId, variant, quantity = 1, covered = false, api = '/api/v1', ...extra },
) {
  let id = offeringId || (categoryKey && offeringByCategory.get(categoryKey));
  let variantId = null;
  if (!id && offeringCode) {
    const detail = await json(await request.get(`${api}/catalog/offerings/${offeringCode}`));
    id = detail.id;
    if (variant) {
      // A size-agnostic offering needs the customer's size — find it by label in the category tree.
      const tree = await json(await request.get(`${api}/catalog/categories/${encodeURIComponent(detail.category.key)}/tree`));
      const all = [...tree.productTypes.flatMap((pt) => pt.variants), ...tree.standaloneServices.flatMap((s) => s.options)];
      variantId = all.find((v) => v.label === variant)?.id;
    }
  }
  if (!id) throw new Error('offeringBookingBody: no offering (create one with createTestOffering first)');

  const isExpress = Boolean(extra.isExpress || extra.isInstant || extra.timeGroup === 'ASAP');
  const quote = await json(
    await request.post(`${api}/catalog/quote`, {
      data: {
        lines: [{ offeringId: id, variantId, quantity, isExpress }],
        paymentMode: extra.paymentMode,
        location: extra.address?.city ? { city: extra.address.city } : undefined,
      },
    }),
  );
  return { offeringId: id, ...(variantId ? { variantId } : {}), quantity, expectedFinalAmount: covered ? 0 : quote.totals.final, ...extra };
}

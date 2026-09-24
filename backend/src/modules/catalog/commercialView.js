import { toRupees } from './money.js';

// Customer-facing shapes for catalogue prices and quotes (ARCHITECTURE §8).
// Built by WHITELIST, not by deleting internal keys: partner payout, NCC
// margin, rate reasons and admin notes can never reach a customer by being
// added to an internal object later. Amounts leave here as rupees.

const ref = (doc, labelField = 'name') => (doc ? { id: String(doc._id ?? doc.id), [labelField]: doc[labelField] } : null);

function expressView(offering, rate) {
  return offering.express?.enabled ? { enabled: true, fee: toRupees(rate.expressFee) } : { enabled: false, fee: 0 };
}

/** One bookable offering as the category tree lists it. */
export function toCustomerOffering(offering, rate, defaultGstPercent) {
  return {
    id: String(offering._id),
    code: offering.code,
    name: offering.name,
    bookingType: offering.bookingType,
    productTypeId: offering.productType ? String(offering.productType._id ?? offering.productType) : null,
    variantId: offering.variant ? String(offering.variant._id ?? offering.variant) : null,
    serviceId: String(offering.service._id ?? offering.service),
    serviceName: offering.service.name,
    pricingUnit: offering.pricingUnit,
    unitLabel: offering.unitLabel,
    minQty: offering.minQty,
    maxQty: offering.maxQty,
    customerPrice: toRupees(rate.customerPrice),
    gstPercent: offering.tax?.gstPercent ?? defaultGstPercent,
    express: expressView(offering, rate),
    estimatedDurationMins: offering.estimatedDurationMins,
    description: offering.description,
    displayOrder: offering.displayOrder,
  };
}

/** Full offering page: the tree fields plus content and required info. */
export function toCustomerOfferingDetail(offering, rate, defaultGstPercent) {
  return {
    ...toCustomerOffering(offering, rate, defaultGstPercent),
    category: { key: offering.category.key, name: offering.category.name },
    productType: ref(offering.productType),
    variant: ref(offering.variant, 'label'),
    service: ref(offering.service),
    included: offering.included || [],
    excluded: offering.excluded || [],
    customerInstructions: offering.customerInstructions || '',
    requiredInfo: (offering.requiredInfo || []).map(({ key, label, type, options, required }) => ({ key, label, type, options, required })),
  };
}

function lineView(line) {
  return {
    offeringId: line.offering.id,
    offeringCode: line.offering.code,
    name: line.offering.name,
    bookingType: line.offering.bookingType,
    category: line.category,
    productType: line.productType,
    variant: line.variant,
    service: line.service,
    pricingUnit: line.offering.pricingUnit,
    unitLabel: line.offering.unitLabel,
    quantity: line.quantity,
    unitPrice: toRupees(line.unitPrice),
    baseAmount: toRupees(line.baseAmount),
    discount: toRupees(line.discount),
    coverage: { type: line.coverage.type, amount: toRupees(line.coverage.amount) },
    isExpress: line.isExpress,
    expressFee: toRupees(line.expressFee),
    taxableAmount: toRupees(line.taxableAmount),
    gstPercent: line.gstPercent,
    gstAmount: toRupees(line.gstAmount),
    finalAmount: toRupees(line.finalAmount),
    coinsApplied: toRupees(line.coinsApplied),
    advanceAmount: toRupees(line.advanceAmount),
    payableAfterService: toRupees(line.payableAfterService),
    rateId: line.rate.id,
    rateVersion: line.rate.version,
  };
}

/** The quote the customer app renders on every screen. */
export function toCustomerQuote(quote) {
  const { totals } = quote;
  return {
    lines: quote.lines.map(lineView),
    totals: {
      base: toRupees(totals.base),
      discount: toRupees(totals.discount),
      coverage: toRupees(totals.coverage),
      expressFee: toRupees(totals.expressFee),
      taxable: toRupees(totals.taxable),
      gst: toRupees(totals.gst),
      final: toRupees(totals.final),
    },
    couponCode: quote.couponCode,
    couponApplied: toRupees(quote.couponApplied),
    coinsApplied: toRupees(quote.coinsApplied),
    coinsToRedeem: quote.coinsToRedeem,
    paymentMode: quote.paymentMode,
    advanceAmount: toRupees(quote.advanceAmount),
    payableNow: toRupees(quote.payableNow),
    payableAfterService: toRupees(quote.payableAfterService),
    pricedAt: quote.pricedAt,
  };
}

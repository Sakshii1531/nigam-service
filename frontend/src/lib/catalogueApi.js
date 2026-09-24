import { apiRequest } from './apiClient';

// Customer-side Master Catalogue API (docs/master-catalogue Phase 4).
//
// The rule for every booking screen: prices come from a server quote, never
// from arithmetic here. The only selection logic the app has is
// pickOffering() below — which offering a (product type, size, service)
// choice resolves to.

const qs = (params) => {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '');
  return entries.length ? `?${new URLSearchParams(entries).toString()}` : '';
};

/** Everything bookable in one category: product types → sizes, standalone services → options, offerings with prices. */
export const getCategoryTree = (key, { city, pincode } = {}) =>
  apiRequest(`/catalog/categories/${encodeURIComponent(key)}/tree${qs({ city, pincode })}`, { silentError: true });

/** One offering's detail page: description, included / not included, instructions, required questions. */
export const getOffering = (code, { city, pincode } = {}) =>
  apiRequest(`/catalog/offerings/${encodeURIComponent(code)}${qs({ city, pincode })}`, { silentError: true });

/**
 * POST /catalog/quote. Sent with auth when the customer is signed in (so
 * wallet coins can apply); a guest still gets a price. Errors come back as
 * ApiError with `.code` (QUANTITY_OUT_OF_RANGE, EXPRESS_NOT_AVAILABLE, …).
 */
export const getQuote = (body, { signedIn = false } = {}) =>
  apiRequest('/catalog/quote', { method: 'POST', body, auth: signedIn, silentError: true });

/**
 * The offering a selection resolves to (ARCHITECTURE §2.5). With a size
 * picked, a size-specific offering for the service wins over a size-agnostic
 * one ("Any size"). Returns null when the combination isn't bookable.
 */
export function pickOffering(tree, { productTypeId = null, variantId = null, serviceId }) {
  if (!tree || !serviceId) return null;
  const candidates = tree.offerings.filter(
    (o) => o.serviceId === serviceId && (o.productTypeId || null) === (productTypeId || null),
  );
  return (variantId && candidates.find((o) => o.variantId === variantId)) || candidates.find((o) => o.variantId === null) || null;
}

/**
 * The services a customer can pick for a product type + size, each already
 * resolved to its offering (and so its price). Only bookable combinations
 * appear — an unconfigured one is simply absent (client Test 12).
 */
export function servicesFor(tree, { productTypeId, variantId }) {
  if (!tree) return [];
  const serviceIds = [...new Set(tree.offerings.filter((o) => o.productTypeId === productTypeId).map((o) => o.serviceId))];
  return serviceIds
    .map((serviceId) => {
      const offering = pickOffering(tree, { productTypeId, variantId, serviceId });
      const service = tree.services.find((s) => s.id === serviceId);
      return offering && service ? { service, offering } : null;
    })
    .filter(Boolean);
}

/** The options of a standalone service, each with its offering — e.g. tank sizes with their prices. */
export function optionsFor(tree, serviceId) {
  const service = tree?.standaloneServices.find((s) => s.id === serviceId);
  if (!service) return [];
  return service.options
    .map((option) => ({ option, offering: pickOffering(tree, { variantId: option.id, serviceId }) }))
    .filter((entry) => entry.offering);
}

/** A standalone service's own offering when it has no options (Fan Installation). */
export const standaloneOffering = (tree, serviceId) => pickOffering(tree, { serviceId });

export const formatRupees = (value) =>
  `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

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

/** GET /catalog/search — grouped results ({ groups, categories }), each with a "from" price and a deepLink. */
export const searchCatalogue = (q, { city, pincode, limit } = {}) =>
  apiRequest(`/catalog/search${qs({ q, city, pincode, limit })}`, { silentError: true });

/** POST /catalog/search/resolve — the best destination (or null) for each free-text label, in order. */
export const resolveLabels = (labels, { city, pincode } = {}) =>
  apiRequest('/catalog/search/resolve', {
    method: 'POST',
    body: { labels, location: city || pincode ? { city, pincode } : undefined },
    silentError: true,
  });

/**
 * The booking-flow selection a deep link asks for (Phase 6):
 * /book/AC?pt=split&variant=1_5_ton&svc=installation&qty=2, or
 * /book/Electrician?offering=ELEC-FAN-INSTALL. Unknown slugs are ignored, so
 * a stale link still opens the category. `preferredServiceId` is a
 * product-linked service to pick in step 2 once a type (and size) is chosen;
 * `step` is the first step that still needs the customer's input.
 */
export function selectionFromDeepLink(tree, search) {
  const params = new URLSearchParams(search);
  const bySlug = (list, slug) => (slug ? (list || []).find((x) => x.slug === slug) || null : null);
  const selection = {
    productTypeId: '',
    variantId: '',
    standaloneServiceId: '',
    optionId: '',
    preferredServiceId: '',
    quantity: Math.max(1, Number.parseInt(params.get('qty'), 10) || 1),
  };

  const code = (params.get('offering') || '').toUpperCase();
  const offering = code ? tree.offerings.find((o) => o.code === code) : null;
  if (offering && offering.productTypeId) {
    selection.productTypeId = offering.productTypeId;
    selection.variantId = offering.variantId || '';
    selection.preferredServiceId = offering.serviceId;
  } else if (offering) {
    selection.standaloneServiceId = offering.serviceId;
    selection.optionId = offering.variantId || '';
  } else {
    const pt = bySlug(tree.productTypes, params.get('pt'));
    const standalone = !pt && bySlug(tree.standaloneServices, params.get('svc'));
    if (pt) {
      selection.productTypeId = pt.id;
      selection.variantId = bySlug(pt.variants, params.get('variant'))?.id || '';
    } else if (standalone) {
      selection.standaloneServiceId = standalone.id;
      selection.optionId = bySlug(standalone.options, params.get('variant'))?.id || '';
    }
    if (!standalone) selection.preferredServiceId = bySlug(tree.services, params.get('svc'))?.id || '';
  }

  const pt = tree.productTypes.find((p) => p.id === selection.productTypeId);
  const standalone = tree.standaloneServices.find((s) => s.id === selection.standaloneServiceId);
  const stepOneDone = pt
    ? pt.variants.length === 0 || Boolean(selection.variantId)
    : standalone
      ? standalone.options.length === 0 || Boolean(selection.optionId)
      : false;
  selection.step = stepOneDone ? 2 : 1;
  return selection;
}

/** Whether a URL carries any deep-link selection. */
export const hasDeepLink = (search) => ['offering', 'pt', 'svc', 'variant'].some((k) => new URLSearchParams(search).has(k));

/** GET /catalog/home-sections — the home screen's service rows, every figure live (Phase 22). */
export const getHomeSections = ({ city, pincode } = {}) =>
  apiRequest(`/catalog/home-sections${qs({ city, pincode })}`, { silentError: true });

/** GET /catalog/service-groups — every bookable service with its "from" price and deepLink. */
export const listServiceGroups = ({ city, pincode } = {}) =>
  apiRequest(`/catalog/service-groups${qs({ city, pincode })}`, { silentError: true });

/** GET /catalog/search/popular — suggestions for an empty search box ({ label, deepLink }). */
export const getPopularSearches = () => apiRequest('/catalog/search/popular', { silentError: true });

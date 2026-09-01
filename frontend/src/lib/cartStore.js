// One cart for the whole customer app.
//
// There used to be two, and they could not see each other: BuyNew.jsx kept its
// own under 'nigam_buy_new_cart' with items shaped { id, qty, exchange }, while
// ProductDetails.jsx kept another under 'nigam_cart' shaped { id, quantity }.
// Adding a product from its detail page left the buy listing's cart empty, and
// vice versa. This module is the single source of truth for both.
//
// The local copy stays authoritative for rendering even when signed in. The
// server cart stores only { product, quantity } (backend cart.model.js), while
// the UI needs the denormalized name/price/image it renders from and BuyNew's
// per-item `exchange` trade-in attachment, which has nowhere to live
// server-side. So the server is mirrored to, not read from, outside of login.
//
// Every server call here is best-effort: a cart that fails to reach the network
// must still work locally, because checkout posts the line items it can see
// rather than trusting the server copy (see the note on clear()).

import { useSyncExternalStore } from 'react';
import { apiRequest, getStoredTokens } from './apiClient';

const KEY = 'ncc_cart';
// Read once on first load so an in-flight cart survives the deploy that
// introduced this module, then dropped so they never diverge again.
const LEGACY_KEYS = ['nigam_cart', 'nigam_buy_new_cart'];

const listeners = new Set();
let items = load();

function isAuthed() {
  return Boolean(getStoredTokens().accessToken);
}

/** Canonical line-item shape: `qty`, never `quantity`. */
function normalize(item) {
  const { quantity, qty, ...rest } = item;
  const n = Number(qty ?? quantity ?? 1);
  return { ...rest, qty: Number.isFinite(n) && n > 0 ? Math.floor(n) : 1 };
}

function mergeById(a, b) {
  const out = [];
  const seen = new Map();
  for (const raw of [...a, ...b]) {
    const item = normalize(raw);
    if (!item.id) continue;
    const existing = seen.get(item.id);
    if (existing) existing.qty += item.qty;
    else {
      const copy = { ...item };
      seen.set(item.id, copy);
      out.push(copy);
    }
  }
  return out;
}

function readKey(key) {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return readKey(KEY).map(normalize).filter((i) => i.id);
    const migrated = mergeById(readKey(LEGACY_KEYS[0]), readKey(LEGACY_KEYS[1]));
    if (migrated.length) localStorage.setItem(KEY, JSON.stringify(migrated));
    LEGACY_KEYS.forEach((k) => localStorage.removeItem(k));
    return migrated;
  } catch {
    return [];
  }
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    // Private mode / quota. State stays correct for this session.
  }
  listeners.forEach((l) => l());
}

/**
 * Mirror one line to the server. There is no "set quantity" endpoint and POST
 * /cart/items *adds* to the existing line (cart.service.js addItem), so a plain
 * POST would double a quantity the user only nudged. Replacing the line keeps
 * this idempotent and free of drift.
 */
async function pushQty(productId, qty) {
  if (!isAuthed()) return;
  try {
    await apiRequest(`/cart/items/${productId}`, { method: 'DELETE', auth: true });
    if (qty > 0) {
      await apiRequest('/cart/items', { method: 'POST', auth: true, body: { productId, quantity: qty } });
    }
  } catch {
    // Best-effort: the local cart is what the user sees and what checkout posts.
  }
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getItems() {
  return items;
}

export function getCount() {
  return items.reduce((sum, i) => sum + i.qty, 0);
}

/** Adds one of `product`, carrying any extra per-item fields (category, exchange, icon). */
export function addItem(product, extra = {}) {
  const id = product.id;
  if (!id) return;
  const existing = items.find((i) => i.id === id);
  const qty = existing ? existing.qty + (extra.qty || 1) : extra.qty || 1;

  items = existing
    ? items.map((i) => (i.id === id ? normalize({ ...i, ...extra, qty }) : i))
    : [...items, normalize({ ...product, ...extra, id, qty })];

  persist();
  pushQty(id, qty);
}

export function setQty(id, qty) {
  const next = Math.max(0, Math.floor(qty));
  if (next === 0) return removeItem(id);
  items = items.map((i) => (i.id === id ? { ...i, qty: next } : i));
  persist();
  pushQty(id, next);
}

export function adjustQty(id, delta) {
  const existing = items.find((i) => i.id === id);
  if (existing) setQty(id, existing.qty + delta);
}

export function removeItem(id) {
  items = items.filter((i) => i.id !== id);
  persist();
  pushQty(id, 0);
}

/** Replaces the whole cart — the "Buy now" path, which checks out a single item. */
export function replaceWith(list) {
  items = list.map(normalize).filter((i) => i.id);
  persist();
  if (isAuthed()) {
    apiRequest('/cart', { method: 'DELETE', auth: true })
      .then(() => Promise.all(items.map((i) => pushQty(i.id, i.qty))))
      .catch(() => {});
  }
}

/**
 * Empties both copies. Checkout posts explicit line items rather than
 * { useCart: true } so the order always matches the cart the user is looking at
 * even if a mirror call was lost — which means the server does not clear its own
 * cart on checkout (order.service.js only does that for useCart orders). Both
 * pages call this after a successful order, so this is where that happens.
 */
export function clear() {
  items = [];
  persist();
  if (isAuthed()) apiRequest('/cart', { method: 'DELETE', auth: true }).catch(() => {});
}

/**
 * Fold the guest cart into the account's cart at login, then adopt the result.
 *
 * Pushing each local line through POST /cart/items leans on the server's own
 * additive semantics, so a product in both copies ends up with the sum rather
 * than one silently overwriting the other. The re-read afterwards is what makes
 * a cart built on another device show up here.
 */
export async function syncOnLogin() {
  if (!isAuthed()) return;
  const local = items;
  try {
    for (const item of local) {
      await apiRequest('/cart/items', {
        method: 'POST',
        auth: true,
        body: { productId: item.id, quantity: item.qty },
      });
    }

    const cart = await apiRequest('/cart', { auth: true });
    const decorations = new Map(local.map((i) => [i.id, i]));

    items = (cart?.items || [])
      .map(({ product, quantity }) => {
        // populate() yields null for a product deleted since it was added.
        if (!product) return null;
        const populated = typeof product === 'object' ? product : null;
        const id = populated ? populated.id || populated._id : String(product);
        if (!id) return null;
        // Server product wins on name/price (it is the fresher copy); the local
        // item supplies what the server cart cannot hold — exchange, icon, category.
        return normalize({ ...(decorations.get(id) || {}), ...(populated || {}), id, qty: quantity });
      })
      .filter(Boolean);

    persist();
  } catch {
    // Offline at login, or the cart endpoint is unhappy — keep the local cart
    // exactly as it was rather than dropping items the user added as a guest.
  }
}

/** Drops the local copy only; the account's server cart is left for next login. */
export function clearLocalOnLogout() {
  items = [];
  persist();
}

export function useCart() {
  const list = useSyncExternalStore(subscribe, getItems, getItems);
  return {
    items: list,
    count: list.reduce((sum, i) => sum + i.qty, 0),
    addItem,
    setQty,
    adjustQty,
    removeItem,
    replaceWith,
    clear,
  };
}

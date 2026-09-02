import { apiRequest } from '../../lib/apiClient';
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from '../../components/super-admin/Sidebar';
import Topbar from '../../components/super-admin/Topbar';
import { Plus, Trash2, Edit2, RotateCcw, Image, Sparkles, LayoutGrid, Check, Package } from 'lucide-react';

// Default static banners imported in Dashboard.jsx
import acBanner from '../../assets/ac_service_banner.png';
import electricianBanner from '../../assets/electrician_banner.png';
import plumbingBanner from '../../assets/plumbing_banner.png';
import warrantyBanner1 from '../../assets/warranty_banner_1.png';
import warrantyBanner2 from '../../assets/warranty_banner_2.png';

// Brand images
import splitAcImg from '../../assets/categories/split_ac.png';
import mostBookedWm from '../../assets/most_booked_wm.png';
import applianceFridge from '../../assets/appliance_fridge.png';
import mostBookedAc1 from '../../assets/most_booked_ac_1.png';
import mostBookedAc2 from '../../assets/most_booked_ac_2.png';
import mostBookedCleaning from '../../assets/most_booked_cleaning.png';
import mostBookedSalon from '../../assets/most_booked_salon.png';

// Stories assets
import storyGeyser from '../../assets/story_geyser.png';
import storyWinter from '../../assets/story_winter.png';
import storyElectrician from '../../assets/story_electrician.png';
import storySalon from '../../assets/story_salon.png';
import storyGeyser2 from '../../assets/story_geyser_2.png';
import storyGeyser3 from '../../assets/story_geyser_3.png';
import storyWinter2 from '../../assets/story_winter_2.png';
import storyWinter3 from '../../assets/story_winter_3.png';
import storyElectrician2 from '../../assets/story_electrician_2.png';
import storyElectrician3 from '../../assets/story_electrician_3.png';
import storySalon2 from '../../assets/story_salon_2.png';
import storySalon3 from '../../assets/story_salon_3.png';

// Default static service images
import acImgDefault from '../../assets/categories/ac.png';
import washingImgDefault from '../../assets/categories/wasing.png';
import electricianImgDefault from '../../assets/categories/electrician_fixed.png';
import plumberImgDefault from '../../assets/categories/plumber_fixed.png';
import cleaningImgDefault from '../../assets/categories/cleaning.png';
import saloonImgDefault from '../../assets/categories/saloon.png';
import spaImgDefault from '../../assets/categories/spa.png';

const DEFAULT_CATEGORIES = [
  { name: 'For You', icon: 'sparkles', isForYou: true },
  { name: 'AC', icon: 'ac', service: 'AC Repair' },
  { name: 'Washing Machine', icon: 'washing', service: 'Washing Machine' },
  { name: 'Refrigerator', icon: 'fridge', isFridge: true },
  { name: 'TV', icon: 'tv', service: 'Smart TV Service & Repair' },
  { name: 'RO Water Purifier', icon: 'ro', service: 'Water Purifier RO Service' },
  { name: 'Geyser', icon: 'geyser', service: 'Geyser Service & Repair' },
  { name: 'More', icon: 'more', isMore: true }
];

const AVAILABLE_ICONS = [
  { id: 'sparkles', label: 'For You' },
  { id: 'ac', label: 'AC Unit' },
  { id: 'washing', label: 'Washing Machine' },
  { id: 'fridge', label: 'Refrigerator' },
  { id: 'tv', label: 'Television' },
  { id: 'ro', label: 'Water Purifier' },
  { id: 'geyser', label: 'Geyser' },
  { id: 'microwave', label: 'Microwave' },
  { id: 'chimney', label: 'Chimney' },
  { id: 'laptop', label: 'Laptop/PC' },
  { id: 'mobile', label: 'Mobile' },
  { id: 'electric', label: 'Electrician' },
  { id: 'plumbing', label: 'Plumber' },
  { id: 'cleaning', label: 'Cleaning' },
  { id: 'painting', label: 'Painter' },
  { id: 'sofa', label: 'Sofa/Furniture' },
  { id: 'pest', label: 'Pest Control' },
  { id: 'car', label: 'Car Service' },
  { id: 'gardening', label: 'Gardening' },
  { id: 'carpenter', label: 'Carpenter' },
  { id: 'appliance', label: 'Appliance' },
  { id: 'wrench', label: 'General Repair' },
  { id: 'shield', label: 'Warranty' },
  { id: 'tag', label: 'Offers' },
  { id: 'clock', label: 'Fast Service' },
  { id: 'truck', label: 'Delivery' },
  { id: 'more', label: 'More' }
];

const CategoryVectorIcon = ({ iconKey, className = "w-6 h-6 text-[#0D47A1]" }) => {
  const k = (iconKey || '').toLowerCase();
  if (k === 'ac') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <rect x="2" y="6" width="20" height="8" rx="2" />
        <line x1="6" y1="14" x2="18" y2="14" />
        <path d="M7 17l1.5 2" />
        <path d="M12 17v2" />
        <path d="M17 17l-1.5 2" />
        <circle cx="18" cy="10" r="1" fill="currentColor" />
      </svg>
    );
  }
  if (k === 'washing') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <rect x="5" y="3" width="14" height="18" rx="2" />
        <circle cx="12" cy="13" r="4" />
        <circle cx="12" cy="7" r="1" />
      </svg>
    );
  }
  if (k === 'fridge') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <rect x="5" y="2" width="14" height="20" rx="2" />
        <line x1="5" y1="10" x2="19" y2="10" />
        <line x1="9" y1="6" x2="9" y2="8" />
        <line x1="9" y1="13" x2="9" y2="17" />
      </svg>
    );
  }
  if (k === 'tv') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8" />
        <path d="M12 17v4" />
      </svg>
    );
  }
  if (k === 'ro' || k === 'water') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M12 22a7 7 0 0 0 7-7c0-4.3-7-13-7-13S5 10.7 5 15a7 7 0 0 0 7 7z" />
      </svg>
    );
  }
  if (k === 'geyser') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <rect x="6" y="2" width="12" height="16" rx="3" />
        <path d="M9 22v-4" />
        <path d="M15 22v-4" />
        <circle cx="12" cy="10" r="2" />
      </svg>
    );
  }
  if (k === 'sparkles') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275Z" />
      </svg>
    );
  }
  if (k === 'microwave') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M15 5v14" />
        <circle cx="18" cy="9" r="1" fill="currentColor" />
        <circle cx="18" cy="13" r="1" fill="currentColor" />
        <path d="M6 12h5" />
      </svg>
    );
  }
  if (k === 'chimney') {
    // Kitchen range hood - clean trapezoid shape
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <rect x="5" y="2" width="14" height="6" rx="1" />
        <path d="M3 8h18l-2 13H5L3 8z" />
      </svg>
    );
  }
  if (k === 'laptop') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <rect x="4" y="5" width="16" height="10" rx="2" />
        <path d="M2 19h20" />
      </svg>
    );
  }
  if (k === 'mobile') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <rect x="6" y="3" width="12" height="18" rx="2" />
        <line x1="11" y1="18" x2="13" y2="18" />
      </svg>
    );
  }
  if (k === 'electric') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    );
  }
  if (k === 'plumbing') {
    // Clean water faucet / tap
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M9 5h6v3H9z" />
        <path d="M9 8a6 6 0 0 0 6 0" />
        <path d="M12 8v6" />
        <path d="M10 14h4" />
        <circle cx="12" cy="17" r="1" fill="currentColor" />
      </svg>
    );
  }
  if (k === 'cleaning') {
    // Broom - diagonal stick with bristles
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M17 3 7 13" />
        <path d="M5 21c0-3 2-6 5-8l5-5-3-3-7 7c-2 3-1 9 0 9z" />
      </svg>
    );
  }
  if (k === 'painting') {
    // Paint roller - recognizable roller tool
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <rect x="3" y="5" width="12" height="7" rx="2" />
        <path d="M15 8h3a2 2 0 0 1 0 4h-3" />
        <path d="M9 12v7" />
        <rect x="6" y="18" width="6" height="3" rx="1" />
      </svg>
    );
  }
  if (k === 'sofa') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M20 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v3" />
        <path d="M2 11v5a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
        <path d="M4 18v2" />
        <path d="M20 18v2" />
      </svg>
    );
  }
  if (k === 'pest') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <rect x="8" y="9" width="8" height="10" rx="4" />
        <path d="M6 13h12" />
        <path d="M4 9l4 3" />
        <path d="M20 9l-4 3" />
        <path d="M4 17l4-2" />
        <path d="M20 17l-4-2" />
      </svg>
    );
  }
  if (k === 'car') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M5 17a2 2 0 1 0 4 0 2 2 0 1 0-4 0Z" />
        <path d="M15 17a2 2 0 1 0 4 0 2 2 0 1 0-4 0Z" />
        <path d="M5 9l2-4h10l2 4v8H5V9Z" />
      </svg>
    );
  }
  if (k === 'gardening') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M12 22v-9" />
        <path d="M12 13C7 13 4 8 4 3c5 0 10 3 10 8" />
        <path d="M12 17c4 0 7-3 7-7-4 0-7 2-7 7" />
      </svg>
    );
  }
  if (k === 'carpenter') {
    // Hammer - clean minimal shape
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="m2 22 8-8" />
        <path d="m13 7 4-4" />
        <path d="M10 14 4 8l6-6 6 6-6 6z" />
        <path d="m17 3 4 4-4-4z" />
      </svg>
    );
  }
  if (k === 'appliance') {
    // Electrical plug - clean Lucide-style
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M12 22v-5" />
        <path d="M9 8V2" />
        <path d="M15 8V2" />
        <path d="M18 8H6" />
        <path d="M6 8a6 6 0 0 0 6 6 6 6 0 0 0 6-6" />
      </svg>
    );
  }
  if (k === 'wrench') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      </svg>
    );
  }
  if (k === 'shield') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    );
  }
  if (k === 'tag') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M12 2H2v10l11.29 11.29a1 1 0 0 0 1.41 0l7-7a1 1 0 0 0 0-1.41L12 2z" />
        <circle cx="7" cy="7" r="1.5" />
      </svg>
    );
  }
  if (k === 'clock') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    );
  }
  if (k === 'truck') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <rect x="1" y="3" width="15" height="13" rx="2" />
        <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
        <circle cx="5.5" cy="18.5" r="2.5" />
        <circle cx="18.5" cy="18.5" r="2.5" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
    </svg>
  );
};

// The API stores imageUrl/segment; this screen has always spoken image/title.
// ── Category booking-config storage ───────────────────────────────────────────
// Same storage swap as the tiles: a synchronous mirror keeps the existing
// editors working while writes go to /cms/category-configs, which the booking
// flow can now read. This config was previously written and never read by
// anything.
const categoryConfigCache = {};

async function hydrateCategoryConfigs() {
  try {
    const rows = await apiRequest('/cms/category-configs');
    for (const row of Array.isArray(rows) ? rows : []) {
      categoryConfigCache[row.categoryName] = {
        productTypes: row.productTypes || [],
        services: row.services || {},
        brands: row.brands || [],
        whyBrandPoints: row.whyBrandPoints || [],
        categoryNote: row.categoryNote || '',
      };
    }
  } catch (err) {
    console.warn('Could not load category booking configs:', err.message);
  }
}

function readCategoryConfigs() {
  return Object.keys(categoryConfigCache).length ? JSON.stringify(categoryConfigCache) : null;
}

function writeCategoryConfigs(configs) {
  const removed = Object.keys(categoryConfigCache).filter((k) => !(k in configs));
  const changed = Object.keys(configs).filter(
    (k) => JSON.stringify(configs[k]) !== JSON.stringify(categoryConfigCache[k]),
  );

  for (const key of Object.keys(categoryConfigCache)) delete categoryConfigCache[key];
  Object.assign(categoryConfigCache, configs);

  changed.forEach((key) =>
    apiRequest(`/cms/category-configs/${encodeURIComponent(key)}`, { method: 'PUT', auth: true, body: configs[key] })
      .catch((err) => console.warn(`Could not save category "${key}":`, err.message)),
  );
  removed.forEach((key) =>
    apiRequest(`/cms/category-configs/${encodeURIComponent(key)}`, { method: 'DELETE', auth: true })
      .catch((err) => console.warn(`Could not delete category "${key}":`, err.message)),
  );
}

// ── Home-tile storage ─────────────────────────────────────────────────────────
// Same approach as the service-page editors: the five tile lists were written
// against synchronous localStorage across ~25 sites, so the storage layer is
// swapped rather than each editor rewritten. Every list maps onto one
// `placement` of /cms/home-tiles, which the customer app reads directly.
const TILE_PLACEMENTS = {
  categories: 'category',
  services: 'dashboard-service',
  mostBooked: 'most-booked',
  applianceServices: 'appliance-service',
  brandCards: 'brand-card',
};

const tileCache = {};

// Each list has its own field names; these translate to and from the shared
// HomeTile shape so the editors keep working unchanged.
const TILE_ADAPTERS = {
  categories: {
    toApi: (t) => ({ title: t.name, icon: t.icon, service: t.service }),
    fromApi: (t) => ({ id: t.id, name: t.title, icon: t.icon, service: t.service }),
  },
  services: {
    toApi: (t) => ({ title: t.name, imageUrl: t.img }),
    fromApi: (t) => ({ id: t.id, name: t.title, img: t.imageUrl }),
  },
  mostBooked: {
    toApi: (t) => ({ title: t.title, imageUrl: t.image, rating: t.rating, price: t.price, badge: t.badge }),
    fromApi: (t) => ({ id: t.id, title: t.title, image: t.imageUrl, rating: t.rating, price: t.price, badge: t.badge }),
  },
  applianceServices: {
    toApi: (t) => ({ title: t.title, imageUrl: t.image, rating: t.rating, price: t.price, badge: t.badge, link: t.path }),
    fromApi: (t) => ({ id: t.id, title: t.title, image: t.imageUrl, rating: t.rating, price: t.price, badge: t.badge, path: t.link }),
  },
  brandCards: {
    toApi: (t) => ({
      title: t.title, imageUrl: t.image, brandName: t.brandName, subtitle: t.subtitle,
      buttonText: t.buttonText, link: t.actionUrl, badgeText: t.badgeText,
      gradient: t.gradient, textColor: t.textColor,
    }),
    fromApi: (t) => ({
      id: t.id, title: t.title, image: t.imageUrl, brandName: t.brandName, subtitle: t.subtitle,
      buttonText: t.buttonText, actionUrl: t.link, badgeText: t.badgeText,
      gradient: t.gradient, textColor: t.textColor,
    }),
  },
};

async function hydrateTiles() {
  try {
    const rows = await apiRequest('/cms/home-tiles/admin', { auth: true });
    for (const [key, placement] of Object.entries(TILE_PLACEMENTS)) {
      const items = (Array.isArray(rows) ? rows : [])
        .filter((t) => t.placement === placement)
        .map(TILE_ADAPTERS[key].fromApi);

      // Keep the last tile per name (highest sortOrder = most recently written).
      // If duplicates exist (from a failed PUT that fell back to POST), auto-clean the stale ones.
      const byName = new Map();
      const staleIds = [];
      for (const item of items) {
        const identifier = (item.name || item.title || '').trim().toLowerCase();
        if (!identifier) continue;
        if (byName.has(identifier)) {
          // Keep whichever has the higher sortOrder; discard the other
          const existing = byName.get(identifier);
          if (item.id && existing.id) {
            staleIds.push(existing.id); // delete the older duplicate
            byName.set(identifier, item);
          }
        } else {
          byName.set(identifier, item);
        }
      }

      const uniqueItems = [...byName.values(), ...items.filter((i) => !(i.name || i.title))];
      tileCache[key] = uniqueItems;

      // Fire-and-forget cleanup of stale duplicate tiles in the DB
      for (const staleId of staleIds) {
        if (!String(staleId).match(/^\d+$/)) {
          apiRequest(`/cms/home-tiles/${staleId}`, { method: 'DELETE', auth: true }).catch(() => {});
        }
      }
    }
  } catch (err) {
    console.warn('Could not load home tiles:', err.message);
  }
}

function readTiles(key) {
  return tileCache[key]?.length ? JSON.stringify(tileCache[key]) : null;
}

/**
 * Diffs the incoming list against the cache and issues only the calls that
 * changed — a full delete-and-recreate would churn ids the customer app uses
 * as React keys.
 */
async function writeTiles(key, list) {
  const previous = tileCache[key] || [];
  const placement = TILE_PLACEMENTS[key];
  const { toApi, fromApi } = TILE_ADAPTERS[key];

  const updatedList = [];
  try {
    for (const [i, tile] of list.entries()) {
      const body = { ...toApi(tile), placement, sortOrder: i };

      // Prefer tile.id directly (preserved in state after edit) so we always PUT
      // the correct DB document without relying on stale cache name-matching.
      const directId = tile.id && !String(tile.id).match(/^\d+$/) ? String(tile.id) : null;
      const cacheMatch = previous.find((p) =>
        (p.id && tile.id && String(p.id) === String(tile.id)) ||
        (p.name && tile.name && p.name.trim().toLowerCase() === tile.name.trim().toLowerCase()) ||
        (p.title && tile.title && p.title.trim().toLowerCase() === tile.title.trim().toLowerCase())
      );
      const targetId = directId || (cacheMatch?.id && !String(cacheMatch.id).match(/^\d+$/) ? String(cacheMatch.id) : null);

      if (targetId) {
        const updated = await apiRequest(`/cms/home-tiles/${targetId}`, { method: 'PUT', auth: true, body });
        updatedList.push(fromApi(updated));
      } else {
        const created = await apiRequest('/cms/home-tiles', { method: 'POST', auth: true, body });
        updatedList.push(fromApi(created));
      }
    }

    const goneTiles = previous.filter(
      (prev) => prev.id && !String(prev.id).match(/^\d+$/) && !list.some((t) => 
        (t.id && String(t.id) === String(prev.id)) ||
        (t.name && prev.name && t.name.trim().toLowerCase() === prev.name.trim().toLowerCase()) ||
        (t.title && prev.title && t.title.trim().toLowerCase() === prev.title.trim().toLowerCase())
      )
    );

    for (const gone of goneTiles) {
      await apiRequest(`/cms/home-tiles/${gone.id}`, { method: 'DELETE', auth: true });
    }
  } catch (err) {
    console.warn(`Could not save ${key}:`, err.message);
    throw err;
  }

  tileCache[key] = updatedList;
  return updatedList;
}

// ── Service-page storage ──────────────────────────────────────────────────────
// These editors were written against a synchronous localStorage API, and there
// are ~40 read/write sites across the sub-sections. Rather than rewrite each,
// the storage layer underneath them is swapped: a module-level mirror keeps the
// synchronous reads working, and every write is pushed to /cms/service-pages so
// the customer app sees it. Hero copy and catalog live in one document per
// service, so a write to either syncs the merged pair.
const servicePageCache = { configs: {}, catalogs: {} };

async function hydrateServicePages() {
  try {
    const rows = await apiRequest('/cms/service-pages');
    for (const row of Array.isArray(rows) ? rows : []) {
      servicePageCache.configs[row.serviceKey] = {
        tagline: row.tagline || '',
        subtitle: row.subtitle || '',
        subServices: row.subServices || '',
      };
      if (row.catalog?.length) servicePageCache.catalogs[row.serviceKey] = row.catalog;
    }
  } catch (err) {
    console.warn('Could not load service page configs:', err.message);
  }
}

function syncServicePage(serviceKey) {
  const config = servicePageCache.configs[serviceKey] || {};
  const catalog = servicePageCache.catalogs[serviceKey];
  return apiRequest(`/cms/service-pages/${encodeURIComponent(serviceKey)}`, {
    method: 'PUT',
    auth: true,
    body: { ...config, ...(catalog ? { catalog } : {}) },
  }).catch((err) => console.warn(`Could not save "${serviceKey}":`, err.message));
}

async function writeServiceConfigs(configs) {
  const changed = Object.keys(configs).filter(
    (k) => JSON.stringify(configs[k]) !== JSON.stringify(servicePageCache.configs[k]),
  );
  servicePageCache.configs = configs;
  await Promise.all(changed.map(syncServicePage));
}

async function writeServiceCatalogs(catalogs) {
  const changed = Object.keys(catalogs).filter(
    (k) => JSON.stringify(catalogs[k]) !== JSON.stringify(servicePageCache.catalogs[k]),
  );
  servicePageCache.catalogs = catalogs;
  await Promise.all(changed.map(syncServicePage));
}

function readServiceConfigs() {
  return Object.keys(servicePageCache.configs).length ? JSON.stringify(servicePageCache.configs) : null;
}

function readServiceCatalogs() {
  return Object.keys(servicePageCache.catalogs).length ? JSON.stringify(servicePageCache.catalogs) : null;
}

function shapeStory(s) {
  return {
    id: s.id,
    title: s.title,
    type: s.type,
    image: s.mediaUrl || s.slides?.[0]?.image || '',
    slides: (s.slides || []).map((sl, i) => ({ id: i + 1, ...sl })),
  };
}

function shapeBanner(b) {
  return { id: b.id, image: b.imageUrl, title: b.title || '', sortOrder: b.sortOrder ?? 0 };
}

const DEFAULT_NON_WARRANTY = [
  { id: 1, image: acBanner, title: 'AC Service Banner' },
  { id: 2, image: electricianBanner, title: 'Electrician Banner' },
  { id: 3, image: plumbingBanner, title: 'Plumbing Banner' }
];

const DEFAULT_WARRANTY = [
  { id: 1, image: warrantyBanner1, title: 'Warranty Banner 1' },
  { id: 2, image: warrantyBanner2, title: 'Warranty Banner 2' }
];

const DEFAULT_SERVICES = [
  { id: 1, name: 'AC Repair', img: acImgDefault },
  { id: 2, name: 'Washing Machine', img: washingImgDefault },
  { id: 3, name: 'Electrician', img: electricianImgDefault },
  { id: 4, name: 'Plumber', img: plumberImgDefault },
  { id: 5, name: 'Full Home Cleaning', img: cleaningImgDefault },
  { id: 6, name: 'Salon for Women', img: saloonImgDefault },
  { id: 7, name: 'Spa & Massage', img: spaImgDefault }
];

const DEFAULT_SERVICE_CONFIGS = {
  'Electrician': {
    tagline: 'Power Back On',
    subtitle: 'Certified Electricians for\nSafe & Reliable Repairs',
    subServices: 'Book a consultation, Installation Services, Repair & Maintenance, UPS Inverter, Water Motor'
  },
  'Plumber': {
    tagline: 'Leak Fixed Fast',
    subtitle: 'Expert Plumbers at\nYour Doorstep in 60 min',
    subServices: 'Book a consultation, Pipe Leakage, Tap & Fitting, Drainage, Geyser Install'
  },
  'AC Repair': {
    tagline: 'Cool Again Today',
    subtitle: 'Certified AC Technicians\nFor All Brands',
    subServices: 'Book a consultation, AC Installation, Gas Refilling, Deep Cleaning, AMC Plan'
  }
};

const DEFAULT_CATALOG_TEMPLATE = [
  {
    section: 'Book a consultation',
    items: [
      {
        name: 'Standard Consultancy',
        rating: 4.4,
        reviews: 38,
        price: '₹149',
        time: '1 hrs',
        bullets: [
          'Detailed inspection and quote estimation',
          'Fee adjusted in final repair work invoice'
        ]
      }
    ]
  },
  {
    section: 'Repair & Installation Services',
    items: [
      {
        name: 'Standard Repair Service',
        rating: 4.5,
        reviews: 28,
        price: '₹299',
        time: '1 hrs',
        bullets: [
          'Expert installation and functional testing',
          '30 days post-service warranty'
        ]
      }
    ]
  }
];

const DEFAULT_STORIES = [
  {
    id: 1,
    title: 'Cold showers in winter? Hard pass',
    image: storyGeyser,
    slides: [
      {
        image: storyGeyser,
        caption: 'Cold showers in winter? Hard pass',
        subCaption: 'Your geyser deserves a check-up before winter hits.',
      },
      {
        image: storyGeyser2,
        caption: 'Leaking? Tripping? No hot water?',
        subCaption: 'From thermostat failure to heating coil burnout — we\'ve seen it all.',
      },
      {
        image: storyGeyser3,
        caption: 'Back to warm showers in no time',
        subCaption: 'Our certified technicians get your geyser fixed fast.',
      },
    ],
  },
  {
    id: 2,
    title: 'Winter Home Repairs & Maintenance',
    image: storyWinter,
    slides: [
      {
        image: storyWinter,
        caption: 'Winter Home Repairs & Maintenance',
        subCaption: 'Keep your home warm and worry-free this season.',
      },
      {
        image: storyWinter2,
        caption: 'Cracks? Leaks? Chipping walls?',
        subCaption: 'Winter can be tough on your home. Spot the damage early.',
      },
      {
        image: storyWinter3,
        caption: 'Trust the experts. Leave the repairs to us.',
        subCaption: 'Nigam Care technicians — certified, background-checked, on-time.',
      },
    ],
  },
  {
    id: 3,
    title: 'Quick Electrical Fixes',
    image: storyElectrician,
    slides: [
      {
        image: storyElectrician,
        caption: 'Quick Electrical Fixes',
        subCaption: 'Faulty switch? Tripping MCB? Fan not working? We fix it.',
      },
      {
        image: storyElectrician2,
        caption: 'Safe. Certified. Insured.',
        subCaption: 'All our electricians carry ISI-certified tools and follow safety protocols.',
      },
      {
        image: storyElectrician3,
        caption: 'Light up your home again',
        subCaption: 'Hundreds of families trust Nigam Care every month for electrical work.',
      },
    ],
  },
  {
    id: 4,
    title: 'Salon-like pampering at home',
    image: storySalon,
    slides: [
      {
        image: storySalon,
        caption: 'Salon-like pampering at home',
        subCaption: 'Professional beauty experts come right to your doorstep.',
      },
      {
        image: storySalon2,
        caption: 'Nails. Skin. Hair. All at home.',
        subCaption: 'Relax while our experts bring the salon experience to you.',
      },
      {
        image: storySalon3,
        caption: 'Glowing skin. Happy you.',
        subCaption: 'Book a home salon session and feel the difference today.',
      },
    ],
  },
];

const DEFAULT_MOST_BOOKED = [
  { id: 1, title: "Foam-jet AC service", image: mostBookedAc1, rating: 4.76, price: 649, badge: "Instant" },
  { id: 2, title: "AC repair", image: mostBookedAc2, rating: 4.74, price: 299, badge: "Instant" },
  { id: 3, title: "Washing Machine", image: mostBookedWm, rating: 4.85, price: 499, badge: "Instant" },
  { id: 4, title: "Home Cleaning", image: mostBookedCleaning, rating: 4.90, price: 999, badge: "Trending" },
  { id: 5, title: "Women Salon", image: mostBookedSalon, rating: 4.80, price: 799, badge: "Best Seller" }
];

const DEFAULT_APPLIANCE_SERVICES = [
  { id: 1, title: "Foam-jet AC service", image: mostBookedAc1, rating: 4.76, price: 649, badge: "Instant", path: '/booking' },
  { id: 2, title: "AC repair", image: mostBookedAc2, rating: 4.74, price: 299, badge: "Instant", path: '/booking' },
  { id: 3, title: "Washing Machine", image: mostBookedWm, rating: 4.85, price: 499, badge: "Instant", path: '/booking' },
  { id: 4, title: "Refrigerator Repair & Service", image: applianceFridge, rating: 4.80, price: 899, badge: "Instant", path: '/refrigerator-details' },
  { id: 5, title: "Deep Clean AC", image: mostBookedAc1, rating: 4.76, price: 1198, badge: "2 ACs", path: '/booking' },
  { id: 6, title: "WM Checkup", image: mostBookedWm, rating: 4.85, price: 199, badge: "Instant", path: '/booking' }
];

const DEFAULT_BRAND_CARDS = [
  {
    id: 1,
    brandName: 'LLOYD',
    title: 'New Launch Glacier Series AC',
    subtitle: 'Experience Superior Cooling & Comfort',
    image: splitAcImg,
    buttonText: 'Explore on NCC',
    actionUrl: '/service-details?service=AC%20Repair&brand=Lloyd',
    badgeText: '',
    gradient: 'from-[#E3F2FD] via-[#F4F9FF] to-[#D5E6FF]',
    textColor: '#014694'
  },
  {
    id: 2,
    brandName: 'SAMSUNG',
    title: 'Bespoke AI Laundry Range',
    subtitle: 'Smart. Gentle. Intelligent.',
    image: mostBookedWm,
    buttonText: 'Visit Official Site',
    actionUrl: 'https://www.samsung.com',
    badgeText: 'Official Partner',
    gradient: 'from-[#E8F5E9] via-[#F6FAF6] to-[#D2E8D4]',
    textColor: '#1B5E20'
  },
  {
    id: 3,
    brandName: 'DAIKIN',
    title: 'Air Specialist Inverter Series',
    subtitle: 'Perfect Comfort. Every Season.',
    image: splitAcImg,
    buttonText: 'Explore on NCC',
    actionUrl: '/service-details?service=AC%20Repair&brand=Daikin',
    badgeText: 'Air Specialist',
    gradient: 'from-[#F0F4FF] via-[#F7F9FF] to-[#E1E8FF]',
    textColor: '#00529C'
  },
  {
    id: 4,
    brandName: 'LG',
    title: 'Double Door Frost Free Refrigerator',
    subtitle: 'Premium cooling. Maximum savings.',
    image: applianceFridge,
    buttonText: 'Explore on NCC',
    actionUrl: '/refrigerator-details',
    badgeText: '',
    gradient: 'from-[#FCE4EC] via-[#FFF1F3] to-[#F8BBD0]',
    textColor: '#C30F42'
  }
];

const CustomerAppCustomization = () => {
  const location = useLocation();
  const [activeSubSection, setActiveSubSection] = useState('categories'); // 'categories' | 'banners' | 'services' | 'brands' | 'mostbooked' | 'applianceservices'
  const [successMessage, setSuccessMessage] = useState('');

  // Stories State
  const [storiesList, setStoriesList] = useState([]);
  const [showStoryModal, setShowStoryModal] = useState(false);
  const [isEditingStory, setIsEditingStory] = useState(false);
  const [editStoryIndex, setEditStoryIndex] = useState(-1);
  const [storyForm, setStoryForm] = useState({
    title: '',
    image: ''
  });
  const [storySlides, setStorySlides] = useState([]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab === 'banners') {
      setActiveSubSection('banners');
    } else if (tab === 'services') {
      setActiveSubSection('services');
    } else if (tab === 'brands') {
      setActiveSubSection('brands');
    } else if (tab === 'mostbooked') {
      setActiveSubSection('mostbooked');
    } else if (tab === 'applianceservices') {
      setActiveSubSection('applianceservices');
    } else if (tab === 'stories') {
      setActiveSubSection('stories');
    } else {
      setActiveSubSection('categories');
    }
  }, [location.search]);

  // Category State
  const [categories, setCategories] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editIndex, setEditIndex] = useState(-1);
  const [iconMode, setIconMode] = useState('preset'); // 'preset' | 'upload'
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    icon: 'ac',
    service: '',
    isForYou: false,
    isMore: false,
    isFridge: false,
    productTypes: '',
    servicesJson: '',
    brands: '',
    categoryNote: ''
  });

  // Banner State
  const [bannerType, setBannerType] = useState('non-warranty'); // 'non-warranty' or 'warranty'
  const [nonWarrantyBanners, setNonWarrantyBanners] = useState([]);
  const [warrantyBanners, setWarrantyBanners] = useState([]);
  const [newBannerTitle, setNewBannerTitle] = useState('');
  const [newBannerFile, setNewBannerFile] = useState('');

  // Services State
  const [services, setServices] = useState([]);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [isEditingService, setIsEditingService] = useState(false);
  const [editServiceIndex, setEditServiceIndex] = useState(-1);
  const [serviceForm, setServiceForm] = useState({
    name: '',
    img: '',
    tagline: '',
    subtitle: '',
    bannerImg: ''
  });
  const [serviceTypes, setServiceTypes] = useState([]);
  const [servicePackages, setServicePackages] = useState([]);

  // Brands & Offers State
  const [brandCards, setBrandCards] = useState([]);
  const [showBrandModal, setShowBrandModal] = useState(false);
  const [isEditingBrand, setIsEditingBrand] = useState(false);
  const [editBrandIndex, setEditBrandIndex] = useState(-1);
  const [brandForm, setBrandForm] = useState({
    brandName: '',
    title: '',
    subtitle: '',
    image: '',
    buttonText: 'Explore on NCC',
    actionUrl: '',
    badgeText: '',
    gradient: 'from-[#E3F2FD] via-[#F4F9FF] to-[#D5E6FF]',
    textColor: '#014694'
  });

  // Most Booked State
  const [mostBookedList, setMostBookedList] = useState([]);
  const [showMostBookedModal, setShowMostBookedModal] = useState(false);
  const [isEditingMostBooked, setIsEditingMostBooked] = useState(false);
  const [editMostBookedIndex, setEditMostBookedIndex] = useState(-1);
  const [mostBookedForm, setMostBookedForm] = useState({
    title: '',
    rating: '4.8',
    price: '499',
    badge: 'Instant',
    image: ''
  });
  const [mostBookedTypes, setMostBookedTypes] = useState([]);
  const [mostBookedPackages, setMostBookedPackages] = useState([]);

  // Appliance Services State
  const [applianceServicesList, setApplianceServicesList] = useState([]);
  const [showApplianceModal, setShowApplianceModal] = useState(false);
  const [isEditingAppliance, setIsEditingAppliance] = useState(false);
  const [editApplianceIndex, setEditApplianceIndex] = useState(-1);
  const [applianceForm, setApplianceForm] = useState({
    title: '',
    rating: '4.8',
    price: '499',
    badge: 'Instant',
    image: '',
    path: '/booking'
  });
  const [applianceTypes, setApplianceTypes] = useState([]);
  const [appliancePackages, setAppliancePackages] = useState([]);

  useEffect(() => {
    (async () => {
      await hydrateTiles();
      await hydrateCategoryConfigs();
      await hydrateServicePages();

      // Load Categories
      const savedCats = readTiles('categories');
      if (savedCats) {
        const parsed = JSON.parse(savedCats);
        const uniqueCats = [];
        const seenNames = new Set();
        for (const cat of parsed) {
          const norm = (cat.name || '').trim().toLowerCase();
          if (norm && !seenNames.has(norm)) {
            seenNames.add(norm);
            uniqueCats.push(cat);
          }
        }
        setCategories(uniqueCats);
        if (uniqueCats.length !== parsed.length) {
          writeTiles('categories', uniqueCats);
        }
      } else {
        setCategories(DEFAULT_CATEGORIES);
        writeTiles('categories', DEFAULT_CATEGORIES);
      }

      // Load Services
      const savedServices = readTiles('services');
      if (savedServices) {
        setServices(JSON.parse(savedServices));
      } else {
        setServices(DEFAULT_SERVICES);
        writeTiles('services', DEFAULT_SERVICES);
      }

      // Load Brands & Offers
      const savedBrands = readTiles('brandCards');
      if (savedBrands) {
        setBrandCards(JSON.parse(savedBrands));
      } else {
        setBrandCards(DEFAULT_BRAND_CARDS);
        writeTiles('brandCards', DEFAULT_BRAND_CARDS);
      }

      // Load Most Booked
      const savedMost = readTiles('mostBooked');
      if (savedMost) {
        setMostBookedList(JSON.parse(savedMost));
      } else {
        setMostBookedList(DEFAULT_MOST_BOOKED);
        writeTiles('mostBooked', DEFAULT_MOST_BOOKED);
      }

      // Load Appliance Services
      const savedAppliance = readTiles('applianceServices');
      if (savedAppliance) {
        setApplianceServicesList(JSON.parse(savedAppliance));
      } else {
        setApplianceServicesList(DEFAULT_APPLIANCE_SERVICES);
        writeTiles('applianceServices', DEFAULT_APPLIANCE_SERVICES);
      }
    })();

    // Load Banners
    // Banners are real server-side content (/cms/banners), not local state —
    // the customer app reads the same endpoint, so what an admin publishes here
    // actually reaches users.
    (async () => {
      try {
        const all = await apiRequest('/cms/banners/admin?app=customer', { auth: true });
        const list = Array.isArray(all) ? all : [];
        setNonWarrantyBanners(list.filter(b => b.segment !== 'warranty').map(shapeBanner));
        setWarrantyBanners(list.filter(b => b.segment === 'warranty').map(shapeBanner));
      } catch (err) {
        console.warn('Could not load banners:', err.message);
      }
    })();

    // Stories are server-side content the customer app reads from the same
    // endpoint — /admin so Scheduled ones are visible here too.
    (async () => {
      try {
        const data = await apiRequest('/cms/stories/admin', { auth: true });
        setStoriesList((data || []).map(shapeStory));
      } catch (err) {
        console.warn('Could not load stories:', err.message);
      }
    })();

    // Pre-populate default catalogs and configs if not exists
    const savedCatalogs = readServiceCatalogs();
    const catalogs = savedCatalogs ? JSON.parse(savedCatalogs) : {};
    
    const savedConfigs = readServiceConfigs();
    const configs = savedConfigs ? JSON.parse(savedConfigs) : {};

    const defaultServiceNames = [
      'Foam-jet AC service',
      'AC repair',
      'Washing Machine',
      'Home Cleaning',
      'Women Salon',
      'Refrigerator Repair & Service',
      'Deep Clean AC',
      'WM Checkup'
    ];

    let changed = false;
    defaultServiceNames.forEach(name => {
      if (!catalogs[name]) {
        catalogs[name] = [
          {
            section: 'General Services',
            items: [
              {
                name: name + ' Standard Work',
                rating: 4.5,
                reviews: 28,
                price: '₹299',
                time: '1 hrs',
                bullets: ['Professional execution by certified technician', '30 days service warranty included'],
                icon: '🔧',
                desc: 'Standard professional service',
                unit: 'per job'
              }
            ]
          }
        ];
        changed = true;
      }
      if (!configs[name]) {
        configs[name] = {
          tagline: 'Expert Help at Your Door',
          subtitle: 'Verified Professionals\nFor Every Home Need',
          bannerImg: '',
          productTypes: name.toLowerCase().includes('ac') ? ['Split AC', 'Window AC'] : (name.toLowerCase().includes('washing') || name.toLowerCase().includes('wm') ? ['Top Load', 'Front Load'] : []),
          brands: ['LG', 'Samsung', 'Whirlpool', 'Panasonic'],
          categoryNote: 'Prices shown are indicative.'
        };
        changed = true;
      }
    });

    if (changed) {
      writeServiceCatalogs(catalogs);
      writeServiceConfigs(configs);
    }
  }, []);

  const showToast = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const detectIconFromName = (name) => {
    const norm = (name || '').toLowerCase().trim();
    if (!norm) return null;
    if (norm.includes('microwave') || norm.includes('oven') || norm.includes('micro')) return 'microwave';
    if (norm.includes('chimney') || norm.includes('exhaust')) return 'chimney';
    if (norm.includes('laptop') || norm.includes('computer') || norm.includes('pc')) return 'laptop';
    if (norm.includes('mobile') || norm.includes('phone') || norm.includes('tablet')) return 'mobile';
    if (norm.includes('electric') || norm.includes('wire') || norm.includes('mcb') || norm.includes('switch')) return 'electric';
    if (norm.includes('plumb') || norm.includes('pipe') || norm.includes('tap') || norm.includes('leak')) return 'plumbing';
    if (norm.includes('clean') || norm.includes('sweep') || norm.includes('wash home')) return 'cleaning';
    if (norm.includes('paint') || norm.includes('wall') || norm.includes('color')) return 'painting';
    if (norm.includes('sofa') || norm.includes('couch') || norm.includes('furnit')) return 'sofa';
    if (norm.includes('pest') || norm.includes('bug') || norm.includes('termite')) return 'pest';
    if (norm.includes('car') || norm.includes('vehicle') || norm.includes('auto')) return 'car';
    if (norm.includes('garden') || norm.includes('plant') || norm.includes('lawn')) return 'gardening';
    if (norm.includes('carpent') || norm.includes('wood') || norm.includes('furniture repair')) return 'carpenter';
    if (norm.includes('appliance') || norm.includes('plug')) return 'appliance';
    if (norm.includes('ac') || norm.includes('air condition') || norm.includes('cool')) return 'ac';
    if (norm.includes('wash') || norm.includes('machine') || norm.includes('laundry')) return 'washing';
    if (norm.includes('fridge') || norm.includes('refriger')) return 'fridge';
    if (norm.includes('tv') || norm.includes('televis') || norm.includes('screen')) return 'tv';
    if (norm.includes('ro') || norm.includes('purif') || norm.includes('water')) return 'ro';
    if (norm.includes('geyser') || norm.includes('heater') || norm.includes('boiler')) return 'geyser';
    if (norm.includes('sparkle') || norm.includes('for you')) return 'sparkles';
    if (norm.includes('repair') || norm.includes('fix')) return 'wrench';
    if (norm.includes('warrant') || norm.includes('shield')) return 'shield';
    if (norm.includes('offer') || norm.includes('discount') || norm.includes('tag')) return 'tag';
    if (norm.includes('fast') || norm.includes('express') || norm.includes('clock')) return 'clock';
    if (norm.includes('deliver') || norm.includes('truck')) return 'truck';
    if (norm.includes('more')) return 'more';
    return null;
  };

  // --- Category Handlers ---
  const handleCategoryFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setIconMode('upload');
        setCategoryForm(prev => ({ ...prev, icon: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOpenAddCategory = () => {
    setIsEditing(false);
    setIconMode('preset');
    setShowIconPicker(false);
    setCategoryForm({
      name: '',
      icon: 'ac',
      service: '',
      isForYou: false,
      isMore: false,
      isFridge: false,
      productTypes: '',
      servicesJson: '[\n  { "id": "repair", "name": "Repair", "icon": "🔧", "desc": "Fix breakdowns & issues", "price": 299 },\n  { "id": "installation", "name": "Installation", "icon": "🔩", "desc": "Standard installation", "price": 399 }\n]',
      brands: 'Voltas, LG, Samsung, Whirlpool',
      categoryNote: 'Prices shown are indicative. The technician will confirm exact charges after inspection.'
    });
    setShowAddModal(true);
  };

  const handleOpenEditCategory = (index) => {
    setIsEditing(true);
    setEditIndex(index);
    setShowIconPicker(false);
    const cat = categories[index];
    setIconMode(cat.icon && cat.icon.startsWith('data:image/') ? 'upload' : 'preset');
    
    const savedCatalogs = readCategoryConfigs();
    const customCatalogs = savedCatalogs ? JSON.parse(savedCatalogs) : {};
    
    let config = customCatalogs[cat.name] || {};
    if (!customCatalogs[cat.name]) {
      const norm = cat.name.toLowerCase();
      if (norm.includes('ac')) {
        config = {
          productTypes: 'Split AC, Window AC, Cassette AC, Tower AC, Portable AC',
          services: [
            { id: 'installation',  name: 'Installation',  icon: '🔩', desc: 'New AC fitting & setup',          price: 499 },
            { id: 'repair',        name: 'Repair',         icon: '🔧', desc: 'Fix breakdowns & issues',         price: 299 },
            { id: 'gas_refilling', name: 'Gas Refilling',  icon: '💨', desc: 'Refrigerant top-up',             price: 799 },
            { id: 'maintenance',   name: 'Maintenance',    icon: '🛠️', desc: 'Preventive check & tune-up',     price: 349 },
            { id: 'deep_cleaning', name: 'Deep Cleaning',  icon: '✨', desc: 'Foam-jet wash & coil clean',     price: 649 }
          ],
          brands: 'Voltas, LG, Samsung, Daikin, Whirlpool, Lloyd, Panasonic, Blue Star, Hitachi',
          categoryNote: 'Prices shown are indicative. The technician will confirm exact charges after inspection.'
        };
      } else if (norm.includes('wash') || norm.includes('machine')) {
        config = {
          productTypes: 'Front Load, Top Load, Semi Automatic',
          services: [
            { id: 'repair',        name: 'Repair',        icon: '🔧', desc: 'Fix spin, drain & motor issues', price: 399 },
            { id: 'installation',  name: 'Installation',  icon: '🔩', desc: 'New machine setup & demo',       price: 299 },
            { id: 'drum_cleaning', name: 'Drum Cleaning', icon: '✨', desc: 'Deep drum & tub sanitisation',   price: 499 }
          ],
          brands: 'LG, Samsung, Whirlpool, IFB, Bosch, Haier, Godrej, Panasonic',
          categoryNote: 'Prices are indicative. Exact charges are confirmed after inspection.'
        };
      } else if (norm.includes('fridge') || norm.includes('refriger')) {
        config = {
          productTypes: 'Single Door, Double Door, Side By Side, Convertible, French Door',
          services: [
            { id: 'cooling_issue', name: 'Cooling Issue',  icon: '🌡️', desc: 'Not cooling / over-freezing fix', price: 449 },
            { id: 'installation',  name: 'Installation',   icon: '🔩', desc: 'Setup, levelling & demo',         price: 299 },
            { id: 'repair',        name: 'Repair',          icon: '🔧', desc: 'General repairs & part fix',     price: 499 }
          ],
          brands: 'LG, Samsung, Whirlpool, Godrej, Haier, Panasonic, Bosch, Voltas, Hitachi',
          categoryNote: 'Cooling issues may need gas refilling — exact diagnosis done by the technician on-site.'
        };
      } else if (norm.includes('tv') || norm.includes('television')) {
        config = {
          productTypes: 'LED TV, OLED TV, QLED TV, Smart TV',
          services: [
            { id: 'wall_mount',    name: 'Wall Mount Installation', icon: '🔩', desc: 'TV mounting & cable management',    price: 299 },
            { id: 'repair',        name: 'Repair',                  icon: '🔧', desc: 'No display, flickering, no sound', price: 349 },
            { id: 'display_issue', name: 'Display Issue',           icon: '🖥️', desc: 'Screen lines, colour fix',         price: 599 }
          ],
          brands: 'LG, Samsung, Sony, Panasonic, Mi, OnePlus, TCL, Haier, VU',
          categoryNote: 'Panel repairs depend on part availability. Technician will confirm before proceeding.'
        };
      } else if (norm.includes('ro') || norm.includes('purif') || norm.includes('water')) {
        config = {
          productTypes: 'RO, UV, UF, RO + UV',
          services: [
            { id: 'installation',       name: 'Installation',       icon: '🔩', desc: 'New purifier setup & fitting', price: 399 },
            { id: 'filter_replacement', name: 'Filter Replacement', icon: '🔄', desc: 'Replace complete filter set',  price: 799 },
            { id: 'repair',             name: 'Repair',             icon: '🔧', desc: 'No water / leakage fix',      price: 349 }
          ],
          brands: 'Kent, Aquaguard, Pureit, Livpure, Blue Star, Havells',
          categoryNote: 'Filters are replaced with genuine parts. Membrane is checked separately.'
        };
      } else {
        config = {
          productTypes: '',
          services: [
            { id: 'repair', name: 'Repair', icon: '🔧', desc: 'General repair services', price: 299 },
            { id: 'installation', name: 'Installation', icon: '🔩', desc: 'Setup & fitting', price: 399 }
          ],
          brands: 'Other',
          categoryNote: 'Prices shown are indicative.'
        };
      }
    }

    let selectedIcon = cat.icon || detectIconFromName(cat.name) || 'ac';

    setCategoryForm({
      name: cat.name,
      icon: selectedIcon,
      service: cat.service || '',
      isForYou: !!cat.isForYou,
      isMore: !!cat.isMore,
      isFridge: !!cat.isFridge,
      productTypes: typeof config.productTypes === 'string' ? config.productTypes : (config.productTypes || []).map(p => typeof p === 'string' ? p : p.name).join(', '),
      servicesJson: JSON.stringify(config.services?.default || config.services || [], null, 2),
      brands: Array.isArray(config.brands) ? config.brands.join(', ') : config.brands || '',
      categoryNote: config.categoryNote || ''
    });
    setShowAddModal(true);
  };

  const handleDeleteCategory = (index) => {
    const catName = categories[index].name;
    if (window.confirm(`Are you sure you want to delete "${catName}"?`)) {
      const updated = categories.filter((_, i) => i !== index);
      setCategories(updated);
      writeTiles('categories', updated);

      const savedCatalogs = readCategoryConfigs();
      if (savedCatalogs) {
        const customCatalogs = JSON.parse(savedCatalogs);
        delete customCatalogs[catName];
        writeCategoryConfigs(customCatalogs);
      }

      showToast('Category deleted successfully.');
    }
  };

  const handleSaveCategory = (e) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) return;

    let parsedServices;
    try {
      parsedServices = JSON.parse(categoryForm.servicesJson);
      if (!Array.isArray(parsedServices)) {
        alert('Services must be a valid JSON array.');
        return;
      }
    } catch (err) {
      alert('Invalid JSON in Booking Services. Details:\n' + err.message);
      return;
    }

    let updated = [...categories];
    const newCat = {
      id: isEditing ? categories[editIndex]?.id : undefined,
      name: categoryForm.name,
      icon: categoryForm.icon,
      service: categoryForm.service || undefined,
      isForYou: categoryForm.isForYou || undefined,
      isMore: categoryForm.isMore || undefined,
      isFridge: categoryForm.isFridge || undefined
    };

    if (isEditing) {
      updated[editIndex] = newCat;
    } else {
      updated.push(newCat);
    }

    setCategories(updated);
    writeTiles('categories', updated);

    const savedCatalogs = readCategoryConfigs();
    const customCatalogs = savedCatalogs ? JSON.parse(savedCatalogs) : {};

    const typesArray = categoryForm.productTypes.trim()
      ? categoryForm.productTypes.split(',').map((p, idx) => ({
          id: p.trim().toLowerCase().replace(/ /g, '_'),
          name: p.trim(),
          icon: '⚡',
          desc: ''
        }))
      : [];

    customCatalogs[categoryForm.name] = {
      productTypes: typesArray,
      services: {
        default: parsedServices
      },
      brands: categoryForm.brands.split(',').map(b => b.trim()).filter(Boolean),
      whyBrandPoints: ['Brand certified expert technicians', 'Correct parts calibration', 'Genuine brand replacement parts'],
      categoryNote: categoryForm.categoryNote
    };
    writeCategoryConfigs(customCatalogs);

    setShowAddModal(false);
    showToast('Category and booking settings saved successfully.');
  };

  const handleResetCategories = () => {
    if (window.confirm('Reset categories to default customer app dashboard options?')) {
      setCategories(DEFAULT_CATEGORIES);
      writeTiles('categories', DEFAULT_CATEGORIES);
      writeCategoryConfigs({});
      showToast('Restored default categories.');
    }
  };

  // --- Services Handlers ---
  const handleServiceFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await apiRequest('/uploads', {
          method: 'POST',
          auth: true,
          body: formData,
        });
        const url = res.url || res.data?.url || '';
        if (url) {
          setServiceForm(prev => ({ ...prev, img: url }));
        }
      } catch (err) {
        showToast(`Image upload failed: ${err.message}`);
      }
    }
  };

  const handlePackageIconChange = async (pkgId, e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await apiRequest('/uploads', {
          method: 'POST',
          auth: true,
          body: formData,
        });
        const url = res.url || res.data?.url || '';
        if (url) {
          setServicePackages(prev => prev.map(p => p.id === pkgId ? { ...p, icon: url } : p));
        }
      } catch (err) {
        showToast(`Icon upload failed: ${err.message}`);
      }
    }
  };

  const handleServiceBannerFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await apiRequest('/uploads', {
          method: 'POST',
          auth: true,
          body: formData,
        });
        const url = res.url || res.data?.url || '';
        if (url) {
          setServiceForm(prev => ({ ...prev, bannerImg: url }));
        }
      } catch (err) {
        showToast(`Banner upload failed: ${err.message}`);
      }
    }
  };

  const handleOpenAddService = () => {
    setIsEditingService(false);
    setServiceForm({
      name: '',
      img: '',
      tagline: 'Expert Help at Your Door',
      subtitle: 'Verified Professionals\nFor Every Home Need',
      bannerImg: ''
    });
    setServiceTypes([]);
    setServicePackages([
      { id: Date.now() + 1, section: 'Book a consultation', name: 'Standard Consultancy', price: '149', bullets: 'Inspection and quote estimation, Fee adjusted in final invoice', icon: '🔩', desc: 'Standard inspection & quote', unit: 'per visit' }
    ]);
    setShowServiceModal(true);
  };

  const handleOpenEditService = (index) => {
    setIsEditingService(true);
    setEditServiceIndex(index);
    const srv = services[index];
    
    const savedConfigs = readServiceConfigs();
    const configs = savedConfigs ? JSON.parse(savedConfigs) : {};
    const config = configs[srv.name] || DEFAULT_SERVICE_CONFIGS[srv.name] || {
      tagline: 'Expert Help at Your Door',
      subtitle: 'Verified Professionals\nFor Every Home Need',
      bannerImg: '',
      productTypes: []
    };

    const savedCatalogs = readServiceCatalogs();
    const catalogs = savedCatalogs ? JSON.parse(savedCatalogs) : {};
    const catalog = catalogs[srv.name] || DEFAULT_CATALOG_TEMPLATE;

    setServiceForm({
      name: srv.name,
      img: srv.img || '',
      tagline: config.tagline || 'Expert Help at Your Door',
      subtitle: config.subtitle || 'Verified Professionals\nFor Every Home Need',
      bannerImg: config.bannerImg || ''
    });

    const rawTypes = config.productTypes || [];
    setServiceTypes(rawTypes);

    const pkgs = [];
    catalog.forEach(group => {
      if (group && group.items) {
        group.items.forEach(item => {
          pkgs.push({
            id: Math.random() + Math.random(),
            section: group.section || 'General Services',
            name: item.name || '',
            price: (item.price || '').replace('₹', ''),
            bullets: Array.isArray(item.bullets) ? item.bullets.join(', ') : item.bullets || '',
            icon: item.icon || '🔧',
            desc: item.desc || '',
            unit: item.unit || 'per unit'
          });
        });
      }
    });
    setServicePackages(pkgs);

    setShowServiceModal(true);
  };

  const handleDeleteService = async (index) => {
    const srvName = services[index].name;
    if (window.confirm(`Are you sure you want to delete "${srvName}"?`)) {
      const updated = services.filter((_, i) => i !== index);
      try {
        const savedTiles = await writeTiles('services', updated);
        setServices(savedTiles || updated);

        const savedConfigs = readServiceConfigs();
        if (savedConfigs) {
          const configs = JSON.parse(savedConfigs);
          delete configs[srvName];
          writeServiceConfigs(configs);
        }

        const savedCatalogs = readServiceCatalogs();
        if (savedCatalogs) {
          const catalogs = JSON.parse(savedCatalogs);
          delete catalogs[srvName];
          writeServiceCatalogs(catalogs);
        }

        showToast('Service deleted successfully.');
      } catch (err) {
        showToast(`Could not delete service: ${err.message}`);
      }
    }
  };

  const handleSaveService = async (e) => {
    e.preventDefault();
    if (!serviceForm.name.trim()) return;

    const sectionsMap = {};
    servicePackages.forEach(pkg => {
      const secName = pkg.section.trim() || 'General Services';
      if (!sectionsMap[secName]) {
        sectionsMap[secName] = { section: secName, items: [] };
      }
      sectionsMap[secName].items.push({
        name: pkg.name.trim(),
        rating: 4.5,
        reviews: 25,
        price: pkg.price.startsWith('₹') ? pkg.price : `₹${pkg.price}`,
        bullets: pkg.bullets.split(',').map(b => b.trim()).filter(Boolean),
        icon: pkg.icon || '🔧',
        desc: pkg.desc || '',
        unit: pkg.unit || 'per unit',
        img: ''
      });
    });
    const parsedCatalog = Object.values(sectionsMap);

    let updated = [...services];
    const newSrv = {
      id: isEditingService ? services[editServiceIndex].id : Date.now(),
      name: serviceForm.name,
      img: serviceForm.img
    };

    if (isEditingService) {
      updated[editServiceIndex] = newSrv;
    } else {
      updated.push(newSrv);
    }

    try {
      const savedTiles = await writeTiles('services', updated);
      setServices(savedTiles || updated);

      const savedConfigs = readServiceConfigs();
      const configs = savedConfigs ? JSON.parse(savedConfigs) : {};
      configs[serviceForm.name] = {
        tagline: serviceForm.tagline,
        subtitle: serviceForm.subtitle,
        bannerImg: serviceForm.bannerImg,
        subServices: Array.from(new Set(servicePackages.map(p => p.section.trim()).filter(Boolean))).join(', '),
        productTypes: serviceTypes.map(t => t.trim()).filter(Boolean)
      };
      await writeServiceConfigs(configs);

      const savedCatalogs = readServiceCatalogs();
      const catalogs = savedCatalogs ? JSON.parse(savedCatalogs) : {};
      catalogs[serviceForm.name] = parsedCatalog;
      await writeServiceCatalogs(catalogs);

      setShowServiceModal(false);
      showToast('Service details saved successfully!');
    } catch (err) {
      showToast(`Error saving service: ${err.message}`);
    }
  };

  const handleResetServices = () => {
    if (window.confirm('Reset dashboard services and all customized details pages to original defaults?')) {
      setServices(DEFAULT_SERVICES);
      writeTiles('services', DEFAULT_SERVICES);
      writeServiceConfigs({});
      writeServiceCatalogs({});
      showToast('Restored original defaults.');
    }
  };

  // --- Banner Handlers ---
  const handleBannerFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewBannerFile(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddBanner = async (e) => {
    e.preventDefault();
    if (!newBannerFile) return;

    try {
      const created = await apiRequest('/cms/banners', {
        method: 'POST',
        auth: true,
        body: {
          imageUrl: newBannerFile,
          app: 'customer',
          segment: bannerType === 'warranty' ? 'warranty' : 'non-warranty',
        },
      });
      const banner = shapeBanner(created);
      if (bannerType === 'non-warranty') setNonWarrantyBanners((prev) => [...prev, banner]);
      else setWarrantyBanners((prev) => [...prev, banner]);

      setNewBannerTitle('');
      setNewBannerFile('');
      const fileInput = document.getElementById('banner-file-input-sub');
      if (fileInput) fileInput.value = '';
      showToast('Banner published — it is now live in the customer app.');
    } catch (err) {
      showToast(`Could not publish the banner: ${err.message}`);
    }
  };

  const handleDeleteBanner = async (id) => {
    if (!window.confirm('Are you sure you want to delete this banner?')) return;

    const prevNon = nonWarrantyBanners;
    const prevWar = warrantyBanners;
    if (bannerType === 'non-warranty') setNonWarrantyBanners((p) => p.filter((b) => b.id !== id));
    else setWarrantyBanners((p) => p.filter((b) => b.id !== id));

    try {
      await apiRequest(`/cms/banners/${id}`, { method: 'DELETE', auth: true });
      showToast('Banner removed from the customer app.');
    } catch (err) {
      setNonWarrantyBanners(prevNon);
      setWarrantyBanners(prevWar);
      showToast(`Could not delete the banner: ${err.message}`);
    }
  };

  // Banners now live on the server and are shared by every customer, so there is
  // no local default to restore to — resetting would mean deleting real content
  // for everyone. Removed deliberately rather than left as a no-op button.
  const handleResetBanners = () => {
    showToast('Banners are live content — delete individual banners instead of resetting.');
  };

  const currentBanners = bannerType === 'non-warranty' ? nonWarrantyBanners : warrantyBanners;

  // --- Brands Handlers ---
  const handleBrandFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setBrandForm(prev => ({ ...prev, image: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOpenAddBrand = () => {
    setIsEditingBrand(false);
    setBrandForm({
      brandName: '',
      title: '',
      subtitle: '',
      image: '',
      buttonText: 'Explore on NCC',
      actionUrl: '',
      badgeText: '',
      gradient: 'from-[#E3F2FD] via-[#F4F9FF] to-[#D5E6FF]',
      textColor: '#014694'
    });
    setShowBrandModal(true);
  };

  const handleOpenEditBrand = (index) => {
    setIsEditingBrand(true);
    setEditBrandIndex(index);
    const card = brandCards[index];
    setBrandForm({
      brandName: card.brandName || '',
      title: card.title || '',
      subtitle: card.subtitle || '',
      image: card.image || '',
      buttonText: card.buttonText || 'Explore on NCC',
      actionUrl: card.actionUrl || '',
      badgeText: card.badgeText || '',
      gradient: card.gradient || 'from-[#E3F2FD] via-[#F4F9FF] to-[#D5E6FF]',
      textColor: card.textColor || '#014694'
    });
    setShowBrandModal(true);
  };

  const handleDeleteBrand = (index) => {
    if (window.confirm(`Are you sure you want to delete this brand card?`)) {
      const updated = brandCards.filter((_, i) => i !== index);
      setBrandCards(updated);
      writeTiles('brandCards', updated);
      showToast('Brand offer card deleted successfully.');
    }
  };

  const handleSaveBrand = (e) => {
    e.preventDefault();
    if (!brandForm.brandName.trim()) return;

    let updated = [...brandCards];
    const newCard = {
      id: isEditingBrand ? brandCards[editBrandIndex].id : Date.now(),
      brandName: brandForm.brandName,
      title: brandForm.title,
      subtitle: brandForm.subtitle,
      image: brandForm.image,
      buttonText: brandForm.buttonText,
      actionUrl: brandForm.actionUrl,
      badgeText: brandForm.badgeText,
      gradient: brandForm.gradient,
      textColor: brandForm.textColor
    };

    if (isEditingBrand) {
      updated[editBrandIndex] = newCard;
    } else {
      updated.push(newCard);
    }

    setBrandCards(updated);
    writeTiles('brandCards', updated);
    setShowBrandModal(false);
    showToast('Brand offer card saved successfully!');
  };

  const handleResetBrands = () => {
    if (window.confirm('Reset Brands & Offers to original defaults?')) {
      setBrandCards(DEFAULT_BRAND_CARDS);
      writeTiles('brandCards', DEFAULT_BRAND_CARDS);
      showToast('Restored brand offers defaults.');
    }
  };

  // --- Most Booked Handlers ---
  const handleMostBookedFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setMostBookedForm(prev => ({ ...prev, image: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOpenAddMostBooked = () => {
    setIsEditingMostBooked(false);
    setMostBookedForm({
      title: '',
      rating: '4.8',
      price: '499',
      badge: 'Instant',
      image: ''
    });
    setMostBookedTypes([]);
    setMostBookedPackages([
      { id: Date.now() + 1, section: 'Book a consultation', name: 'Standard Consultancy', price: '149', bullets: 'Inspection and quote estimation, Fee adjusted in final invoice', icon: '🔩', desc: 'Standard inspection & quote', unit: 'per visit' }
    ]);
    setShowMostBookedModal(true);
  };

  const handleOpenEditMostBooked = (index) => {
    setIsEditingMostBooked(true);
    setEditMostBookedIndex(index);
    const mb = mostBookedList[index];

    // Load custom service details configs & catalogs under this service title
    const savedConfigs = readServiceConfigs();
    const configs = savedConfigs ? JSON.parse(savedConfigs) : {};
    const config = configs[mb.title] || {
      tagline: 'Expert Help at Your Door',
      subtitle: 'Verified Professionals\nFor Every Home Need',
      bannerImg: '',
      productTypes: []
    };

    const savedCatalogs = readServiceCatalogs();
    const catalogs = savedCatalogs ? JSON.parse(savedCatalogs) : {};
    const catalog = catalogs[mb.title] || DEFAULT_CATALOG_TEMPLATE;

    setMostBookedForm({
      title: mb.title,
      rating: mb.rating || '4.8',
      price: mb.price || '499',
      badge: mb.badge || 'Instant',
      image: mb.image || ''
    });

    const rawTypes = config.productTypes || [];
    setMostBookedTypes(rawTypes);

    const pkgs = [];
    catalog.forEach(group => {
      if (group && group.items) {
        group.items.forEach(item => {
          pkgs.push({
            id: Math.random() + Math.random(),
            section: group.section || 'General Services',
            name: item.name || '',
            price: (item.price || '').replace('₹', ''),
            bullets: Array.isArray(item.bullets) ? item.bullets.join(', ') : item.bullets || '',
            icon: item.icon || '🔧',
            desc: item.desc || '',
            unit: item.unit || 'per unit'
          });
        });
      }
    });
    setMostBookedPackages(pkgs);

    setShowMostBookedModal(true);
  };

  const handleDeleteMostBooked = (index) => {
    const title = mostBookedList[index].title;
    if (window.confirm(`Are you sure you want to delete "${title}" from most booked list?`)) {
      const updated = mostBookedList.filter((_, i) => i !== index);
      setMostBookedList(updated);
      writeTiles('mostBooked', updated);

      // delete configs & catalogs too
      const savedConfigs = readServiceConfigs();
      if (savedConfigs) {
        const configs = JSON.parse(savedConfigs);
        delete configs[title];
        writeServiceConfigs(configs);
      }

      const savedCatalogs = readServiceCatalogs();
      if (savedCatalogs) {
        const catalogs = JSON.parse(savedCatalogs);
        delete catalogs[title];
        writeServiceCatalogs(catalogs);
      }

      showToast('Most booked service deleted successfully.');
    }
  };

  const handleSaveMostBooked = (e) => {
    e.preventDefault();
    if (!mostBookedForm.title.trim()) return;

    // Parse sub-sections
    const sectionsMap = {};
    mostBookedPackages.forEach(pkg => {
      const secName = pkg.section.trim() || 'General Services';
      if (!sectionsMap[secName]) {
        sectionsMap[secName] = { section: secName, items: [] };
      }
      sectionsMap[secName].items.push({
        name: pkg.name.trim(),
        rating: 4.5,
        reviews: 25,
        price: pkg.price.startsWith('₹') ? pkg.price : `₹${pkg.price}`,
        bullets: pkg.bullets.split(',').map(b => b.trim()).filter(Boolean),
        icon: pkg.icon || '🔧',
        desc: pkg.desc || '',
        unit: pkg.unit || 'per unit',
        img: ''
      });
    });
    const parsedCatalog = Object.values(sectionsMap);

    let updated = [...mostBookedList];
    const newMb = {
      id: isEditingMostBooked ? mostBookedList[editMostBookedIndex].id : Date.now(),
      title: mostBookedForm.title,
      rating: parseFloat(mostBookedForm.rating) || 4.8,
      price: parseInt(mostBookedForm.price) || 499,
      badge: mostBookedForm.badge,
      image: mostBookedForm.image
    };

    if (isEditingMostBooked) {
      updated[editMostBookedIndex] = newMb;
    } else {
      updated.push(newMb);
    }

    setMostBookedList(updated);
    writeTiles('mostBooked', updated);

    // Save configurations
    const savedConfigs = readServiceConfigs();
    const configs = savedConfigs ? JSON.parse(savedConfigs) : {};
    configs[mostBookedForm.title] = {
      tagline: 'Expert Help at Your Door',
      subtitle: 'Verified Professionals\nFor Every Home Need',
      bannerImg: '',
      productTypes: mostBookedTypes,
      brands: ['LG', 'Samsung', 'Whirlpool', 'Panasonic'],
      categoryNote: 'Prices shown are indicative.'
    };
    writeServiceConfigs(configs);

    const savedCatalogs = readServiceCatalogs();
    const catalogs = savedCatalogs ? JSON.parse(savedCatalogs) : {};
    catalogs[mostBookedForm.title] = parsedCatalog;
    writeServiceCatalogs(catalogs);

    setShowMostBookedModal(false);
    showToast('Most booked service saved successfully!');
  };

  const handleResetMostBooked = () => {
    if (window.confirm('Reset Most Booked Services list to original defaults?')) {
      setMostBookedList(DEFAULT_MOST_BOOKED);
      writeTiles('mostBooked', DEFAULT_MOST_BOOKED);
      showToast('Restored most booked defaults.');
    }
  };

  // --- Appliance Services Handlers ---
  const handleApplianceFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setApplianceForm(prev => ({ ...prev, image: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOpenAddAppliance = () => {
    setIsEditingAppliance(false);
    setApplianceForm({
      title: '',
      rating: '4.8',
      price: '499',
      badge: 'Instant',
      image: '',
      path: '/booking'
    });
    setApplianceTypes([]);
    setAppliancePackages([
      { id: Date.now() + 1, section: 'Book a consultation', name: 'Standard Consultancy', price: '149', bullets: 'Inspection and quote estimation, Fee adjusted in final invoice', icon: '🔩', desc: 'Standard inspection & quote', unit: 'per visit' }
    ]);
    setShowApplianceModal(true);
  };

  const handleOpenEditAppliance = (index) => {
    setIsEditingAppliance(true);
    setEditApplianceIndex(index);
    const app = applianceServicesList[index];

    // Load custom service details configs & catalogs under this service title
    const savedConfigs = readServiceConfigs();
    const configs = savedConfigs ? JSON.parse(savedConfigs) : {};
    const config = configs[app.title] || {
      tagline: 'Expert Help at Your Door',
      subtitle: 'Verified Professionals\nFor Every Home Need',
      bannerImg: '',
      productTypes: []
    };

    const savedCatalogs = readServiceCatalogs();
    const catalogs = savedCatalogs ? JSON.parse(savedCatalogs) : {};
    const catalog = catalogs[app.title] || DEFAULT_CATALOG_TEMPLATE;

    setApplianceForm({
      title: app.title || '',
      rating: app.rating || '4.8',
      price: app.price || '499',
      badge: app.badge || 'Instant',
      image: app.image || '',
      path: app.path || '/booking'
    });

    const rawTypes = config.productTypes || [];
    setApplianceTypes(rawTypes);

    const pkgs = [];
    catalog.forEach(group => {
      if (group && group.items) {
        group.items.forEach(item => {
          pkgs.push({
            id: Math.random() + Math.random(),
            section: group.section || 'General Services',
            name: item.name || '',
            price: (item.price || '').replace('₹', ''),
            bullets: Array.isArray(item.bullets) ? item.bullets.join(', ') : item.bullets || '',
            icon: item.icon || '🔧',
            desc: item.desc || '',
            unit: item.unit || 'per unit'
          });
        });
      }
    });
    setAppliancePackages(pkgs);

    setShowApplianceModal(true);
  };

  const handleDeleteAppliance = (index) => {
    const title = applianceServicesList[index].title;
    if (window.confirm(`Are you sure you want to delete "${title}" from appliance services list?`)) {
      const updated = applianceServicesList.filter((_, i) => i !== index);
      setApplianceServicesList(updated);
      writeTiles('applianceServices', updated);

      // delete configs & catalogs too
      const savedConfigs = readServiceConfigs();
      if (savedConfigs) {
        const configs = JSON.parse(savedConfigs);
        delete configs[title];
        writeServiceConfigs(configs);
      }

      const savedCatalogs = readServiceCatalogs();
      if (savedCatalogs) {
        const catalogs = JSON.parse(savedCatalogs);
        delete catalogs[title];
        writeServiceCatalogs(catalogs);
      }

      showToast('Appliance service card deleted successfully.');
    }
  };

  const handleSaveAppliance = (e) => {
    e.preventDefault();
    if (!applianceForm.title.trim()) return;

    // Parse sub-sections
    const sectionsMap = {};
    appliancePackages.forEach(pkg => {
      const secName = pkg.section.trim() || 'General Services';
      if (!sectionsMap[secName]) {
        sectionsMap[secName] = { section: secName, items: [] };
      }
      sectionsMap[secName].items.push({
        name: pkg.name.trim(),
        rating: 4.5,
        reviews: 25,
        price: pkg.price.startsWith('₹') ? pkg.price : `₹${pkg.price}`,
        bullets: pkg.bullets.split(',').map(b => b.trim()).filter(Boolean),
        icon: pkg.icon || '🔧',
        desc: pkg.desc || '',
        unit: pkg.unit || 'per unit',
        img: ''
      });
    });
    const parsedCatalog = Object.values(sectionsMap);

    let updated = [...applianceServicesList];
    const newApp = {
      id: isEditingAppliance ? applianceServicesList[editApplianceIndex].id : Date.now(),
      title: applianceForm.title,
      rating: parseFloat(applianceForm.rating) || 4.8,
      price: parseInt(applianceForm.price) || 499,
      badge: applianceForm.badge,
      image: applianceForm.image,
      path: applianceForm.path
    };

    if (isEditingAppliance) {
      updated[editApplianceIndex] = newApp;
    } else {
      updated.push(newApp);
    }

    setApplianceServicesList(updated);
    writeTiles('applianceServices', updated);

    // Save configurations
    const savedConfigs = readServiceConfigs();
    const configs = savedConfigs ? JSON.parse(savedConfigs) : {};
    configs[applianceForm.title] = {
      tagline: 'Expert Help at Your Door',
      subtitle: 'Verified Professionals\nFor Every Home Need',
      bannerImg: '',
      productTypes: applianceTypes,
      brands: ['LG', 'Samsung', 'Whirlpool', 'Panasonic'],
      categoryNote: 'Prices shown are indicative.'
    };
    writeServiceConfigs(configs);

    const savedCatalogs = readServiceCatalogs();
    const catalogs = savedCatalogs ? JSON.parse(savedCatalogs) : {};
    catalogs[applianceForm.title] = parsedCatalog;
    writeServiceCatalogs(catalogs);

    setShowApplianceModal(false);
    showToast('Appliance service saved successfully!');
  };

  const handleResetAppliance = () => {
    if (window.confirm('Reset Appliance Repair & Services list to original defaults?')) {
      setApplianceServicesList(DEFAULT_APPLIANCE_SERVICES);
      writeTiles('applianceServices', DEFAULT_APPLIANCE_SERVICES);
      showToast('Restored appliance services defaults.');
    }
  };

  // --- Stories Handlers ---
  const handleStoryFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setStoryForm(prev => ({ ...prev, image: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOpenAddStory = () => {
    setIsEditingStory(false);
    setStoryForm({
      title: '',
      image: ''
    });
    setStorySlides([
      { id: Date.now() + 1, image: '', caption: '', subCaption: '' }
    ]);
    setShowStoryModal(true);
  };

  const handleOpenEditStory = (index) => {
    setIsEditingStory(true);
    setEditStoryIndex(index);
    const story = storiesList[index];
    setStoryForm({
      title: story.title || '',
      image: story.image || ''
    });
    
    const slides = (story.slides || []).map((slide) => ({
      id: slide.id || Math.random() + Math.random(),
      image: slide.image || '',
      caption: slide.caption || '',
      subCaption: slide.subCaption || ''
    }));
    setStorySlides(slides);
    
    setShowStoryModal(true);
  };

  const handleDeleteStory = async (index) => {
    const story = storiesList[index];
    if (!window.confirm(`Are you sure you want to delete story "${story.title}"?`)) return;

    const previous = storiesList;
    setStoriesList(storiesList.filter((_, i) => i !== index));
    try {
      await apiRequest(`/cms/stories/${story.id}`, { method: 'DELETE', auth: true });
      showToast('Story removed from the customer app.');
    } catch (err) {
      setStoriesList(previous);
      showToast(`Could not delete the story: ${err.message}`);
    }
  };

  const handleSaveStory = async (e) => {
    e.preventDefault();
    if (!storyForm.title.trim()) return;

    const parsedSlides = storySlides.map((slide, idx) => ({
      id: idx + 1,
      image: slide.image || storyForm.image,
      caption: slide.caption || storyForm.title,
      subCaption: slide.subCaption || ''
    }));

    const body = {
      title: storyForm.title,
      type: storyForm.type || 'Customer Help Slider',
      mediaUrl: storyForm.image || parsedSlides[0]?.image || '',
      slides: parsedSlides.map(({ image, caption, subCaption }) => ({ image, caption, subCaption })),
    };

    try {
      if (isEditingStory) {
        const existing = storiesList[editStoryIndex];
        const saved = await apiRequest(`/cms/stories/${existing.id}`, { method: 'PUT', auth: true, body });
        setStoriesList(storiesList.map((s2, i) => (i === editStoryIndex ? shapeStory(saved) : s2)));
      } else {
        const saved = await apiRequest('/cms/stories', { method: 'POST', auth: true, body });
        setStoriesList([...storiesList, shapeStory(saved)]);
      }
      setShowStoryModal(false);
      showToast('Story published to the customer app.');
    } catch (err) {
      showToast(`Could not save the story: ${err.message}`);
    }
  };

  // Same reasoning as banners: stories are live shared content, so there is no
  // local default to restore without deleting real content for every customer.
  const handleResetStories = () => {
    showToast('Stories are live content — delete individual stories instead of resetting.');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex relative">
      <Sidebar />

      <div className="flex-1 ml-64 min-h-screen flex flex-col">
        <Topbar title="Customer App Customization" />

        <div className="p-6 space-y-6 flex-1">
          {successMessage && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl flex items-center gap-2 shadow-xs text-sm">
              <Sparkles size={16} />
              <span>{successMessage}</span>
            </div>
          )}



          {/* ---------------- SUBSECTION 1: CATEGORY CUSTOMIZATION ---------------- */}
          {activeSubSection === 'categories' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Categories Header Card */}
              <div className="flex flex-wrap justify-between items-center bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#0D47A1]">
                      <LayoutGrid size={18} />
                    </div>
                    <h2 className="text-base font-extrabold text-slate-900 tracking-tight">Dashboard Categories</h2>
                    <span className="bg-blue-50 border border-blue-100 text-[#0D47A1] text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      {categories.length} Categories
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium pl-10">
                    Configure the top category bar icons, booking services, and target routes shown on the customer app home screen.
                  </p>
                </div>

                <div className="flex gap-2.5 items-center">
                  <button 
                    onClick={handleResetCategories}
                    className="bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                  >
                    <RotateCcw size={14} className="text-slate-500" /> Reset Defaults
                  </button>
                  <button 
                    onClick={handleOpenAddCategory}
                    className="bg-[#0D47A1] hover:bg-blue-800 text-white px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-98"
                  >
                    <Plus size={15} /> Add Category
                  </button>
                </div>
              </div>

              {/* Categories Table Container */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider text-[10.5px] border-b border-slate-200/80">
                        <th className="px-6 py-3.5 w-16">#</th>
                        <th className="px-6 py-3.5">Category Name</th>
                        <th className="px-6 py-3.5">Icon Preview</th>
                        <th className="px-6 py-3.5">Target Route / Action</th>
                        <th className="px-6 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {categories.map((cat, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors group">
                          <td className="px-6 py-4 font-extrabold text-slate-400 font-mono text-xs">{idx + 1}</td>
                          
                          <td className="px-6 py-4 font-bold text-slate-900 text-sm">
                            <span className="group-hover:text-[#0D47A1] transition-colors">{cat.name}</span>
                          </td>

                          <td className="px-6 py-4">
                            {cat.icon && cat.icon.startsWith('data:image/') ? (
                              <img src={cat.icon} alt={cat.name} className="w-9 h-9 object-contain border border-slate-200 rounded-xl p-1 bg-slate-50 shadow-2xs" />
                            ) : (
                              <div className="w-10 h-10 rounded-2xl bg-blue-50/80 border border-blue-100/90 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                                <CategoryVectorIcon iconKey={cat.icon || detectIconFromName(cat.name)} className="w-5.5 h-5.5 text-[#0D47A1]" />
                              </div>
                            )}
                          </td>

                          <td className="px-6 py-4">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200/60">
                              {cat.isForYou ? '⚡ For You Feed' : cat.isMore ? '📂 More Category Page' : cat.isFridge ? '🧊 Refrigerator Booking' : cat.service ? `🛠️ Service: ${cat.service}` : `📅 Booking: /book/${cat.name}`}
                            </span>
                          </td>

                          <td className="px-6 py-4 text-right">
                            <div className="flex gap-2 justify-end items-center">
                              <button 
                                onClick={() => handleOpenEditCategory(idx)}
                                className="p-2 text-slate-500 hover:text-[#0D47A1] hover:bg-blue-50 rounded-xl transition-all cursor-pointer"
                                title="Edit Category"
                              >
                                <Edit2 size={15} />
                              </button>
                              <button 
                                onClick={() => handleDeleteCategory(idx)}
                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                                title="Delete Category"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ---------------- SUBSECTION 4: BRANDS & OFFERS CUSTOMIZATION ---------------- */}
          {activeSubSection === 'brands' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-xs">
                <div>
                  <h2 className="text-sm font-bold text-[#1E293B]">Brands & Offers Customization</h2>
                  <p className="text-xs text-slate-500 mt-1">Manage the brand promotion cards and offers shown in the carousel on the user dashboard.</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={handleResetBrands}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <RotateCcw size={14} /> Reset Defaults
                  </button>
                  <button 
                    onClick={handleOpenAddBrand}
                    className="bg-[#0D47A1] hover:bg-blue-800 text-white px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                  >
                    <Plus size={14} /> Add Brand/Offer Card
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-[#64748B] font-semibold border-b border-[#E2E8F0]">
                      <th className="px-6 py-4">Position</th>
                      <th className="px-6 py-4">Brand name</th>
                      <th className="px-6 py-4">Offer Title</th>
                      <th className="px-6 py-4">Image Preview</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {brandCards.map((bc, idx) => (
                      <tr key={bc.id || idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-500">{idx + 1}</td>
                        <td className="px-6 py-4 font-bold text-[#1E293B]">{bc.brandName}</td>
                        <td className="px-6 py-4 font-medium text-slate-600">{bc.title}</td>
                        <td className="px-6 py-4">
                          {bc.image && (
                            <img src={bc.image} alt={bc.brandName} className="w-10 h-10 object-contain border border-slate-200 rounded-lg p-0.5 bg-slate-50" />
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex gap-2 justify-end">
                            <button 
                              onClick={() => handleOpenEditBrand(idx)}
                              className="p-1.5 text-slate-500 hover:text-[#0D47A1] hover:bg-slate-100 rounded-lg transition-colors"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button 
                              onClick={() => handleDeleteBrand(idx)}
                              className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ---------------- SUBSECTION 5: MOST BOOKED SERVICES CUSTOMIZATION ---------------- */}
          {activeSubSection === 'mostbooked' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-xs">
                <div>
                  <h2 className="text-sm font-bold text-[#1E293B]">Most Booked Services Customization</h2>
                  <p className="text-xs text-slate-500 mt-1">Manage the services displayed under the 'Most Booked Services' section of the dashboard.</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={handleResetMostBooked}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <RotateCcw size={14} /> Reset Defaults
                  </button>
                  <button 
                    onClick={handleOpenAddMostBooked}
                    className="bg-[#0D47A1] hover:bg-blue-800 text-white px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                  >
                    <Plus size={14} /> Add Service Card
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-[#64748B] font-semibold border-b border-[#E2E8F0]">
                      <th className="px-6 py-4">Position</th>
                      <th className="px-6 py-4">Service Title</th>
                      <th className="px-6 py-4">Badge</th>
                      <th className="px-6 py-4">Start Price</th>
                      <th className="px-6 py-4">Image Preview</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {mostBookedList.map((mb, idx) => (
                      <tr key={mb.id || idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-500">{idx + 1}</td>
                        <td className="px-6 py-4 font-bold text-[#1E293B]">{mb.title}</td>
                        <td className="px-6 py-4"><span className="bg-[#E3F2FD] text-[#0D47A1] px-2 py-0.5 rounded-full font-bold text-[10px]">{mb.badge || 'Instant'}</span></td>
                        <td className="px-6 py-4 font-bold text-slate-800">₹{mb.price}</td>
                        <td className="px-6 py-4">
                          {mb.image && (
                            <img src={mb.image} alt={mb.title} className="w-10 h-10 object-cover border border-slate-200 rounded-lg p-0.5 bg-slate-50" />
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex gap-2 justify-end">
                            <button 
                              onClick={() => handleOpenEditMostBooked(idx)}
                              className="p-1.5 text-slate-500 hover:text-[#0D47A1] hover:bg-slate-100 rounded-lg transition-colors"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button 
                              onClick={() => handleDeleteMostBooked(idx)}
                              className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ---------------- SUBSECTION 6: APPLIANCE REPAIR & SERVICE CUSTOMIZATION ---------------- */}
          {activeSubSection === 'applianceservices' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-xs">
                <div>
                  <h2 className="text-sm font-bold text-[#1E293B]">Appliance Repair & Service Customization</h2>
                  <p className="text-xs text-slate-500 mt-1">Manage the services displayed under the 'Appliance Repair & Service' section of the dashboard.</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={handleResetAppliance}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <RotateCcw size={14} /> Reset Defaults
                  </button>
                  <button 
                    onClick={handleOpenAddAppliance}
                    className="bg-[#0D47A1] hover:bg-blue-800 text-white px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                  >
                    <Plus size={14} /> Add Appliance Card
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-[#64748B] font-semibold border-b border-[#E2E8F0]">
                      <th className="px-6 py-4">Position</th>
                      <th className="px-6 py-4">Appliance Title</th>
                      <th className="px-6 py-4">Badge</th>
                      <th className="px-6 py-4">Start Price</th>
                      <th className="px-6 py-4">Action Path</th>
                      <th className="px-6 py-4">Image Preview</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {applianceServicesList.map((app, idx) => (
                      <tr key={app.id || idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-500">{idx + 1}</td>
                        <td className="px-6 py-4 font-bold text-[#1E293B]">{app.title}</td>
                        <td className="px-6 py-4"><span className="bg-[#E3F2FD] text-[#0D47A1] px-2 py-0.5 rounded-full font-bold text-[10px]">{app.badge || 'Instant'}</span></td>
                        <td className="px-6 py-4 font-bold text-slate-800">₹{app.price}</td>
                        <td className="px-6 py-4 font-medium text-slate-500">{app.path}</td>
                        <td className="px-6 py-4">
                          {app.image && (
                            <img src={app.image} alt={app.title} className="w-10 h-10 object-cover border border-slate-200 rounded-lg p-0.5 bg-slate-50" />
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex gap-2 justify-end">
                            <button 
                              onClick={() => handleOpenEditAppliance(idx)}
                              className="p-1.5 text-slate-500 hover:text-[#0D47A1] hover:bg-slate-100 rounded-lg transition-colors"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button 
                              onClick={() => handleDeleteAppliance(idx)}
                              className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ---------------- SUBSECTION 7: STORIES CUSTOMIZATION ---------------- */}
          {activeSubSection === 'stories' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-xs">
                <div>
                  <h2 className="text-sm font-bold text-[#1E293B]">Stories Customization</h2>
                  <p className="text-xs text-slate-500 mt-1">Manage the Instagram-style story cards and sub-slides shown on the user dashboard.</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={handleResetStories}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <RotateCcw size={14} /> Reset Defaults
                  </button>
                  <button 
                    onClick={handleOpenAddStory}
                    className="bg-[#0D47A1] hover:bg-blue-800 text-white px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                  >
                    <Plus size={14} /> Add Story Card
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-[#64748B] font-semibold border-b border-[#E2E8F0]">
                      <th className="px-6 py-4">Position</th>
                      <th className="px-6 py-4">Story Cover Title</th>
                      <th className="px-6 py-4">Total Slides</th>
                      <th className="px-6 py-4">Cover Image Preview</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {storiesList.map((story, idx) => (
                      <tr key={story.id || idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-500">{idx + 1}</td>
                        <td className="px-6 py-4 font-bold text-[#1E293B]">{story.title}</td>
                        <td className="px-6 py-4 font-bold text-slate-600">🎥 {story.slides?.length || 0} Slides</td>
                        <td className="px-6 py-4">
                          {story.image && (
                            <img src={story.image} alt={story.title} className="w-10 h-10 object-cover border border-slate-200 rounded-lg p-0.5 bg-slate-50" />
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex gap-2 justify-end">
                            <button 
                              onClick={() => handleOpenEditStory(idx)}
                              className="p-1.5 text-slate-500 hover:text-[#0D47A1] hover:bg-slate-100 rounded-lg transition-colors"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button 
                              onClick={() => handleDeleteStory(idx)}
                              className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ---------------- SUBSECTION 2: BANNER CUSTOMIZATION ---------------- */}
          {activeSubSection === 'banners' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-xs">
                <div>
                  <h2 className="text-sm font-bold text-[#1E293B]">Dashboard sliding Banners</h2>
                  <p className="text-xs text-slate-500 mt-1">Manage the sliding offer banners displayed right under the category bar on the user dashboard.</p>
                </div>
                <button 
                  onClick={handleResetBanners}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <RotateCcw size={14} /> Reset Current Defaults
                </button>
              </div>
              {/* Banner type label — only regular banners are shown */}
              <div className="flex gap-2 bg-slate-100 p-1 rounded-xl self-start w-fit">
                <button
                  onClick={() => setBannerType('non-warranty')}
                  className="px-4 py-1.5 text-[10.5px] font-bold rounded-lg transition-all bg-white text-slate-900 shadow-2xs"
                >
                  Regular Banners
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                {/* Upload form */}
                <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs flex flex-col gap-4">
                  <h3 className="text-xs font-bold text-[#1E293B] uppercase tracking-wider flex items-center gap-1.5">
                    <Image size={15} className="text-[#0D47A1]" />
                    <span>Upload New Banner</span>
                  </h3>

                  <form onSubmit={handleAddBanner} className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-[#64748B] mb-1 block">Banner Title</label>
                      <input
                        type="text"
                        value={newBannerTitle}
                        onChange={(e) => setNewBannerTitle(e.target.value)}
                        placeholder="e.g. Festive discount offer"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-[#0D47A1] transition-all"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-[#64748B] mb-1 block">Choose Image *</label>
                      <div className="border-2 border-dashed border-slate-200 rounded-lg p-3 bg-slate-50 flex flex-col items-center text-center gap-2">
                        <input 
                          id="banner-file-input-sub"
                          type="file" 
                          accept="image/*"
                          onChange={handleBannerFileChange}
                          className="hidden"
                          required
                        />
                        <label 
                          htmlFor="banner-file-input-sub"
                          className="bg-white border border-slate-200 px-3.5 py-1.5 rounded-lg text-[10px] font-bold text-[#0D47A1] cursor-pointer hover:bg-slate-50 transition-colors shadow-2xs"
                        >
                          Browse Image
                        </label>
                        <span className="text-[9px] text-slate-400 font-medium">Supports PNG, JPG, JPEG</span>
                      </div>
                    </div>

                    {newBannerFile && (
                      <div>
                        <span className="text-[10px] font-semibold text-[#64748B] mb-1 block">Selected Preview:</span>
                        <img 
                          src={newBannerFile} 
                          alt="Preview" 
                          className="w-full h-24 object-cover border border-slate-200 rounded-xl"
                        />
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={!newBannerFile}
                      className="w-full bg-[#0D47A1] hover:bg-blue-800 text-white font-semibold py-2.5 rounded-lg text-xs transition-all shadow-sm cursor-pointer disabled:opacity-50"
                    >
                      Publish Banner
                    </button>
                  </form>
                </div>

                {/* Banners List */}
                <div className="lg:col-span-2 space-y-4">
                  <h3 className="text-xs font-bold text-[#1E293B] uppercase tracking-wider">
                    Current Active Banners ({currentBanners.length})
                  </h3>

                  {currentBanners.length === 0 ? (
                    <div className="bg-white border border-[#E2E8F0] rounded-2xl p-8 text-center text-slate-400 font-medium text-xs">
                      No banners uploaded for this category tab yet. Upload one on the left panel!
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {currentBanners.map((banner, index) => (
                        <div 
                          key={banner.id} 
                          className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-2xs flex flex-col group"
                        >
                          <div className="h-32 w-full relative">
                            <img 
                              src={banner.image} 
                              alt={banner.title} 
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute top-2 left-2 bg-slate-900/60 text-white px-2 py-0.5 rounded-full text-[9px] font-bold">
                              Position {index + 1}
                            </div>
                          </div>
                          <div className="p-3.5 flex justify-between items-center bg-slate-50/50">
                            <div className="min-w-0 flex-1">
                              <span className="text-[10px] text-slate-400 font-bold block">Title</span>
                              <span className="text-xs font-bold text-slate-800 truncate block mt-0.5">{banner.title || 'Untitled Banner'}</span>
                            </div>
                            <button
                              onClick={() => handleDeleteBanner(banner.id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-2"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ---------------- SUBSECTION 3: SERVICES CUSTOMIZATION ---------------- */}
          {activeSubSection === 'services' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Services Header Card */}
              <div className="flex flex-wrap justify-between items-center bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#0D47A1]">
                      <Package size={18} />
                    </div>
                    <h2 className="text-base font-extrabold text-slate-900 tracking-tight">Dashboard Services Listing</h2>
                    <span className="bg-blue-50 border border-blue-100 text-[#0D47A1] text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      {services.length} Active Services
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium pl-10">
                    Manage the primary service catalog grid displayed under 'Our Services' on the customer app dashboard.
                  </p>
                </div>

                <div className="flex gap-2.5 items-center">
                  <button 
                    onClick={handleResetServices}
                    className="bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                  >
                    <RotateCcw size={14} className="text-slate-500" /> Reset Defaults
                  </button>
                  <button 
                    onClick={handleOpenAddService}
                    className="bg-[#0D47A1] hover:bg-blue-800 text-white px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-98"
                  >
                    <Plus size={15} /> Add Service
                  </button>
                </div>
              </div>

              {/* Services Table Container */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider text-[10.5px] border-b border-slate-200/80">
                        <th className="px-6 py-3.5 w-16">#</th>
                        <th className="px-6 py-3.5">Service Name</th>
                        <th className="px-6 py-3.5">Image Preview</th>
                        <th className="px-6 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {services.map((srv, idx) => (
                        <tr key={srv.id || idx} className="hover:bg-slate-50/80 transition-colors group">
                          <td className="px-6 py-4 font-extrabold text-slate-400 font-mono text-xs">{idx + 1}</td>
                          
                          <td className="px-6 py-4 font-bold text-slate-900 text-sm">
                            <span className="group-hover:text-[#0D47A1] transition-colors">{srv.name}</span>
                          </td>

                          <td className="px-6 py-4">
                            {srv.img ? (
                              <img src={srv.img} alt={srv.name} className="w-11 h-11 object-contain border border-slate-200/80 rounded-xl p-1 bg-slate-50 shadow-2xs group-hover:scale-105 transition-transform" />
                            ) : (
                              <span className="text-slate-400 text-xs italic">No image uploaded</span>
                            )}
                          </td>

                          <td className="px-6 py-4 text-right">
                            <div className="flex gap-2 justify-end items-center">
                              <button 
                                onClick={() => handleOpenEditService(idx)}
                                className="p-2 text-slate-500 hover:text-[#0D47A1] hover:bg-blue-50 rounded-xl transition-all cursor-pointer"
                                title="Edit Service Details"
                              >
                                <Edit2 size={15} />
                              </button>
                              <button 
                                onClick={() => handleDeleteService(idx)}
                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                                title="Delete Service"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Edit/Add Service Modal Overlay */}
      {showServiceModal && (
        <div className="fixed inset-0 bg-[#052355]/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl border border-slate-100 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh]">
            <div className="flex justify-between items-center flex-shrink-0">
              <h3 className="text-base font-bold text-[#1E293B]">{isEditingService ? 'Edit Service & Details Page' : 'Add New Service & Details Page'}</h3>
              <button onClick={() => setShowServiceModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>
            
            <form onSubmit={handleSaveService} className="space-y-4 overflow-y-auto pr-1 flex-1 max-h-[75vh] no-scrollbar">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-150 space-y-3">
                <span className="text-[10px] font-bold text-[#0D47A1] uppercase tracking-wider block">1. Dashboard Listing Details</span>
                <div>
                  <label className="text-xs font-semibold text-[#64748B] mb-1 block">Service Name *</label>
                  <input 
                    type="text" 
                    value={serviceForm.name}
                    onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
                    placeholder="e.g. Chimney Cleaning"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-[#0D47A1] transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#64748B] mb-1 block">Dashboard Grid Image *</label>
                  <div className="flex items-center gap-3 bg-white border border-dashed border-slate-200 rounded-lg p-2">
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleServiceFileChange}
                      className="w-full text-xs text-slate-500 file:mr-3 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-[10px] file:font-semibold file:bg-blue-50 file:text-[#0D47A1] hover:file:bg-blue-100 cursor-pointer"
                      required={!isEditingService}
                    />
                    {serviceForm.img && (
                      <img src={serviceForm.img} alt="Preview" className="w-10 h-10 object-contain border border-slate-200 rounded-md p-0.5 bg-white flex-shrink-0" />
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100 space-y-3">
                <span className="text-[10px] font-bold text-[#0D47A1] uppercase tracking-wider block">2. Details Page Hero Header</span>
                
                <div>
                  <label className="text-xs font-semibold text-[#64748B] mb-1 block">Hero Tagline</label>
                  <input 
                    type="text" 
                    value={serviceForm.tagline}
                    onChange={(e) => setServiceForm({ ...serviceForm, tagline: e.target.value })}
                    placeholder="e.g. Cool Again Today"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-[#0D47A1] transition-all"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#64748B] mb-1 block">Hero Subtitle</label>
                  <input 
                    type="text" 
                    value={serviceForm.subtitle}
                    onChange={(e) => setServiceForm({ ...serviceForm, subtitle: e.target.value })}
                    placeholder="e.g. Certified AC Technicians For All Brands"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-[#0D47A1] transition-all"
                  />
                </div>

              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-150 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-[#0D47A1] uppercase tracking-wider">3. Device Types / Options (Optional)</span>
                  <button
                    type="button"
                    onClick={() => setServiceTypes([...serviceTypes, ''])}
                    className="bg-white border border-slate-200 text-[#0D47A1] px-2.5 py-1 rounded-md text-[10px] font-extrabold shadow-2xs hover:bg-slate-50 transition-all"
                  >
                    + Add Type
                  </button>
                </div>
                <span className="text-[9px] text-slate-400 font-medium block">Add options if this device has selection types (e.g. Split AC, Window AC). Otherwise leave empty.</span>
                
                {serviceTypes.length > 0 ? (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {serviceTypes.map((type, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <input
                          type="text"
                          value={type}
                          onChange={(e) => setServiceTypes(serviceTypes.map((t, tIdx) => tIdx === idx ? e.target.value : t))}
                          placeholder="e.g. Split AC"
                          className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-[#0D47A1] transition-all"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setServiceTypes(serviceTypes.filter((_, tIdx) => tIdx !== idx))}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[10px] text-slate-400 italic bg-white border border-slate-100 rounded-lg p-2 text-center">
                    No custom types defined (field is optional).
                  </div>
                )}
              </div>

              <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-[#0D47A1] uppercase tracking-wider font-sans">4. Services & Packages List *</span>
                  <button
                    type="button"
                    onClick={() => setServicePackages([...servicePackages, { id: Date.now() + Math.random(), section: 'General Repair', name: '', price: '', bullets: '' }])}
                    className="bg-white border border-blue-200 text-[#0D47A1] px-2.5 py-1 rounded-md text-[10px] font-extrabold shadow-2xs hover:bg-slate-50 transition-all"
                  >
                    + Add Package
                  </button>
                </div>
                <span className="text-[9px] text-slate-400 font-medium block">Add pricing packages. Bullets should be comma-separated.</span>
                
                {servicePackages.length > 0 ? (
                  <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                    {servicePackages.map((pkg, idx) => (
                      <div key={pkg.id || idx} className="bg-white border border-slate-200 rounded-xl p-3 space-y-2.5 relative group shadow-2xs">
                        <button
                          type="button"
                          onClick={() => setServicePackages(servicePackages.filter(p => p.id !== pkg.id))}
                          className="absolute top-2 right-2 p-1 text-slate-400 hover:text-red-600 rounded-lg transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 block mb-0.5">Section Name *</label>
                            <input
                              type="text"
                              value={pkg.section}
                              onChange={(e) => setServicePackages(servicePackages.map(p => p.id === pkg.id ? { ...p, section: e.target.value } : p))}
                              placeholder="e.g. Installation Services"
                              className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs outline-none focus:border-[#0D47A1] transition-all"
                              required
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 block mb-0.5">Package/Service Name *</label>
                            <input
                              type="text"
                              value={pkg.name}
                              onChange={(e) => setServicePackages(servicePackages.map(p => p.id === pkg.id ? { ...p, name: e.target.value } : p))}
                              placeholder="e.g. Split AC Installation"
                              className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs outline-none focus:border-[#0D47A1] transition-all"
                              required
                            />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 block mb-0.5">Price (₹) *</label>
                            <input
                              type="text"
                              value={pkg.price === 0 || pkg.price === '0' ? '' : (pkg.price ?? '')}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => {
                                const val = e.target.value;
                                setServicePackages(servicePackages.map(p => p.id === pkg.id ? { ...p, price: val === '0' ? '' : val } : p));
                              }}
                              placeholder="e.g. 299"
                              className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs outline-none focus:border-[#0D47A1] transition-all"
                              required
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 block mb-0.5">Price Unit *</label>
                            <input
                              type="text"
                              value={pkg.unit || 'per unit'}
                              onChange={(e) => setServicePackages(servicePackages.map(p => p.id === pkg.id ? { ...p, unit: e.target.value } : p))}
                              placeholder="e.g. per AC, per visit"
                              className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs outline-none focus:border-[#0D47A1] transition-all"
                              required
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 block mb-0.5">Upload Icon Image *</label>
                            <div className="flex items-center gap-1.5 bg-slate-50 border border-dashed border-slate-200 rounded-md p-1">
                              <input 
                                type="file" 
                                accept="image/*"
                                onChange={(e) => handlePackageIconChange(pkg.id, e)}
                                className="w-full text-[10px] text-slate-500 file:mr-2 file:py-0.5 file:px-1.5 file:rounded file:border-0 file:text-[9px] file:font-semibold file:bg-blue-50 file:text-[#0D47A1] hover:file:bg-blue-100 cursor-pointer"
                              />
                              {pkg.icon && (
                                <div className="w-6 h-6 flex-shrink-0 bg-white border border-slate-200 rounded-md flex items-center justify-center overflow-hidden">
                                  {pkg.icon.startsWith('data:image/') ? (
                                    <img src={pkg.icon} alt="" className="w-full h-full object-contain" />
                                  ) : (
                                    <span className="text-[11px]">{pkg.icon}</span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div className="col-span-1">
                            <label className="text-[9px] font-bold text-slate-400 block mb-0.5">Short Description</label>
                            <input
                              type="text"
                              value={pkg.desc || ''}
                              onChange={(e) => setServicePackages(servicePackages.map(p => p.id === pkg.id ? { ...p, desc: e.target.value } : p))}
                              placeholder="e.g. New AC fitting & setup"
                              className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs outline-none focus:border-[#0D47A1] transition-all"
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="text-[9px] font-bold text-slate-400 block mb-0.5">Description Bullets (Comma-separated)</label>
                            <input
                              type="text"
                              value={pkg.bullets}
                              onChange={(e) => setServicePackages(servicePackages.map(p => p.id === pkg.id ? { ...p, bullets: e.target.value } : p))}
                              placeholder="e.g. 30 days warranty, gas leak check"
                              className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs outline-none focus:border-[#0D47A1] transition-all"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[10px] text-red-500 italic bg-red-50 border border-red-100 rounded-lg p-3 text-center font-semibold">
                    Please add at least one service package.
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2 bg-white sticky bottom-0 z-10">
                <button 
                  type="button"
                  onClick={() => setShowServiceModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 rounded-lg text-xs transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={servicePackages.length === 0}
                  className="flex-1 bg-[#0D47A1] hover:bg-blue-800 text-white font-semibold py-2.5 rounded-lg text-xs transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save Service Details
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit/Add Category Modal Overlay */}
      {showAddModal && (
        <div className="fixed inset-0 bg-[#052355]/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl border border-slate-100 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh]">
            <div className="flex justify-between items-center flex-shrink-0">
              <div>
                <h3 className="text-base font-black text-slate-900">{isEditing ? 'Edit Category' : 'Add New Category'}</h3>
                <p className="text-xs font-medium text-slate-500 mt-0.5">Configure category icon, brands, and booking service packages.</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 font-bold transition-colors">✕</button>
            </div>
            
            <form 
              onSubmit={handleSaveCategory} 
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.target.tagName === 'INPUT') {
                  e.preventDefault();
                }
              }}
              className="space-y-4 overflow-y-auto pr-1 flex-1 max-h-[75vh] no-scrollbar text-left"
            >
              {/* 1. Basic Details */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                <span className="text-[10px] font-black text-[#0D47A1] uppercase tracking-wider block">1. Basic Details</span>
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">Category Name *</label>
                  <input 
                    type="text" 
                    value={categoryForm.name}
                    onChange={(e) => {
                      const newName = e.target.value;
                      const detected = detectIconFromName(newName);
                      setCategoryForm(prev => ({
                        ...prev,
                        name: newName,
                        icon: (!isEditing && detected && iconMode === 'preset') ? detected : (prev.icon || 'ac')
                      }));
                    }}
                    placeholder="e.g. Microwave, Chimney"
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-[#0D47A1] transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1.5 block">Category Icon *</label>
                  <div className="flex gap-4 mb-2">
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
                      <input 
                        type="radio" 
                        name="iconSource" 
                        checked={iconMode === 'preset'} 
                        onChange={() => {
                          setIconMode('preset');
                          setShowIconPicker(true);
                          if (categoryForm.icon && categoryForm.icon.startsWith('data:image/')) {
                            setCategoryForm(prev => ({ ...prev, icon: 'ac' }));
                          }
                        }}
                      />
                      <span>Built-in Icon</span>
                    </label>
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
                      <input 
                        type="radio" 
                        name="iconSource" 
                        checked={iconMode === 'upload'} 
                        onChange={() => {
                          setIconMode('upload');
                        }}
                      />
                      <span>Upload Image</span>
                    </label>
                  </div>

                  {iconMode === 'preset' ? (
                    !showIconPicker && categoryForm.icon ? (
                      <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center">
                            <CategoryVectorIcon iconKey={categoryForm.icon} className="w-6 h-6 text-[#0D47A1]" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-slate-800 block">
                              {AVAILABLE_ICONS.find(i => i.id === categoryForm.icon)?.label || categoryForm.icon}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium block">Selected Built-in Icon</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowIconPicker(true)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                        >
                          Change Icon
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center px-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Choose Icon</span>
                          <button
                            type="button"
                            onClick={() => setShowIconPicker(false)}
                            className="text-xs text-[#0D47A1] font-bold hover:underline cursor-pointer"
                          >
                            Close Grid ✕
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2.5 pt-1 bg-white p-3 border border-slate-200 rounded-2xl">
                          {AVAILABLE_ICONS.map((ico) => {
                            const isSelected = categoryForm.icon === ico.id;
                            return (
                              <button
                                key={ico.id}
                                type="button"
                                onClick={() => {
                                  setCategoryForm({ ...categoryForm, icon: ico.id });
                                  setShowIconPicker(false);
                                }}
                                className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
                                  isSelected 
                                    ? 'bg-blue-50 border-2 border-[#0D47A1] shadow-xs scale-105' 
                                    : 'bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                                }`}
                                title={ico.label}
                              >
                                <CategoryVectorIcon iconKey={ico.id} className={`w-6 h-6 ${isSelected ? 'text-[#0D47A1]' : 'text-slate-500'}`} />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )
                  ) : (
                    <div className="flex items-center gap-3 bg-white border border-dashed border-slate-200 rounded-xl p-3">
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={handleCategoryFileChange}
                        className="w-full text-xs text-slate-500 file:mr-3 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-[10px] file:font-semibold file:bg-blue-50 file:text-[#0D47A1] hover:file:bg-blue-100 cursor-pointer"
                        required={!categoryForm.icon || !categoryForm.icon.startsWith('data:image/')}
                      />
                      {categoryForm.icon && categoryForm.icon.startsWith('data:image/') && (
                        <img src={categoryForm.icon} alt="Preview" className="w-9 h-9 object-contain border border-slate-200 rounded-xl p-0.5 bg-white flex-shrink-0 shadow-2xs" />
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* 2. Supported Options & Brands */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                <span className="text-[10px] font-black text-[#0D47A1] uppercase tracking-wider block">2. Booking Options & Brands</span>

                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">Supported Brands (Comma separated)</label>
                  <input 
                    type="text" 
                    value={categoryForm.brands}
                    onChange={(e) => setCategoryForm({ ...categoryForm, brands: e.target.value })}
                    placeholder="e.g. Voltas, LG, Samsung, Whirlpool"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-[#0D47A1] transition-all"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">Appliance Types (Optional - Comma separated)</label>
                  <input 
                    type="text" 
                    value={categoryForm.productTypes}
                    onChange={(e) => setCategoryForm({ ...categoryForm, productTypes: e.target.value })}
                    placeholder="e.g. Split AC, Window AC, Cassette AC"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-[#0D47A1] transition-all"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">Price Note / Disclaimer</label>
                  <input 
                    type="text" 
                    value={categoryForm.categoryNote}
                    onChange={(e) => setCategoryForm({ ...categoryForm, categoryNote: e.target.value })}
                    placeholder="e.g. Prices shown are indicative. Exact charges confirmed after inspection."
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-[#0D47A1] transition-all"
                  />
                </div>
              </div>

              {/* 3. Booking Services Builder */}
              <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100/80 space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-[10px] font-black text-[#0D47A1] uppercase tracking-wider block font-sans">3. Booking Services & Pricing *</span>
                    <span className="text-[10px] text-slate-500 font-medium mt-0.5 block">Add services customers can book in this category.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      let currentList = [];
                      try { currentList = JSON.parse(categoryForm.servicesJson); } catch(_e) { /* ignore parse error */ }
                      if (!Array.isArray(currentList)) currentList = [];
                      currentList.push({
                        id: `service_${Date.now()}`,
                        name: '',
                        price: 299,
                        icon: '🔧',
                        desc: ''
                      });
                      setCategoryForm({ ...categoryForm, servicesJson: JSON.stringify(currentList, null, 2) });
                    }}
                    className="bg-[#0D47A1] hover:bg-blue-800 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-1"
                  >
                    <Plus size={13} /> Add Service Option
                  </button>
                </div>

                {/* Visual Service Items List */}
                {(() => {
                  let parsed = [];
                  try { parsed = JSON.parse(categoryForm.servicesJson); } catch(_e) { /* ignore parse error */ }
                  if (!Array.isArray(parsed)) parsed = [];

                  if (parsed.length === 0) {
                    return (
                      <div className="bg-white border border-slate-200 rounded-xl p-4 text-center text-xs text-slate-500 font-semibold">
                        No services added yet. Click "+ Add Service Option" above.
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                      {parsed.map((item, idx) => (
                        <div key={idx} className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs flex flex-col gap-2 relative">
                          <button
                            type="button"
                            onClick={() => {
                              const updated = parsed.filter((_, i) => i !== idx);
                              setCategoryForm({ ...categoryForm, servicesJson: JSON.stringify(updated, null, 2) });
                            }}
                            className="absolute top-2.5 right-2.5 p-1 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                          
                          <div className="grid grid-cols-12 gap-2 pr-6">
                            <div className="col-span-5 sm:col-span-4">
                              <label className="text-[9px] font-bold text-slate-400 block mb-0.5">Icon / Image</label>
                              {item.icon && (item.icon.startsWith('data:image/') || item.icon.startsWith('http')) ? (
                                <div className="flex items-center gap-1.5 h-7">
                                  <img src={item.icon} alt="Icon" className="w-7 h-7 object-contain border border-slate-200 rounded-md p-0.5 bg-white shadow-2xs flex-shrink-0" />
                                  <label className="text-[10px] text-[#0D47A1] font-bold hover:underline cursor-pointer">
                                    Change
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={(e) => {
                                        const file = e.target.files[0];
                                        if (file) {
                                          const reader = new FileReader();
                                          reader.onloadend = () => {
                                            parsed[idx].icon = reader.result;
                                            setCategoryForm({ ...categoryForm, servicesJson: JSON.stringify(parsed, null, 2) });
                                          };
                                          reader.readAsDataURL(file);
                                        }
                                      }}
                                    />
                                  </label>
                                  <button 
                                    type="button" 
                                    onClick={() => {
                                      parsed[idx].icon = '🔧';
                                      setCategoryForm({ ...categoryForm, servicesJson: JSON.stringify(parsed, null, 2) });
                                    }}
                                    className="text-[10px] text-rose-500 font-extrabold hover:underline"
                                    title="Reset to default emoji icon"
                                  >
                                    Reset
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 h-7">
                                  <input 
                                    type="text"
                                    value={item.icon || '🔧'}
                                    onChange={(e) => {
                                      parsed[idx].icon = e.target.value;
                                      setCategoryForm({ ...categoryForm, servicesJson: JSON.stringify(parsed, null, 2) });
                                    }}
                                    placeholder="🔧"
                                    className="w-8 px-1 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs font-semibold text-center outline-none focus:border-[#0D47A1]"
                                  />
                                  <label className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded-md text-[10px] font-bold cursor-pointer transition-colors flex items-center gap-1">
                                    <Image size={11} />
                                    Upload
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={(e) => {
                                        const file = e.target.files[0];
                                        if (file) {
                                          const reader = new FileReader();
                                          reader.onloadend = () => {
                                            parsed[idx].icon = reader.result;
                                            setCategoryForm({ ...categoryForm, servicesJson: JSON.stringify(parsed, null, 2) });
                                          };
                                          reader.readAsDataURL(file);
                                        }
                                      }}
                                    />
                                  </label>
                                </div>
                              )}
                            </div>
                            <div className="col-span-7 sm:col-span-5">
                              <label className="text-[9px] font-bold text-slate-400 block mb-0.5">Service Name *</label>
                              <input 
                                type="text"
                                value={item.name || ''}
                                onChange={(e) => {
                                  parsed[idx].name = e.target.value;
                                  if (!parsed[idx].id) parsed[idx].id = (e.target.value || '').toLowerCase().replace(/\s+/g, '_');
                                  setCategoryForm({ ...categoryForm, servicesJson: JSON.stringify(parsed, null, 2) });
                                }}
                                placeholder="e.g. Repair & Fix"
                                className="w-full px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-[#0D47A1]"
                                required
                              />
                            </div>
                            <div className="col-span-12 sm:col-span-3">
                              <label className="text-[9px] font-bold text-slate-400 block mb-0.5">Price (₹) *</label>
                              <input 
                                type="number"
                                value={item.price === 0 || item.price === '0' ? '' : (item.price ?? '')}
                                onFocus={(e) => e.target.select()}
                                onChange={(e) => {
                                  const raw = e.target.value;
                                  parsed[idx].price = raw === '' ? '' : Number(raw);
                                  setCategoryForm({ ...categoryForm, servicesJson: JSON.stringify(parsed, null, 2) });
                                }}
                                placeholder="299"
                                className="w-full px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-extrabold outline-none focus:border-[#0D47A1]"
                                required
                              />
                            </div>
                          </div>

                          <div>
                            <input 
                              type="text"
                              value={item.desc || ''}
                              onChange={(e) => {
                                parsed[idx].desc = e.target.value;
                                setCategoryForm({ ...categoryForm, servicesJson: JSON.stringify(parsed, null, 2) });
                              }}
                              placeholder="Short description (e.g. Fix breakdowns & issues)"
                              className="w-full px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-medium text-slate-600 outline-none focus:border-[#0D47A1]"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {/* Advanced Mode Section - Open automatically */}
                <details open className="mt-2 text-xs">
                  <summary className="cursor-pointer text-[10px] font-extrabold text-[#0D47A1] hover:underline">
                    ⚙️ Advanced Options & Technical Flags
                  </summary>
                  <div className="mt-3 space-y-3 p-3 bg-white rounded-xl border border-slate-200">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 mb-1 block">Direct Details Page Link (Optional)</label>
                      <input 
                        type="text" 
                        value={categoryForm.service}
                        onChange={(e) => setCategoryForm({ ...categoryForm, service: e.target.value })}
                        placeholder="e.g. Smart TV Service & Repair"
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-[#0D47A1]"
                      />
                    </div>
                    <div className="flex flex-wrap gap-4 pt-1">
                      <label className="flex items-center gap-1.5 text-xs text-slate-700 font-semibold cursor-pointer">
                        <input 
                          type="checkbox"
                          checked={categoryForm.isForYou}
                          onChange={(e) => setCategoryForm({ ...categoryForm, isForYou: e.target.checked })}
                        />
                        <span>"For You" Feed</span>
                      </label>
                      <label className="flex items-center gap-1.5 text-xs text-slate-700 font-semibold cursor-pointer">
                        <input 
                          type="checkbox"
                          checked={categoryForm.isMore}
                          onChange={(e) => setCategoryForm({ ...categoryForm, isMore: e.target.checked })}
                        />
                        <span>"More" Link</span>
                      </label>
                      <label className="flex items-center gap-1.5 text-xs text-slate-700 font-semibold cursor-pointer">
                        <input 
                          type="checkbox"
                          checked={categoryForm.isFridge}
                          onChange={(e) => setCategoryForm({ ...categoryForm, isFridge: e.target.checked })}
                        />
                        <span>Refrigerator Specific</span>
                      </label>
                    </div>
                  </div>
                </details>
              </div>

              <div className="flex gap-3 pt-2 bg-white sticky bottom-0 z-10">
                <button 
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 bg-[#0D47A1] hover:bg-blue-800 text-white font-bold py-2.5 rounded-xl text-xs transition-all shadow-sm cursor-pointer"
                >
                  Save Category & Settings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit/Add Brand Offer Modal Overlay */}
      {showBrandModal && (
        <div className="fixed inset-0 bg-[#052355]/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl border border-slate-100 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh]">
            <div className="flex justify-between items-center flex-shrink-0">
              <h3 className="text-base font-bold text-[#1E293B]">{isEditingBrand ? 'Edit Brand Offer Card' : 'Add New Brand Offer Card'}</h3>
              <button onClick={() => setShowBrandModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>
            
            <form onSubmit={handleSaveBrand} className="space-y-4 overflow-y-auto pr-1 flex-1 max-h-[75vh] no-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-[#64748B] mb-1 block">Brand Name *</label>
                  <input 
                    type="text" 
                    value={brandForm.brandName}
                    onChange={(e) => setBrandForm({ ...brandForm, brandName: e.target.value })}
                    placeholder="e.g. LLOYD, SAMSUNG"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-[#0D47A1] transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#64748B] mb-1 block">Badge Text (Optional)</label>
                  <input 
                    type="text" 
                    value={brandForm.badgeText}
                    onChange={(e) => setBrandForm({ ...brandForm, badgeText: e.target.value })}
                    placeholder="e.g. Official Partner, New Launch"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-[#0D47A1] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#64748B] mb-1 block">Tagline / Title *</label>
                <input 
                  type="text" 
                  value={brandForm.title}
                  onChange={(e) => setBrandForm({ ...brandForm, title: e.target.value })}
                  placeholder="e.g. New Launch Glacier Series AC"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-[#0D47A1] transition-all"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#64748B] mb-1 block">Subtitle *</label>
                <input 
                  type="text" 
                  value={brandForm.subtitle}
                  onChange={(e) => setBrandForm({ ...brandForm, subtitle: e.target.value })}
                  placeholder="e.g. Experience Superior Cooling & Comfort"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-[#0D47A1] transition-all"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-[#64748B] mb-1 block">Button Text *</label>
                  <input 
                    type="text" 
                    value={brandForm.buttonText}
                    onChange={(e) => setBrandForm({ ...brandForm, buttonText: e.target.value })}
                    placeholder="e.g. Explore on NCC, Visit Official Site"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-[#0D47A1] transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#64748B] mb-1 block">Action URL / Path *</label>
                  <input 
                    type="text" 
                    value={brandForm.actionUrl}
                    onChange={(e) => setBrandForm({ ...brandForm, actionUrl: e.target.value })}
                    placeholder="e.g. /service-details?service=AC%20Repair"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-[#0D47A1] transition-all"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-[#64748B] mb-1 block">Background Gradient Theme</label>
                  <select
                    value={brandForm.gradient}
                    onChange={(e) => {
                      const val = e.target.value;
                      let txt = '#0D47A1';
                      if (val.includes('E8F5E9')) txt = '#1B5E20';
                      if (val.includes('FCE4EC')) txt = '#C30F42';
                      setBrandForm({ ...brandForm, gradient: val, textColor: txt });
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-[#0D47A1] bg-white transition-all"
                  >
                    <option value="from-[#E3F2FD] via-[#F4F9FF] to-[#D5E6FF]">Blue (Lloyd Style)</option>
                    <option value="from-[#E8F5E9] via-[#F6FAF6] to-[#D2E8D4]">Green (Samsung Style)</option>
                    <option value="from-[#F0F4FF] via-[#F7F9FF] to-[#E1E8FF]">Indigo (Daikin Style)</option>
                    <option value="from-[#FCE4EC] via-[#FFF1F3] to-[#F8BBD0]">Pink/Red (LG Style)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#64748B] mb-1 block">Upload Appliance Image *</label>
                  <div className="flex items-center gap-3 bg-white border border-dashed border-slate-200 rounded-lg p-1.5">
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleBrandFileChange}
                      className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[9.5px] file:font-semibold file:bg-blue-50 file:text-[#0D47A1] hover:file:bg-blue-100 cursor-pointer"
                    />
                    {brandForm.image && (
                      <img src={brandForm.image} alt="Preview" className="w-10 h-8 object-contain border border-slate-200 rounded-md bg-white flex-shrink-0" />
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2 bg-white sticky bottom-0 z-10">
                <button 
                  type="button"
                  onClick={() => setShowBrandModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 rounded-lg text-xs transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 bg-[#0D47A1] hover:bg-blue-800 text-white font-semibold py-2.5 rounded-lg text-xs transition-all shadow-sm"
                >
                  Save Brand Card
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit/Add Most Booked Modal Overlay */}
      {showMostBookedModal && (
        <div className="fixed inset-0 bg-[#052355]/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl border border-slate-100 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh]">
            <div className="flex justify-between items-center flex-shrink-0">
              <h3 className="text-base font-bold text-[#1E293B]">{isEditingMostBooked ? 'Edit Most Booked Service' : 'Add Most Booked Service'}</h3>
              <button onClick={() => setShowMostBookedModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>
            
            <form onSubmit={handleSaveMostBooked} className="space-y-4 overflow-y-auto pr-1 flex-1 max-h-[75vh] no-scrollbar">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-150 space-y-3">
                <span className="text-[10px] font-bold text-[#0D47A1] uppercase tracking-wider block font-sans">1. Card View Customization</span>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-[#64748B] mb-1 block">Service Title *</label>
                    <input 
                      type="text" 
                      value={mostBookedForm.title}
                      onChange={(e) => setMostBookedForm({ ...mostBookedForm, title: e.target.value })}
                      placeholder="e.g. Foam-jet AC service"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-[#0D47A1] transition-all"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#64748B] mb-1 block">Badge (e.g. Instant, 2 ACs)</label>
                    <input 
                      type="text" 
                      value={mostBookedForm.badge}
                      onChange={(e) => setMostBookedForm({ ...mostBookedForm, badge: e.target.value })}
                      placeholder="e.g. Instant"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-[#0D47A1] transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#64748B] mb-1 block">Start Price (₹) *</label>
                  <input 
                    type="text" 
                    value={mostBookedForm.price}
                    onChange={(e) => setMostBookedForm({ ...mostBookedForm, price: e.target.value })}
                    placeholder="e.g. 649"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-[#0D47A1] transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#64748B] mb-1 block">Upload Card Image *</label>
                  <div className="flex items-center gap-3 bg-white border border-dashed border-slate-200 rounded-lg p-1.5">
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleMostBookedFileChange}
                      className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[9.5px] file:font-semibold file:bg-blue-50 file:text-[#0D47A1] hover:file:bg-blue-100 cursor-pointer"
                    />
                    {mostBookedForm.image && (
                      <img src={mostBookedForm.image} alt="Preview" className="w-10 h-8 object-cover border border-slate-200 rounded-md bg-white flex-shrink-0" />
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100 space-y-3">
                <span className="text-[10px] font-bold text-[#0D47A1] uppercase tracking-wider block font-sans">2. Checkout Booking Flow Settings</span>
                
                <div>
                  <label className="text-xs font-semibold text-[#64748B] mb-1 block">Device Types (Optional - Comma separated)</label>
                  <input 
                    type="text" 
                    value={mostBookedTypes.join(', ')}
                    onChange={(e) => setMostBookedTypes(e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
                    placeholder="e.g. Split AC, Window AC, Cassette AC"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-[#0D47A1] transition-all"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">Leave blank if this device does not have sub-types (e.g. Full Home Cleaning).</p>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-150 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-[#0D47A1] uppercase tracking-wider">3. Services & Packages List *</span>
                  <button
                    type="button"
                    onClick={() => setMostBookedPackages([...mostBookedPackages, { id: Date.now(), section: 'General Services', name: '', price: '', bullets: '', icon: '🔧', desc: '', unit: 'per unit' }])}
                    className="bg-white hover:bg-slate-50 text-[#0D47A1] border border-slate-200 px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all"
                  >
                    + Add Package
                  </button>
                </div>

                {mostBookedPackages.length > 0 ? (
                  <div className="space-y-4 max-h-[30vh] overflow-y-auto pr-1">
                    {mostBookedPackages.map((pkg) => (
                      <div key={pkg.id} className="bg-white border border-slate-200 rounded-xl p-3 space-y-2.5 relative shadow-2xs">
                        <button
                          type="button"
                          onClick={() => setMostBookedPackages(mostBookedPackages.filter(p => p.id !== pkg.id))}
                          className="absolute top-2 right-2 p-1 text-slate-400 hover:text-red-600 rounded-lg transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 block mb-0.5">Section Name *</label>
                            <input
                              type="text"
                              value={pkg.section}
                              onChange={(e) => setMostBookedPackages(mostBookedPackages.map(p => p.id === pkg.id ? { ...p, section: e.target.value } : p))}
                              placeholder="e.g. Installation Services"
                              className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs outline-none focus:border-[#0D47A1] transition-all"
                              required
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 block mb-0.5">Package/Service Name *</label>
                            <input
                              type="text"
                              value={pkg.name}
                              onChange={(e) => setMostBookedPackages(mostBookedPackages.map(p => p.id === pkg.id ? { ...p, name: e.target.value } : p))}
                              placeholder="e.g. Split AC Installation"
                              className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs outline-none focus:border-[#0D47A1] transition-all"
                              required
                            />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 block mb-0.5">Price (₹) *</label>
                            <input
                              type="text"
                              value={pkg.price}
                              onChange={(e) => setMostBookedPackages(mostBookedPackages.map(p => p.id === pkg.id ? { ...p, price: e.target.value } : p))}
                              placeholder="e.g. 299"
                              className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs outline-none focus:border-[#0D47A1] transition-all"
                              required
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 block mb-0.5">Price Unit *</label>
                            <input
                              type="text"
                              value={pkg.unit || 'per unit'}
                              onChange={(e) => setMostBookedPackages(mostBookedPackages.map(p => p.id === pkg.id ? { ...p, unit: e.target.value } : p))}
                              placeholder="e.g. per AC, per visit"
                              className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs outline-none focus:border-[#0D47A1] transition-all"
                              required
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 block mb-0.5">Upload Icon Image *</label>
                            <div className="flex items-center gap-1.5 bg-slate-50 border border-dashed border-slate-200 rounded-md p-1">
                              <input 
                                type="file" 
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                      setMostBookedPackages(prev => prev.map(p => p.id === pkg.id ? { ...p, icon: reader.result } : p));
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                                className="w-full text-[10px] text-slate-500 file:mr-2 file:py-0.5 file:px-1.5 file:rounded file:border-0 file:text-[9px] file:font-semibold file:bg-blue-50 file:text-[#0D47A1] hover:file:bg-blue-100 cursor-pointer"
                              />
                              {pkg.icon && (
                                <div className="w-6 h-6 flex-shrink-0 bg-white border border-slate-200 rounded-md flex items-center justify-center overflow-hidden">
                                  {pkg.icon.startsWith('data:image/') ? (
                                    <img src={pkg.icon} alt="" className="w-full h-full object-contain" />
                                  ) : (
                                    <span className="text-[11px]">{pkg.icon}</span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div className="col-span-1">
                            <label className="text-[9px] font-bold text-slate-400 block mb-0.5">Short Description</label>
                            <input
                              type="text"
                              value={pkg.desc || ''}
                              onChange={(e) => setMostBookedPackages(mostBookedPackages.map(p => p.id === pkg.id ? { ...p, desc: e.target.value } : p))}
                              placeholder="e.g. New AC fitting & setup"
                              className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs outline-none focus:border-[#0D47A1] transition-all"
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="text-[9px] font-bold text-slate-400 block mb-0.5">Description Bullets (Comma-separated)</label>
                            <input
                              type="text"
                              value={pkg.bullets}
                              onChange={(e) => setMostBookedPackages(mostBookedPackages.map(p => p.id === pkg.id ? { ...p, bullets: e.target.value } : p))}
                              placeholder="e.g. 30 days warranty, gas leak check"
                              className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs outline-none focus:border-[#0D47A1] transition-all"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[10px] text-red-500 italic bg-red-50 border border-red-100 rounded-lg p-3 text-center font-semibold">
                    Please add at least one service package.
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2 bg-white sticky bottom-0 z-10">
                <button 
                  type="button"
                  onClick={() => setShowMostBookedModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 rounded-lg text-xs transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={mostBookedPackages.length === 0}
                  className="flex-1 bg-[#0D47A1] hover:bg-blue-800 text-white font-semibold py-2.5 rounded-lg text-xs transition-all shadow-sm disabled:opacity-50"
                >
                  Save Service Card
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit/Add Appliance Service Modal Overlay */}
      {showApplianceModal && (
        <div className="fixed inset-0 bg-[#052355]/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl border border-slate-100 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh]">
            <div className="flex justify-between items-center flex-shrink-0">
              <h3 className="text-base font-bold text-[#1E293B]">{isEditingAppliance ? 'Edit Appliance Service Card' : 'Add Appliance Service Card'}</h3>
              <button onClick={() => setShowApplianceModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>
            
            <form onSubmit={handleSaveAppliance} className="space-y-4 overflow-y-auto pr-1 flex-1 max-h-[75vh] no-scrollbar">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-150 space-y-3">
                <span className="text-[10px] font-bold text-[#0D47A1] uppercase tracking-wider block font-sans">Card Details</span>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-[#64748B] mb-1 block">Appliance Title *</label>
                    <input 
                      type="text" 
                      value={applianceForm.title}
                      onChange={(e) => setApplianceForm({ ...applianceForm, title: e.target.value })}
                      placeholder="e.g. Refrigerator Repair & Service"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-[#0D47A1] transition-all"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#64748B] mb-1 block">Badge (e.g. Instant, 2 ACs)</label>
                    <input 
                      type="text" 
                      value={applianceForm.badge}
                      onChange={(e) => setApplianceForm({ ...applianceForm, badge: e.target.value })}
                      placeholder="e.g. Instant"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-[#0D47A1] transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#64748B] mb-1 block">Start Price (₹) *</label>
                  <input 
                    type="text" 
                    value={applianceForm.price}
                    onChange={(e) => setApplianceForm({ ...applianceForm, price: e.target.value })}
                    placeholder="e.g. 499"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-[#0D47A1] transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#64748B] mb-1 block">Action Path / Category Link *</label>
                  <input 
                    type="text" 
                    value={applianceForm.path}
                    onChange={(e) => setApplianceForm({ ...applianceForm, path: e.target.value })}
                    placeholder="e.g. /refrigerator-details or /book/Refrigerator"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-[#0D47A1] transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#64748B] mb-1 block">Upload Card Image *</label>
                  <div className="flex items-center gap-3 bg-white border border-dashed border-slate-200 rounded-lg p-1.5">
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleApplianceFileChange}
                      className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[9.5px] file:font-semibold file:bg-blue-50 file:text-[#0D47A1] hover:file:bg-blue-100 cursor-pointer"
                    />
                    {applianceForm.image && (
                      <img src={applianceForm.image} alt="Preview" className="w-10 h-8 object-contain border border-slate-200 rounded-md bg-white flex-shrink-0" />
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100 space-y-3">
                <span className="text-[10px] font-bold text-[#0D47A1] uppercase tracking-wider block font-sans">2. Checkout Booking Flow Settings</span>
                
                <div>
                  <label className="text-xs font-semibold text-[#64748B] mb-1 block">Device Types (Optional - Comma separated)</label>
                  <input 
                    type="text" 
                    value={applianceTypes.join(', ')}
                    onChange={(e) => setApplianceTypes(e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
                    placeholder="e.g. Split AC, Window AC, Cassette AC"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-[#0D47A1] transition-all"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">Leave blank if this device does not have sub-types (e.g. Full Home Cleaning).</p>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-150 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-[#0D47A1] uppercase tracking-wider">3. Services & Packages List *</span>
                  <button
                    type="button"
                    onClick={() => setAppliancePackages([...appliancePackages, { id: Date.now(), section: 'General Services', name: '', price: '', bullets: '', icon: '🔧', desc: '', unit: 'per unit' }])}
                    className="bg-white hover:bg-slate-50 text-[#0D47A1] border border-slate-200 px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all"
                  >
                    + Add Package
                  </button>
                </div>

                {appliancePackages.length > 0 ? (
                  <div className="space-y-4 max-h-[30vh] overflow-y-auto pr-1">
                    {appliancePackages.map((pkg) => (
                      <div key={pkg.id} className="bg-white border border-slate-200 rounded-xl p-3 space-y-2.5 relative shadow-2xs">
                        <button
                          type="button"
                          onClick={() => setAppliancePackages(appliancePackages.filter(p => p.id !== pkg.id))}
                          className="absolute top-2 right-2 p-1 text-slate-400 hover:text-red-600 rounded-lg transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 block mb-0.5">Section Name *</label>
                            <input
                              type="text"
                              value={pkg.section}
                              onChange={(e) => setAppliancePackages(appliancePackages.map(p => p.id === pkg.id ? { ...p, section: e.target.value } : p))}
                              placeholder="e.g. Installation Services"
                              className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs outline-none focus:border-[#0D47A1] transition-all"
                              required
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 block mb-0.5">Package/Service Name *</label>
                            <input
                              type="text"
                              value={pkg.name}
                              onChange={(e) => setAppliancePackages(appliancePackages.map(p => p.id === pkg.id ? { ...p, name: e.target.value } : p))}
                              placeholder="e.g. Split AC Installation"
                              className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs outline-none focus:border-[#0D47A1] transition-all"
                              required
                            />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 block mb-0.5">Price (₹) *</label>
                            <input
                              type="text"
                              value={pkg.price}
                              onChange={(e) => setAppliancePackages(appliancePackages.map(p => p.id === pkg.id ? { ...p, price: e.target.value } : p))}
                              placeholder="e.g. 299"
                              className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs outline-none focus:border-[#0D47A1] transition-all"
                              required
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 block mb-0.5">Price Unit *</label>
                            <input
                              type="text"
                              value={pkg.unit || 'per unit'}
                              onChange={(e) => setAppliancePackages(appliancePackages.map(p => p.id === pkg.id ? { ...p, unit: e.target.value } : p))}
                              placeholder="e.g. per AC, per visit"
                              className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs outline-none focus:border-[#0D47A1] transition-all"
                              required
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 block mb-0.5">Upload Icon Image *</label>
                            <div className="flex items-center gap-1.5 bg-slate-50 border border-dashed border-slate-200 rounded-md p-1">
                              <input 
                                type="file" 
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                      setAppliancePackages(prev => prev.map(p => p.id === pkg.id ? { ...p, icon: reader.result } : p));
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                                className="w-full text-[10px] text-slate-500 file:mr-2 file:py-0.5 file:px-1.5 file:rounded file:border-0 file:text-[9px] file:font-semibold file:bg-blue-50 file:text-[#0D47A1] hover:file:bg-blue-100 cursor-pointer"
                              />
                              {pkg.icon && (
                                <div className="w-6 h-6 flex-shrink-0 bg-white border border-slate-200 rounded-md flex items-center justify-center overflow-hidden">
                                  {pkg.icon.startsWith('data:image/') ? (
                                    <img src={pkg.icon} alt="" className="w-full h-full object-contain" />
                                  ) : (
                                    <span className="text-[11px]">{pkg.icon}</span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div className="col-span-1">
                            <label className="text-[9px] font-bold text-slate-400 block mb-0.5">Short Description</label>
                            <input
                              type="text"
                              value={pkg.desc || ''}
                              onChange={(e) => setAppliancePackages(appliancePackages.map(p => p.id === pkg.id ? { ...p, desc: e.target.value } : p))}
                              placeholder="e.g. New AC fitting & setup"
                              className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs outline-none focus:border-[#0D47A1] transition-all"
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="text-[9px] font-bold text-slate-400 block mb-0.5">Description Bullets (Comma-separated)</label>
                            <input
                              type="text"
                              value={pkg.bullets}
                              onChange={(e) => setAppliancePackages(appliancePackages.map(p => p.id === pkg.id ? { ...p, bullets: e.target.value } : p))}
                              placeholder="e.g. 30 days warranty, gas leak check"
                              className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs outline-none focus:border-[#0D47A1] transition-all"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[10px] text-red-500 italic bg-red-50 border border-red-100 rounded-lg p-3 text-center font-semibold">
                    Please add at least one service package.
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2 bg-white sticky bottom-0 z-10">
                <button 
                  type="button"
                  onClick={() => setShowApplianceModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 rounded-lg text-xs transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={appliancePackages.length === 0}
                  className="flex-1 bg-[#0D47A1] hover:bg-blue-800 text-white font-semibold py-2.5 rounded-lg text-xs transition-all shadow-sm disabled:opacity-50"
                >
                  Save Appliance Card
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Edit/Add Story Modal Overlay */}
      {showStoryModal && (
        <div className="fixed inset-0 bg-[#052355]/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl border border-slate-100 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh]">
            <div className="flex justify-between items-center flex-shrink-0">
              <h3 className="text-base font-bold text-[#1E293B]">{isEditingStory ? 'Edit Story Card' : 'Add Story Card'}</h3>
              <button onClick={() => setShowStoryModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>
            
            <form onSubmit={handleSaveStory} className="space-y-4 overflow-y-auto pr-1 flex-1 max-h-[75vh] no-scrollbar">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-150 space-y-3">
                <span className="text-[10px] font-bold text-[#0D47A1] uppercase tracking-wider block font-sans">1. Story Cover Customization</span>
                
                <div>
                  <label className="text-xs font-semibold text-[#64748B] mb-1 block">Story Title *</label>
                  <input 
                    type="text" 
                    value={storyForm.title}
                    onChange={(e) => setStoryForm({ ...storyForm, title: e.target.value })}
                    placeholder="e.g. Cold showers in winter? Hard pass"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-[#0D47A1] transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#64748B] mb-1 block">Upload Cover Image *</label>
                  <div className="flex items-center gap-3 bg-white border border-dashed border-slate-200 rounded-lg p-1.5">
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleStoryFileChange}
                      className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[9.5px] file:font-semibold file:bg-blue-50 file:text-[#0D47A1] hover:file:bg-blue-100 cursor-pointer"
                    />
                    {storyForm.image && (
                      <img src={storyForm.image} alt="Preview" className="w-10 h-8 object-contain border border-slate-200 rounded-md bg-white flex-shrink-0" />
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-150 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-[#0D47A1] uppercase tracking-wider">2. Slides / Frames List *</span>
                  <button
                    type="button"
                    onClick={() => setStorySlides([...storySlides, { id: Date.now(), image: '', caption: '', subCaption: '' }])}
                    className="bg-white hover:bg-slate-50 text-[#0D47A1] border border-slate-200 px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all"
                  >
                    + Add Slide
                  </button>
                </div>

                {storySlides.length > 0 ? (
                  <div className="space-y-4 max-h-[35vh] overflow-y-auto pr-1">
                    {storySlides.map((slide, sIdx) => (
                      <div key={slide.id} className="bg-white border border-slate-200 rounded-xl p-3 space-y-2.5 relative shadow-2xs">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
                          <span className="text-[10px] font-bold text-slate-500">Slide #{sIdx + 1}</span>
                          <button
                            type="button"
                            onClick={() => setStorySlides(storySlides.filter(s => s.id !== slide.id))}
                            className="p-1 text-slate-400 hover:text-red-600 rounded-lg transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>

                        <div>
                          <label className="text-[9px] font-bold text-slate-400 block mb-0.5">Upload Slide Image *</label>
                          <div className="flex items-center gap-2 bg-slate-50 border border-dashed border-slate-200 rounded-md p-1">
                            <input 
                              type="file" 
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    setStorySlides(prev => prev.map(s => s.id === slide.id ? { ...s, image: reader.result } : s));
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                              className="w-full text-[10px] text-slate-500 file:mr-2 file:py-0.5 file:px-1.5 file:rounded file:border-0 file:text-[9px] file:font-semibold file:bg-blue-50 file:text-[#0D47A1] hover:file:bg-blue-100 cursor-pointer"
                            />
                            {slide.image && (
                              <img src={slide.image} alt="" className="w-10 h-8 object-contain border border-slate-200 rounded bg-white flex-shrink-0" />
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 block mb-0.5">Slide Caption *</label>
                            <input
                              type="text"
                              value={slide.caption}
                              onChange={(e) => setStorySlides(storySlides.map(s => s.id === slide.id ? { ...s, caption: e.target.value } : s))}
                              placeholder="e.g. Cold showers in winter?"
                              className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs outline-none focus:border-[#0D47A1] transition-all"
                              required
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 block mb-0.5">Slide Sub-caption</label>
                            <input
                              type="text"
                              value={slide.subCaption}
                              onChange={(e) => setStorySlides(storySlides.map(s => s.id === slide.id ? { ...s, subCaption: e.target.value } : s))}
                              placeholder="e.g. Your geyser deserves a check-up."
                              className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs outline-none focus:border-[#0D47A1] transition-all"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[10px] text-red-500 italic bg-red-50 border border-red-100 rounded-lg p-3 text-center font-semibold">
                    Please add at least one story slide.
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2 bg-white sticky bottom-0 z-10">
                <button 
                  type="button"
                  onClick={() => setShowStoryModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 rounded-lg text-xs transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={storySlides.length === 0}
                  className="flex-1 bg-[#0D47A1] hover:bg-blue-800 text-white font-semibold py-2.5 rounded-lg text-xs transition-all shadow-sm disabled:opacity-50"
                >
                  Save Story Card
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default CustomerAppCustomization;

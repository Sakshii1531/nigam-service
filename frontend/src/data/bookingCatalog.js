/**
 * bookingCatalog.js
 *
 * Centralized, category-aware booking configuration.
 * To add a new category, simply add a new key here — no changes to BookingFlow.jsx needed.
 *
 * Schema per category:
 * {
 *   icon         : imported image asset
 *   color        : primary hex color for this category's accent
 *   lightBg      : light tinted background hex
 *   productTypes : [{ id, name, icon (emoji), desc }]
 *   services     : { default: [{ id, name, icon (emoji), desc, price }] }
 *   brands       : string[]
 *   whyBrandPoints: string[]   — shown in Step 4 "Why brand matters?" section
 *   categoryNote : string      — short note shown on Step 3 below service list
 * }
 */

// ─── 3D Icon Asset Imports ─────────────────────────────────────────────────────
import iconAc      from '../assets/icon_3d_ac.png';
import iconWm      from '../assets/icon_3d_wm.png';
import iconFridge  from '../assets/icon_3d_fridge.png';
import iconTv      from '../assets/icon_3d_tv.png';
import iconGeyser  from '../assets/icon_3d_geyser.png';
import iconRo      from '../assets/icon_3d_ro.png';
import iconOven    from '../assets/icon_3d_oven.png';
import iconChimney from '../assets/icon_3d_chimney.png';
import iconCooler  from '../assets/icon_3d_cooler.png';
import { apiRequest } from '../lib/apiClient';

// Admin overrides live server-side (ServicePageConfig + CategoryBookingConfig).
// getCatalogEntry stays synchronous — BookingFlow reads it during render — so
// the overrides are fetched once into these caches and preloadCatalogOverrides()
// is awaited before the first read. An empty cache simply means "no override",
// which falls through to the bundled defaults below.
const getInitialOverrides = (storageKey) => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = sessionStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

let servicePageOverrides = getInitialOverrides('ncc_service_pages_cache');
let categoryOverrides = getInitialOverrides('ncc_category_configs_cache');
// The platform's real catalog (Category + ServiceCatalogItem, same collections
// super-admin's catalog module and the service-provider job screen read from).
// Keyed by the DB Category.key (e.g. "AC"). Booking used to only ever read the
// two CMS override systems above, so a service added straight to the catalog
// (rather than through the Services/Categories admin tabs) never reached
// customers even though it was real, saved data.
let dbCatalogByKey = getInitialOverrides('ncc_db_catalog_cache');

export async function preloadCatalogOverrides() {
  try {
    const [servicePages, categories, dbCategories] = await Promise.all([
      apiRequest('/cms/service-pages'),
      apiRequest('/cms/category-configs'),
      apiRequest('/catalog/categories'),
    ]);
    servicePageOverrides = Object.fromEntries((servicePages || []).map(c => [c.serviceKey, c]));
    categoryOverrides = Object.fromEntries((categories || []).map(c => [c.categoryName, c]));
    dbCatalogByKey = Object.fromEntries((dbCategories || []).map(c => [c.key, c]));
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('ncc_service_pages_cache', JSON.stringify(servicePageOverrides));
        sessionStorage.setItem('ncc_category_configs_cache', JSON.stringify(categoryOverrides));
        sessionStorage.setItem('ncc_db_catalog_cache', JSON.stringify(dbCatalogByKey));
      } catch {
        // Storage can be full or disabled (private mode); the cache is optional.
      }
    }
  } catch (err) {
    console.warn('[catalog] Could not load admin overrides, using defaults:', err.message);
  }
}

function findDbCategory(decodedNorm, cleanDecoded, baseDecoded) {
  const dbKeys = Object.keys(dbCatalogByKey);
  const matchKey = dbKeys.find((k) => k.toLowerCase() === decodedNorm)
    || dbKeys.find((k) => k.toLowerCase().replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim() === cleanDecoded)
    || dbKeys.find((k) => {
      const kClean = k.toLowerCase().replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();
      return kClean === baseDecoded || cleanDecoded.includes(kClean) || (baseDecoded && kClean.includes(baseDecoded));
    });
  return matchKey ? dbCatalogByKey[matchKey] : null;
}

/** Real ServiceCatalogItem rows for a category, mapped to the same shape as a
 * BOOKING_CATALOG services entry, so they can replace whichever list (CMS
 * override or bundled default) is otherwise in effect. */
function findDbServices(decodedNorm, cleanDecoded, baseDecoded) {
  const dbCategory = findDbCategory(decodedNorm, cleanDecoded, baseDecoded);
  return (dbCategory?.services || []).map((s) => ({
    id: s.id,
    name: s.name,
    icon: s.icon || '🔧',
    desc: s.desc || '',
    price: typeof s.price === 'number' ? s.price : (parseInt(s.price) || 299),
    unit: s.unit || 'per unit',
  }));
}

/** Real ProductType rows for a category, each carrying the price addon it
 * charges on top of whichever service the customer books. Used to have no DB
 * counterpart at all — every category's product types came from a CMS list
 * that only ever had 2 of e.g. AC's 5 real registered types, so the other 3
 * (and the addon field itself) simply had nowhere to live. */
function findDbProductTypes(decodedNorm, cleanDecoded, baseDecoded) {
  const dbCategory = findDbCategory(decodedNorm, cleanDecoded, baseDecoded);
  return (dbCategory?.productTypes || []).map((pt) => ({
    id: pt.id,
    name: pt.name,
    icon: pt.icon || '⚡',
    desc: pt.desc || '',
    priceAddon: typeof pt.priceAddon === 'number' ? pt.priceAddon : 0,
  }));
}

// ─── Booking Catalog ───────────────────────────────────────────────────────────
export const BOOKING_CATALOG = {

  // ──────────────────────────────────────────────────────────────────────────
  // AIR CONDITIONER
  // ──────────────────────────────────────────────────────────────────────────
  'AC': {
    icon: iconAc,
    color: '#0D47A1',
    lightBg: '#EAF4FF',
    productTypes: [
      { id: 'split',    name: 'Split AC',    icon: '❄️',  desc: '1 ton · 1.5 ton · 2 ton' },
      { id: 'window',   name: 'Window AC',   icon: '🪟',  desc: 'Single wall-mount unit' },
      { id: 'cassette', name: 'Cassette AC', icon: '⬛',  desc: 'Ceiling mounted / 4-way' },
      { id: 'tower',    name: 'Tower AC',    icon: '🏛️',  desc: 'Floor standing unit' },
      { id: 'portable', name: 'Portable AC', icon: '🔄',  desc: 'Movable, no installation' },
    ],
    services: {
      default: [
        { id: 'installation',  name: 'Installation',  icon: '🔩', desc: 'New AC fitting & setup',          price: 499 },
        { id: 'repair',        name: 'Repair',         icon: '🔧', desc: 'Fix breakdowns & issues',         price: 299 },
        { id: 'gas_refilling', name: 'Gas Refilling',  icon: '💨', desc: 'Refrigerant top-up',             price: 799 },
        { id: 'maintenance',   name: 'Maintenance',    icon: '🛠️', desc: 'Preventive check & tune-up',     price: 349 },
        { id: 'deep_cleaning', name: 'Deep Cleaning',  icon: '✨', desc: 'Foam-jet wash & coil clean',     price: 649 },
        { id: 'uninstall',     name: 'Uninstallation', icon: '📤', desc: 'Safe removal & packing',         price: 299 },
      ],
    },
    brands: ['Voltas', 'LG', 'Samsung', 'Daikin', 'Whirlpool', 'Lloyd', 'Panasonic', 'Blue Star', 'Hitachi', 'Carrier', 'O General'],
    whyBrandPoints: [
      'ServiceProviders carry brand-specific gas & parts',
      'AC model-specific calibration & settings',
      'Correct refrigerant type (R22 vs R410A)',
    ],
    categoryNote: 'Prices shown are indicative. The serviceProvider will confirm exact charges after inspection.',
  },

  // ──────────────────────────────────────────────────────────────────────────
  // WASHING MACHINE
  // ──────────────────────────────────────────────────────────────────────────
  'Washing Machine': {
    icon: iconWm,
    color: '#1565C0',
    lightBg: '#E3F2FD',
    productTypes: [
      { id: 'front_load', name: 'Front Load',     icon: '🔄', desc: 'Auto, drum in front' },
      { id: 'top_load',   name: 'Top Load',       icon: '⬆️', desc: 'Auto, drum on top' },
      { id: 'semi_auto',  name: 'Semi Automatic', icon: '⚙️', desc: 'Manual water fill' },
    ],
    services: {
      default: [
        { id: 'repair',        name: 'Repair',        icon: '🔧', desc: 'Fix spin, drain & motor issues', price: 399 },
        { id: 'installation',  name: 'Installation',  icon: '🔩', desc: 'New machine setup & demo',       price: 299 },
        { id: 'drum_cleaning', name: 'Drum Cleaning', icon: '✨', desc: 'Deep drum & tub sanitisation',   price: 499 },
        { id: 'maintenance',   name: 'Maintenance',   icon: '🛠️', desc: 'Preventive service & check',    price: 349 },
        { id: 'uninstall',     name: 'Uninstallation',icon: '📤', desc: 'Safe removal & packing',        price: 199 },
      ],
    },
    brands: ['LG', 'Samsung', 'Whirlpool', 'IFB', 'Bosch', 'Haier', 'Godrej', 'Panasonic', 'Voltas', 'Siemens'],
    whyBrandPoints: [
      'Brand-specific PCB & motor spare parts stocked',
      'Correct drum belt & bearing specifications',
      'Model-specific error code diagnosis',
    ],
    categoryNote: 'Prices are indicative. Exact charges are confirmed after inspection by the serviceProvider.',
  },

  // ──────────────────────────────────────────────────────────────────────────
  // REFRIGERATOR
  // ──────────────────────────────────────────────────────────────────────────
  'Refrigerator': {
    icon: iconFridge,
    color: '#4527A0',
    lightBg: '#EDE7F6',
    productTypes: [
      { id: 'single_door',  name: 'Single Door',  icon: '🚪',   desc: '100 L – 260 L capacity' },
      { id: 'double_door',  name: 'Double Door',  icon: '🚪🚪', desc: '260 L – 450 L capacity' },
      { id: 'side_by_side', name: 'Side By Side', icon: '◀️▶️', desc: '500 L+ premium model' },
      { id: 'convertible',  name: 'Convertible',  icon: '🔁',   desc: 'Fridge-freezer switching' },
      { id: 'french_door',  name: 'French Door',  icon: '🏠',   desc: 'Multi-door premium' },
    ],
    services: {
      default: [
        { id: 'cooling_issue', name: 'Cooling Issue',  icon: '🌡️', desc: 'Not cooling / over-freezing fix', price: 449 },
        { id: 'installation',  name: 'Installation',   icon: '🔩', desc: 'Setup, levelling & demo',         price: 299 },
        { id: 'repair',        name: 'Repair',          icon: '🔧', desc: 'General repairs & part fix',     price: 499 },
        { id: 'maintenance',   name: 'Maintenance',     icon: '🛠️', desc: 'Coil clean & annual check',     price: 349 },
        { id: 'gas_refilling', name: 'Gas Refilling',   icon: '💨', desc: 'Refrigerant refill',            price: 899 },
      ],
    },
    brands: ['LG', 'Samsung', 'Whirlpool', 'Godrej', 'Haier', 'Panasonic', 'Bosch', 'Voltas', 'Hitachi', 'Liebherr'],
    whyBrandPoints: [
      'Brand-specific compressor & thermostat parts',
      'Correct refrigerant type (R600a vs R134a)',
      'Model-specific PCB & sensor calibration',
    ],
    categoryNote: 'Cooling issues may need gas refilling — exact diagnosis done by the serviceProvider on-site.',
  },

  // ──────────────────────────────────────────────────────────────────────────
  // TELEVISION
  // ──────────────────────────────────────────────────────────────────────────
  'TV': {
    icon: iconTv,
    color: '#B71C1C',
    lightBg: '#FFEBEE',
    productTypes: [
      { id: 'led',      name: 'LED TV',    icon: '📺', desc: 'Standard LED/LCD flat screen' },
      { id: 'oled',     name: 'OLED TV',   icon: '🖥️', desc: 'Organic LED, deep blacks' },
      { id: 'qled',     name: 'QLED TV',   icon: '💎', desc: 'Quantum dot premium display' },
      { id: 'smart_tv', name: 'Smart TV',  icon: '📱', desc: 'Android / Tizen / WebOS' },
    ],
    services: {
      default: [
        { id: 'wall_mount',    name: 'Wall Mount Installation', icon: '🔩', desc: 'TV mounting & cable management',    price: 299 },
        { id: 'repair',        name: 'Repair',                  icon: '🔧', desc: 'No display, flickering, no sound', price: 349 },
        { id: 'display_issue', name: 'Display Issue',           icon: '🖥️', desc: 'Screen lines, colour fix',         price: 599 },
        { id: 'maintenance',   name: 'Maintenance',             icon: '🛠️', desc: 'Deep clean & port check',         price: 249 },
        { id: 'panel_repair',  name: 'Panel Replacement',       icon: '🔄', desc: 'Screen panel change',             price: 1499 },
      ],
    },
    brands: ['LG', 'Samsung', 'Sony', 'Panasonic', 'Mi', 'OnePlus', 'TCL', 'Haier', 'VU', 'Philips', 'Hisense'],
    whyBrandPoints: [
      'Brand-specific display panels & backlights stocked',
      'Firmware & software issues diagnosed correctly',
      'Correct T-Con board & power supply components',
    ],
    categoryNote: 'Panel repairs depend on part availability. ServiceProvider will confirm before proceeding.',
  },

  // ──────────────────────────────────────────────────────────────────────────
  // WATER PURIFIER / RO
  // ──────────────────────────────────────────────────────────────────────────
  'RO Water Purifier': {
    icon: iconRo,
    color: '#00695C',
    lightBg: '#E0F2F1',
    productTypes: [
      { id: 'ro',       name: 'RO',       icon: '💧', desc: 'Reverse osmosis purifier' },
      { id: 'uv',       name: 'UV',       icon: '☀️', desc: 'Ultraviolet purifier' },
      { id: 'uf',       name: 'UF',       icon: '🌊', desc: 'Ultrafiltration purifier' },
      { id: 'ro_uv',    name: 'RO + UV',  icon: '💠', desc: 'Combined RO & UV system' },
    ],
    services: {
      default: [
        { id: 'installation',       name: 'Installation',       icon: '🔩', desc: 'New purifier setup & fitting', price: 399 },
        { id: 'filter_replacement', name: 'Filter Replacement', icon: '🔄', desc: 'Replace complete filter set',  price: 799 },
        { id: 'repair',             name: 'Repair',             icon: '🔧', desc: 'No water / leakage fix',      price: 349 },
        { id: 'amc_service',        name: 'AMC Service',        icon: '📋', desc: 'Annual maintenance contract', price: 999 },
        { id: 'membrane_change',    name: 'Membrane Change',    icon: '♻️', desc: 'RO membrane replacement',    price: 849 },
      ],
    },
    brands: ['Kent', 'Eureka Forbes', 'Aquaguard', 'Pureit', 'Blue Star', 'AO Smith', 'Livpure', 'HUL', 'Luminous', 'Havells'],
    whyBrandPoints: [
      'Brand-specific filter cartridges & membranes available',
      'Correct TDS calibration per model specs',
      'Genuine UV bulbs & RO membranes used',
    ],
    categoryNote: 'Filter replacement intervals depend on your water quality (usually every 6–12 months).',
  },

  // ──────────────────────────────────────────────────────────────────────────
  // GEYSER / WATER HEATER
  // ──────────────────────────────────────────────────────────────────────────
  'Geyser': {
    icon: iconGeyser,
    color: '#E65100',
    lightBg: '#FFF3E0',
    productTypes: [
      { id: 'storage', name: 'Storage Geyser', icon: '🛢️', desc: '10 L · 15 L · 25 L tank' },
      { id: 'instant', name: 'Instant Geyser', icon: '⚡', desc: 'Tankless, rapid heating' },
      { id: 'solar',   name: 'Solar Heater',   icon: '☀️', desc: 'Solar panel water heater' },
    ],
    services: {
      default: [
        { id: 'repair',             name: 'Repair',              icon: '🔧', desc: 'Heating element & thermostat fix', price: 299 },
        { id: 'installation',       name: 'Installation',        icon: '🔩', desc: 'New geyser fitting & safety check', price: 399 },
        { id: 'service_flush',      name: 'Service & Flush',     icon: '✨', desc: 'Tank descaling & flushing',        price: 349 },
        { id: 'element_replacement',name: 'Element Replacement', icon: '🔌', desc: 'Heating rod change',              price: 499 },
        { id: 'anode_replacement',  name: 'Anode Rod Change',    icon: '🔩', desc: 'Anti-corrosion rod replacement',  price: 299 },
      ],
    },
    brands: ['Havells', 'AO Smith', 'Racold', 'Bajaj', 'V-Guard', 'Venus', 'Kenstar', 'Usha', 'Orient', 'Crompton'],
    whyBrandPoints: [
      'Brand-specific heating elements & thermostats available',
      'Correct wattage element for your tank capacity',
      'Safety pressure valve check per brand specs',
    ],
    categoryNote: 'Regular tank flushing every 2 years extends geyser life significantly.',
  },

  // ──────────────────────────────────────────────────────────────────────────
  // MICROWAVE OVEN
  // ──────────────────────────────────────────────────────────────────────────
  'Microwave': {
    icon: iconOven,
    color: '#37474F',
    lightBg: '#ECEFF1',
    productTypes: [
      { id: 'solo',        name: 'Solo Microwave',  icon: '📡', desc: 'Basic reheating only' },
      { id: 'grill',       name: 'Grill Microwave', icon: '🔥', desc: 'Heating + grilling mode' },
      { id: 'convection',  name: 'Convection',      icon: '🌀', desc: 'Baking, roasting & grilling' },
      { id: 'otg',         name: 'OTG',             icon: '🍞', desc: 'Oven toaster griller' },
    ],
    services: {
      default: [
        { id: 'repair',        name: 'Repair',        icon: '🔧', desc: 'Not heating, sparking or dead', price: 349 },
        { id: 'installation',  name: 'Installation',  icon: '🔩', desc: 'Setup, demo & safety check',    price: 199 },
        { id: 'deep_cleaning', name: 'Deep Cleaning', icon: '✨', desc: 'Interior deodorisation & clean', price: 249 },
        { id: 'maintenance',   name: 'Maintenance',   icon: '🛠️', desc: 'Annual check & magnetron test', price: 299 },
      ],
    },
    brands: ['LG', 'Samsung', 'IFB', 'Morphy Richards', 'Bajaj', 'Panasonic', 'Godrej', 'Whirlpool', 'Philips', 'Bosch'],
    whyBrandPoints: [
      'Brand-specific magnetron & waveguide cover parts',
      'Correct turntable motor & coupler replacements',
      'Model-specific control panel & keypad parts',
    ],
    categoryNote: 'Never use metal containers inside. ServiceProvider will inspect for any magnetron damage.',
  },

  // ──────────────────────────────────────────────────────────────────────────
  // CHIMNEY
  // ──────────────────────────────────────────────────────────────────────────
  'Chimney': {
    icon: iconChimney,
    color: '#212121',
    lightBg: '#F5F5F5',
    productTypes: [
      { id: 'baffle',   name: 'Baffle Filter',   icon: '🌀', desc: 'Curved aluminium mesh' },
      { id: 'cassette', name: 'Cassette Filter',  icon: '📦', desc: 'Easy-clean cartridge' },
      { id: 'auto',     name: 'Auto-Clean',       icon: '✨', desc: 'Self-cleaning oil collector' },
      { id: 'filterless',name: 'Filterless',      icon: '🔆', desc: 'No filter, centrifugal tech' },
    ],
    services: {
      default: [
        { id: 'deep_cleaning',    name: 'Deep Cleaning',     icon: '✨', desc: 'Filter, motor & oil collector clean', price: 399 },
        { id: 'repair',           name: 'Repair',            icon: '🔧', desc: 'Motor, suction & button fix',        price: 349 },
        { id: 'installation',     name: 'Installation',      icon: '🔩', desc: 'New chimney mounting & ducting',     price: 499 },
        { id: 'filter_replace',   name: 'Filter Replacement',icon: '🔄', desc: 'Baffle / mesh / cassette change',   price: 299 },
        { id: 'maintenance',      name: 'Maintenance',       icon: '🛠️', desc: 'Annual service & suction test',    price: 349 },
      ],
    },
    brands: ['Faber', 'Elica', 'Glen', 'Hindware', 'Kaff', 'Sunflame', 'Bosch', 'IFB', 'Siemens', 'Whirlpool'],
    whyBrandPoints: [
      'Brand-specific motor & oil collector parts available',
      'Correct ducting adaptor & pipe fittings used',
      'Auto-clean motor serviced per brand manual',
    ],
    categoryNote: 'Chimney should be deep-cleaned every 3–6 months for optimal suction performance.',
  },

  // ──────────────────────────────────────────────────────────────────────────
  // AIR COOLER
  // ──────────────────────────────────────────────────────────────────────────
  'Air Cooler': {
    icon: iconCooler,
    color: '#1565C0',
    lightBg: '#E3F2FD',
    productTypes: [
      { id: 'desert',   name: 'Desert Cooler',   icon: '🏜️', desc: 'Large, high-capacity tank' },
      { id: 'personal', name: 'Personal Cooler',  icon: '👤', desc: 'Compact & portable' },
      { id: 'tower',    name: 'Tower Cooler',     icon: '🏛️', desc: 'Tall, 360° airflow' },
      { id: 'window',   name: 'Window Cooler',    icon: '🪟', desc: 'Window-mounted unit' },
    ],
    services: {
      default: [
        { id: 'service_clean', name: 'Service & Clean', icon: '✨', desc: 'Pad, pump & tank clean',      price: 249 },
        { id: 'repair',        name: 'Repair',          icon: '🔧', desc: 'Motor, pump & fan fix',       price: 299 },
        { id: 'installation',  name: 'Installation',    icon: '🔩', desc: 'Setup & positioning',         price: 199 },
        { id: 'pad_change',    name: 'Cooling Pad Change',icon: '🧽',desc: 'Replace honeycomb/wood pads',price: 349 },
        { id: 'maintenance',   name: 'Maintenance',     icon: '🛠️', desc: 'Pre-summer full check',      price: 299 },
      ],
    },
    brands: ['Symphony', 'Bajaj', 'Orient', 'Kenstar', 'Crompton', 'Hindware', 'Usha', 'Havells', 'Voltas', 'Cello'],
    whyBrandPoints: [
      'Brand-specific pump & motor replacements available',
      'Correct cooling pad type (honeycomb vs wood wool)',
      'Float valve & water distributor parts matched to model',
    ],
    categoryNote: 'Replace cooling pads every season for best cooling efficiency.',
  },

};

// ─── Category Lookup (case-insensitive) ────────────────────────────────────────
/**
 * Looks up a category from BOOKING_CATALOG by name (case-insensitive).
 * Returns { key, data } or null if not found.
 *
 * @param {string} category - The category name from the URL param
 * @returns {{ key: string, data: object } | null}
 */
export const getCatalogEntry = (category) => {
  if (!category) return null;
  const decoded = decodeURIComponent(category).trim();
  const decodedNorm = decoded.toLowerCase();
  const cleanDecoded = decodedNorm.replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();
  const baseDecoded = cleanDecoded.replace(/\b(repair|services|service|checkup|installation|complete)\b/gi, '').replace(/\s+/g, ' ').trim();
  const dbServices = findDbServices(decodedNorm, cleanDecoded, baseDecoded);
  const dbProductTypes = findDbProductTypes(decodedNorm, cleanDecoded, baseDecoded);

  // 1. Look up in Services Customization data (from Services tab)
  const serviceConfigs = servicePageOverrides;
  const keys = Object.keys(serviceConfigs);

  // 1a. Try exact match first
  let matchedServiceKey = keys.find(k => k.toLowerCase() === decodedNorm);

  // 1b. Normalized spacing & hyphens
  if (!matchedServiceKey) {
    matchedServiceKey = keys.find(k => k.toLowerCase().replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim() === cleanDecoded);
  }

  // 1c. Base name without suffixes (e.g. "Washing Machine Repair" -> "Washing Machine")
  if (!matchedServiceKey && baseDecoded) {
    matchedServiceKey = keys.find(k => {
      const kClean = k.toLowerCase().replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();
      const kBase = kClean.replace(/\b(repair|services|service|checkup|installation|complete)\b/gi, '').replace(/\s+/g, ' ').trim();
      return kBase === baseDecoded || kClean === baseDecoded;
    });
  }

  // 1d. Substring word inclusion (bidirectional)
  if (!matchedServiceKey) {
    matchedServiceKey = keys.find(k => {
      const kClean = k.toLowerCase().replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();
      return cleanDecoded.includes(kClean) || (baseDecoded && kClean.includes(baseDecoded));
    });
  }

  if (matchedServiceKey) {
    const config = serviceConfigs[matchedServiceKey] || {};
    const catalog = config.catalog || [];
    const categoryConfig = categoryOverrides[matchedServiceKey] || categoryOverrides[decoded] || {};
    const staticDefault = BOOKING_CATALOG[decoded] || BOOKING_CATALOG[Object.keys(BOOKING_CATALOG).find(k => k.toLowerCase() === decodedNorm || k.toLowerCase().replace(/[-_]/g, ' ').trim() === cleanDecoded)] || {};

    // Product types priority:
    // 0. Real catalog (Category/ProductType, incl. price addons) — authoritative once populated
    // 1. Service Page Config (from Services Tab)
    // 2. Category Config (from Categories Tab)
    // 3. Static Bundled Defaults (only if no custom types configured)
    const rawProductTypes = (config.productTypes && config.productTypes.length > 0)
      ? config.productTypes
      : (categoryConfig.productTypes && (Array.isArray(categoryConfig.productTypes) ? categoryConfig.productTypes.length > 0 : String(categoryConfig.productTypes).trim().length > 0))
      ? categoryConfig.productTypes
      : null;

    let productTypes;
    if (dbProductTypes.length > 0) {
      productTypes = dbProductTypes;
    } else if (rawProductTypes) {
      const list = typeof rawProductTypes === 'string'
        ? rawProductTypes.split(',').map(s => s.trim()).filter(Boolean)
        : (Array.isArray(rawProductTypes) ? rawProductTypes : []);

      productTypes = list.map(item => {
        const nameStr = typeof item === 'string' ? item : (item.name || String(item));
        const nameClean = nameStr.toLowerCase().replace(/[-_]/g, ' ').trim();
        const staticItem = (staticDefault.productTypes || []).find(st => {
          const stClean = (st.name || '').toLowerCase().replace(/[-_]/g, ' ').trim();
          return stClean === nameClean || stClean.includes(nameClean) || nameClean.includes(stClean);
        });

        // Determine sensible default icons if static item doesn't specify
        let defaultIcon = '⚡';
        let defaultDesc = '';
        if (nameClean.includes('semi')) {
          defaultIcon = '⚙️';
          defaultDesc = 'Manual / twin-tub operation';
        } else if (nameClean.includes('full') || nameClean.includes('front')) {
          defaultIcon = '🔄';
          defaultDesc = 'Fully automatic cycle';
        } else if (nameClean.includes('top')) {
          defaultIcon = '⬆️';
          defaultDesc = 'Top load drum';
        } else if (nameClean.includes('split')) {
          defaultIcon = '❄️';
          defaultDesc = 'Split wall-mounted unit';
        } else if (nameClean.includes('window')) {
          defaultIcon = '🪟';
          defaultDesc = 'Single window unit';
        }

        const hasCustomDesc = typeof item === 'object' && item !== null && item.desc !== undefined;
        const customDesc = hasCustomDesc ? (item.desc || '') : null;

        return {
          id: staticItem?.id || (typeof item === 'object' && item.id ? item.id : nameStr.toLowerCase().replace(/[^a-z0-9]+/g, '_')),
          name: nameStr,
          icon: (typeof item === 'object' && item.icon) ? item.icon : (staticItem?.icon || defaultIcon),
          desc: customDesc !== null ? customDesc : (staticItem?.desc || defaultDesc)
        };
      });
    } else {
      productTypes = staticDefault.productTypes || [];
    }

    const servicesList = [];
    catalog.forEach(group => {
      if (group && group.items) {
        group.items.forEach(item => {
          servicesList.push({
            id: item.name.toLowerCase().replace(/ /g, '_'),
            name: item.name,
            icon: item.icon || '🔧',
            desc: item.desc || (Array.isArray(item.bullets) ? item.bullets.join(' · ') : item.bullets || ''),
            price: parseInt((item.price || '').replace('₹', '')) || 299,
            unit: item.unit || 'per unit'
          });
        });
      }
    });

    // The real catalog (Category/ServiceCatalogItem, managed from the super-admin
    // catalog console) is authoritative once it has anything for this category —
    // the CMS-configured / bundled-static lists below only cover a category the
    // catalog console hasn't been used for yet.
    const resolvedServices = dbServices.length > 0 ? dbServices : (
      servicesList.length > 0 ? servicesList : (
        Array.isArray(categoryConfig.services) ? categoryConfig.services : (
          staticDefault.services?.default || (Array.isArray(staticDefault.services) ? staticDefault.services : [])
        )
      )
    );

    const resolved = {
      icon: staticDefault.icon || null,
      color: staticDefault.color || '#0D47A1',
      lightBg: staticDefault.lightBg || '#EAF4FF',
      productTypes,
      services: {
        default: resolvedServices
      },
      brands: categoryConfig.brands?.length ? categoryConfig.brands : (staticDefault.brands || []),
      whyBrandPoints: categoryConfig.whyBrandPoints?.length
        ? categoryConfig.whyBrandPoints
        : (staticDefault.whyBrandPoints || ['Brand certified expert serviceProviders', 'Correct parts calibration', 'Genuine brand replacement parts']),
      categoryNote: categoryConfig.categoryNote || staticDefault.categoryNote || 'Prices shown are indicative.',
      bannerImg: config.bannerImg || '',
      tagline: config.tagline || '',
      subtitle: config.subtitle || ''
    };

    return { key: decoded, data: resolved };
  }

  // 2. Otherwise, fall back to Category Customization (categoryOverrides) merged over Static defaults (BOOKING_CATALOG)
  const staticKey = Object.keys(BOOKING_CATALOG).find(
    (k) => k.toLowerCase() === decodedNorm || k.toLowerCase().replace(/[-_]/g, ' ').trim() === cleanDecoded
  );
  const staticDefault = staticKey ? BOOKING_CATALOG[staticKey] : {};

  const overrideKey = Object.keys(categoryOverrides).find(
    (k) => k.toLowerCase() === decodedNorm || k.toLowerCase().replace(/[-_]/g, ' ').trim() === cleanDecoded
  );
  const categoryConfig = overrideKey ? categoryOverrides[overrideKey] : null;

  const fallbackServiceKey = Object.keys(serviceConfigs).find(
    (k) => k.toLowerCase() === decodedNorm || k.toLowerCase().replace(/[-_]/g, ' ').trim() === cleanDecoded
  );
  const serviceConfig = fallbackServiceKey ? serviceConfigs[fallbackServiceKey] : null;

  if (!staticKey && !overrideKey && !serviceConfig && dbServices.length === 0) {
    return null;
  }

  // Parse productTypes from service override, category override, or static
  const dynTypes = (serviceConfig && serviceConfig.productTypes && serviceConfig.productTypes.length > 0)
    ? serviceConfig.productTypes
    : (categoryConfig && categoryConfig.productTypes && (Array.isArray(categoryConfig.productTypes) ? categoryConfig.productTypes.length > 0 : String(categoryConfig.productTypes).trim().length > 0))
    ? categoryConfig.productTypes
    : null;

  let productTypes;
  if (dbProductTypes.length > 0) {
    productTypes = dbProductTypes;
  } else if (dynTypes) {
    const rawTypes = typeof dynTypes === 'string'
      ? dynTypes.split(',').map(s => s.trim()).filter(Boolean)
      : (Array.isArray(dynTypes) ? dynTypes : []);

    productTypes = rawTypes.map(item => {
      const nameStr = typeof item === 'string' ? item : (item.name || String(item));
      const hasCustomDesc = typeof item === 'object' && item !== null && item.desc !== undefined;
      const customDesc = hasCustomDesc ? (item.desc || '') : null;
      const nameClean = nameStr.toLowerCase().replace(/[-_]/g, ' ').trim();
      const staticItem = (staticDefault.productTypes || []).find(
        st => (st.name || '').toLowerCase().replace(/[-_]/g, ' ').trim() === nameClean
      );
      return {
        id: staticItem?.id || (typeof item === 'object' && item.id ? item.id : nameStr.toLowerCase().replace(/[^a-z0-9]+/g, '_')),
        name: nameStr,
        icon: (typeof item === 'object' && item.icon) ? item.icon : (staticItem?.icon || '⚡'),
        desc: customDesc !== null ? customDesc : (staticItem?.desc || '')
      };
    });
  } else {
    productTypes = staticDefault.productTypes || [];
  }

  // Parse services — the real catalog wins once it has anything for this
  // category; CMS-configured / bundled-static lists are the fallback for a
  // category the catalog console hasn't been used for yet.
  let servicesList = [];
  if (dbServices.length > 0) {
    servicesList = dbServices;
  } else if (categoryConfig && categoryConfig.services) {
    const rawServices = Array.isArray(categoryConfig.services)
      ? categoryConfig.services
      : (categoryConfig.services.default || []);

    servicesList = rawServices.map(s => ({
      id: s.id || (s.name || '').toLowerCase().replace(/\s+/g, '_'),
      name: s.name || '',
      icon: s.icon || '🔧',
      desc: s.desc || '',
      price: typeof s.price === 'number' ? s.price : (parseInt(s.price) || 299),
      unit: s.unit || 'per unit'
    }));
  } else if (staticDefault.services) {
    servicesList = Array.isArray(staticDefault.services)
      ? staticDefault.services
      : (staticDefault.services.default || []);
  }

  // Parse brands from override or static
  let brands = [];
  if (categoryConfig && categoryConfig.brands) {
    brands = typeof categoryConfig.brands === 'string'
      ? categoryConfig.brands.split(',').map(s => s.trim()).filter(Boolean)
      : categoryConfig.brands;
  }
  if (!brands || brands.length === 0) {
    brands = staticDefault.brands || [];
  }

  // Parse whyBrandPoints
  const whyBrandPoints = (categoryConfig && categoryConfig.whyBrandPoints && categoryConfig.whyBrandPoints.length)
    ? categoryConfig.whyBrandPoints
    : (staticDefault.whyBrandPoints || [
        'Brand certified expert serviceProviders',
        'Correct parts calibration',
        'Genuine brand replacement parts'
      ]);

  // Parse categoryNote
  const categoryNote = (categoryConfig && categoryConfig.categoryNote)
    || staticDefault.categoryNote
    || 'Prices shown are indicative.';

  const resolved = {
    icon: staticDefault.icon || null,
    color: staticDefault.color || '#0D47A1',
    lightBg: staticDefault.lightBg || '#EAF4FF',
    productTypes,
    services: {
      default: servicesList
    },
    brands,
    whyBrandPoints,
    categoryNote
  };

  return { key: overrideKey || staticKey || decoded, data: resolved };
};

/**
 * Returns all registered category keys (for future use in listings/routing).
 */
export const getAllCategoryKeys = () => Object.keys(BOOKING_CATALOG);

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
      'Technicians carry brand-specific gas & parts',
      'AC model-specific calibration & settings',
      'Correct refrigerant type (R22 vs R410A)',
    ],
    categoryNote: 'Prices shown are indicative. The technician will confirm exact charges after inspection.',
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
    categoryNote: 'Prices are indicative. Exact charges are confirmed after inspection by the technician.',
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
    categoryNote: 'Cooling issues may need gas refilling — exact diagnosis done by the technician on-site.',
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
    categoryNote: 'Panel repairs depend on part availability. Technician will confirm before proceeding.',
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
    categoryNote: 'Never use metal containers inside. Technician will inspect for any magnetron damage.',
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
  const decoded = decodeURIComponent(category);
  const decodedNorm = decoded.toLowerCase();

  // 1. Look up in Services Customization data (from Services tab)
  const savedConfigs = localStorage.getItem('custom_service_details_configs');
  const serviceConfigs = savedConfigs ? JSON.parse(savedConfigs) : {};

  const savedCatalogs = localStorage.getItem('custom_service_catalogs');
  const serviceCatalogs = savedCatalogs ? JSON.parse(savedCatalogs) : {};

  let matchedServiceKey = null;
  Object.keys(serviceConfigs).forEach(key => {
    const keyNorm = key.toLowerCase();
    if (keyNorm === decodedNorm || keyNorm.includes(decodedNorm) || decodedNorm.includes(keyNorm)) {
      matchedServiceKey = key;
    }
  });

  if (matchedServiceKey) {
    const config = serviceConfigs[matchedServiceKey] || {};
    const catalog = serviceCatalogs[matchedServiceKey] || [];

    const productTypes = (config.productTypes || []).map(t => ({
      id: t.toLowerCase().replace(/ /g, '_'),
      name: t,
      icon: '⚡',
      desc: ''
    }));

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

    const staticDefault = BOOKING_CATALOG[decoded] || BOOKING_CATALOG[Object.keys(BOOKING_CATALOG).find(k => k.toLowerCase() === decodedNorm)] || {};

    const mockData = {
      icon: staticDefault.icon || null,
      color: staticDefault.color || '#0D47A1',
      lightBg: staticDefault.lightBg || '#EAF4FF',
      productTypes,
      services: {
        default: servicesList
      },
      brands: config.brands || staticDefault.brands || ['LG', 'Samsung', 'Whirlpool', 'Panasonic'],
      whyBrandPoints: staticDefault.whyBrandPoints || ['Brand certified expert technicians', 'Correct parts calibration', 'Genuine brand replacement parts'],
      categoryNote: config.categoryNote || staticDefault.categoryNote || 'Prices shown are indicative.',
      bannerImg: config.bannerImg || '',
      tagline: config.tagline || '',
      subtitle: config.subtitle || ''
    };

    return { key: decoded, data: mockData };
  }

  // 2. Otherwise, fall back to Category Customization / Static defaults
  const savedBookingCatalogs = localStorage.getItem('custom_booking_catalog');
  const customBookingCatalog = savedBookingCatalogs ? JSON.parse(savedBookingCatalogs) : {};

  const unifiedCatalog = { ...BOOKING_CATALOG, ...customBookingCatalog };

  const key = Object.keys(unifiedCatalog).find(
    (k) => k.toLowerCase() === decodedNorm
  );

  return key ? { key, data: unifiedCatalog[key] } : null;
};

/**
 * Returns all registered category keys (for future use in listings/routing).
 */
export const getAllCategoryKeys = () => Object.keys(BOOKING_CATALOG);

// Master Service & Offering Catalogue seed (docs/master-catalogue/phase-1-data-model.md).
//
// Rates are in RUPEES here for readability; the seeder converts to paise.
// `demo: true` marks a placeholder rate the client has not given yet — the
// offering is flagged needsRateReview and shows a DEMO badge in the admin until
// a real rate is saved. Rates without `demo` are the client's own numbers.
//
// Categories reuse the existing keys the customer app and partner matching
// already route by ("Electrician", "Water Tank Sump Cleaning", "RO Water
// Purifier"); only CCTV is new.
//
// Intentionally NOT seeded (client Test 12 — unconfigured combinations must
// not be bookable): Window AC → Gas Refilling, Window AC → Deep Cleaning.

const EXPRESS = { enabled: true };
const NO_EXPRESS = { enabled: false };
const EXPRESS_RATE = { expressFee: 99, expressSpIncentive: 50 };
const NO_EXPRESS_RATE = { expressFee: 0, expressSpIncentive: 0 };

export const MASTER_CATALOGUE_SEED = [
  // ─── AC ────────────────────────────────────────────────────────────────
  {
    key: 'AC',
    keywords: ['air conditioner', 'aircon', 'split', 'window', 'cooling'],
    productTypes: [
      {
        slug: 'split', name: 'Split AC', icon: '❄️', desc: '1 ton · 1.5 ton · 2 ton',
        variantDimension: { key: 'capacity', label: 'Capacity' },
        variants: [
          { slug: '1t', label: '1 Ton' },
          { slug: '15t', label: '1.5 Ton' },
          { slug: '2t', label: '2 Ton' },
        ],
      },
      { slug: 'window', name: 'Window AC', icon: '🪟', desc: 'Single wall-mount unit', variantDimension: null, variants: [] },
    ],
    services: [
      { slug: 'installation', name: 'Installation', icon: '🔩', desc: 'New AC fitting & setup', keywords: ['install', 'fitting'] },
      { slug: 'uninstallation', name: 'Uninstallation', icon: '📤', desc: 'Safe removal & packing', keywords: ['uninstall', 'removal', 'dismantle'] },
      { slug: 'repair', name: 'Repair', icon: '🔧', desc: 'Diagnose & fix breakdowns', keywords: ['not cooling', 'fix'] },
      { slug: 'deep_cleaning', name: 'Deep Cleaning', icon: '✨', desc: 'Foam-jet wash & coil clean', keywords: ['service', 'wash', 'jet'] },
      { slug: 'gas_refilling', name: 'Gas Refilling', icon: '💨', desc: 'Refrigerant top-up', keywords: ['gas', 'refrigerant'] },
      { slug: 'inspection', name: 'Inspection', icon: '🔍', desc: 'Health check & diagnosis', keywords: ['checkup'] },
    ],
    offerings: [
      {
        code: 'AC-SPLIT-1T-INSTALL', name: 'Split AC 1 Ton Installation', productType: 'split', variant: '1t', service: 'installation',
        unitLabel: 'per AC', minQty: 1, maxQty: 5, express: EXPRESS, estimatedDurationMins: 120,
        included: ['Indoor & outdoor unit mounting', 'Up to 3 ft copper piping', 'Gas pressure check', 'Demo'],
        excluded: ['Extra copper pipe beyond 3 ft', 'Outdoor stand', 'Core cutting'],
        requiredInfo: [{ key: 'wall_type', label: 'Wall type', type: 'select', options: ['Brick', 'Concrete', 'Other'], required: true }],
        rate: { customerPrice: 1399, spPayout: 850, ...EXPRESS_RATE }, demo: true,
      },
      {
        code: 'AC-SPLIT-15T-INSTALL', name: 'Split AC 1.5 Ton Installation', productType: 'split', variant: '15t', service: 'installation',
        unitLabel: 'per AC', minQty: 1, maxQty: 5, express: EXPRESS, estimatedDurationMins: 120,
        included: ['Indoor & outdoor unit mounting', 'Up to 3 ft copper piping', 'Gas pressure check', 'Demo'],
        excluded: ['Extra copper pipe beyond 3 ft', 'Outdoor stand', 'Core cutting'],
        requiredInfo: [{ key: 'wall_type', label: 'Wall type', type: 'select', options: ['Brick', 'Concrete', 'Other'], required: true }],
        rate: { customerPrice: 1499, spPayout: 900, ...EXPRESS_RATE },
      },
      {
        code: 'AC-SPLIT-2T-INSTALL', name: 'Split AC 2 Ton Installation', productType: 'split', variant: '2t', service: 'installation',
        unitLabel: 'per AC', minQty: 1, maxQty: 5, express: EXPRESS, estimatedDurationMins: 150,
        included: ['Indoor & outdoor unit mounting', 'Up to 3 ft copper piping', 'Gas pressure check', 'Demo'],
        excluded: ['Extra copper pipe beyond 3 ft', 'Outdoor stand', 'Core cutting'],
        requiredInfo: [{ key: 'wall_type', label: 'Wall type', type: 'select', options: ['Brick', 'Concrete', 'Other'], required: true }],
        rate: { customerPrice: 1699, spPayout: 1000, ...EXPRESS_RATE }, demo: true,
      },
      {
        // Variant-agnostic: the client priced uninstallation without a tonnage.
        // Customer price ₹999 is the client's; the payout is a placeholder.
        code: 'AC-SPLIT-UNINSTALL', name: 'Split AC Uninstallation', productType: 'split', variant: null, service: 'uninstallation',
        unitLabel: 'per AC', minQty: 1, maxQty: 5, express: EXPRESS, estimatedDurationMins: 60,
        included: ['Gas pump-down', 'Indoor & outdoor unit removal', 'Basic packing'],
        excluded: ['Re-installation', 'Wall repair / painting'],
        rate: { customerPrice: 999, spPayout: 550, ...EXPRESS_RATE }, demo: true,
      },
      {
        code: 'AC-SPLIT-REPAIR', name: 'Split AC Repair Visit', productType: 'split', variant: null, service: 'repair',
        pricingUnit: 'PER_SERVICE', unitLabel: 'per visit', express: EXPRESS, estimatedDurationMins: 60,
        description: 'Diagnosis and labour for the repair. Spare parts are quoted on site and added only with your approval.',
        excluded: ['Spare parts', 'Gas refilling'],
        rate: { customerPrice: 399, spPayout: 250, ...EXPRESS_RATE }, demo: true,
      },
      {
        code: 'AC-SPLIT-DEEPCLEAN', name: 'Split AC Deep Cleaning', productType: 'split', variant: null, service: 'deep_cleaning',
        unitLabel: 'per AC', minQty: 1, maxQty: 5, express: EXPRESS, estimatedDurationMins: 75,
        included: ['Foam-jet indoor coil wash', 'Filter & drain cleaning', 'Outdoor unit wash'],
        rate: { customerPrice: 649, spPayout: 380, ...EXPRESS_RATE }, demo: true,
      },
      {
        code: 'AC-SPLIT-GAS', name: 'Split AC Gas Refilling', productType: 'split', variant: null, service: 'gas_refilling',
        unitLabel: 'per AC', minQty: 1, maxQty: 5, express: EXPRESS, estimatedDurationMins: 90,
        included: ['Leak test', 'Full gas refill', 'Cooling check'],
        excluded: ['Leak repair / brazing'],
        rate: { customerPrice: 2499, spPayout: 1200, ...EXPRESS_RATE }, demo: true,
      },
      {
        code: 'AC-WINDOW-INSTALL', name: 'Window AC Installation', productType: 'window', variant: null, service: 'installation',
        unitLabel: 'per AC', minQty: 1, maxQty: 5, express: EXPRESS, estimatedDurationMins: 60,
        included: ['Unit fitting in existing window slot', 'Demo'],
        excluded: ['Wall cutting / new slot', 'Window frame or stand'],
        rate: { customerPrice: 599, spPayout: 350, ...EXPRESS_RATE },
      },
      {
        code: 'AC-WINDOW-UNINSTALL', name: 'Window AC Uninstallation', productType: 'window', variant: null, service: 'uninstallation',
        unitLabel: 'per AC', minQty: 1, maxQty: 5, express: EXPRESS, estimatedDurationMins: 45,
        rate: { customerPrice: 399, spPayout: 220, ...EXPRESS_RATE }, demo: true,
      },
      {
        code: 'AC-WINDOW-REPAIR', name: 'Window AC Repair Visit', productType: 'window', variant: null, service: 'repair',
        pricingUnit: 'PER_SERVICE', unitLabel: 'per visit', express: EXPRESS, estimatedDurationMins: 60,
        description: 'Diagnosis and labour for the repair. Spare parts are quoted on site and added only with your approval.',
        excluded: ['Spare parts', 'Gas refilling'],
        rate: { customerPrice: 349, spPayout: 220, ...EXPRESS_RATE }, demo: true,
      },
    ],
  },

  // ─── TV ────────────────────────────────────────────────────────────────
  {
    key: 'TV',
    keywords: ['television', 'led', 'smart tv', 'wall mount'],
    productTypes: [
      {
        slug: 'led', name: 'LED TV', icon: '📺', desc: 'Standard LED/LCD flat screen',
        variantDimension: { key: 'screen_size', label: 'Screen Size' },
        variants: [
          { slug: '32', label: '32 inch' },
          { slug: '40-43', label: '40–43 inch' },
          { slug: '55-65', label: '55–65 inch' },
          { slug: '75-plus', label: '75 inch+' },
        ],
      },
    ],
    services: [
      { slug: 'installation', name: 'Installation', icon: '🔩', desc: 'Wall mount & setup', keywords: ['install', 'wall mount', 'mounting'] },
      { slug: 'uninstallation', name: 'Uninstallation', icon: '📤', desc: 'Safe removal from wall', keywords: ['uninstall', 'removal'] },
    ],
    offerings: [
      {
        code: 'TV-LED-32-INSTALL', name: 'LED TV 32 inch Installation', productType: 'led', variant: '32', service: 'installation',
        unitLabel: 'per TV', minQty: 1, maxQty: 3, express: EXPRESS, estimatedDurationMins: 45,
        included: ['Wall-mount fitting', 'Cable dressing', 'Demo'], excluded: ['Wall bracket (if not supplied with TV)'],
        rate: { customerPrice: 349, spPayout: 200, ...EXPRESS_RATE },
      },
      {
        code: 'TV-LED-40-43-INSTALL', name: 'LED TV 40–43 inch Installation', productType: 'led', variant: '40-43', service: 'installation',
        unitLabel: 'per TV', minQty: 1, maxQty: 3, express: EXPRESS, estimatedDurationMins: 60,
        included: ['Wall-mount fitting', 'Cable dressing', 'Demo'], excluded: ['Wall bracket (if not supplied with TV)'],
        rate: { customerPrice: 499, spPayout: 300, ...EXPRESS_RATE }, demo: true,
      },
      {
        code: 'TV-LED-55-65-INSTALL', name: 'LED TV 55–65 inch Installation', productType: 'led', variant: '55-65', service: 'installation',
        unitLabel: 'per TV', minQty: 1, maxQty: 3, express: EXPRESS, estimatedDurationMins: 90,
        included: ['Wall-mount fitting (2 technicians if needed)', 'Cable dressing', 'Demo'], excluded: ['Wall bracket (if not supplied with TV)'],
        rate: { customerPrice: 799, spPayout: 450, ...EXPRESS_RATE },
      },
      {
        code: 'TV-LED-75-INSTALL', name: 'LED TV 75 inch+ Installation', productType: 'led', variant: '75-plus', service: 'installation',
        unitLabel: 'per TV', minQty: 1, maxQty: 3, express: EXPRESS, estimatedDurationMins: 120,
        included: ['Wall-mount fitting (2 technicians)', 'Cable dressing', 'Demo'], excluded: ['Wall bracket (if not supplied with TV)'],
        rate: { customerPrice: 1299, spPayout: 700, ...EXPRESS_RATE }, demo: true,
      },
      {
        code: 'TV-LED-UNINSTALL', name: 'LED TV Uninstallation', productType: 'led', variant: null, service: 'uninstallation',
        unitLabel: 'per TV', minQty: 1, maxQty: 3, express: EXPRESS, estimatedDurationMins: 30,
        rate: { customerPrice: 299, spPayout: 150, ...EXPRESS_RATE }, demo: true,
      },
    ],
  },

  // ─── Washing Machine ───────────────────────────────────────────────────
  {
    key: 'Washing Machine',
    keywords: ['washer', 'front load', 'top load'],
    productTypes: [
      { slug: 'front_load', name: 'Front Load', icon: '🔄', desc: 'Auto, drum in front', variantDimension: null, variants: [] },
    ],
    services: [
      { slug: 'installation', name: 'Installation', icon: '🔩', desc: 'New machine setup & demo', keywords: ['install'] },
    ],
    offerings: [
      {
        code: 'WM-FRONT-INSTALL', name: 'Front Load Washing Machine Installation', productType: 'front_load', variant: null, service: 'installation',
        pricingUnit: 'PER_SERVICE', unitLabel: 'per machine', express: EXPRESS, estimatedDurationMins: 60,
        included: ['Inlet & drain connection', 'Transit bolt removal', 'Demo'], excluded: ['Plumbing work', 'Extra hoses'],
        rate: { customerPrice: 499, spPayout: 280, ...EXPRESS_RATE }, demo: true,
      },
    ],
  },

  // ─── Geyser ────────────────────────────────────────────────────────────
  {
    key: 'Geyser',
    keywords: ['water heater', 'geezer'],
    productTypes: [
      {
        slug: 'storage', name: 'Storage Geyser', icon: '🛢️', desc: '10 L · 15 L · 25 L tank',
        variantDimension: { key: 'capacity', label: 'Capacity' },
        variants: [
          { slug: '10l', label: '10 L' },
          { slug: '15l', label: '15 L' },
          { slug: '25l', label: '25 L' },
        ],
      },
    ],
    services: [
      { slug: 'installation', name: 'Installation', icon: '🔩', desc: 'New geyser fitting & safety check', keywords: ['install'] },
    ],
    offerings: [
      {
        code: 'GEYSER-15L-INSTALL', name: 'Storage Geyser 15 L Installation', productType: 'storage', variant: '15l', service: 'installation',
        unitLabel: 'per geyser', minQty: 1, maxQty: 3, express: EXPRESS, estimatedDurationMins: 60,
        included: ['Wall mounting', 'Inlet/outlet connection', 'Safety valve check'], excluded: ['Pipes & fittings', 'Electrical point'],
        rate: { customerPrice: 599, spPayout: 350, ...EXPRESS_RATE }, demo: true,
      },
    ],
  },

  // ─── CCTV (new category) ───────────────────────────────────────────────
  {
    key: 'CCTV',
    create: {
      name: 'CCTV & Wi-Fi Camera',
      color: '#37474F',
      lightBg: '#ECEFF1',
      groups: ['handyman'],
      section: 'Installation',
      isActive: true,
    },
    keywords: ['camera', 'cctv', 'wifi camera', 'security camera'],
    productTypes: [
      { slug: 'wifi_camera', name: 'Wi-Fi Camera', icon: '📷', desc: 'Smart home camera', variantDimension: null, variants: [] },
    ],
    services: [
      { slug: 'installation', name: 'Installation', icon: '🔩', desc: 'Mount, power & app setup', keywords: ['install', 'setup'] },
    ],
    offerings: [
      {
        code: 'CCTV-WIFI-INSTALL', name: 'Wi-Fi Camera Installation', productType: 'wifi_camera', variant: null, service: 'installation',
        unitLabel: 'per camera', minQty: 1, maxQty: 10, express: EXPRESS, estimatedDurationMins: 30,
        included: ['Wall/ceiling mounting', 'Power connection to existing point', 'App & Wi-Fi setup'], excluded: ['Wiring beyond 2 m', 'Memory card'],
        rate: { customerPrice: 399, spPayout: 220, ...EXPRESS_RATE }, demo: true,
      },
    ],
  },

  // ─── Electrician (standalone) ──────────────────────────────────────────
  {
    key: 'Electrician',
    keywords: ['electrician', 'electrical', 'wiring', 'switch', 'socket', 'fan', 'mcb'],
    productTypes: [],
    services: [
      { slug: 'fan_installation', name: 'Fan Installation', icon: '🌀', desc: 'Ceiling, wall or exhaust fan fitting', keywords: ['ceiling fan', 'fan fitting'] },
      { slug: 'switch_installation', name: 'Switch Installation', icon: '🔘', desc: 'New or replacement switch', keywords: ['switch', 'switchboard'] },
      { slug: 'socket_installation', name: 'Socket Installation', icon: '🔌', desc: 'New or replacement socket', keywords: ['socket', 'plug point'] },
      { slug: 'mcb_installation', name: 'MCB Installation', icon: '🛠️', desc: 'MCB fitting or replacement', keywords: ['mcb', 'db box', 'breaker'] },
      { slug: 'consultation', name: 'Electrician Consultation', icon: '🔍', desc: 'Visit to diagnose and advise', keywords: ['electrician', 'visit', 'diagnose'] },
      { slug: 'inspection', name: 'Electrical Inspection', icon: '📋', desc: 'Safety check of wiring & points', keywords: ['safety', 'audit'] },
      { slug: 'wiring_repair', name: 'Wiring Repair', icon: '⚡', desc: 'Faulty wiring & short circuit fix', keywords: ['short circuit', 'tripping'] },
    ],
    offerings: [
      {
        code: 'ELEC-FAN-INSTALL', name: 'Fan Installation', service: 'fan_installation',
        unitLabel: 'per fan', minQty: 1, maxQty: 10, express: EXPRESS, estimatedDurationMins: 30,
        included: ['Fan assembly & mounting on existing hook', 'Connection to existing point'], excluded: ['New hook / down-rod', 'New wiring'],
        requiredInfo: [{ key: 'fan_type', label: 'Fan type', type: 'select', options: ['Ceiling', 'Wall', 'Exhaust'], required: true }],
        rate: { customerPrice: 299, spPayout: 180, ...EXPRESS_RATE },
      },
      {
        code: 'ELEC-SWITCH-INSTALL', name: 'Switch Installation', service: 'switch_installation',
        pricingUnit: 'PER_PIECE', unitLabel: 'per switch', minQty: 1, maxQty: 20, express: EXPRESS, estimatedDurationMins: 15,
        excluded: ['Switch / material cost'],
        rate: { customerPrice: 99, spPayout: 60, ...EXPRESS_RATE }, demo: true,
      },
      {
        code: 'ELEC-SOCKET-INSTALL', name: 'Socket Installation', service: 'socket_installation',
        pricingUnit: 'PER_PIECE', unitLabel: 'per socket', minQty: 1, maxQty: 20, express: EXPRESS, estimatedDurationMins: 20,
        excluded: ['Socket / material cost'],
        rate: { customerPrice: 129, spPayout: 75, ...EXPRESS_RATE }, demo: true,
      },
      {
        code: 'ELEC-MCB-INSTALL', name: 'MCB Installation', service: 'mcb_installation',
        pricingUnit: 'PER_PIECE', unitLabel: 'per MCB', minQty: 1, maxQty: 10, express: EXPRESS, estimatedDurationMins: 30,
        excluded: ['MCB / material cost'],
        rate: { customerPrice: 249, spPayout: 150, ...EXPRESS_RATE }, demo: true,
      },
      {
        code: 'ELEC-CONSULT', name: 'Electrician Consultation', service: 'consultation',
        pricingUnit: 'PER_SERVICE', unitLabel: 'per visit', express: NO_EXPRESS, estimatedDurationMins: 30,
        description: 'An electrician visits, diagnoses the problem and quotes any additional work, which is added only with your approval.',
        rate: { customerPrice: 199, spPayout: 120, ...NO_EXPRESS_RATE }, demo: true,
      },
      {
        code: 'ELEC-INSPECT', name: 'Electrical Inspection', service: 'inspection',
        pricingUnit: 'PER_SERVICE', unitLabel: 'per visit', express: NO_EXPRESS, estimatedDurationMins: 60,
        rate: { customerPrice: 299, spPayout: 180, ...NO_EXPRESS_RATE }, demo: true,
      },
      {
        code: 'ELEC-WIRING-REPAIR', name: 'Wiring Repair', service: 'wiring_repair',
        pricingUnit: 'PER_SERVICE', unitLabel: 'per visit', express: EXPRESS, estimatedDurationMins: 60,
        excluded: ['Wire & material cost'],
        rate: { customerPrice: 349, spPayout: 210, ...EXPRESS_RATE }, demo: true,
      },
    ],
  },

  // ─── Water tank cleaning (standalone, with a tank-size option) ─────────
  {
    key: 'Water Tank Sump Cleaning',
    keywords: ['water tank', 'tank cleaning', 'sump', 'overhead tank', 'underground tank'],
    productTypes: [],
    services: [
      {
        slug: 'water_tank_cleaning', name: 'Water Tank Cleaning', icon: '💧', desc: 'Drain, scrub & sanitise',
        keywords: ['tank', 'sanitise'],
        optionDimension: { key: 'tank_capacity', label: 'Tank Capacity' },
        options: [
          { slug: 'upto-500l', label: 'Up to 500 L' },
          { slug: '501-1000l', label: '501–1000 L' },
          { slug: '1001-2000l', label: '1001–2000 L' },
          { slug: '2000l-plus', label: '2000 L+' },
        ],
      },
      { slug: 'overhead_tank_cleaning', name: 'Overhead Tank Cleaning', icon: '🏠', desc: 'Rooftop tank cleaning', keywords: ['overhead', 'roof tank'] },
      { slug: 'underground_tank_cleaning', name: 'Underground Tank Cleaning', icon: '⬇️', desc: 'Sump / underground tank cleaning', keywords: ['underground', 'sump'] },
    ],
    offerings: [
      {
        code: 'CLEAN-TANK-500L', name: 'Water Tank Cleaning (Up to 500 L)', service: 'water_tank_cleaning', variant: 'upto-500l',
        unitLabel: 'per tank', minQty: 1, maxQty: 5, express: EXPRESS, estimatedDurationMins: 60,
        included: ['Draining', 'Sludge removal', 'Scrubbing', 'Anti-bacterial rinse'],
        customerInstructions: 'Please stop water inflow to the tank 2 hours before the visit.',
        rate: { customerPrice: 499, spPayout: 300, ...EXPRESS_RATE }, demo: true,
      },
      {
        code: 'CLEAN-TANK-1000L', name: 'Water Tank Cleaning (501–1000 L)', service: 'water_tank_cleaning', variant: '501-1000l',
        unitLabel: 'per tank', minQty: 1, maxQty: 5, express: EXPRESS, estimatedDurationMins: 90,
        included: ['Draining', 'Sludge removal', 'Scrubbing', 'Anti-bacterial rinse'],
        customerInstructions: 'Please stop water inflow to the tank 2 hours before the visit.',
        rate: { customerPrice: 699, spPayout: 420, ...EXPRESS_RATE }, demo: true,
      },
      {
        code: 'CLEAN-TANK-2000L', name: 'Water Tank Cleaning (1001–2000 L)', service: 'water_tank_cleaning', variant: '1001-2000l',
        unitLabel: 'per tank', minQty: 1, maxQty: 5, express: EXPRESS, estimatedDurationMins: 120,
        included: ['Draining', 'Sludge removal', 'Scrubbing', 'Anti-bacterial rinse'],
        customerInstructions: 'Please stop water inflow to the tank 2 hours before the visit.',
        rate: { customerPrice: 999, spPayout: 600, ...EXPRESS_RATE }, demo: true,
      },
      {
        code: 'CLEAN-TANK-2000L-PLUS', name: 'Water Tank Cleaning (2000 L+)', service: 'water_tank_cleaning', variant: '2000l-plus',
        unitLabel: 'per tank', minQty: 1, maxQty: 5, express: EXPRESS, estimatedDurationMins: 150,
        included: ['Draining', 'Sludge removal', 'Scrubbing', 'Anti-bacterial rinse'],
        customerInstructions: 'Please stop water inflow to the tank 2 hours before the visit.',
        rate: { customerPrice: 1499, spPayout: 900, ...EXPRESS_RATE }, demo: true,
      },
      {
        code: 'CLEAN-OVERHEAD-TANK', name: 'Overhead Tank Cleaning', service: 'overhead_tank_cleaning',
        unitLabel: 'per tank', minQty: 1, maxQty: 5, express: EXPRESS, estimatedDurationMins: 90,
        rate: { customerPrice: 799, spPayout: 480, ...EXPRESS_RATE }, demo: true,
      },
      {
        code: 'CLEAN-UNDERGROUND-TANK', name: 'Underground Tank Cleaning', service: 'underground_tank_cleaning',
        unitLabel: 'per tank', minQty: 1, maxQty: 3, express: EXPRESS, estimatedDurationMins: 150,
        rate: { customerPrice: 1299, spPayout: 780, ...EXPRESS_RATE }, demo: true,
      },
    ],
  },

  // ─── RO (standalone services) ──────────────────────────────────────────
  {
    key: 'RO Water Purifier',
    keywords: ['ro', 'water purifier', 'purifier', 'filter'],
    productTypes: [],
    services: [
      { slug: 'prefilter_service', name: 'RO Pre-Filter Service / Replacement', icon: '🔄', desc: 'Pre-filter cleaning or replacement', keywords: ['pre filter', 'prefilter', 'sediment'] },
      { slug: 'inspection', name: 'RO Inspection', icon: '🔍', desc: 'TDS & performance check', keywords: ['tds', 'checkup'] },
      { slug: 'maintenance', name: 'RO Maintenance', icon: '🛠️', desc: 'Periodic service & sanitisation', keywords: ['service', 'amc'] },
    ],
    offerings: [
      {
        code: 'RO-PREFILTER', name: 'RO Pre-Filter Service / Replacement', service: 'prefilter_service',
        unitLabel: 'per unit', minQty: 1, maxQty: 3, express: EXPRESS, estimatedDurationMins: 30,
        excluded: ['Filter cartridge cost (if replaced)'],
        rate: { customerPrice: 349, spPayout: 200, ...EXPRESS_RATE }, demo: true,
      },
      {
        code: 'RO-INSPECT', name: 'RO Inspection', service: 'inspection',
        pricingUnit: 'PER_SERVICE', unitLabel: 'per visit', express: NO_EXPRESS, estimatedDurationMins: 30,
        rate: { customerPrice: 199, spPayout: 120, ...NO_EXPRESS_RATE }, demo: true,
      },
      {
        code: 'RO-MAINTENANCE', name: 'RO Maintenance', service: 'maintenance',
        unitLabel: 'per unit', minQty: 1, maxQty: 3, express: EXPRESS, estimatedDurationMins: 45,
        rate: { customerPrice: 499, spPayout: 300, ...EXPRESS_RATE }, demo: true,
      },
    ],
  },
];

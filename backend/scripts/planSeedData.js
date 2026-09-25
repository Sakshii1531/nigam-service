// AMC plans (docs/master-catalogue Phase 12). DEMO prices — the client
// replaces them from Super Admin → Plans. Benefits describe only what the
// platform really does: an AMC visit is booked as a covered job (₹0 to the
// customer) until the plan's visits run out or it expires.

const visitsLine = (n) => `${n} scheduled service visit${n === 1 ? '' : 's'} at no charge`;
const plan = (applianceCategory, tier, name, price, visitsTotal, extra = [], opts = {}) => ({
  name,
  tier,
  applianceCategory,
  price,
  visitsTotal,
  durationMonths: 12,
  benefits: [visitsLine(visitsTotal), 'Valid for 12 months', ...extra],
  displayOrder: { Silver: 1, Gold: 2, Platinum: 3 }[tier] || 9,
  isPopular: tier === 'Gold',
  isActive: true,
  ...opts,
});

export const AMC_PLAN_SEED = [
  // Any appliance — the old "membership" tiers, now AMC plans.
  plan(null, 'Silver', 'AMC Silver Plan', 999, 2, ['Covers one appliance of your choice'], { description: 'Basic yearly care for one appliance' }),
  plan(null, 'Gold', 'AMC Gold Plan', 2499, 4, ['Covers one appliance of your choice'], { description: 'Quarterly care for one appliance' }),
  plan(null, 'Platinum', 'AMC Platinum Plan', 3999, 6, ['Covers one appliance of your choice'], { description: 'Every-two-months care for one appliance' }),
  // Per appliance
  plan('AC', 'Silver', 'AC Silver AMC', 1199, 2, ['Pre-summer and post-summer service'], { description: 'Two services a year for one AC' }),
  plan('AC', 'Gold', 'AC Gold AMC', 1799, 3, ['Includes one deep (foam-jet) cleaning'], { description: 'Three services a year for one AC' }),
  plan('AC', 'Platinum', 'AC Platinum AMC', 2999, 4, ['Includes one deep (foam-jet) cleaning', 'Gas pressure check every visit']),
  plan('Refrigerator', 'Silver', 'Refrigerator Silver AMC', 799, 1, ['Coil and condenser clean']),
  plan('Refrigerator', 'Gold', 'Refrigerator Gold AMC', 1299, 2, ['Coil and condenser clean', 'Door gasket check']),
  plan('Washing Machine', 'Silver', 'Washing Machine Silver AMC', 699, 1, ['Drum and filter clean']),
  plan('Washing Machine', 'Gold', 'Washing Machine Gold AMC', 1199, 2, ['Drum and filter clean', 'Inlet and drain check']),
  plan('TV', 'Silver', 'TV Silver AMC', 599, 1, ['Picture and sound check']),
  plan('TV', 'Gold', 'TV Gold AMC', 999, 2, ['Picture and sound check', 'Wall-mount safety check']),
  plan('RO Water Purifier', 'Silver', 'RO Silver AMC', 999, 2, ['TDS check every visit']),
  plan('RO Water Purifier', 'Gold', 'RO Gold AMC', 1499, 4, ['TDS check every visit', 'Pre-filter cleaning']),
  plan('Geyser', 'Silver', 'Geyser Silver AMC', 599, 1, ['Descaling and flush']),
];

// Extended-warranty packs per appliance (docs/master-catalogue Phase 13). DEMO
// prices; the two any-appliance packs seeded earlier stay as they are.
const ew = (applianceCategory, name, durationYears, price, claimsTotal, features) => ({
  name,
  applianceCategory,
  durationYears,
  price,
  claimsTotal,
  description: `Extends your ${applianceCategory} warranty by ${durationYears} year${durationYears > 1 ? 's' : ''} from its current expiry.`,
  features,
  displayOrder: durationYears,
  isPopular: durationYears === 2,
  isActive: true,
});

export const EW_PLAN_SEED = [
  ew('TV', 'TV 1-Year Extended Warranty', 1, 999, 2, ['Panel and board repair cover', 'Genuine brand parts']),
  ew('TV', 'TV 2-Year Extended Warranty', 2, 1699, 3, ['Panel and board repair cover', 'Genuine brand parts', 'Free pick-up if needed']),
  ew('Refrigerator', 'Refrigerator 1-Year Extended Warranty', 1, 999, 2, ['Compressor and cooling cover', 'Genuine brand parts']),
  ew('Refrigerator', 'Refrigerator 2-Year Extended Warranty', 2, 1799, 3, ['Compressor and cooling cover', 'Gas charging included']),
  ew('Washing Machine', 'Washing Machine 1-Year Extended Warranty', 1, 999, 2, ['Motor and PCB cover', 'Genuine brand parts']),
  ew('AC', 'AC 1-Year Extended Warranty', 1, 1199, 2, ['Compressor and PCB cover', 'Genuine brand parts']),
  ew('AC', 'AC 2-Year Extended Warranty', 2, 1999, 3, ['Compressor and PCB cover', 'Gas charging included']),
  ew('RO Water Purifier', 'RO 1-Year Extended Warranty', 1, 699, 2, ['Pump and PCB cover']),
  ew('Geyser', 'Geyser 1-Year Extended Warranty', 1, 599, 2, ['Element and thermostat cover']),
  ew('Microwave', 'Microwave 1-Year Extended Warranty', 1, 599, 2, ['Magnetron and PCB cover']),
  ew('Chimney', 'Chimney 1-Year Extended Warranty', 1, 699, 2, ['Motor and PCB cover']),
  ew('Air Cooler', 'Air Cooler 1-Year Extended Warranty', 1, 499, 2, ['Motor and pump cover']),
];

// Spare parts sold in the store (Buy → Spare Parts & Accessories, Dashboard
// strip). Ordinary admin-managed Products in the "Spare Parts" category.
export const SPARE_PART_SEED = [
  ['RO Pre-Filter Candle', 'RO outer candle', 199, 'SP-RO-PREFILTER'],
  ['RO Membrane', 'High-TDS membrane', 899, 'SP-RO-MEMBRANE'],
  ['RO Sediment Filter', 'RO inner filter', 249, 'SP-RO-SEDIMENT'],
  ['RO Carbon Filter', 'Activated carbon', 299, 'SP-RO-CARBON'],
  ['RO Post-Carbon Filter', 'Taste enhancer', 249, 'SP-RO-POSTCARBON'],
].map(([name, spec, price, sku]) => ({
  category: 'Spare Parts',
  name,
  specs: [spec],
  condition: 'New',
  price,
  stock: 50,
  sku,
  benefits: ['Genuine part'],
  isActive: true,
}));

// Names for the categories, product types and services the Master Catalogue
// seeds beyond the hand-built ones in masterCatalogueSeedData.js
// (docs/master-catalogue Phase 8). They are the names the app showed before the
// catalogue existed, so nothing a customer knows is renamed.
//
// `base` is a reference price (₹) the generator in catalogueExpansion.js turns
// into a random but deterministic DEMO rate. Every generated rate is a
// placeholder: it is flagged ⚠ DEMO in the admin until a real rate is saved.
//
// Generated once from the pre-catalogue seed (git show 4bd4b3d:backend/scripts/catalogSeedData.js).

export const NEW_CATEGORIES = [
  {
    key: "Refrigerator",
    keywords: ["fridge", "freezer", "refrigerator"],
    unitLabel: "per fridge",
    productTypes: [
      { slug: "single_door", name: "Single Door", icon: "🚪", desc: "100 L – 260 L capacity" },
      { slug: "double_door", name: "Double Door", icon: "🚪🚪", desc: "260 L – 450 L capacity" },
      { slug: "side_by_side", name: "Side By Side", icon: "◀️▶️", desc: "500 L+ premium model" },
      { slug: "convertible", name: "Convertible", icon: "🔁", desc: "Fridge-freezer switching" },
      { slug: "french_door", name: "French Door", icon: "🏠", desc: "Multi-door premium" },
    ],
    services: [
      { slug: "cooling_issue", name: "Cooling Issue", icon: "🌡️", desc: "Not cooling / over-freezing fix", base: 449 },
      { slug: "installation", name: "Installation", icon: "🔩", desc: "Setup, levelling & demo", base: 299 },
      { slug: "repair", name: "Repair", icon: "🔧", desc: "General repairs & part fix", base: 499 },
      { slug: "maintenance", name: "Maintenance", icon: "🛠️", desc: "Coil clean & annual check", base: 349 },
      { slug: "gas_refilling", name: "Gas Refilling", icon: "💨", desc: "Refrigerant refill", base: 899 },
    ],
  },
  {
    key: "Microwave",
    keywords: ["oven", "otg", "microwave"],
    unitLabel: "per microwave",
    productTypes: [
      { slug: "solo", name: "Solo Microwave", icon: "📡", desc: "Basic reheating only" },
      { slug: "grill", name: "Grill Microwave", icon: "🔥", desc: "Heating + grilling mode" },
      { slug: "convection", name: "Convection", icon: "🌀", desc: "Baking, roasting & grilling" },
      { slug: "otg", name: "OTG", icon: "🍞", desc: "Oven toaster griller" },
    ],
    services: [
      { slug: "repair", name: "Repair", icon: "🔧", desc: "Not heating, sparking or dead", base: 349 },
      { slug: "installation", name: "Installation", icon: "🔩", desc: "Setup, demo & safety check", base: 199 },
      { slug: "deep_cleaning", name: "Deep Cleaning", icon: "✨", desc: "Interior deodorisation & clean", base: 249 },
      { slug: "maintenance", name: "Maintenance", icon: "🛠️", desc: "Annual check & magnetron test", base: 299 },
    ],
  },
  {
    key: "Chimney",
    keywords: ["kitchen chimney", "hood", "exhaust"],
    unitLabel: "per chimney",
    productTypes: [
      { slug: "baffle", name: "Baffle Filter", icon: "🌀", desc: "Curved aluminium mesh" },
      { slug: "cassette", name: "Cassette Filter", icon: "📦", desc: "Easy-clean cartridge" },
      { slug: "auto", name: "Auto-Clean", icon: "✨", desc: "Self-cleaning oil collector" },
      { slug: "filterless", name: "Filterless", icon: "🔆", desc: "No filter, centrifugal tech" },
    ],
    services: [
      { slug: "deep_cleaning", name: "Deep Cleaning", icon: "✨", desc: "Filter, motor & oil collector clean", base: 399 },
      { slug: "repair", name: "Repair", icon: "🔧", desc: "Motor, suction & button fix", base: 349 },
      { slug: "installation", name: "Installation", icon: "🔩", desc: "New chimney mounting & ducting", base: 499 },
      { slug: "filter_replace", name: "Filter Replacement", icon: "🔄", desc: "Baffle / mesh / cassette change", base: 299 },
      { slug: "maintenance", name: "Maintenance", icon: "🛠️", desc: "Annual service & suction test", base: 349 },
    ],
  },
  {
    key: "Air Cooler",
    keywords: ["cooler", "desert cooler"],
    unitLabel: "per cooler",
    productTypes: [
      { slug: "desert", name: "Desert Cooler", icon: "🏜️", desc: "Large, high-capacity tank" },
      { slug: "personal", name: "Personal Cooler", icon: "👤", desc: "Compact & portable" },
      { slug: "tower", name: "Tower Cooler", icon: "🏛️", desc: "Tall, 360° airflow" },
      { slug: "window", name: "Window Cooler", icon: "🪟", desc: "Window-mounted unit" },
    ],
    services: [
      { slug: "service_clean", name: "Service & Clean", icon: "✨", desc: "Pad, pump & tank clean", base: 249 },
      { slug: "repair", name: "Repair", icon: "🔧", desc: "Motor, pump & fan fix", base: 299 },
      { slug: "installation", name: "Installation", icon: "🔩", desc: "Setup & positioning", base: 199 },
      { slug: "pad_change", name: "Cooling Pad Change", icon: "🧽", desc: "Replace honeycomb/wood pads", base: 349 },
      { slug: "maintenance", name: "Maintenance", icon: "🛠️", desc: "Pre-summer full check", base: 299 },
    ],
  },
  {
    key: "Carpenter",
    keywords: ["carpentry", "furniture", "wood"],
    productTypes: [],
    services: [
      { slug: "consultation", name: "Carpentry Inspection Visit", icon: "🔍", desc: "Expert carpenter inspection for custom furniture, woodwork repair, or mounting. Consultation fee adjusted against final service invoice.", base: 149 },
      { slug: "bed_wardrobe", name: "Bed & Wardrobe Assembly / Repair", icon: "🛏️", desc: "Assembly and dismantle of king, queen, or single beds and wardrobes. Hinge adjustment, door alignment, and tight fitting.", base: 449, unitLabel: "per item", maxQty: 5 },
      { slug: "table_chair", name: "Table & Chair Repair", icon: "🪑", desc: "Fix loose wooden legs, wobbly dining chairs, and squeaky joints. High-strength adhesive and industrial screws included.", base: 249, unitLabel: "per item", maxQty: 10 },
      { slug: "door_lock", name: "Door Lock Installation & Repair", icon: "🔐", desc: "Installation of mortise lock, handle set, cylindrical lock, or latch fix. Ensures smooth latching and deadbolt alignment.", base: 299, unitLabel: "per lock", maxQty: 5 },
      { slug: "window_mesh", name: "Window & Mesh Fitting", icon: "🪟", desc: "Fix sliding window channels, wooden shutters, and mosquito mesh. Smooth gliding guaranteed.", base: 199, unitLabel: "per window", maxQty: 10 },
      { slug: "wall_hanging", name: "Wall Hangings & Mirror Mounting", icon: "🖼️", desc: "Drill and hang wall art, mirrors, clocks, bathroom accessories, and shelves. Clean, precise drilling with zero wall chipping.", base: 149, unitLabel: "per item", maxQty: 10 },
    ],
  },
  {
    key: "Plumber",
    keywords: ["plumbing", "tap", "leak", "pipe", "drain"],
    productTypes: [],
    services: [
      { slug: "consultation", name: "Plumber Inspection & Diagnosis", icon: "🔍", desc: "Complete diagnosis for concealed leakage, low water pressure, and pipe issues. Inspection charge waived off on repair.", base: 149 },
      { slug: "tap_mixer", name: "Tap & Mixer Repair / Replacement", icon: "🚰", desc: "Fix continuous dripping, spindle replacement, and angle valve installation. Compatible with Jaguar, Kohler, Hindware, and all major brands.", base: 199, unitLabel: "per tap", maxQty: 6 },
      { slug: "shower_diverter", name: "Shower & Diverter Servicing", icon: "🚿", desc: "Unclog shower nozzles, fix diverter cartridge, and clean hard water deposits.", base: 299 },
      { slug: "drainage", name: "Drainage Blockage Clearing", icon: "🌊", desc: "Unclog kitchen sink, bathroom floor trap, and balcony drainage. High-pressure rotary snake tool used for deep clearance.", base: 299 },
      { slug: "pipeline_leak", name: "Pipeline Leakage Repair", icon: "🔧", desc: "Repair damaged CPVC/UPVC pipes and solvent joint sealing.", base: 349 },
    ],
  },
  {
    key: "Sofa Repair",
    keywords: ["sofa", "couch"],
    productTypes: [],
    services: [
      { slug: "consultation", name: "Sofa Repair Inspection Visit", icon: "🔍", desc: "Expert inspection and diagnosis for sofa repair by certified technicians. Consultation charge is adjusted against your final service invoice.", base: 149 },
      { slug: "standard_service", name: "Sofa Repair Service", icon: "🛋️", desc: "Comprehensive repair, servicing, and inspection for your sofa. Includes genuine replacement parts and workmanship warranty.", base: 299 },
    ],
  },
  {
    key: "Tile Grouting",
    keywords: ["tiles", "grout"],
    productTypes: [],
    services: [
      { slug: "consultation", name: "Tile Grouting Inspection Visit", icon: "🔍", desc: "Expert inspection and diagnosis for tile grouting by certified technicians. Consultation charge is adjusted against your final service invoice.", base: 149 },
      { slug: "standard_service", name: "Tile Grouting Service", icon: "🧱", desc: "Comprehensive re-grouting, sealing, and inspection for your tiles. Includes genuine materials and workmanship warranty.", base: 299 },
    ],
  },
  {
    key: "Furniture Assembly",
    keywords: ["assemble", "ikea", "furniture"],
    productTypes: [],
    services: [
      { slug: "consultation", name: "Furniture Assembly Inspection Visit", icon: "🔍", desc: "Expert inspection and diagnosis for furniture assembly by certified technicians. Consultation charge is adjusted against your final service invoice.", base: 149 },
      { slug: "standard_service", name: "Furniture Assembly Service", icon: "🪑", desc: "Comprehensive assembly, fitting, and inspection for your furniture. Includes genuine hardware and workmanship warranty.", base: 299 },
    ],
  },
  {
    key: "Hanger Installation",
    keywords: ["cloth hanger", "drying stand"],
    productTypes: [],
    services: [
      { slug: "consultation", name: "Hanger Installation Inspection Visit", icon: "🔍", desc: "Expert inspection and diagnosis for hanger installation by certified technicians. Consultation charge is adjusted against your final service invoice.", base: 149 },
      { slug: "standard_service", name: "Hanger Installation Service", icon: "🪝", desc: "Comprehensive installation and inspection for cloth hangers / drying stands. Includes genuine hardware and workmanship warranty.", base: 299 },
    ],
  },
  {
    key: "Mosquito Mesh",
    keywords: ["mesh", "net", "mosquito"],
    productTypes: [],
    services: [
      { slug: "consultation", name: "Mosquito Mesh Inspection Visit", icon: "🔍", desc: "Expert inspection and diagnosis for mosquito mesh fitting by certified technicians. Consultation charge is adjusted against your final service invoice.", base: 149 },
      { slug: "standard_service", name: "Mosquito Mesh Service", icon: "🦟", desc: "Comprehensive mesh fitting, frame alignment, and inspection. Includes genuine materials and workmanship warranty.", base: 299 },
    ],
  },
  {
    key: "Safety Net",
    keywords: ["balcony net", "pigeon net"],
    productTypes: [],
    services: [
      { slug: "consultation", name: "Safety Net Inspection Visit", icon: "🔍", desc: "Expert inspection and diagnosis for balcony/window safety nets by certified technicians. Consultation charge is adjusted against your final service invoice.", base: 149 },
      { slug: "standard_service", name: "Safety Net Service", icon: "🕸️", desc: "Comprehensive net installation, anchoring, and inspection. Includes genuine materials and workmanship warranty.", base: 299 },
    ],
  },
  {
    key: "Gas Stove & Hob Services",
    keywords: ["gas stove", "hob", "burner"],
    productTypes: [],
    services: [
      { slug: "consultation", name: "Gas Stove Inspection Visit", icon: "🔍", desc: "Expert inspection and diagnosis for gas stove/hob by certified technicians. Consultation charge is adjusted against your final service invoice.", base: 149 },
      { slug: "standard_service", name: "Gas Stove Service", icon: "🔥", desc: "Comprehensive repair, servicing, and inspection for your gas stove or hob. Includes genuine replacement parts and workmanship warranty.", base: 299 },
    ],
  },
  {
    key: "Gas Pipeline Installation",
    keywords: ["gas pipeline", "png", "gas line"],
    productTypes: [],
    services: [
      { slug: "consultation", name: "Gas Pipeline Inspection Visit", icon: "🔍", desc: "Expert inspection and diagnosis for gas pipeline installation by certified technicians. Consultation charge is adjusted against your final service invoice.", base: 149 },
      { slug: "standard_service", name: "Gas Pipeline Installation", icon: "🛠️", desc: "Comprehensive pipeline fitting, leak testing, and safety certification. Includes genuine materials and workmanship warranty.", base: 499 },
    ],
  },
  {
    key: "Full House Cleaning",
    keywords: ["home cleaning", "deep cleaning", "house cleaning"],
    express: false,
    productTypes: [],
    services: [
      { slug: "full_home_deep_clean", name: "Complete Full Home Deep Cleaning", icon: "✨", desc: "Deep scrubbing and sanitization of bedrooms, living room, balconies, and windows. Hospital-grade eco-friendly chemicals used.", base: 2499 },
    ],
  },
  {
    key: "Bathroom Cleaning",
    keywords: ["bathroom", "toilet"],
    productTypes: [],
    services: [
      { slug: "bathroom_deep_clean", name: "Bathroom Deep Cleaning", icon: "🚿", desc: "Tile stain removal, hard water descaling, mirror shine, and toilet bowl sanitization.", base: 449, unitLabel: "per bathroom", maxQty: 5 },
    ],
  },
  {
    key: "Kitchen Cleaning",
    keywords: ["kitchen"],
    productTypes: [],
    services: [
      { slug: "kitchen_deep_clean", name: "Kitchen Deep Cleaning", icon: "✨", desc: "Oil and grease removal from slab, tiles, stove, and chimney exteriors.", base: 899, unitLabel: "per kitchen", maxQty: 2 },
    ],
  },
  {
    key: "Sofa Carpet Mattress Cleaning",
    keywords: ["sofa cleaning", "carpet", "mattress", "upholstery"],
    productTypes: [],
    services: [
      { slug: "consultation", name: "Sofa/Carpet/Mattress Cleaning Checkup", icon: "🔍", desc: "Expert inspection and diagnosis for upholstery cleaning by certified technicians. Consultation charge is adjusted against your final service invoice.", base: 149 },
      { slug: "standard_service", name: "Upholstery Deep Clean", icon: "🛋️", desc: "Vacuum extraction, stain treatment, and sanitization for sofas, carpets, and mattresses.", base: 299, unitLabel: "per item", maxQty: 10 },
    ],
  },
  {
    key: "Marble Polishing",
    keywords: ["marble", "floor polish"],
    express: false,
    productTypes: [],
    services: [
      { slug: "consultation", name: "Marble Polishing Inspection Visit", icon: "🔍", desc: "Expert inspection and diagnosis for marble flooring by certified technicians. Consultation charge is adjusted against your final service invoice.", base: 149 },
      { slug: "standard_service", name: "Marble Polishing Service", icon: "✨", desc: "Diamond grinding, crystallization, and high-gloss polishing for marble floors.", base: 299 },
    ],
  },
  {
    key: "Pest Control",
    keywords: ["pest", "insects"],
    productTypes: [],
    services: [
      { slug: "consultation", name: "Pest Control Inspection Visit", icon: "🔍", desc: "Expert inspection and diagnosis for general pest infestation by certified technicians. Consultation charge is adjusted against your final service invoice.", base: 149 },
      { slug: "standard_service", name: "General Pest Control", icon: "🐜", desc: "Comprehensive spraying, gel treatment, and inspection for common household pests.", base: 299 },
    ],
  },
  {
    key: "Cockroach Control Treatment",
    keywords: ["cockroach"],
    productTypes: [],
    services: [
      { slug: "consultation", name: "Cockroach Control Inspection Visit", icon: "🔍", desc: "Expert inspection and diagnosis for cockroach infestation by certified technicians. Consultation charge is adjusted against your final service invoice.", base: 149 },
      { slug: "standard_service", name: "Cockroach Control Treatment", icon: "🪳", desc: "Gel-based and spray treatment targeting cockroach breeding zones.", base: 299 },
    ],
  },
  {
    key: "Bed Bug Control Treatment",
    keywords: ["bed bug", "bedbug"],
    productTypes: [],
    services: [
      { slug: "consultation", name: "Bed Bug Control Inspection Visit", icon: "🔍", desc: "Expert inspection and diagnosis for bed bug infestation by certified technicians. Consultation charge is adjusted against your final service invoice.", base: 149 },
      { slug: "standard_service", name: "Bed Bug Control Treatment", icon: "🛏️", desc: "Heat and spray treatment for mattresses, bed frames, and upholstery.", base: 299 },
    ],
  },
  {
    key: "Rodent Control Treatment",
    keywords: ["rat", "mouse", "rodent"],
    productTypes: [],
    services: [
      { slug: "consultation", name: "Rodent Control Inspection Visit", icon: "🔍", desc: "Expert inspection and diagnosis for rodent infestation by certified technicians. Consultation charge is adjusted against your final service invoice.", base: 149 },
      { slug: "standard_service", name: "Rodent Control Treatment", icon: "🐭", desc: "Trap placement and baiting treatment for rodent-proofing your home.", base: 299 },
    ],
  },
  {
    key: "Termite Control",
    keywords: ["termite", "deemak"],
    express: false,
    productTypes: [],
    services: [
      { slug: "consultation", name: "Termite Control Inspection Visit", icon: "🔍", desc: "Expert inspection and diagnosis for termite infestation by certified technicians. Consultation charge is adjusted against your final service invoice.", base: 149 },
      { slug: "standard_service", name: "Termite Control Treatment", icon: "🐛", desc: "Anti-termite chemical barrier and wood treatment for long-term protection.", base: 299 },
    ],
  },
  {
    key: "Wall Painting",
    keywords: ["painting", "painter", "paint"],
    express: false,
    productTypes: [],
    services: [
      { slug: "consultation", name: "Wall Painting Inspection Visit", icon: "🔍", desc: "Expert inspection and estimate for interior/exterior wall painting by certified painters. Consultation charge is adjusted against your final service invoice.", base: 149 },
      { slug: "standard_service", name: "Wall Painting Service", icon: "🎨", desc: "Surface prep, primer, and two coats of premium emulsion paint.", base: 299 },
    ],
  },
  {
    key: "Waterproofing",
    keywords: ["leakage", "seepage", "damp"],
    express: false,
    productTypes: [],
    services: [
      { slug: "consultation", name: "Waterproofing Inspection Visit", icon: "🔍", desc: "Expert inspection and diagnosis for leakage and seepage by certified technicians. Consultation charge is adjusted against your final service invoice.", base: 149 },
      { slug: "standard_service", name: "Waterproofing Service", icon: "💧", desc: "Crack sealing and waterproof membrane coating for terraces, walls, and bathrooms.", base: 499 },
    ],
  },
  {
    key: "Home Shifting",
    keywords: ["packers", "movers", "relocation"],
    express: false,
    productTypes: [],
    services: [
      { slug: "consultation", name: "Home Shifting Inspection Visit", icon: "🔍", desc: "Expert survey and estimate for household relocation by certified movers. Consultation charge is adjusted against your final service invoice.", base: 149 },
      { slug: "standard_service", name: "Home Shifting Service", icon: "📦", desc: "Packing, loading, transport, and unloading for a full household move.", base: 2999 },
    ],
  },
  {
    key: "Office Relocation",
    keywords: ["office shifting", "movers"],
    express: false,
    productTypes: [],
    services: [
      { slug: "consultation", name: "Office Relocation Inspection Visit", icon: "🔍", desc: "Expert survey and estimate for office relocation by certified movers. Consultation charge is adjusted against your final service invoice.", base: 149 },
      { slug: "standard_service", name: "Office Relocation Service", icon: "🏢", desc: "Packing, loading, transport, and unloading for office furniture and equipment.", base: 3999 },
    ],
  },
  {
    key: "Home Renovation",
    keywords: ["renovation", "remodel"],
    express: false,
    productTypes: [],
    services: [
      { slug: "consultation", name: "Home Renovation Inspection Visit", icon: "🔍", desc: "On-site survey and estimate for full home renovation by certified contractors. Consultation charge is adjusted against your final service invoice.", base: 299 },
      { slug: "standard_service", name: "Home Renovation Service", icon: "🏠", desc: "Civil work, painting, and fixture upgrades scoped after inspection.", base: 4999 },
    ],
  },
  {
    key: "Kitchen Renovation",
    keywords: ["modular kitchen", "kitchen remodel"],
    express: false,
    productTypes: [],
    services: [
      { slug: "consultation", name: "Kitchen Renovation Inspection Visit", icon: "🔍", desc: "On-site survey and estimate for kitchen renovation by certified contractors. Consultation charge is adjusted against your final service invoice.", base: 299 },
      { slug: "standard_service", name: "Kitchen Renovation Service", icon: "🍳", desc: "Modular fittings, tiling, and plumbing/electrical rework scoped after inspection.", base: 3999 },
    ],
  },
  {
    key: "Bathroom Renovation",
    keywords: ["bathroom remodel"],
    express: false,
    productTypes: [],
    services: [
      { slug: "consultation", name: "Bathroom Renovation Inspection Visit", icon: "🔍", desc: "On-site survey and estimate for bathroom renovation by certified contractors. Consultation charge is adjusted against your final service invoice.", base: 299 },
      { slug: "standard_service", name: "Bathroom Renovation Service", icon: "🚽", desc: "Fittings, tiling, and waterproofing rework scoped after inspection.", base: 3499 },
    ],
  },
];
// Additions to hand-built categories. AC is deliberately not extended: its
// shape is the client's own example, and client Test 12 needs Window AC Gas
// Refilling / Deep Cleaning to stay unconfigured. `skip` lists (type, service)
// pairs that already have a hand-built offering.
export const EXTENSIONS = [
  {
    key: 'Washing Machine',
    unitLabel: 'per machine',
    productTypes: [
      { slug: 'top_load', name: 'Top Load', icon: '⬆️', desc: 'Auto, drum on top' },
      { slug: 'semi_auto', name: 'Semi Automatic', icon: '⚙️', desc: 'Manual water fill' },
    ],
    services: [
      { slug: 'installation', base: 299 },
      { slug: 'repair', name: 'Repair', icon: '🔧', desc: 'Fix spin, drain & motor issues', base: 399 },
      { slug: 'drum_cleaning', name: 'Drum Cleaning', icon: '✨', desc: 'Deep drum & tub sanitisation', base: 499 },
      { slug: 'maintenance', name: 'Maintenance', icon: '🛠️', desc: 'Preventive service & check', base: 349 },
      { slug: 'uninstallation', name: 'Uninstallation', icon: '📤', desc: 'Safe removal & packing', base: 199 },
    ],
    skip: [['front_load', 'installation']],
  },
  {
    key: 'Geyser',
    unitLabel: 'per geyser',
    productTypes: [
      { slug: 'instant', name: 'Instant Geyser', icon: '⚡', desc: '1 L – 6 L, instant heating' },
      { slug: 'solar', name: 'Solar Heater', icon: '☀️', desc: 'Solar water heating' },
    ],
    services: [
      { slug: 'installation', base: 399 },
      { slug: 'repair', name: 'Repair', icon: '🔧', desc: 'Heating & leakage issues', base: 299 },
      { slug: 'service_flush', name: 'Service & Flush', icon: '🚿', desc: 'Descaling & tank flush', base: 349 },
      { slug: 'element_replacement', name: 'Element Replacement', icon: '🔌', desc: 'Heating element change', base: 499 },
      { slug: 'anode_replacement', name: 'Anode Rod Change', icon: '🔩', desc: 'Corrosion protection rod', base: 299 },
    ],
    // Storage-geyser installs are priced per size (below); the other storage services are size-agnostic.
    skip: [['storage', 'installation']],
    extraOfferings: [
      { code: 'GEYSER-10L-INSTALL', productType: 'storage', variant: '10l', service: 'installation', name: 'Storage Geyser 10 L Installation', base: 499 },
      { code: 'GEYSER-25L-INSTALL', productType: 'storage', variant: '25l', service: 'installation', name: 'Storage Geyser 25 L Installation', base: 699 },
    ],
  },
  {
    key: 'TV',
    unitLabel: 'per TV',
    productTypes: [],
    services: [
      { slug: 'repair', name: 'Repair', icon: '🔧', desc: 'No display, no sound, power issues', base: 419, types: ['led'] },
      { slug: 'display_issue', name: 'Display Issue', icon: '🖥️', desc: 'Lines, patches, flicker', base: 599, types: ['led'] },
      { slug: 'maintenance', name: 'Maintenance', icon: '🛠️', desc: 'Dust clean & settings check', base: 249, types: ['led'] },
      { slug: 'panel_repair', name: 'Panel Replacement', icon: '🧩', desc: 'Screen panel change (panel extra)', base: 1499, types: ['led'] },
    ],
  },
  {
    key: 'RO Water Purifier',
    unitLabel: 'per purifier',
    productTypes: [],
    services: [
      { slug: 'installation', name: 'RO Installation', icon: '🔩', desc: 'Wall mount & plumbing', base: 399 },
      { slug: 'filter_replacement', name: 'RO Filter Replacement', icon: '🔄', desc: 'Sediment/carbon filters (filters extra)', base: 799 },
      { slug: 'repair', name: 'RO Repair', icon: '🔧', desc: 'Leakage, pump & flow issues', base: 349 },
      { slug: 'membrane_change', name: 'RO Membrane Change', icon: '💧', desc: 'Membrane replacement (membrane extra)', base: 849 },
    ],
  },
];

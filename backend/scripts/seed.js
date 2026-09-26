// Idempotent — safe to re-run. Seeds the baseline RBAC data (permissions, one
// platform role, one brand role) and exactly one User per role for local dev /
// the Phase 3 exit criterion ("seed one user per role; verify login -> protected
// route -> 403 on wrong role"). Run with: npm run seed (from backend/).

import { connectDB, disconnectDB, ensureIndexes } from '../src/config/db.js';
import { Permission } from '../src/modules/auth/permission.model.js';
import { Role } from '../src/modules/auth/role.model.js';
import { User } from '../src/modules/auth/user.model.js';
import { ServiceProvider } from '../src/modules/service-provider/serviceProvider.model.js';
import { Brand } from '../src/modules/super-admin/brand.model.js';
import { City } from '../src/modules/super-admin/city.model.js';
import { AssignmentWeighting } from '../src/modules/super-admin/assignmentWeighting.model.js';
import { Category } from '../src/modules/catalog/category.model.js';
import { Product } from '../src/modules/buy-commerce/product.model.js';
import { ProductCategory } from '../src/modules/buy-commerce/productCategory.model.js';
import { Coupon } from '../src/modules/rewards-loyalty/coupon.model.js';
import { ExchangeQuestionSet } from '../src/modules/warranty-amc-exchange/exchangeQuestionSet.model.js';
import { ExchangeCampaign } from '../src/modules/warranty-amc-exchange/exchangeCampaign.model.js';
import { AMCPlan } from '../src/modules/warranty-amc-exchange/amcPlan.model.js';
import { AMCSubscription } from '../src/modules/warranty-amc-exchange/amcSubscription.model.js';
import { ExtendedWarrantyOrder } from '../src/modules/warranty-amc-exchange/extendedWarrantyOrder.model.js';
import { ExtendedWarrantyPlan } from '../src/modules/warranty-amc-exchange/extendedWarrantyPlan.model.js';
import { ExchangeBaseValue } from '../src/modules/warranty-amc-exchange/exchangeBaseValue.model.js';
import { EXCHANGE_BASE_VALUES } from './exchangeBaseValueSeedData.js';
import { OwnedAppliance } from '../src/modules/service-requests/ownedAppliance.model.js';
import { Notification } from '../src/modules/notifications/notification.model.js';
import { hashPassword } from '../src/modules/auth/password.js';
import { ROLES } from '../src/config/constants.js';
import { CATEGORY_SEED } from './categorySeedData.js';
import { seedCatalogueBrands } from './seedCatalogueBrands.js';
import { seedHomeSections } from './seedHomeSections.js';
import { AMC_PLAN_SEED, EW_PLAN_SEED, SPARE_PART_SEED } from './planSeedData.js';
import { seedMasterCatalogue } from './seedMasterCatalogue.js';
import { seedDemoEntities } from './demoSeedData.js';

const PRODUCTS = [
  {
    category: 'Refrigerator',
    name: 'LG Double Door 260L',
    brand: 'LG',
    condition: 'Refurbished',
    conditionGrade: 'Excellent',
    originalPrice: 25000,
    price: 14999,
    stock: 5,
    sku: 'REF-LG-260L',
    warrantyMonths: 6,
    benefits: ['6-month seller warranty', 'Free delivery & installation'],
  },
  {
    category: 'Television',
    name: 'Samsung Crystal 4K 43"',
    brand: 'Samsung',
    condition: 'New',
    originalPrice: 32000,
    price: 29999,
    stock: 10,
    sku: 'TV-SAM-43-4K',
    warrantyMonths: 12,
    benefits: ['1-year brand warranty', 'Free wall-mount kit'],
  },
  {
    category: 'Washing Machine',
    name: 'IFB Front Load 6.5kg',
    brand: 'IFB',
    condition: 'Refurbished',
    conditionGrade: 'Good',
    originalPrice: 21000,
    price: 12499,
    stock: 3,
    sku: 'WM-IFB-6.5-FL',
    warrantyMonths: 3,
  },
];

// Mirrors frontend/src/data/exchangeMockData.js's defaultQuestionSets (q_mobile)
// and defaultCampaigns (c1) — same category, questions, deductions, bonus.
const EXCHANGE_QUESTION_SET = {
  name: 'Mobile Questions',
  category: 'Mobile',
  questions: [
    {
      text: 'Does the phone turn on and function properly?',
      type: 'Yes/No',
      options: ['Yes', 'No'],
      deductions: { No: 0.8 },
    },
    {
      text: 'Is the screen cracked, scratched, or showing line issues?',
      type: 'Radio',
      options: ['Flawless (No scratches)', 'Minor Scratches', 'Cracked Screen / Lines'],
      deductions: { 'Flawless (No scratches)': 0, 'Minor Scratches': 0.1, 'Cracked Screen / Lines': 0.4 },
    },
    {
      text: 'Are original accessories (charger, box) available?',
      type: 'Toggle',
      options: ['Yes', 'No'],
      deductions: { No: 0.05 },
    },
  ],
};

const EXCHANGE_CAMPAIGN = {
  name: 'Independence Day Offer',
  badgeText: 'Extra ₹1,500 Exchange Off',
  highlightColor: '#10B981',
  status: 'Active',
  bonusAmount: 1500,
};

const COUPON = { code: 'WELCOME150', discount: 150, description: '₹150 off your first order', status: 'Active' };

const PERMISSIONS = [
  { key: 'users:manage', description: 'Manage platform users', domain: 'users' },
  // Two granular levels rather than one — an ASM's per-instance permission
  // checkboxes (asm.service.js's createAsm) let super-admin hand out
  // view-only zone oversight without also granting approve/suspend power.
  { key: 'techs:view', description: 'View service providers and their submitted documents', domain: 'techs' },
  { key: 'techs:manage', description: 'Manage service providers (approve/suspend/reactivate)', domain: 'techs' },
  { key: 'brands:manage', description: 'Manage brands', domain: 'brands' },
  { key: 'billing:manage', description: 'Manage platform billing/finance', domain: 'billing' },
  { key: 'settings:manage', description: 'Manage platform settings', domain: 'settings' },
  { key: 'requests:manage', description: 'Manage service requests/complaints', domain: 'requests' },
  { key: 'invoices:export', description: 'View and export invoices', domain: 'invoices' },
  { key: 'catalog:manage', description: 'Manage brand catalog', domain: 'catalog' },
  { key: 'catalogue:manage', description: 'Manage the Master Service & Offering Catalogue (prices, partner payouts)', domain: 'catalogue' },
  { key: 'claims:approve', description: 'Approve/reject warranty & FOC claims', domain: 'claims' },
  { key: 'teams:manage', description: 'Manage brand teams/departments', domain: 'teams' },
];

async function upsertPermissions() {
  const docs = await Promise.all(
    PERMISSIONS.map((p) => Permission.findOneAndUpdate({ key: p.key }, p, { upsert: true, new: true })),
  );
  console.log(`[seed] ${docs.length} permissions ready`);
  return docs;
}

async function upsertBrand() {
  const brand = await Brand.findOneAndUpdate(
    { name: 'Demo Brand' },
    { name: 'Demo Brand', category: 'Appliances', status: 'Active' },
    { upsert: true, new: true },
  );
  console.log(`[seed] brand ready: ${brand.name} (${brand.id})`);
  return brand;
}

// Second brand + its own Brand Admin role — exists purely so there are two real,
// separately-scoped tenants to manually verify cross-tenant isolation against
// (Phase 7 exit criterion). Automated Jest/E2E specs still build their own
// throwaway two-brand fixtures per test, same isolation reasoning as every other
// "asserts on specifics" test in this codebase — this is for manual smoke testing
// and the Postman collection, not relied on by the automated suites.
async function upsertSecondBrand() {
  const brand = await Brand.findOneAndUpdate(
    { name: 'Second Demo Brand' },
    { name: 'Second Demo Brand', category: 'Electronics', status: 'Active' },
    { upsert: true, new: true },
  );
  console.log(`[seed] second brand ready: ${brand.name} (${brand.id})`);
  return brand;
}

async function upsertRoles(permissions, brand, secondBrand) {
  const permByKey = Object.fromEntries(permissions.map((p) => [p.key, p._id]));
  const brandAdminPermissions = [
    permByKey['requests:manage'],
    permByKey['invoices:export'],
    permByKey['catalog:manage'],
    permByKey['claims:approve'],
    permByKey['teams:manage'],
  ];

  const superAdminRole = await Role.findOneAndUpdate(
    { name: 'Super Admin', scope: 'platform' },
    { name: 'Super Admin', scope: 'platform', brand: null, permissions: permissions.map((p) => p._id) },
    { upsert: true, new: true },
  );

  const brandAdminRole = await Role.findOneAndUpdate(
    { name: 'Brand Admin', scope: 'brand', brand: brand._id },
    { name: 'Brand Admin', scope: 'brand', brand: brand._id, permissions: brandAdminPermissions },
    { upsert: true, new: true },
  );

  const secondBrandAdminRole = await Role.findOneAndUpdate(
    { name: 'Brand Admin', scope: 'brand', brand: secondBrand._id },
    { name: 'Brand Admin', scope: 'brand', brand: secondBrand._id, permissions: brandAdminPermissions },
    { upsert: true, new: true },
  );

  console.log(`[seed] roles ready: ${superAdminRole.name}, ${brandAdminRole.name} x2`);
  return { superAdminRole, brandAdminRole, secondBrandAdminRole };
}

async function upsertUser({ role, name, phone, email, password, extra = {} }) {
  const filter = { role, ...(phone ? { phone } : {}), ...(email ? { email } : {}) };
  const existing = await User.findOne(filter);
  if (existing) {
    console.log(`[seed] user already exists: ${role} ${email || phone}`);
    return existing;
  }

  const user = await User.create({
    role,
    name,
    phone,
    email,
    passwordHash: await hashPassword(password),
    status: 'Active',
    ...extra,
  });
  console.log(`[seed] created user: ${role} ${email || phone} (password: ${password})`);
  return user;
}

async function upsertCategories() {
  for (const entry of CATEGORY_SEED) {
    await Category.findOneAndUpdate({ key: entry.key }, entry, { upsert: true, new: true, setDefaultsOnInsert: true });
  }
  console.log(`[seed] ${CATEGORY_SEED.length} categories ready`);
}

async function upsertCatalogueBrands() {
  const { total } = await seedCatalogueBrands();
  console.log(`[seed] ${total} catalogue brands ready`);
}

// Home-screen service rows (Phase 22): tiles that point at bookable
// catalogue services — no price, rating or badge stored.
async function upsertHomeTiles() {
  const { created, removedLegacy } = await seedHomeSections();
  console.log(`[seed] home tiles: ${created} created, ${removedLegacy} legacy removed`);
}

async function upsertCommerce() {
  await Promise.all([...PRODUCTS, ...SPARE_PART_SEED].map((p) => Product.findOneAndUpdate({ sku: p.sku }, p, { upsert: true, setDefaultsOnInsert: true })));
  // The admin Products screen picks a product's category from this list.
  for (const [i, name] of ['Refrigerator', 'Television', 'Washing Machine', 'Spare Parts'].entries()) {
    await ProductCategory.findOneAndUpdate(
      { name },
      { name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), sortOrder: i, isActive: true },
      { upsert: true, setDefaultsOnInsert: true },
    );
  }
  console.log(`[seed] ${PRODUCTS.length + SPARE_PART_SEED.length} products ready`);

  await ExchangeQuestionSet.findOneAndUpdate({ category: EXCHANGE_QUESTION_SET.category }, EXCHANGE_QUESTION_SET, {
    upsert: true,
    setDefaultsOnInsert: true,
  });
  await ExchangeCampaign.findOneAndUpdate({ name: EXCHANGE_CAMPAIGN.name }, EXCHANGE_CAMPAIGN, {
    upsert: true,
    setDefaultsOnInsert: true,
  });
  // Trade-in base values — without these, no model can be valued online.
  await ExchangeBaseValue.bulkWrite(
    EXCHANGE_BASE_VALUES.map((row) => ({
      updateOne: {
        filter: { category: row.category, brand: row.brand, model: row.model },
        update: { $set: row },
        upsert: true,
      },
    })),
  );

  console.log(`[seed] exchange question set + campaign ready, ${EXCHANGE_BASE_VALUES.length} base values`);

  await Coupon.findOneAndUpdate({ code: COUPON.code }, COUPON, { upsert: true, setDefaultsOnInsert: true });
  console.log(`[seed] coupon ready: ${COUPON.code}`);
}

// AMC/Extended-Warranty purchase flows are deliberately deferred (Phase 5 scope
// decision) — these fixtures give Phase 6's AMC-Visit/NCC-Extended-Warranty job
// types something real to link against without building that flow early.
async function upsertTechFixtures(customer) {
  // AMC plans — the customer AMC page sells exactly these (Super Admin → Plans).
  for (const plan of AMC_PLAN_SEED) {
    await AMCPlan.findOneAndUpdate({ name: plan.name }, plan, { upsert: true, setDefaultsOnInsert: true });
  }
  const amcPlan = await AMCPlan.findOne({ name: 'AMC Gold Plan' });

  const amcSubscription = await AMCSubscription.findOneAndUpdate(
    { user: customer._id, brand: 'LG', model: 'Double Door 260L' },
    {
      user: customer._id,
      plan: amcPlan._id,
      brand: 'LG',
      model: 'Double Door 260L',
      expiryDate: new Date(Date.now() + 300 * 24 * 60 * 60 * 1000),
      status: 'Active',
      visitsTotal: 4,
      visitsRemaining: 4,
      visitNumber: 1,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  // The purchasable extension packs — ExtendWarranty.jsx reads these, and the
  // order endpoint prices from them, so an empty catalogue means nothing is
  // buyable rather than a silent default price.
  for (const pack of EW_PLAN_SEED) {
    await ExtendedWarrantyPlan.findOneAndUpdate({ name: pack.name }, pack, { upsert: true, setDefaultsOnInsert: true });
  }
  await ExtendedWarrantyPlan.findOneAndUpdate(
    { name: '1-Year Extension Pack' },
    {
      name: '1-Year Extension Pack',
      durationYears: 1,
      price: 799,
      description: 'Extends coverage by 1 full year from your current expiry date.',
      features: ['Full repair cover', 'Genuine brand parts', 'Zero inspection fee'],
      claimsTotal: 2,
      isActive: true,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  await ExtendedWarrantyPlan.findOneAndUpdate(
    { name: '2-Year Gold Extension Pack' },
    {
      name: '2-Year Gold Extension Pack',
      durationYears: 2,
      price: 1399,
      description: 'Extends coverage by 2 full years from your current expiry date.',
      features: ['2 years peace of mind', 'Priority serviceProvider booking', 'Comprehensive repair cover', 'Gas charging included'],
      claimsTotal: 3,
      isActive: true,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  // A registered appliance for the seeded customer, so the extend-warranty and
  // warranty-status screens have a real unit (with a real purchase date) to read.
  await OwnedAppliance.findOneAndUpdate(
    { user: customer._id, serialNumber: 'SEED-AC-0001' },
    {
      user: customer._id,
      category: 'AC',
      brand: 'Voltas',
      model: '1.5 Ton 3 Star Split',
      modelNumber: 'SAC-183V',
      serialNumber: 'SEED-AC-0001',
      purchaseDate: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  const extendedWarrantyOrder = await ExtendedWarrantyOrder.findOneAndUpdate(
    { user: customer._id, applianceCategory: 'AC', brand: 'Voltas' },
    {
      user: customer._id,
      applianceCategory: 'AC',
      brand: 'Voltas',
      tierId: 'ew-2yr',
      price: 1999,
      fullName: customer.name,
      mobile: customer.phone,
      validTill: new Date(Date.now() + 700 * 24 * 60 * 60 * 1000),
      status: 'Active',
      coverage: ['Compressor', 'Gas Refill', 'Electronic Parts'],
      claimsRemaining: 3,
      claimsTotal: 3,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  console.log(`[seed] AMC subscription ready: ${amcSubscription.id}, EW order ready: ${extendedWarrantyOrder.id}`);
  return { amcSubscription, extendedWarrantyOrder };
}

// Phase 8 platform fixtures — a City the seeded service provider belongs to
// (so the real weighted assignmentEngine.js has real proximity data to score
// against) and an explicit AssignmentWeighting doc (schema defaults, written
// out so it's visible/editable rather than only implied).
async function upsertPlatformFixtures() {
  const city = await City.findOneAndUpdate(
    { name: 'Lucknow', state: 'Uttar Pradesh' },
    { name: 'Lucknow', state: 'Uttar Pradesh', district: 'Lucknow', coverageAreaSqkm: 350, status: 'Active' },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  const weighting = await AssignmentWeighting.findOneAndUpdate(
    {},
    { proximityPercent: 40, skillPercent: 30, ratingPercent: 20, workloadPercent: 10 },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  console.log(`[seed] city ready: ${city.name} (${city.id})`);
  return { city, weighting };
}

async function main() {
  await connectDB();
  await ensureIndexes();
  await Notification.deleteMany({});

  const permissions = await upsertPermissions();
  const brand = await upsertBrand();
  const secondBrand = await upsertSecondBrand();
  const { superAdminRole, brandAdminRole, secondBrandAdminRole } = await upsertRoles(permissions, brand, secondBrand);
  const { city } = await upsertPlatformFixtures();

  const customer = await upsertUser({
    role: ROLES.CUSTOMER,
    name: 'Sakshi Dwivedi',
    phone: '9876543210',
    password: 'password123',
    extra: { walletCoins: 500 }, // 500 Nigam Coins = ₹50 (10 coins/₹1) — enough to smoke-test redemption
  });

  const serviceProviderUser = await upsertUser({
    role: ROLES.SERVICE_PROVIDER,
    name: 'Rahul Sharma',
    phone: '9000000001',
    password: 'password123',
  });

  await upsertUser({
    role: ROLES.BRAND_ADMIN,
    name: 'Brand Admin',
    email: 'admin123@gmail.com',
    password: 'admin123',
    extra: { brand: brand._id, assignedRoles: [brandAdminRole._id] },
  });

  await upsertUser({
    role: ROLES.BRAND_ADMIN,
    name: 'Second Brand Admin',
    email: 'admin2@gmail.com',
    password: 'admin123',
    extra: { brand: secondBrand._id, assignedRoles: [secondBrandAdminRole._id] },
  });

  await upsertUser({
    role: ROLES.SUPER_ADMIN,
    name: 'Super Admin',
    email: 'admin123@gmail.com',
    password: 'admin123',
    extra: { assignedRoles: [superAdminRole._id] },
  });

  const serviceProviderProfile = await ServiceProvider.findOneAndUpdate(
    { user: serviceProviderUser._id },
    {
      user: serviceProviderUser._id,
      name: serviceProviderUser.name,
      phone: serviceProviderUser.phone,
      status: 'Active',
      availability: 'Available',
      specs: ['AC', 'Refrigerator', 'Washing Machine'],
      city: city._id,
    },
    { upsert: true, new: true },
  );
  console.log(`[seed] serviceProvider profile ready: ${serviceProviderProfile.name} (${serviceProviderProfile.id})`);

  await upsertCategories();
  await upsertCatalogueBrands();
  // Master Service & Offering Catalogue (docs/master-catalogue): product
  // types, services, offerings and their rates — the only price source.
  const catalogue = await seedMasterCatalogue();
  console.log(`[seed] master catalogue ready: ${catalogue.offerings} offerings (${catalogue.ratesCreated} new rates)`);
  await upsertHomeTiles();
  await upsertCommerce();
  await upsertTechFixtures(customer);
  await seedDemoEntities();

  console.log(`[seed] customer ready: ${customer.name} (${customer.id})`);
  console.log('[seed] done');

  await disconnectDB();
}

main().catch(async (err) => {
  console.error('[seed] failed:', err);
  await disconnectDB();
  process.exit(1);
});

// Idempotent — safe to re-run. Seeds the baseline RBAC data (permissions, one
// platform role, one brand role) and exactly one User per role for local dev /
// the Phase 3 exit criterion ("seed one user per role; verify login -> protected
// route -> 403 on wrong role"). Run with: npm run seed (from backend/).

import { connectDB, disconnectDB, ensureIndexes } from '../src/config/db.js';
import { Permission } from '../src/modules/auth/permission.model.js';
import { Role } from '../src/modules/auth/role.model.js';
import { User } from '../src/modules/auth/user.model.js';
import { Technician } from '../src/modules/technician/technician.model.js';
import { Brand } from '../src/modules/super-admin/brand.model.js';
import { Category } from '../src/modules/catalog/category.model.js';
import { ProductType } from '../src/modules/catalog/productType.model.js';
import { ServiceCatalogItem } from '../src/modules/catalog/serviceCatalogItem.model.js';
import { Product } from '../src/modules/buy-commerce/product.model.js';
import { Coupon } from '../src/modules/rewards-loyalty/coupon.model.js';
import { ExchangeQuestionSet } from '../src/modules/warranty-amc-exchange/exchangeQuestionSet.model.js';
import { ExchangeCampaign } from '../src/modules/warranty-amc-exchange/exchangeCampaign.model.js';
import { hashPassword } from '../src/modules/auth/password.js';
import { ROLES } from '../src/config/constants.js';
import { CATALOG_SEED } from './catalogSeedData.js';

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
  { key: 'techs:manage', description: 'Manage technicians', domain: 'techs' },
  { key: 'brands:manage', description: 'Manage brands', domain: 'brands' },
  { key: 'billing:manage', description: 'Manage platform billing/finance', domain: 'billing' },
  { key: 'settings:manage', description: 'Manage platform settings', domain: 'settings' },
  { key: 'requests:manage', description: 'Manage service requests/complaints', domain: 'requests' },
  { key: 'invoices:export', description: 'View and export invoices', domain: 'invoices' },
  { key: 'catalog:manage', description: 'Manage brand catalog', domain: 'catalog' },
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

async function upsertRoles(permissions, brand) {
  const permByKey = Object.fromEntries(permissions.map((p) => [p.key, p._id]));

  const superAdminRole = await Role.findOneAndUpdate(
    { name: 'Super Admin', scope: 'platform' },
    { name: 'Super Admin', scope: 'platform', brand: null, permissions: permissions.map((p) => p._id) },
    { upsert: true, new: true },
  );

  const brandAdminRole = await Role.findOneAndUpdate(
    { name: 'Brand Admin', scope: 'brand', brand: brand._id },
    {
      name: 'Brand Admin',
      scope: 'brand',
      brand: brand._id,
      permissions: [
        permByKey['requests:manage'],
        permByKey['invoices:export'],
        permByKey['catalog:manage'],
        permByKey['claims:approve'],
        permByKey['teams:manage'],
      ],
    },
    { upsert: true, new: true },
  );

  console.log(`[seed] roles ready: ${superAdminRole.name}, ${brandAdminRole.name}`);
  return { superAdminRole, brandAdminRole };
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

async function upsertCatalog() {
  for (const entry of CATALOG_SEED) {
    const { productTypes, services, ...categoryFields } = entry;
    const category = await Category.findOneAndUpdate({ key: entry.key }, categoryFields, {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    });

    await Promise.all(
      productTypes.map((pt) =>
        ProductType.findOneAndUpdate({ category: category._id, slug: pt.slug }, { category: category._id, ...pt }, { upsert: true }),
      ),
    );
    await Promise.all(
      services.map((s) =>
        ServiceCatalogItem.findOneAndUpdate({ category: category._id, slug: s.slug }, { category: category._id, ...s }, { upsert: true }),
      ),
    );
  }
  console.log(`[seed] catalog ready: ${CATALOG_SEED.length} categories`);
}

async function upsertCommerce() {
  await Promise.all(PRODUCTS.map((p) => Product.findOneAndUpdate({ sku: p.sku }, p, { upsert: true, setDefaultsOnInsert: true })));
  console.log(`[seed] ${PRODUCTS.length} products ready`);

  await ExchangeQuestionSet.findOneAndUpdate({ category: EXCHANGE_QUESTION_SET.category }, EXCHANGE_QUESTION_SET, {
    upsert: true,
    setDefaultsOnInsert: true,
  });
  await ExchangeCampaign.findOneAndUpdate({ name: EXCHANGE_CAMPAIGN.name }, EXCHANGE_CAMPAIGN, {
    upsert: true,
    setDefaultsOnInsert: true,
  });
  console.log('[seed] exchange question set + campaign ready');

  await Coupon.findOneAndUpdate({ code: COUPON.code }, COUPON, { upsert: true, setDefaultsOnInsert: true });
  console.log(`[seed] coupon ready: ${COUPON.code}`);
}

async function main() {
  await connectDB();
  await ensureIndexes();

  const permissions = await upsertPermissions();
  const brand = await upsertBrand();
  const { superAdminRole, brandAdminRole } = await upsertRoles(permissions, brand);

  const customer = await upsertUser({
    role: ROLES.CUSTOMER,
    name: 'Sakshi Dwivedi',
    phone: '9876543210',
    password: 'password123',
    extra: { walletCoins: 500 }, // 500 Nigam Coins = ₹50 (10 coins/₹1) — enough to smoke-test redemption
  });

  const technicianUser = await upsertUser({
    role: ROLES.TECHNICIAN,
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
    role: ROLES.SUPER_ADMIN,
    name: 'Super Admin',
    email: 'admin123@gmail.com',
    password: 'admin123',
    extra: { assignedRoles: [superAdminRole._id] },
  });

  const technicianProfile = await Technician.findOneAndUpdate(
    { user: technicianUser._id },
    {
      user: technicianUser._id,
      name: technicianUser.name,
      phone: technicianUser.phone,
      status: 'Active',
      availability: 'Available',
      specs: ['AC', 'Refrigerator', 'Washing Machine'],
    },
    { upsert: true, new: true },
  );
  console.log(`[seed] technician profile ready: ${technicianProfile.name} (${technicianProfile.id})`);

  await upsertCatalog();
  await upsertCommerce();

  console.log(`[seed] customer ready: ${customer.name} (${customer.id})`);
  console.log('[seed] done');

  await disconnectDB();
}

main().catch(async (err) => {
  console.error('[seed] failed:', err);
  await disconnectDB();
  process.exit(1);
});

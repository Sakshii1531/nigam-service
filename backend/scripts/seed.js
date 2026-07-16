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
import { hashPassword } from '../src/modules/auth/password.js';
import { ROLES } from '../src/config/constants.js';

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

  console.log(`[seed] customer ready: ${customer.name} (${customer.id})`);
  console.log('[seed] done');

  await disconnectDB();
}

main().catch(async (err) => {
  console.error('[seed] failed:', err);
  await disconnectDB();
  process.exit(1);
});

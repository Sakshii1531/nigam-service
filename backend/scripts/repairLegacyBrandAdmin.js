// Targeted repair for pre-CRM owner accounts. Preview first; --apply is explicit.
// Unlike the original broad backfill, this refuses roleless/custom/restricted
// staff accounts and requires the expected brand ID as well as the email.
// node scripts/repairLegacyBrandAdmin.js --email owner@example.com --brand <id> [--apply]
import mongoose from 'mongoose';
import { pathToFileURL } from 'node:url';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { registerAllModels } from '../src/config/registerModels.js';
import { User } from '../src/modules/auth/user.model.js';
import { Role } from '../src/modules/auth/role.model.js';
import { Permission } from '../src/modules/auth/permission.model.js';
import { Brand } from '../src/modules/super-admin/brand.model.js';
import { AuditLog } from '../src/modules/super-admin/auditLog.model.js';
import { BRAND_PERMISSION_KEYS, SUPER_ADMIN_TEMPLATE } from '../src/modules/brand-crm/permissions.js';
import { ensureBrandRoleTemplates } from '../src/modules/brand-crm/roleTemplates.service.js';
import { runInTransaction } from '../src/utils/transaction.js';
import { invalidateBrandPermissions } from '../src/modules/brand-crm/brandPermission.middleware.js';

export async function repairLegacyBrandAdmin({ email, brandId, apply = false }) {
  if (!email || !mongoose.isValidObjectId(brandId)) throw new Error('Supply --email and the expected --brand ObjectId');
  const user = await User.findOne({ email: email.toLowerCase().trim(), role: 'brand_admin', brand: brandId, status: 'Active' });
  if (!user) throw new Error('No active Brand Admin matches this email and brand');
  const brand = await Brand.findById(brandId).select('name status').lean();
  if (!brand || brand.status !== 'Active') throw new Error('The expected brand must be active');
  const roles = await Role.find({ _id: { $in: user.assignedRoles } }).lean();
  const snapshot = user.assignedRoles.map(String);
  const owner = roles.find(r => r.scope === 'brand' && String(r.brand) === String(brandId) && r.template === SUPER_ADMIN_TEMPLATE);
  const current = await Permission.find({ _id: { $in: roles.filter(r => r.scope === 'brand' && String(r.brand) === String(brandId)).flatMap(r => r.permissions) }, scope: 'brand', key: { $in: BRAND_PERMISSION_KEYS } }).select('key').lean();
  if (!owner && (current.length || roles.length !== snapshot.length || !roles.length || roles.some(r => r.scope !== 'brand' || String(r.brand) !== String(brandId) || r.name !== 'Brand Admin' || r.template))) {
    throw new Error('Not a legacy owner: refusing to elevate roleless, custom, restricted or foreign-brand staff');
  }
  const preview = { email: user.email, brand: brand.name, brandId: String(brandId), previousRoles: roles.map(r => r.name), effectivePermissionCount: current.length, targetRole: 'Brand Super Admin', applied: false };
  if (!apply) return preview;
  const templates = await ensureBrandRoleTemplates(brandId);
  const target = templates[SUPER_ADMIN_TEMPLATE];
  if (!owner) await runInTransaction(async session => {
    const result = await User.updateOne({ _id: user._id, role: 'brand_admin', brand: brandId, status: 'Active', assignedRoles: user.assignedRoles }, { $addToSet: { assignedRoles: target._id } }, { session });
    if (result.modifiedCount !== 1) throw new Error('Account roles changed during repair; inspect again before retrying');
    await AuditLog.create([{
      brand: brandId, user: null, actor: { kind: 'system', name: 'Targeted legacy Brand CRM owner repair' },
      type: 'User', entityType: 'User', entityId: user._id, action: 'auth.roles_changed',
      reason: 'Restore pre-CRM owner access after verified legacy permission migration',
      meta: { changes: { assignedRoles: [snapshot, [...snapshot, String(target._id)]] } },
    }], { session });
  });
  invalidateBrandPermissions(user.id);
  return { ...preview, applied: true, alreadyOwner: Boolean(owner), effectivePermissionCount: target.permissions.length };
}

async function main() {
  const args = process.argv.slice(2);
  const value = flag => args[args.indexOf(flag) + 1];
  if (!args.includes('--email') || !args.includes('--brand')) throw new Error('Usage: --email <email> --brand <brand-id> [--apply]');
  // A role repair must not rebuild unrelated collection indexes.
  mongoose.set('autoIndex', false);
  await registerAllModels(); await connectDB();
  console.log(JSON.stringify(await repairLegacyBrandAdmin({ email: value('--email'), brandId: value('--brand'), apply: args.includes('--apply') }), null, 2));
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => { console.error('[legacy-owner-repair]', error.message); process.exitCode = 1; }).finally(disconnectDB);
}

import { User } from '../auth/user.model.js';

// Actor snapshots (docs/brand-crm/ARCHITECTURE.md §5): who did something, as
// they were at that moment — name, employee ID, role names, department. Stored
// on timeline events, on ticket fields such as registeredBy, and in AuditLog,
// so "approved by Vikram S (LG-WE-003)" stays true after a rename or a role
// change.

export function snapshotOf(user, kind) {
  return {
    kind,
    user: user?._id || null,
    name: user?.name || null,
    employeeId: user?.employeeId || null,
    roles: (user?.assignedRoles || []).map((r) => r?.name).filter(Boolean),
    department: user?.department || null,
  };
}

/** Loads the user and builds their snapshot. `kind`: 'brand' | 'admin' | 'customer' | 'partner'. */
export async function actorFromUser(userId, kind) {
  const user = await User.findById(userId).select('name employeeId department assignedRoles').populate('assignedRoles', 'name').lean();
  if (!user) return { kind, user: userId || null, name: null, employeeId: null, roles: [], department: null };
  return snapshotOf(user, kind);
}

const KIND_BY_ROLE = { brand_admin: 'brand', super_admin: 'admin', customer: 'customer', service_provider: 'partner', asm: 'admin' };

/** Snapshot of the caller of an authenticated request. */
export function actorFromReq(req) {
  return actorFromUser(req.user.id, KIND_BY_ROLE[req.user.role] || 'system');
}

export const SYSTEM_ACTOR = Object.freeze({ kind: 'system', user: null, name: 'NCC', employeeId: null, roles: [], department: null });

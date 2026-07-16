import { User } from '../auth/user.model.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { parsePagination, paginationMeta } from '../../utils/pagination.js';

// Platform-wide user management across all 4 app roles. User.findById/find()
// respect passwordHash's `select: false` by default — never use `.create()`'s
// return value directly in a response (see brand-admin/brandUser.service.js's
// Phase 7 bug for why), but that doesn't apply here since this module never
// creates users, only lists/updates status on existing ones.

export async function listUsers({ role, status, page, limit, sort } = {}) {
  const query = {};
  if (role) query.role = role;
  if (status) query.status = status;

  const { skip, limit: lim, page: pg, sort: sortObj } = parsePagination({ page, limit, sort });
  const [items, total] = await Promise.all([
    User.find(query).sort(sortObj).skip(skip).limit(lim),
    User.countDocuments(query),
  ]);
  return { items, meta: paginationMeta({ page: pg, limit: lim, total }) };
}

async function findOr404(id) {
  const user = await User.findById(id);
  if (!user) throw new ApiError(404, 'User not found');
  return user;
}

export async function getUser(id) {
  return findOr404(id);
}

export async function updateUserStatus(id, status) {
  const user = await findOr404(id);
  user.status = status;
  await user.save();
  return user;
}

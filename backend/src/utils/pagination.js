import { PAGINATION_DEFAULT } from '../config/constants.js';

// Parse ?page=&limit=&sort= into a mongoose-ready { skip, limit, sort } triple,
// plus a meta object to echo back in the response envelope.
export function parsePagination(query = {}) {
  const page = Math.max(1, Number(query.page) || PAGINATION_DEFAULT.page);
  const limit = Math.min(PAGINATION_DEFAULT.maxLimit, Math.max(1, Number(query.limit) || PAGINATION_DEFAULT.limit));
  const skip = (page - 1) * limit;

  let sort = { createdAt: -1 };
  if (query.sort) {
    const desc = query.sort.startsWith('-');
    const field = desc ? query.sort.slice(1) : query.sort;
    sort = { [field]: desc ? -1 : 1 };
  }

  return { page, limit, skip, sort };
}

export function paginationMeta({ page, limit, total }) {
  return { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

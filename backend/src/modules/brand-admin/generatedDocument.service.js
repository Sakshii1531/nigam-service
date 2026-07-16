import { GeneratedDocument } from './generatedDocument.model.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { parsePagination, paginationMeta } from '../../utils/pagination.js';

export async function listDocuments(brandId, { type, page, limit, sort } = {}) {
  const query = { brand: brandId };
  if (type) query.type = type;

  const { skip, limit: lim, page: pg, sort: sortObj } = parsePagination({ page, limit, sort });
  const [items, total] = await Promise.all([
    GeneratedDocument.find(query).sort(sortObj).skip(skip).limit(lim),
    GeneratedDocument.countDocuments(query),
  ]);
  return { items, meta: paginationMeta({ page: pg, limit: lim, total }) };
}

export async function getDocument(brandId, id) {
  const doc = await GeneratedDocument.findById(id);
  if (!doc) throw new ApiError(404, 'Document not found');
  if (String(doc.brand) !== brandId) throw new ApiError(403, 'Not authorized to access this document');
  return doc;
}

/** PDF rendering itself is out of scope (no templating engine wired up) — this
 * just tracks that a document of this type was generated and where it lives,
 * same "interface exists, real implementation deferred" shape as fileUpload.js's
 * local-disk fallback. */
export async function generateDocument(brandId, generatedByUserId, { type, serviceRequest, pdfUrl }) {
  return GeneratedDocument.create({
    brand: brandId,
    type,
    serviceRequest,
    generatedBy: generatedByUserId,
    pdfUrl: pdfUrl || null,
  });
}

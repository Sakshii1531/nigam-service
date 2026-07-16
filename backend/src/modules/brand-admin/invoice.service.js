import { Invoice } from './invoice.model.js';
import { ServiceRequest } from '../service-requests/serviceRequest.model.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { parsePagination, paginationMeta } from '../../utils/pagination.js';

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export async function listInvoices(brandId, { status, page, limit, sort } = {}) {
  const query = { brand: brandId };
  if (status) query.status = status;

  const { skip, limit: lim, page: pg, sort: sortObj } = parsePagination({ page, limit, sort });
  const [items, total] = await Promise.all([
    Invoice.find(query).sort(sortObj).skip(skip).limit(lim),
    Invoice.countDocuments(query),
  ]);
  return { items, meta: paginationMeta({ page: pg, limit: lim, total }) };
}

async function findOwnedOr404(brandId, id) {
  const invoice = await Invoice.findById(id);
  if (!invoice) throw new ApiError(404, 'Invoice not found');
  if (String(invoice.brand) !== brandId) throw new ApiError(403, 'Not authorized to access this invoice');
  return invoice;
}

export async function getInvoice(brandId, id) {
  return findOwnedOr404(brandId, id);
}

/** total is always server-computed from the line items, never trusted from the
 * client, same convention as every other money total in this codebase. */
export async function createInvoice(brandId, { serviceRequest, customer, technician, product, serviceCharge = 0, partCharge = 0, gst = 0 }) {
  const sr = await ServiceRequest.findById(serviceRequest);
  if (!sr) throw new ApiError(404, 'Service request not found');
  if (sr.brand && String(sr.brand) !== brandId) throw new ApiError(403, 'That service request belongs to a different brand');

  return Invoice.create({
    brand: brandId,
    serviceRequest,
    customer,
    technician: technician || null,
    product,
    serviceCharge,
    partCharge,
    gst,
    total: round2(serviceCharge + partCharge + gst),
  });
}

export async function updateInvoiceStatus(brandId, id, status) {
  const invoice = await findOwnedOr404(brandId, id);
  invoice.status = status;
  await invoice.save();
  return invoice;
}

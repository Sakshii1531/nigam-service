// Central error shape for the whole API: { data: null, error: { message, code, details }, meta: {} }
// Domain code should throw ApiError (or let Mongoose/zod errors bubble) rather than
// hand-rolling res.status().json() in every route.

export class ApiError extends Error {
  constructor(statusCode, message, details = undefined) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function notFoundHandler(req, res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  // A malformed id is a client mistake, not a server fault. Mongoose raises
  // CastError from any findById with a non-ObjectId (a stale mock id like "p1",
  // a truncated URL), and that surfaced as a 500 with the raw driver message —
  // "Cast to ObjectId failed for value ..." — rendered straight onto the page.
  const isBadId = err.name === 'CastError' && err.kind === 'ObjectId';
  // An upload over multer's limit is the client's file, not a server fault.
  const isUploadError = err.name === 'MulterError';
  const isStaleWrite = err.name === 'VersionError';
  const isDuplicate = err.code === 11000;

  const statusCode = err.statusCode
    || (isDuplicate || isStaleWrite ? 409 : isBadId ? 404 : err.name === 'ValidationError' || isUploadError ? 400 : 500);
  let message = isBadId && !err.statusCode
    ? `No ${err.model?.modelName || 'record'} found for id "${err.value}"`
    : err.message || 'Internal server error';
  if (isUploadError && err.code === 'LIMIT_FILE_SIZE') message = 'File too large — videos can be at most 50 MB';
  if (isStaleWrite) message = 'This record changed while you were working. Refresh to see its current status.';
  if (isDuplicate) {
    const fields = err.keyPattern || err.keyValue || {};
    const field = Object.hasOwn(fields, 'phone') ? 'phone number' : Object.hasOwn(fields, 'email') ? 'email address' : Object.hasOwn(fields, 'employeeId') ? 'employee ID' : null;
    message = field ? `This ${field} is already registered. Edit the existing record or use a different ${field}.` : 'A record with these details already exists.';
  }

  if (statusCode >= 500) {
    req.log ? req.log.error({ err }, message) : console.error(err);
  }

  res.status(statusCode).json({
    data: null,
    error: {
      message,
      code: err.code || undefined,
      details: err.details || undefined,
    },
    meta: {},
  });
}

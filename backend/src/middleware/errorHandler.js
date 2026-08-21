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

  const statusCode = err.statusCode
    || (isBadId ? 404 : err.name === 'ValidationError' ? 400 : 500);
  const message = isBadId && !err.statusCode
    ? `No ${err.model?.modelName || 'record'} found for id "${err.value}"`
    : err.message || 'Internal server error';

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

// Consistent success envelope: { data, error: null, meta }
export function ok(res, data, meta = {}, statusCode = 200) {
  return res.status(statusCode).json({ data, error: null, meta });
}

export function created(res, data, meta = {}) {
  return ok(res, data, meta, 201);
}

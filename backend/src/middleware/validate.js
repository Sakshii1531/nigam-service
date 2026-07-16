import { ApiError } from './errorHandler.js';

// Wrap a zod schema: validate(schema.body, 'body') / validate(schema.query, 'query') / validate(schema.params, 'params')
export function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return next(new ApiError(400, 'Validation failed', result.error.flatten()));
    }
    req[source] = result.data;
    next();
  };
}

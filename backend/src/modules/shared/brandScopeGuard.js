import { auditContext } from './auditContext.js';

function requestBrand() {
  const store = auditContext.getStore();
  return store?.brandScope ? String(store.brandScope) : null;
}

function valuesForBrand(node, out = []) {
  if (!node || typeof node !== 'object') return out;
  if (Object.prototype.hasOwnProperty.call(node, 'brand')) out.push(node.brand);
  for (const [key, value] of Object.entries(node)) {
    if (key !== 'brand') valuesForBrand(value, out);
  }
  return out;
}

function includesBrand(value, brand) {
  if (value == null) return false;
  if (typeof value !== 'object' || value._bsontype) return String(value) === brand;
  if (Array.isArray(value)) return value.some((item) => includesBrand(item, brand));
  if ('$eq' in value) return includesBrand(value.$eq, brand);
  if ('$in' in value) return value.$in.length > 0 && value.$in.every((item) => includesBrand(item, brand));
  return false;
}

function guard(modelName, operation, condition) {
  const brand = requestBrand();
  if (!brand) return;
  const scoped = valuesForBrand(condition).some((value) => includesBrand(value, brand));
  if (scoped) return;
  const message = `[brand-scope] ${modelName}.${operation} requires brand ${brand} in its condition`;
  if (process.env.NODE_ENV === 'production') console.warn(message);
  else throw new Error(message);
}

/**
 * Defence in depth for collections owned by one brand. HTTP authentication
 * remains the authority; this catches a developer adding an unscoped query to
 * a brand request. Production logs to avoid taking an established route down,
 * while development and tests fail immediately.
 */
export function brandScopeGuard(schema) {
  schema.pre(/^find|^count|^update|^delete/, function scopedQuery() {
    guard(this.model.modelName, this.op, this.getFilter());
  });
  schema.pre('aggregate', function scopedAggregate() {
    guard(this._model.modelName, 'aggregate', this.pipeline());
  });
}

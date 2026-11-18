import { ObjectId } from 'mongodb';
import { HttpError } from './httpError.js';

/** Parses `data` with a zod schema or throws a 422 with per-field messages. */
export function parse(schema, data) {
  const result = schema.safeParse(data ?? {});
  if (result.success) return result.data;
  const errors = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join('.') || '_';
    if (!errors[key]) errors[key] = issue.message;
  }
  throw new HttpError(422, Object.values(errors)[0] || 'Validation failed', 'VALIDATION_ERROR', errors);
}

/** Converts a route param to an ObjectId or throws 400. */
export function parseId(value, label = 'id') {
  if (typeof value === 'string' && /^[a-f0-9]{24}$/i.test(value)) return new ObjectId(value);
  throw new HttpError(400, `Invalid ${label}`, 'INVALID_ID');
}

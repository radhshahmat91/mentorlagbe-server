import { Users } from '../config/db.js';
import { HttpError } from '../lib/httpError.js';
import { verifyAccessToken } from '../lib/jwt.js';

const toRequestUser = (doc) => ({
  id: String(doc._id),
  name: doc.name,
  email: doc.email,
  image: doc.image ?? null,
  role: doc.role ?? 'student',
  plan: doc.plan ?? 'free',
  phone: doc.phone ?? '',
  bio: doc.bio ?? '',
});

async function authenticate(req) {
  const header = req.headers.authorization || '';
  if (!/^bearer\s+/i.test(header)) {
    throw new HttpError(401, 'Sign in to continue', 'NO_TOKEN');
  }
  let payload;
  try {
    payload = verifyAccessToken(header.replace(/^bearer\s+/i, '').trim());
  } catch (error) {
    const expired = error.name === 'TokenExpiredError';
    throw new HttpError(401, expired ? 'Your session expired. Please sign in again.' : 'Invalid access token', expired ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN');
  }
  // Always read the CURRENT user so role and plan changes apply immediately.
  const doc = await Users().findOne({ email: payload.email });
  if (!doc) throw new HttpError(401, 'This account no longer exists', 'USER_NOT_FOUND');
  req.user = toRequestUser(doc);
}

/** Verifies the JWT and loads the current user into `req.user`. */
export async function verifyToken(req, res, next) {
  try {
    await authenticate(req);
    next();
  } catch (error) {
    next(error);
  }
}

/** Like verifyToken but never fails — `req.user` is null for guests or bad tokens. */
export async function optionalAuth(req, res, next) {
  req.user = null;
  if (!req.headers.authorization) return next();
  try {
    await authenticate(req);
  } catch {
    req.user = null;
  }
  next();
}

const requireRole = (role) => (req, res, next) =>
  req.user?.role === role ? next() : next(new HttpError(403, `Forbidden: ${role} access only`, 'FORBIDDEN'));

export const verifyStudent = [verifyToken, requireRole('student')];
export const verifyTutor = [verifyToken, requireRole('tutor')];
export const verifyAdmin = [verifyToken, requireRole('admin')];

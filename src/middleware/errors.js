import { env } from '../config/env.js';

export function notFoundHandler(req, res) {
  res.status(404).json({ message: 'Route not found', code: 'ROUTE_NOT_FOUND' });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  let status = err.status || err.statusCode || 500;
  let message = err.message;
  let code = typeof err.code === 'string' ? err.code : undefined;

  if (err.code === 'LIMIT_FILE_SIZE') {
    status = 413;
    message = 'Image must be 5 MB or smaller';
    code = 'FILE_TOO_LARGE';
  } else if (err.name === 'MulterError') {
    status = 400;
    code = 'UPLOAD_ERROR';
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Request body is not valid JSON';
    code = 'INVALID_JSON';
  } else if (err.code === 11000) {
    status = 409;
    message = 'That record already exists';
    code = 'DUPLICATE';
  } else if (typeof err.type === 'string' && err.type.startsWith('Stripe')) {
    code = 'STRIPE_ERROR';
    // Only errors the caller can act on keep their own status (bad session id, declined card, rate limit).
    // Anything else is OUR problem: Stripe is unreachable, or our key is wrong or lacks permission. Those must
    // never surface as 401/403, which the web app reads as "your login expired" or "wrong role".
    if ([400, 402, 404, 409, 429].includes(err.statusCode)) {
      status = err.statusCode;
    } else {
      status = 502;
      message =
        err.type === 'StripeAuthenticationError' || err.type === 'StripePermissionError'
          ? 'Payments are not set up correctly on the server yet.'
          : 'We could not reach Stripe just now. Please try again in a moment.';
    }
  }

  if (status >= 500) {
    if (!env.isTest) console.error(err);
    // Stripe messages above are already safe to show; anything else is replaced in production.
    if (env.isProd && code !== 'STRIPE_ERROR') message = 'Something went wrong on our side. Please try again.';
  }

  res.status(status).json({ message, ...(code && { code }), ...(err.errors && { errors: err.errors }) });
}

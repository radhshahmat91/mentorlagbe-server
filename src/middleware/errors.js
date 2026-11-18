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
    status = err.statusCode && err.statusCode < 500 ? err.statusCode : 502;
    code = 'STRIPE_ERROR';
  }

  if (status >= 500) {
    if (!env.isTest) console.error(err);
    if (env.isProd) message = 'Something went wrong on our side. Please try again.';
  }

  res.status(status).json({ message, ...(code && { code }), ...(err.errors && { errors: err.errors }) });
}

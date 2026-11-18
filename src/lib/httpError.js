export class HttpError extends Error {
  constructor(status, message, code, errors) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
    this.errors = errors;
  }
}

export const notFound = (what = 'Resource') => new HttpError(404, `${what} not found`, 'NOT_FOUND');

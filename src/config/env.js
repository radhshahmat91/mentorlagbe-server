import 'dotenv/config';

const list = (value) =>
  (value || '')
    .split(',')
    .map((item) => item.trim().replace(/\/+$/, ''))
    .filter(Boolean);

const port = Number(process.env.PORT) || 5000;
const isProd = process.env.NODE_ENV === 'production';

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd,
  isTest: process.env.NODE_ENV === 'test',
  port,
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017',
  dbName: process.env.MONGODB_DB || 'mentorlagbe',
  clientUrls: list(process.env.CLIENT_URL || 'http://localhost:3000'),
  authUrl: (process.env.BETTER_AUTH_URL || `http://localhost:${port}`).replace(/\/+$/, ''),
  authSecret: process.env.BETTER_AUTH_SECRET || 'dev-only-better-auth-secret-change-me-32chars',
  jwtSecret: process.env.JWT_SECRET || 'dev-only-jwt-secret-change-me-in-production-32',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  stripeSecret: process.env.STRIPE_SECRET_KEY || '',
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  imgbbKey: process.env.IMGBB_API_KEY || '',
  imgbbUrl: process.env.IMGBB_API_URL || 'https://api.imgbb.com/1/upload',
  adminEmail: (process.env.ADMIN_EMAIL || 'admin@mentorlagbe.com').toLowerCase(),
  adminPassword: process.env.ADMIN_PASSWORD || 'Admin@123456',
};

if (isProd && (!process.env.JWT_SECRET || !process.env.BETTER_AUTH_SECRET)) {
  console.warn('[config] JWT_SECRET / BETTER_AUTH_SECRET are not set — using insecure development defaults.');
}

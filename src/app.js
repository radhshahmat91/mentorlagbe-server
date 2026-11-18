import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { toNodeHandler } from 'better-auth/node';
import { db, ensureIndexes } from './config/db.js';
import { env } from './config/env.js';
import { auth } from './lib/auth.js';
import { HttpError } from './lib/httpError.js';
import { getStripe } from './lib/stripe.js';
import { uploadToImgBB } from './lib/imgbb.js';
import { errorHandler, notFoundHandler } from './middleware/errors.js';
import { bootstrapAdmin } from './services/bootstrap.js';
import { fulfilCheckoutSession } from './services/payments.js';
import accountRoutes from './routes/index.js';

/**
 * Builds the Express app. `stripe` and `uploadImage` can be injected (used by tests);
 * by default they are created lazily from environment variables.
 */
export function createApp({ stripe, uploadImage } = {}) {
  const getStripeClient = () => stripe ?? getStripe();
  const app = express();

  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

  const allowed = new Set([...env.clientUrls, 'http://localhost:3000']);
  app.use(
    cors({
      origin: (origin, callback) => callback(null, !origin || allowed.has(origin)),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Authorization', 'Content-Type'],
      exposedHeaders: ['set-auth-token'],
      maxAge: 86400,
    }),
  );
  if (!env.isTest) app.use(morgan(env.isProd ? 'tiny' : 'dev'));

  // BetterAuth must see the raw request, so it is mounted before express.json().
  app.all('/api/auth/*splat', toNodeHandler(auth));

  // Stripe needs the untouched body to verify its signature.
  app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    if (!env.stripeWebhookSecret && !stripe) {
      throw new HttpError(503, 'Stripe webhook is not configured', 'NOT_CONFIGURED');
    }
    let event;
    try {
      event = getStripeClient().webhooks.constructEvent(
        req.body,
        req.headers['stripe-signature'],
        env.stripeWebhookSecret,
      );
    } catch (error) {
      if (error instanceof HttpError) throw error;
      return res.status(400).json({ message: `Webhook signature verification failed: ${error.message}`, code: 'BAD_SIGNATURE' });
    }
    if (['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(event.type)) {
      await fulfilCheckoutSession(event.data.object);
    }
    res.json({ received: true });
  });

  app.use(express.json({ limit: '1mb' }));

  app.get('/', (req, res) => res.json({ name: 'MentorLagbe API', status: 'ok', time: new Date().toISOString() }));
  app.get('/api/health', async (req, res) => {
    await db.command({ ping: 1 });
    res.json({ status: 'ok', db: 'up' });
  });

  app.use('/api', accountRoutes({ getStripe: getStripeClient, uploadImage: uploadImage ?? uploadToImgBB }));
  app.use(notFoundHandler);
  app.use(errorHandler);

  if (!env.isTest) {
    ensureIndexes();
    bootstrapAdmin();
  }
  return app;
}

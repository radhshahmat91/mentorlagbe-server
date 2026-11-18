import { Router } from 'express';
import multer from 'multer';
import { fromNodeHeaders } from 'better-auth/node';
import { Payments, Users } from '../config/db.js';
import { env } from '../config/env.js';
import { auth } from '../lib/auth.js';
import { PLAN_NAMES, PRO_PRICE_USD } from '../lib/constants.js';
import { HttpError } from '../lib/httpError.js';
import { signAccessToken } from '../lib/jwt.js';
import { publicUser } from '../lib/serialize.js';
import { parse } from '../lib/validate.js';
import { profileSchema } from '../lib/schemas.js';
import { verifyToken } from '../middleware/auth.js';
import { fulfilCheckoutSession } from '../services/payments.js';

const ALLOWED_IMAGES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) =>
    ALLOWED_IMAGES.includes(file.mimetype)
      ? cb(null, true)
      : cb(new HttpError(422, 'Upload a PNG, JPG, WebP or GIF image', 'INVALID_FILE_TYPE')),
});

/** Routes for the signed-in user: JWT exchange, profile, uploads and Stripe payments. */
export function accountRoutes({ getStripe, uploadImage }) {
  const router = Router();

  // Exchanges a BetterAuth session (Bearer session token or cookie) for the API's JWT.
  router.post('/jwt', async (req, res) => {
    const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
    if (!session) throw new HttpError(401, 'Sign in to continue', 'NO_SESSION');
    const doc = await Users().findOne({ email: session.user.email });
    if (!doc) throw new HttpError(401, 'This account no longer exists', 'USER_NOT_FOUND');
    const { token, expiresIn } = signAccessToken(doc);
    res.json({ token, expiresIn, user: publicUser(doc) });
  });

  router.get('/users/me', verifyToken, async (req, res) => {
    res.json(publicUser(await Users().findOne({ email: req.user.email })));
  });

  // Only name, phone, bio and image can change here — never role, plan or email.
  router.patch('/users/me', verifyToken, async (req, res) => {
    const data = parse(profileSchema, req.body);
    if (data.image === '') data.image = null;
    const update = { ...data, updatedAt: new Date() };
    await Users().updateOne({ email: req.user.email }, { $set: update });
    res.json(publicUser(await Users().findOne({ email: req.user.email })));
  });

  router.post('/uploads/image', verifyToken, upload.single('image'), async (req, res) => {
    if (!req.file) throw new HttpError(422, 'Choose an image to upload', 'NO_FILE', { image: 'Choose an image to upload' });
    res.status(201).json(await uploadImage(req.file));
  });

  router.get('/payments/mine', verifyToken, async (req, res) => {
    const items = await Payments().find({ userEmail: req.user.email }).sort({ paidAt: -1 }).toArray();
    res.json({ items });
  });

  router.post('/payments/checkout', verifyToken, async (req, res) => {
    const { user } = req;
    if (!['student', 'tutor'].includes(user.role)) {
      throw new HttpError(403, 'Admin accounts do not need a Pro plan', 'FORBIDDEN');
    }
    if (user.plan === 'pro') throw new HttpError(409, 'You are already on the Pro plan', 'ALREADY_PRO');

    const stripe = getStripe();
    const planName = PLAN_NAMES[user.role];
    const base = env.clientUrls[0];
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: user.email,
      client_reference_id: user.id,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: PRO_PRICE_USD[user.role] * 100,
            product_data: {
              name: `MentorLagbe ${planName}`,
              description:
                user.role === 'tutor'
                  ? 'Unlimited tuition posts and a verified badge'
                  : 'Priority booking — your applications appear first to tutors',
            },
          },
        },
      ],
      metadata: { userId: user.id, userEmail: user.email, userName: user.name, userRole: user.role, planName },
      success_url: `${base}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/payment/cancel`,
    });
    res.json({ url: session.url, sessionId: session.id });
  });

  // Fallback to the webhook: the success page asks the server to confirm the session.
  router.get('/payments/verify', verifyToken, async (req, res) => {
    const sessionId = String(req.query.session_id || '');
    if (!sessionId.startsWith('cs_')) throw new HttpError(400, 'A valid session_id is required', 'INVALID_SESSION');

    const session = await getStripe().checkout.sessions.retrieve(sessionId);
    if (session.metadata?.userEmail !== req.user.email) {
      throw new HttpError(403, 'This payment belongs to another account', 'FORBIDDEN');
    }
    const result = await fulfilCheckoutSession(session);
    const user = await Users().findOne({ email: req.user.email });
    res.json({
      status: result.status,
      plan: user?.plan ?? 'free',
      payment: result.payment ?? null,
      alreadyProcessed: Boolean(result.alreadyProcessed),
    });
  });

  return router;
}

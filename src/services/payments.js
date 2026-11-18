import { Payments, Users } from '../config/db.js';
import { PLAN_NAMES } from '../lib/constants.js';

const paymentIntentId = (session) =>
  typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id || session.id;

/**
 * Turns a PAID Stripe Checkout session into a payment record and upgrades the
 * user to Pro. Safe to call many times (webhook retries + success-page verify).
 */
export async function fulfilCheckoutSession(session) {
  if (session.payment_status !== 'paid') return { status: 'unpaid' };

  const email = session.metadata?.userEmail;
  if (!email) return { status: 'unpaid' };

  const upgradeUser = () =>
    Users().updateOne({ email }, { $set: { plan: 'pro', planUpdatedAt: new Date(), updatedAt: new Date() } });

  const existing = await Payments().findOne({ stripeSessionId: session.id });
  if (existing) {
    await upgradeUser();
    return { status: 'paid', payment: existing, alreadyProcessed: true };
  }

  const role = session.metadata.userRole;
  const payment = {
    userEmail: email,
    userName: session.metadata.userName || email,
    userRole: role,
    planName: session.metadata.planName || PLAN_NAMES[role] || 'Pro Plan',
    amount: (session.amount_total ?? 0) / 100,
    currency: session.currency || 'usd',
    transactionId: paymentIntentId(session),
    stripeSessionId: session.id,
    paymentStatus: 'paid',
    paidAt: new Date(),
  };

  try {
    const { insertedId } = await Payments().insertOne(payment);
    payment._id = insertedId;
  } catch (error) {
    if (error.code === 11000) {
      // Webhook and success-page verify raced; the other one won.
      await upgradeUser();
      return { status: 'paid', payment: await Payments().findOne({ stripeSessionId: session.id }), alreadyProcessed: true };
    }
    throw error;
  }

  await upgradeUser();
  return { status: 'paid', payment, alreadyProcessed: false };
}

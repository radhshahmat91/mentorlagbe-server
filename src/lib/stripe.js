import Stripe from 'stripe';
import { env } from '../config/env.js';
import { HttpError } from './httpError.js';

let cached;

/** Lazily creates the Stripe client so the API still boots without Stripe keys. */
export function getStripe() {
  if (!env.stripeSecret) {
    throw new HttpError(503, 'Payments are not configured on this server yet', 'NOT_CONFIGURED');
  }
  cached ??= new Stripe(env.stripeSecret);
  return cached;
}

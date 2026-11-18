import { betterAuth } from 'better-auth';
import { mongodbAdapter } from 'better-auth/adapters/mongodb';
import { bearer } from 'better-auth/plugins';
import { client, db } from '../config/db.js';
import { env } from '../config/env.js';
import { SIGNUP_ROLES } from './constants.js';

/**
 * BetterAuth instance (email + password, MongoDB adapter).
 * - Users live in the `users` collection with role / plan / phone / bio.
 * - The bearer plugin returns a `set-auth-token` header so the SPA works across
 *   domains without third-party cookies.
 */
export const auth = betterAuth({
  appName: 'MentorLagbe',
  baseURL: env.authUrl,
  secret: env.authSecret,
  trustedOrigins: env.clientUrls,
  database: mongodbAdapter(db, { client, transaction: false }),
  emailAndPassword: { enabled: true, minPasswordLength: 6, autoSignIn: true },
  user: {
    modelName: 'users',
    additionalFields: {
      role: { type: 'string', required: false, defaultValue: 'student', input: true },
      plan: { type: 'string', required: false, defaultValue: 'free', input: false },
      phone: { type: 'string', required: false, defaultValue: '', input: false },
      bio: { type: 'string', required: false, defaultValue: '', input: false },
    },
  },
  databaseHooks: {
    user: {
      create: {
        // Sign-up may only pick "student" or "tutor" — admin is never self-assigned.
        before: async (user) => ({
          data: {
            ...user,
            role: SIGNUP_ROLES.includes(user.role) ? user.role : 'student',
            plan: 'free',
            phone: '',
            bio: '',
          },
        }),
      },
    },
  },
  // Profile edits go through `PATCH /api/users/me`, which can never touch role or plan.
  disabledPaths: ['/update-user'],
  plugins: [bearer()],
  advanced: {
    defaultCookieAttributes: env.isProd ? { sameSite: 'none', secure: true } : { sameSite: 'lax' },
  },
});

import { Users } from '../config/db.js';
import { env } from '../config/env.js';
import { auth } from '../lib/auth.js';

let started;

/** Creates the admin account from ADMIN_EMAIL / ADMIN_PASSWORD when it does not exist yet. */
export function bootstrapAdmin() {
  started ??= (async () => {
    if (await Users().findOne({ email: env.adminEmail })) return;
    await auth.api.signUpEmail({
      body: { name: 'MentorLagbe Admin', email: env.adminEmail, password: env.adminPassword },
    });
    await Users().updateOne(
      { email: env.adminEmail },
      { $set: { role: 'admin', image: '/avatars/admin.svg', emailVerified: true, updatedAt: new Date() } },
    );
    console.log(`[bootstrap] admin account created: ${env.adminEmail}`);
  })().catch((error) => {
    started = undefined;
    console.error('[bootstrap] could not create admin:', error.message);
  });
  return started;
}

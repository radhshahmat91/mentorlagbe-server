import { MongoClient } from 'mongodb';
import { env } from './env.js';

// The driver connects lazily on first use, which suits serverless cold starts.
export const client = new MongoClient(env.mongoUri, { maxPoolSize: 10, serverSelectionTimeoutMS: 15000 });
export const db = client.db(env.dbName);

// The four business collections. BetterAuth also keeps `session`, `account`
// and `verification` collections for its own bookkeeping.
export const Users = () => db.collection('users');
export const Tuitions = () => db.collection('tuitions');
export const Applications = () => db.collection('applications');
export const Payments = () => db.collection('payments');

let indexesReady;

/** Creates indexes once per process; never blocks request handling. */
export function ensureIndexes() {
  // (BetterAuth already maintains the unique index on users.email.)
  indexesReady ??= Promise.all([
    Users().createIndex({ role: 1, createdAt: -1 }),
    Tuitions().createIndex({ approvalStatus: 1, isActive: 1, createdAt: -1 }),
    Tuitions().createIndex({ tutorEmail: 1, createdAt: -1 }),
    Applications().createIndex({ tuitionId: 1, studentEmail: 1 }, { unique: true }),
    Applications().createIndex({ studentEmail: 1, appliedAt: -1 }),
    Applications().createIndex({ tutorEmail: 1, appliedAt: -1 }),
    Payments().createIndex({ stripeSessionId: 1 }, { unique: true }),
    Payments().createIndex({ paidAt: -1 }),
    Payments().createIndex({ userEmail: 1 }),
  ]).catch((error) => {
    indexesReady = undefined;
    console.error('[db] index creation failed:', error.message);
  });
  return indexesReady;
}

// Integration tests: real Express app + real MongoDB (throwaway database), fake Stripe / ImgBB.
// Run with: npm test   (needs a MongoDB reachable at MONGODB_URI, default mongodb://127.0.0.1:27017)
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';
process.env.MONGODB_DB = `mentorlagbe_test_${Date.now()}`;
process.env.JWT_SECRET = 'test-jwt-secret-0123456789-0123456789';
process.env.BETTER_AUTH_SECRET = 'test-auth-secret-0123456789-0123456789';
process.env.CLIENT_URL = 'http://localhost:3000';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret';

const { createApp } = await import('../src/app.js');
const { client, db, ensureIndexes, Users, Tuitions, Applications, Payments } = await import('../src/config/db.js');
const { default: Stripe } = await import('stripe');

// ---- fakes -----------------------------------------------------------------------------
const realStripe = new Stripe('sk_test_dummy');
const sessions = new Map();
let sessionCounter = 0;
const fakeStripe = {
  webhooks: realStripe.webhooks, // signature verification is local, so use the real one
  checkout: {
    sessions: {
      create: async (params) => {
        const id = `cs_test_fake${++sessionCounter}`;
        const session = {
          id, url: `https://checkout.stripe.test/${id}`, payment_status: 'unpaid', metadata: params.metadata,
          amount_total: params.line_items[0].price_data.unit_amount, currency: 'usd', payment_intent: `pi_test_fake${sessionCounter}`,
        };
        sessions.set(id, session);
        return session;
      },
      retrieve: async (id) => {
        const session = sessions.get(id);
        if (!session) throw Object.assign(new Error('No such checkout session'), { type: 'StripeInvalidRequestError', statusCode: 404 });
        return session;
      },
    },
  },
};
const uploadImage = async (file) => ({ url: `https://i.ibb.co/fake/${file.originalname}`, thumbUrl: 'https://i.ibb.co/fake/thumb.png', deleteUrl: 'https://ibb.co/delete/x' });

let server;
let base;

const call = async (method, path, { token, body, headers, form } = {}) => {
  const res = await fetch(base + path, {
    method,
    headers: { ...(body && { 'content-type': 'application/json' }), ...(token && { authorization: `Bearer ${token}` }), ...headers },
    body: form ?? (body ? JSON.stringify(body) : undefined),
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* not json */ }
  return { status: res.status, body: json, headers: res.headers };
};

let counter = 0;
async function makeUser(role = 'student', { plan } = {}) {
  const email = `${role}${++counter}@test.dev`;
  const signUp = await call('POST', '/api/auth/sign-up/email', { body: { name: `${role} ${counter}`, email, password: 'secret12', role } });
  assert.equal(signUp.status, 200, JSON.stringify(signUp.body));
  const sessionToken = signUp.headers.get('set-auth-token');
  const exchange = await call('POST', '/api/jwt', { token: sessionToken });
  if (plan) await Users().updateOne({ email }, { $set: { plan } });
  return { email, sessionToken, jwt: exchange.body.token, id: exchange.body.user._id };
}
const promoteAdmin = async (user) => Users().updateOne({ email: user.email }, { $set: { role: 'admin' } });

const tuitionBody = (over = {}) => ({
  title: 'SSC Physics concept batch', subject: 'Physics', classLevel: 'Class 9-10 (SSC)', mode: 'Offline', location: 'Dhanmondi, Dhaka',
  monthlyFee: 3000, daysPerWeek: 3, description: 'A small group batch with weekly tests and individual feedback for every student.', ...over,
});

const approve = (admin, id, approvalStatus = 'approved') => call('PATCH', `/api/admin/tuitions/${id}/approval`, { token: admin.jwt, body: { approvalStatus } });

before(async () => {
  await ensureIndexes();
  server = createApp({ stripe: fakeStripe, uploadImage }).listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  server.close();
  await db.dropDatabase();
  await client.close();
});

// ---- auth ------------------------------------------------------------------------------
test('sign-up forces a safe role and stores plan/phone/bio on the users document', async () => {
  const sneaky = await call('POST', '/api/auth/sign-up/email', { body: { name: 'Sneaky', email: 'sneaky@test.dev', password: 'secret12', role: 'admin' } });
  assert.equal(sneaky.status, 200);
  assert.ok(sneaky.headers.get('set-auth-token'), 'bearer token header is returned');
  const doc = await Users().findOne({ email: 'sneaky@test.dev' });
  assert.equal(doc.role, 'student');
  assert.equal(doc.plan, 'free');
  assert.equal(doc.phone, '');
  assert.equal(doc.bio, '');

  const tutor = await makeUser('tutor');
  assert.equal((await Users().findOne({ email: tutor.email })).role, 'tutor');
});

test('sign-up validates password length; sign-in works; update-user is disabled', async () => {
  const short = await call('POST', '/api/auth/sign-up/email', { body: { name: 'Short', email: 'short@test.dev', password: '123', role: 'student' } });
  assert.equal(short.status, 400);
  const user = await makeUser('student');
  const signIn = await call('POST', '/api/auth/sign-in/email', { body: { email: user.email, password: 'secret12' } });
  assert.equal(signIn.status, 200);
  const bad = await call('POST', '/api/auth/sign-in/email', { body: { email: user.email, password: 'wrong-password' } });
  assert.equal(bad.status, 401);
  const update = await call('POST', '/api/auth/update-user', { token: user.sessionToken, body: { role: 'admin' } });
  assert.ok([403, 404].includes(update.status));
  assert.equal((await Users().findOne({ email: user.email })).role, 'student');
});

test('POST /api/jwt exchanges a session for a JWT and rejects guests', async () => {
  const user = await makeUser('student');
  assert.ok(user.jwt.split('.').length === 3);
  assert.equal((await call('POST', '/api/jwt')).status, 401);
  assert.equal((await call('POST', '/api/jwt', { token: 'not-a-real-token' })).status, 401);
  const me = await call('GET', '/api/users/me', { token: user.jwt });
  assert.equal(me.status, 200);
  assert.equal(me.body.role, 'student');
});

test('role middlewares: 401 without/with bad token, 403 for the wrong role', async () => {
  const student = await makeUser('student');
  const tutor = await makeUser('tutor');
  assert.equal((await call('GET', '/api/student/stats')).status, 401);
  assert.equal((await call('GET', '/api/student/stats', { token: 'garbage' })).status, 401);
  assert.equal((await call('GET', '/api/student/stats', { token: tutor.jwt })).status, 403);
  assert.equal((await call('GET', '/api/tutor/stats', { token: student.jwt })).status, 403);
  assert.equal((await call('GET', '/api/admin/stats', { token: student.jwt })).status, 403);
  assert.equal((await call('GET', '/api/student/stats', { token: student.jwt })).status, 200);
  assert.equal((await call('GET', '/api/tutor/stats', { token: tutor.jwt })).status, 200);
});

// ---- tutor tuitions & moderation ---------------------------------------------------------
test('tutor CRUD, free-plan limit and pro unlimited', async () => {
  const tutor = await makeUser('tutor');
  const invalid = await call('POST', '/api/tutor/tuitions', { token: tutor.jwt, body: { title: 'x' } });
  assert.equal(invalid.status, 422);
  assert.ok(invalid.body.errors.title);

  const first = await call('POST', '/api/tutor/tuitions', { token: tutor.jwt, body: tuitionBody() });
  assert.equal(first.status, 201);
  assert.equal(first.body.approvalStatus, 'pending');
  assert.equal(first.body.isActive, true);
  assert.equal(first.body.tutorEmail, tutor.email);
  assert.equal((await call('POST', '/api/tutor/tuitions', { token: tutor.jwt, body: tuitionBody({ title: 'Second physics batch' }) })).status, 201);
  const third = await call('POST', '/api/tutor/tuitions', { token: tutor.jwt, body: tuitionBody({ title: 'Third physics batch' }) });
  assert.equal(third.status, 403);
  assert.equal(third.body.code, 'PLAN_LIMIT');

  const list = await call('GET', '/api/tutor/tuitions', { token: tutor.jwt });
  assert.equal(list.body.total, 2);
  assert.equal(list.body.postLimit, 2);
  assert.equal(list.body.postsRemaining, 0);

  await Users().updateOne({ email: tutor.email }, { $set: { plan: 'pro' } });
  assert.equal((await call('POST', '/api/tutor/tuitions', { token: tutor.jwt, body: tuitionBody({ title: 'Third physics batch' }) })).status, 201);
  assert.equal((await call('GET', '/api/tutor/stats', { token: tutor.jwt })).body.postLimit, null);

  const id = first.body._id;
  const patched = await call('PATCH', `/api/tutor/tuitions/${id}`, { token: tutor.jwt, body: { monthlyFee: 3500, title: 'SSC Physics — updated' } });
  assert.equal(patched.body.monthlyFee, 3500);
  const toggled = await call('PATCH', `/api/tutor/tuitions/${id}/status`, { token: tutor.jwt, body: { isActive: false } });
  assert.equal(toggled.body.isActive, false);
  const other = await makeUser('tutor');
  assert.equal((await call('PATCH', `/api/tutor/tuitions/${id}`, { token: other.jwt, body: { monthlyFee: 100 } })).status, 404);
  assert.equal((await call('DELETE', `/api/tutor/tuitions/${id}`, { token: tutor.jwt })).status, 200);
  assert.equal((await call('GET', `/api/tutor/tuitions/${id}`, { token: tutor.jwt })).status, 404);
});

test('only approved + active tuitions are public; admin approval flow; rejected edit resubmits', async () => {
  const tutor = await makeUser('tutor');
  const admin = await makeUser('student');
  await promoteAdmin(admin);
  const created = await call('POST', '/api/tutor/tuitions', { token: tutor.jwt, body: tuitionBody({ title: 'Moderation flow batch' }) });
  const id = created.body._id;

  assert.equal((await call('GET', `/api/tuitions/${id}`)).status, 404, 'pending is hidden from guests');
  assert.equal((await call('GET', `/api/tuitions/${id}`, { token: tutor.jwt })).status, 200, 'owner can preview');
  assert.equal((await call('GET', `/api/tuitions/${id}`, { token: admin.jwt })).status, 200, 'admin can preview');
  assert.ok(!(await call('GET', '/api/tuitions?search=Moderation')).body.items.length);

  const pending = await call('GET', '/api/admin/tuitions?status=pending', { token: admin.jwt });
  assert.ok(pending.body.items.some((t) => t._id === id));
  assert.equal((await approve(admin, id, 'nonsense')).status, 422);
  assert.equal((await approve(admin, id)).body.approvalStatus, 'approved');

  const listed = await call('GET', '/api/tuitions?search=Moderation');
  assert.equal(listed.body.total, 1);
  assert.equal(listed.body.items[0].tutorVerified, false);
  assert.equal((await call('GET', `/api/tuitions/${id}`)).status, 200);

  await call('PATCH', `/api/tutor/tuitions/${id}/status`, { token: tutor.jwt, body: { isActive: false } });
  assert.equal((await call('GET', '/api/tuitions?search=Moderation')).body.total, 0, 'closed tuitions leave the browse page');
  await call('PATCH', `/api/tutor/tuitions/${id}/status`, { token: tutor.jwt, body: { isActive: true } });

  await approve(admin, id, 'rejected');
  const fixed = await call('PATCH', `/api/tutor/tuitions/${id}`, { token: tutor.jwt, body: { description: 'Updated description that is long enough to pass the validation rules.' } });
  assert.equal(fixed.body.approvalStatus, 'pending');
});

test('browse: server-side search, filters, sorting, pagination and regex safety', async () => {
  const now = Date.now();
  const rows = Array.from({ length: 14 }, (_, i) => ({
    title: i % 2 ? `Chemistry batch ${i}` : `Maths batch ${i}`, subject: i % 2 ? 'Chemistry' : 'Mathematics',
    classLevel: i % 3 ? 'Class 11-12 (HSC)' : 'Class 6-8', mode: i % 4 ? 'Online' : 'Offline', location: 'Dhaka', monthlyFee: 1000 + i * 100,
    daysPerWeek: 3, schedule: '', bannerImage: '', description: 'x'.repeat(40), tutorName: 'Seed Tutor', tutorEmail: 'seed-tutor@test.dev',
    approvalStatus: 'approved', isActive: true, ratingAvg: 0, ratingCount: 0, createdAt: new Date(now - i * 1000), updatedAt: new Date(),
  }));
  await Tuitions().insertMany(rows);

  const page1 = await call('GET', '/api/tuitions?search=batch&limit=5&page=1');
  assert.equal(page1.body.items.length, 5);
  assert.equal(page1.body.total, 14);
  assert.equal(page1.body.totalPages, 3);
  const page3 = await call('GET', '/api/tuitions?search=batch&limit=5&page=3');
  assert.equal(page3.body.items.length, 4);

  const chem = await call('GET', '/api/tuitions?subject=Chemistry&search=batch&limit=50');
  assert.equal(chem.body.total, 7);
  assert.ok(chem.body.items.every((t) => t.subject === 'Chemistry'));
  assert.equal((await call('GET', '/api/tuitions?search=chem&limit=50')).body.total, 7, 'search is case-insensitive and matches the subject');
  const online = await call('GET', '/api/tuitions?mode=Online&search=batch&limit=50');
  assert.ok(online.body.items.every((t) => t.mode === 'Online'));
  const level = await call('GET', '/api/tuitions?classLevel=Class%206-8&search=batch&limit=50');
  assert.ok(level.body.items.every((t) => t.classLevel === 'Class 6-8'));
  const cheap = await call('GET', '/api/tuitions?search=batch&sort=fee-asc&limit=3');
  assert.deepEqual(cheap.body.items.map((t) => t.monthlyFee), [1000, 1100, 1200]);
  const pricey = await call('GET', '/api/tuitions?search=batch&sort=fee-desc&limit=2');
  assert.equal(pricey.body.items[0].monthlyFee, 2300);
  assert.equal((await call('GET', '/api/tuitions?search=.*')).body.total, 0, 'regex characters are escaped');
  assert.equal((await call('GET', '/api/tuitions/featured?limit=6')).body.items.length, 6);
});

// ---- applications, reviews, bookmarks ----------------------------------------------------
test('student applications: role rules, duplicates, validation, cancel only while pending', async () => {
  const tutor = await makeUser('tutor');
  const admin = await makeUser('student');
  await promoteAdmin(admin);
  const student = await makeUser('student');
  const proStudent = await makeUser('student', { plan: 'pro' });
  const created = await call('POST', '/api/tutor/tuitions', { token: tutor.jwt, body: tuitionBody({ title: 'Application flow batch' }) });
  const tuitionId = created.body._id;
  const apply = (user, extra = {}) => call('POST', '/api/student/applications', { token: user.jwt, body: { tuitionId, studentPhone: '+8801700000099', preferredSchedule: 'Weekday evenings', studentNote: 'Please help', ...extra } });

  assert.equal((await apply(student)).status, 404, 'cannot apply to an unapproved tuition');
  await approve(admin, tuitionId);
  assert.equal((await apply(tutor)).status, 403);
  assert.equal((await apply(admin)).status, 403);
  assert.equal((await apply(student, { studentPhone: 'abc' })).status, 422);

  const ok = await apply(student);
  assert.equal(ok.status, 201);
  assert.equal(ok.body.status, 'pending');
  assert.equal(ok.body.tutorEmail, tutor.email);
  assert.equal(ok.body.studentEmail, student.email);
  assert.equal(ok.body.isPriority, false);
  const dup = await apply(student);
  assert.equal(dup.status, 409);
  assert.equal(dup.body.code, 'DUPLICATE_APPLICATION');
  assert.equal((await apply(proStudent)).body.isPriority, true);

  const detail = await call('GET', `/api/tuitions/${tuitionId}`, { token: student.jwt });
  assert.equal(detail.body.viewer.applied, true);
  assert.equal(detail.body.viewer.applicationStatus, 'pending');

  const mine = await call('GET', '/api/student/applications', { token: student.jwt });
  assert.equal(mine.body.total, 1);

  // tutor manages applicants: priority first
  const applicants = await call('GET', '/api/tutor/applicants', { token: tutor.jwt });
  assert.equal(applicants.body.total, 2);
  assert.equal(applicants.body.items[0].isPriority, true);
  const other = await makeUser('tutor');
  assert.equal((await call('PATCH', `/api/tutor/applicants/${ok.body._id}/status`, { token: other.jwt, body: { status: 'accepted' } })).status, 404);
  assert.equal((await call('PATCH', `/api/tutor/applicants/${ok.body._id}/status`, { token: tutor.jwt, body: { status: 'pending' } })).status, 422);
  assert.equal((await call('PATCH', `/api/tutor/applicants/${ok.body._id}/status`, { token: tutor.jwt, body: { status: 'accepted' } })).body.status, 'accepted');

  const cancelAccepted = await call('DELETE', `/api/student/applications/${ok.body._id}`, { token: student.jwt });
  assert.equal(cancelAccepted.status, 409);
  assert.equal(cancelAccepted.body.code, 'NOT_PENDING');
  const proApp = (await call('GET', '/api/student/applications', { token: proStudent.jwt })).body.items[0];
  assert.equal((await call('DELETE', `/api/student/applications/${proApp._id}`, { token: student.jwt })).status, 404, "cannot cancel someone else's application");
  assert.equal((await call('DELETE', `/api/student/applications/${proApp._id}`, { token: proStudent.jwt })).status, 200);

  const stats = await call('GET', '/api/student/stats', { token: student.jwt });
  assert.deepEqual([stats.body.totalApplied, stats.body.accepted, stats.body.pending], [1, 1, 0]);
  const tutorStats = await call('GET', '/api/tutor/stats', { token: tutor.jwt });
  assert.equal(tutorStats.body.totalApplicants, 1);

  // reviews: accepted only, aggregate on the tuition
  const lonely = await makeUser('student');
  await apply(lonely);
  const pendingApp = (await call('GET', '/api/student/applications', { token: lonely.jwt })).body.items[0];
  const early = await call('PUT', `/api/student/applications/${pendingApp._id}/review`, { token: lonely.jwt, body: { rating: 5, feedback: 'Great tutor overall' } });
  assert.equal(early.status, 409);
  assert.equal(early.body.code, 'NOT_ACCEPTED');
  assert.equal((await call('PUT', `/api/student/applications/${ok.body._id}/review`, { token: student.jwt, body: { rating: 9, feedback: 'Great tutor overall' } })).status, 422);
  const reviewed = await call('PUT', `/api/student/applications/${ok.body._id}/review`, { token: student.jwt, body: { rating: 4, feedback: 'Clear explanations and fair tests.' } });
  assert.equal(reviewed.body.review.rating, 4);
  await call('PATCH', `/api/tutor/applicants/${pendingApp._id}/status`, { token: tutor.jwt, body: { status: 'accepted' } });
  await call('PUT', `/api/student/applications/${pendingApp._id}/review`, { token: lonely.jwt, body: { rating: 5, feedback: 'Excellent, would recommend.' } });
  const after = await call('GET', `/api/tuitions/${tuitionId}`);
  assert.equal(after.body.ratingCount, 2);
  assert.equal(after.body.ratingAvg, 4.5);
  assert.equal(after.body.reviews.length, 2);
  assert.equal(after.body.tutor.ratingCount, 2);
});

test('bookmarks: save, list, ids, remove', async () => {
  const tutor = await makeUser('tutor');
  const admin = await makeUser('student');
  await promoteAdmin(admin);
  const student = await makeUser('student');
  const tuition = (await call('POST', '/api/tutor/tuitions', { token: tutor.jwt, body: tuitionBody({ title: 'Bookmark batch' }) })).body;
  await approve(admin, tuition._id);

  assert.equal((await call('PUT', `/api/student/bookmarks/${tuition._id}`, { token: tutor.jwt })).status, 403);
  assert.equal((await call('PUT', `/api/student/bookmarks/${tuition._id}`, { token: student.jwt })).body.saved, true);
  await call('PUT', `/api/student/bookmarks/${tuition._id}`, { token: student.jwt });
  assert.deepEqual((await call('GET', '/api/student/bookmarks/ids', { token: student.jwt })).body.ids, [tuition._id]);
  assert.equal((await call('GET', '/api/student/bookmarks', { token: student.jwt })).body.items[0].title, 'Bookmark batch');
  assert.equal((await call('GET', `/api/tuitions/${tuition._id}`, { token: student.jwt })).body.viewer.bookmarked, true);
  assert.equal((await call('GET', '/api/student/stats', { token: student.jwt })).body.saved, 1);
  assert.equal((await call('DELETE', `/api/student/bookmarks/${tuition._id}`, { token: student.jwt })).body.saved, false);
  assert.deepEqual((await call('GET', '/api/student/bookmarks/ids', { token: student.jwt })).body.ids, []);
  assert.equal((await call('PUT', '/api/student/bookmarks/not-an-id', { token: student.jwt })).status, 400);
});

// ---- admin & profile -----------------------------------------------------------------------
test('admin users, roles, stats and transactions', async () => {
  const admin = await makeUser('student');
  await promoteAdmin(admin);
  const target = await makeUser('student');

  const users = await call('GET', '/api/admin/users?search=student&role=student&limit=5', { token: admin.jwt });
  assert.equal(users.status, 200);
  assert.ok(users.body.items.length >= 1 && users.body.items.every((u) => u.role === 'student'));
  assert.ok(!('savedTuitions' in users.body.items[0]));

  assert.equal((await call('PATCH', `/api/admin/users/${target.id}/role`, { token: admin.jwt, body: { role: 'tutor' } })).body.role, 'tutor');
  assert.equal((await call('PATCH', `/api/admin/users/${target.id}/role`, { token: admin.jwt, body: { role: 'wizard' } })).status, 422);
  const self = await call('PATCH', `/api/admin/users/${admin.id}/role`, { token: admin.jwt, body: { role: 'student' } });
  assert.equal(self.status, 400);
  assert.equal(self.body.code, 'SELF_ROLE_CHANGE');
  assert.equal((await call('PATCH', `/api/tutor/stats`, { token: target.jwt })).status, 404);
  assert.equal((await call('GET', '/api/tutor/stats', { token: target.jwt })).status, 200, 'role change applies immediately to the same JWT');

  const stats = await call('GET', '/api/admin/stats', { token: admin.jwt });
  assert.equal(stats.status, 200);
  for (const key of ['totalUsers', 'totalTutors', 'pendingTuitions', 'approvedTuitions', 'totalRevenue']) assert.equal(typeof stats.body[key], 'number');
  assert.equal(stats.body.revenueByMonth.length, 6);
  assert.equal(stats.body.signupsByMonth.length, 6);
  const tx = await call('GET', '/api/admin/transactions', { token: admin.jwt });
  assert.equal(tx.status, 200);
  assert.equal(tx.body.currency, 'usd');
});

test('profile update cannot change role, plan or email', async () => {
  const user = await makeUser('student');
  const res = await call('PATCH', '/api/users/me', { token: user.jwt, body: { name: 'New Name', phone: '+8801711111111', bio: 'Hello', image: 'https://i.ibb.co/x/me.png', role: 'admin', plan: 'pro', email: 'hacker@test.dev' } });
  assert.equal(res.status, 200);
  assert.equal(res.body.name, 'New Name');
  assert.equal(res.body.role, 'student');
  assert.equal(res.body.plan, 'free');
  assert.equal(res.body.email, user.email);
  assert.equal((await call('PATCH', '/api/users/me', { token: user.jwt, body: { phone: 'nope' } })).status, 422);
  assert.equal((await call('PATCH', '/api/users/me', { token: user.jwt, body: { image: 'javascript:alert(1)' } })).status, 422);
});

// ---- payments ---------------------------------------------------------------------------------
const signedWebhook = (session, secret = 'whsec_test_secret') => {
  const payload = JSON.stringify({ id: `evt_${session.id}`, object: 'event', type: 'checkout.session.completed', data: { object: session } });
  return { payload, header: realStripe.webhooks.generateTestHeaderString({ payload, secret }) };
};

test('stripe webhook: signature check, payment record, plan upgrade, idempotency', async () => {
  const user = await makeUser('tutor');
  const session = {
    id: 'cs_test_webhook1', payment_status: 'paid', amount_total: 1500, currency: 'usd', payment_intent: 'pi_test_webhook1',
    metadata: { userId: user.id, userEmail: user.email, userName: 'Webhook Tutor', userRole: 'tutor', planName: 'Pro Tutor Plan' },
  };
  const { payload, header } = signedWebhook(session);
  const bad = await call('POST', '/api/payments/webhook', { body: undefined, form: payload, headers: { 'content-type': 'application/json', 'stripe-signature': 't=1,v1=bad' } });
  assert.equal(bad.status, 400);
  assert.equal((await Users().findOne({ email: user.email })).plan, 'free');

  const ok = await call('POST', '/api/payments/webhook', { form: payload, headers: { 'content-type': 'application/json', 'stripe-signature': header } });
  assert.equal(ok.status, 200);
  assert.equal((await Users().findOne({ email: user.email })).plan, 'pro');
  const payment = await Payments().findOne({ stripeSessionId: 'cs_test_webhook1' });
  assert.equal(payment.amount, 15);
  assert.equal(payment.paymentStatus, 'paid');
  assert.equal(payment.transactionId, 'pi_test_webhook1');
  assert.equal(payment.planName, 'Pro Tutor Plan');

  const replay = signedWebhook(session);
  assert.equal((await call('POST', '/api/payments/webhook', { form: replay.payload, headers: { 'content-type': 'application/json', 'stripe-signature': replay.header } })).status, 200);
  assert.equal(await Payments().countDocuments({ stripeSessionId: 'cs_test_webhook1' }), 1);

  const mine = await call('GET', '/api/payments/mine', { token: user.jwt });
  assert.equal(mine.body.items.length, 1);
});

test('checkout + verify (fallback to the webhook), foreign sessions and already-pro', async () => {
  const student = await makeUser('student');
  const other = await makeUser('student');
  const admin = await makeUser('student');
  await promoteAdmin(admin);

  assert.equal((await call('POST', '/api/payments/checkout', { token: admin.jwt })).status, 403);
  const checkout = await call('POST', '/api/payments/checkout', { token: student.jwt });
  assert.equal(checkout.status, 200);
  assert.match(checkout.body.url, /^https:\/\/checkout\.stripe\.test\//);
  const session = sessions.get(checkout.body.sessionId);
  assert.equal(session.amount_total, 1000);
  assert.equal(session.metadata.userRole, 'student');

  assert.equal((await call('GET', '/api/payments/verify?session_id=nope', { token: student.jwt })).status, 400);
  assert.equal((await call('GET', '/api/payments/verify?session_id=cs_test_missing', { token: student.jwt })).status, 404);
  const unpaid = await call('GET', `/api/payments/verify?session_id=${session.id}`, { token: student.jwt });
  assert.equal(unpaid.body.status, 'unpaid');
  assert.equal(unpaid.body.plan, 'free');
  assert.equal((await call('GET', `/api/payments/verify?session_id=${session.id}`, { token: other.jwt })).status, 403);

  session.payment_status = 'paid';
  const paid = await call('GET', `/api/payments/verify?session_id=${session.id}`, { token: student.jwt });
  assert.equal(paid.body.status, 'paid');
  assert.equal(paid.body.plan, 'pro');
  assert.equal(paid.body.alreadyProcessed, false);
  assert.equal((await call('GET', `/api/payments/verify?session_id=${session.id}`, { token: student.jwt })).body.alreadyProcessed, true);
  assert.equal(await Payments().countDocuments({ stripeSessionId: session.id }), 1);

  const again = await call('POST', '/api/payments/checkout', { token: student.jwt });
  assert.equal(again.status, 409);
  assert.equal(again.body.code, 'ALREADY_PRO');

  const adminTx = await call('GET', '/api/admin/transactions', { token: admin.jwt });
  assert.ok(adminTx.body.totalRevenue >= 25);
  assert.ok(adminTx.body.items.some((p) => p.stripeSessionId === session.id));
});

// ---- uploads, stats, platform -------------------------------------------------------------------
test('image upload validation and success (fake ImgBB)', async () => {
  const user = await makeUser('tutor');
  const form = (blob, name) => { const f = new FormData(); f.append('image', blob, name); return f; };
  assert.equal((await call('POST', '/api/uploads/image', { form: form(new Blob(['x'], { type: 'image/png' }), 'a.png') })).status, 401);
  const empty = await call('POST', '/api/uploads/image', { token: user.jwt, form: new FormData() });
  assert.equal(empty.status, 422);
  const wrong = await call('POST', '/api/uploads/image', { token: user.jwt, form: form(new Blob(['hello'], { type: 'text/plain' }), 'a.txt') });
  assert.equal(wrong.status, 422);
  const big = await call('POST', '/api/uploads/image', { token: user.jwt, form: form(new Blob([new Uint8Array(5 * 1024 * 1024 + 10)], { type: 'image/png' }), 'big.png') });
  assert.equal(big.status, 413);
  const ok = await call('POST', '/api/uploads/image', { token: user.jwt, form: form(new Blob([new Uint8Array(64)], { type: 'image/png' }), 'banner.png') });
  assert.equal(ok.status, 201);
  assert.equal(ok.body.url, 'https://i.ibb.co/fake/banner.png');
});

test('public stats, health, 404 and CORS', async () => {
  const stats = await call('GET', '/api/stats/public');
  assert.equal(stats.status, 200);
  for (const key of ['tutors', 'students', 'activeTuitions', 'subjects', 'applications', 'reviews', 'avgRating']) assert.equal(typeof stats.body[key], 'number');
  assert.ok(Array.isArray(stats.body.topSubjects));
  assert.equal((await call('GET', '/api/health')).body.db, 'up');
  assert.equal((await call('GET', '/')).body.name, 'MentorLagbe API');
  const missing = await call('GET', '/api/nope');
  assert.equal(missing.status, 404);
  assert.equal(missing.body.message, 'Route not found');

  const preflight = await fetch(`${base}/api/student/stats`, { method: 'OPTIONS', headers: { origin: 'http://localhost:3000', 'access-control-request-method': 'GET', 'access-control-request-headers': 'authorization' } });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('access-control-allow-origin'), 'http://localhost:3000');
  assert.match(preflight.headers.get('access-control-allow-headers'), /authorization/i);
  const exposed = await fetch(`${base}/api/health`, { headers: { origin: 'http://localhost:3000' } });
  assert.match(exposed.headers.get('access-control-expose-headers') ?? '', /set-auth-token/);
  const foreign = await fetch(`${base}/api/health`, { headers: { origin: 'https://evil.example' } });
  assert.equal(foreign.headers.get('access-control-allow-origin'), null);
});

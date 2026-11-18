// Usage: npm run seed            (idempotent upsert)
//        npm run seed -- --fresh (drops users, tuitions, applications, payments and BetterAuth data first)
import { client, db, Applications, Payments, Tuitions, Users, ensureIndexes } from '../src/config/db.js';
import { env } from '../src/config/env.js';
import { auth } from '../src/lib/auth.js';
import { PLAN_NAMES, PRO_PRICE_USD } from '../src/lib/constants.js';
import { recomputeRating } from '../src/lib/serialize.js';
import {
  DEMO_PASSWORDS, applications, bookmarks, feedback, notes, schedules, students, tuitions, tutors,
} from './seed-data.js';

const fresh = process.argv.includes('--fresh');
const DAY = 86_400_000;
const ago = (days, hours = 0) => new Date(Date.now() - days * DAY - hours * 3_600_000);
const pick = (list, index) => list[index % list.length];
const hex = (seed, length) => {
  let out = '';
  let n = seed;
  while (out.length < length) {
    n = (n * 1103515245 + 12345) & 0x7fffffff;
    out += n.toString(36);
  }
  return out.slice(0, length);
};

async function upsertUser(spec, role) {
  const email = spec.email.toLowerCase();
  if (!(await Users().findOne({ email }))) {
    await auth.api.signUpEmail({ body: { name: spec.name, email, password: spec.password } });
  }
  await Users().updateOne(
    { email },
    {
      $set: {
        name: spec.name, role, plan: spec.plan ?? 'free', phone: spec.phone ?? '', bio: spec.bio ?? '',
        image: spec.image, emailVerified: true, createdAt: ago(spec.joined, 3), updatedAt: new Date(),
      },
    },
  );
  return Users().findOne({ email });
}

async function main() {
  if (fresh) {
    for (const name of ['users', 'tuitions', 'applications', 'payments', 'session', 'account', 'verification']) {
      await db.collection(name).drop().catch(() => {});
    }
    console.log('• dropped existing collections');
  }

  const admin = await upsertUser(
    { name: 'MentorLagbe Admin', email: env.adminEmail, password: env.adminPassword, plan: 'free', joined: 180, image: '/avatars/admin.svg', bio: 'Platform administrator.', phone: '+8801700000000' },
    'admin',
  );
  const tutorDocs = {};
  const studentDocs = {};
  for (const [i, t] of tutors.entries()) tutorDocs[t.key] = await upsertUser({ ...t, image: `/avatars/${t.key}.svg` }, 'tutor');
  for (const [i, s] of students.entries()) studentDocs[s.key] = await upsertUser({ ...s, image: `/avatars/${s.key}.svg` }, 'student');
  console.log(`• users ready: 1 admin, ${tutors.length} tutors, ${students.length} students`);

  const tuitionIds = {};
  for (const t of tuitions) {
    const tutor = tutorDocs[t.tutor];
    const createdAt = ago(t.daysAgo, 2 + (t.no % 7));
    const { title, subject, classLevel, mode, location, monthlyFee, daysPerWeek, schedule, description } = t;
    await Tuitions().updateOne(
      { tutorEmail: tutor.email, title },
      {
        $set: {
          title, subject, classLevel, mode, location, monthlyFee, daysPerWeek, schedule, description,
          bannerImage: `/banners/${t.banner}.svg`, tutorName: tutor.name, tutorEmail: tutor.email,
          approvalStatus: t.status, isActive: t.active, updatedAt: createdAt,
        },
        $setOnInsert: { createdAt, ratingAvg: 0, ratingCount: 0 },
      },
      { upsert: true },
    );
    tuitionIds[t.no] = (await Tuitions().findOne({ tutorEmail: tutor.email, title }))._id;
  }
  console.log(`• tuitions ready: ${tuitions.length}`);

  const reviewTouched = new Set();
  for (const [index, [key, no, status, rating, daysAgo]] of applications.entries()) {
    const student = studentDocs[key];
    const tuition = tuitions.find((t) => t.no === no);
    const tutor = tutorDocs[tuition.tutor];
    const appliedAt = ago(daysAgo, index % 9);
    const doc = {
      tuitionTitle: tuition.title, subject: tuition.subject, monthlyFee: tuition.monthlyFee,
      tutorEmail: tutor.email, tutorName: tutor.name, studentName: student.name, studentPhone: student.phone,
      preferredSchedule: pick(schedules, index), studentNote: pick(notes, index + no), status,
      isPriority: student.plan === 'pro', updatedAt: ago(Math.max(0, daysAgo - 1)),
    };
    const set = { ...doc };
    const unset = {};
    if (rating) {
      const pool = feedback[rating];
      set.review = { rating, feedback: pick(pool, index + no), reviewedAt: ago(Math.max(0, daysAgo - 4)) };
      reviewTouched.add(tuitionIds[no]);
    } else {
      unset.review = '';
    }
    await Applications().updateOne(
      { tuitionId: tuitionIds[no], studentEmail: student.email },
      { $set: set, ...(Object.keys(unset).length && { $unset: unset }), $setOnInsert: { appliedAt } },
      { upsert: true },
    );
  }
  for (const id of new Set(Object.values(tuitionIds))) await recomputeRating(id);
  console.log(`• applications ready: ${applications.length} (${reviewTouched.size} tuitions reviewed)`);

  for (const [n, spec] of [...tutors, ...students].filter((u) => u.plan === 'pro').entries()) {
    const doc = tutorDocs[spec.key] ?? studentDocs[spec.key];
    const role = doc.role;
    const sessionId = `cs_test_a1${hex(n + 7, 56)}`;
    await Payments().updateOne(
      { stripeSessionId: sessionId },
      {
        $set: {
          userEmail: doc.email, userName: doc.name, userRole: role, planName: PLAN_NAMES[role], amount: PRO_PRICE_USD[role],
          currency: 'usd', transactionId: `pi_3S${hex(n + 31, 21)}`, paymentStatus: 'paid', paidAt: ago(8 + n * 6, 5),
        },
      },
      { upsert: true },
    );
  }
  console.log('• payments ready for every Pro member');

  for (const [key, list] of Object.entries(bookmarks)) {
    await Users().updateOne({ email: studentDocs[key].email }, { $set: { savedTuitions: list.map((no) => tuitionIds[no]) } });
  }
  console.log(`• bookmarks ready for ${Object.keys(bookmarks).length} students`);

  // Seeding signs users up, which opens sessions — remove them so nobody is "logged in".
  await db.collection('session').deleteMany({});
  await ensureIndexes();

  const line = (role, email, password, note = '') => `  ${role.padEnd(14)} ${email.padEnd(32)} ${password.padEnd(14)} ${note}`;
  console.log('\nDemo logins');
  console.log(line('Admin', admin.email, env.adminPassword));
  console.log(line('Tutor (Free)', 'tutor@mentorlagbe.com', DEMO_PASSWORDS.tutor, '2 approved posts — hits the free limit'));
  console.log(line('Tutor (Pro)', 'protutor@mentorlagbe.com', DEMO_PASSWORDS.tutor, 'verified badge, unlimited posts'));
  console.log(line('Student (Free)', 'student@mentorlagbe.com', DEMO_PASSWORDS.student, 'applications in every status'));
  console.log(line('Student (Pro)', 'prostudent@mentorlagbe.com', DEMO_PASSWORDS.student, 'priority applications'));
  console.log(`  All other seeded accounts use ${DEMO_PASSWORDS.other}`);
}

main()
  .catch((error) => {
    console.error('Seeding failed:', error);
    process.exitCode = 1;
  })
  .finally(() => client.close());

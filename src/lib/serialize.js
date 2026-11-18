import { Users, Tuitions, Applications } from '../config/db.js';

export const round1 = (n) => Math.round((Number(n) || 0) * 10) / 10;

export const publicUser = (u) =>
  u && {
    _id: String(u._id),
    name: u.name,
    email: u.email,
    image: u.image ?? null,
    role: u.role ?? 'student',
    plan: u.plan ?? 'free',
    phone: u.phone ?? '',
    bio: u.bio ?? '',
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };

export const toPage = (items, total, page, limit) => ({
  items,
  total,
  page,
  limit,
  totalPages: Math.max(1, Math.ceil(total / limit)),
});

export function pageParams(query, { limit = 10, max = 50 } = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const size = Math.min(max, Math.max(1, parseInt(query.limit, 10) || limit));
  return { page, limit: size, skip: (page - 1) * size };
}

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** Case-insensitive, regex-escaped "contains" matcher for user-typed search text. */
export const contains = (text) => new RegExp(escapeRegex(String(text).trim()), 'i');
export const str = (value) => (typeof value === 'string' ? value.trim() : '');

/** Adds the tutor's avatar and verified flag to tuition documents (one batched query). */
export async function attachTutors(items) {
  const emails = [...new Set(items.map((i) => i.tutorEmail))];
  const docs = emails.length
    ? await Users().find({ email: { $in: emails } }, { projection: { email: 1, image: 1, plan: 1 } }).toArray()
    : [];
  const byEmail = new Map(docs.map((d) => [d.email, d]));
  return items.map((i) => ({
    ...i,
    tutorImage: byEmail.get(i.tutorEmail)?.image ?? null,
    tutorVerified: byEmail.get(i.tutorEmail)?.plan === 'pro',
  }));
}

/** Adds applicantsCount / pendingApplicants to tuition documents. */
export async function attachApplicantCounts(items) {
  if (!items.length) return items;
  const rows = await Applications()
    .aggregate([
      { $match: { tuitionId: { $in: items.map((i) => i._id) } } },
      {
        $group: {
          _id: '$tuitionId',
          applicantsCount: { $sum: 1 },
          pendingApplicants: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
        },
      },
    ])
    .toArray();
  const byId = new Map(rows.map((r) => [String(r._id), r]));
  return items.map((i) => ({
    ...i,
    applicantsCount: byId.get(String(i._id))?.applicantsCount ?? 0,
    pendingApplicants: byId.get(String(i._id))?.pendingApplicants ?? 0,
  }));
}

/** Adds the applicant's avatar to application documents. */
export async function attachStudents(items) {
  const emails = [...new Set(items.map((i) => i.studentEmail))];
  const docs = emails.length
    ? await Users().find({ email: { $in: emails } }, { projection: { email: 1, image: 1 } }).toArray()
    : [];
  const byEmail = new Map(docs.map((d) => [d.email, d.image ?? null]));
  return items.map((i) => ({ ...i, studentImage: byEmail.get(i.studentEmail) ?? null }));
}

/** Recomputes a tuition's average rating from the reviews stored on its applications. */
export async function recomputeRating(tuitionId) {
  const [agg] = await Applications()
    .aggregate([
      { $match: { tuitionId, 'review.rating': { $gte: 1 } } },
      { $group: { _id: null, avg: { $avg: '$review.rating' }, count: { $sum: 1 } } },
    ])
    .toArray();
  await Tuitions().updateOne(
    { _id: tuitionId },
    { $set: { ratingAvg: agg ? round1(agg.avg) : 0, ratingCount: agg?.count ?? 0 } },
  );
}

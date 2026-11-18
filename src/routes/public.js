import { Router } from 'express';
import { Applications, Tuitions, Users } from '../config/db.js';
import { MODES } from '../lib/constants.js';
import { notFound } from '../lib/httpError.js';
import { attachTutors, contains, pageParams, round1, str, toPage } from '../lib/serialize.js';
import { parseId } from '../lib/validate.js';
import { optionalAuth } from '../middleware/auth.js';

const router = Router();
const PUBLIC = { approvalStatus: 'approved', isActive: true };

router.get('/stats/public', async (req, res) => {
  const [tutors, students, activeTuitions, applications, subjectRows, ratingRows] = await Promise.all([
    Users().countDocuments({ role: 'tutor' }),
    Users().countDocuments({ role: 'student' }),
    Tuitions().countDocuments(PUBLIC),
    Applications().countDocuments({}),
    Tuitions()
      .aggregate([{ $match: PUBLIC }, { $group: { _id: '$subject', count: { $sum: 1 } } }, { $sort: { count: -1, _id: 1 } }])
      .toArray(),
    Applications()
      .aggregate([
        { $match: { 'review.rating': { $gte: 1 } } },
        { $group: { _id: null, avg: { $avg: '$review.rating' }, count: { $sum: 1 } } },
      ])
      .toArray(),
  ]);
  res.json({
    tutors,
    students,
    activeTuitions,
    subjects: subjectRows.length,
    applications,
    reviews: ratingRows[0]?.count ?? 0,
    avgRating: round1(ratingRows[0]?.avg),
    topSubjects: subjectRows.slice(0, 8).map((row) => ({ subject: row._id, count: row.count })),
  });
});

const SORTS = {
  latest: { createdAt: -1 },
  'fee-asc': { monthlyFee: 1, createdAt: -1 },
  'fee-desc': { monthlyFee: -1, createdAt: -1 },
  rating: { ratingAvg: -1, ratingCount: -1, createdAt: -1 },
};

// Server-side search, filter, sort and pagination (MongoDB skip/limit).
router.get('/tuitions', async (req, res) => {
  const search = str(req.query.search);
  const subject = str(req.query.subject);
  const classLevel = str(req.query.classLevel);
  const mode = str(req.query.mode);

  const filter = { ...PUBLIC };
  if (search) {
    const rx = contains(search);
    filter.$or = [{ title: rx }, { subject: rx }];
  }
  if (subject) filter.subject = subject;
  if (classLevel) filter.classLevel = classLevel;
  if (MODES.includes(mode)) filter.mode = mode;

  const { page, limit, skip } = pageParams(req.query, { limit: 9, max: 50 });
  const [items, total] = await Promise.all([
    Tuitions().find(filter).sort(SORTS[req.query.sort] ?? SORTS.latest).skip(skip).limit(limit).toArray(),
    Tuitions().countDocuments(filter),
  ]);
  res.json(toPage(await attachTutors(items), total, page, limit));
});

router.get('/tuitions/featured', async (req, res) => {
  const limit = Math.min(12, Math.max(1, parseInt(req.query.limit, 10) || 6));
  const items = await Tuitions().find(PUBLIC).sort({ createdAt: -1 }).limit(limit).toArray();
  res.json({ items: await attachTutors(items) });
});

router.get('/tuitions/:id', optionalAuth, async (req, res) => {
  const _id = parseId(req.params.id, 'tuition id');
  const tuition = await Tuitions().findOne({ _id });
  if (!tuition) throw notFound('Tuition');

  const viewer = req.user;
  const isOwner = viewer?.role === 'tutor' && viewer.email === tuition.tutorEmail;
  const isAdmin = viewer?.role === 'admin';
  const isPublic = tuition.approvalStatus === 'approved' && tuition.isActive;
  if (!isPublic && !isOwner && !isAdmin) throw notFound('Tuition');

  const [tutorDoc, totalTuitions, ratingRows, reviewDocs, myApplication] = await Promise.all([
    Users().findOne({ email: tuition.tutorEmail }),
    Tuitions().countDocuments({ tutorEmail: tuition.tutorEmail, ...PUBLIC }),
    Tuitions()
      .aggregate([
        { $match: { tutorEmail: tuition.tutorEmail, ratingCount: { $gt: 0 } } },
        { $group: { _id: null, count: { $sum: '$ratingCount' }, weighted: { $sum: { $multiply: ['$ratingAvg', '$ratingCount'] } } } },
      ])
      .toArray(),
    Applications()
      .find({ tuitionId: _id, 'review.rating': { $gte: 1 } })
      .sort({ 'review.reviewedAt': -1 })
      .limit(20)
      .toArray(),
    viewer?.role === 'student' ? Applications().findOne({ tuitionId: _id, studentEmail: viewer.email }) : null,
  ]);

  const reviewers = reviewDocs.length
    ? await Users()
        .find({ email: { $in: reviewDocs.map((r) => r.studentEmail) } }, { projection: { email: 1, image: 1 } })
        .toArray()
    : [];
  const imageByEmail = new Map(reviewers.map((u) => [u.email, u.image ?? null]));

  const [withTutor] = await attachTutors([tuition]);
  const rating = ratingRows[0];
  const saved = viewer?.role === 'student' ? await Users().findOne({ email: viewer.email }, { projection: { savedTuitions: 1 } }) : null;

  res.json({
    ...withTutor,
    tutor: {
      name: tutorDoc?.name ?? tuition.tutorName,
      email: tuition.tutorEmail,
      image: tutorDoc?.image ?? null,
      bio: tutorDoc?.bio ?? '',
      plan: tutorDoc?.plan ?? 'free',
      isVerified: tutorDoc?.plan === 'pro',
      joinedAt: tutorDoc?.createdAt ?? tuition.createdAt,
      totalTuitions,
      ratingAvg: rating ? round1(rating.weighted / rating.count) : 0,
      ratingCount: rating?.count ?? 0,
    },
    reviews: reviewDocs.map((r) => ({
      _id: String(r._id),
      studentName: r.studentName,
      studentImage: imageByEmail.get(r.studentEmail) ?? null,
      rating: r.review.rating,
      feedback: r.review.feedback,
      reviewedAt: r.review.reviewedAt,
    })),
    viewer: viewer
      ? {
          role: viewer.role,
          isOwner,
          applied: Boolean(myApplication),
          applicationStatus: myApplication?.status ?? null,
          bookmarked: Boolean(saved?.savedTuitions?.some((id) => String(id) === String(_id))),
        }
      : null,
  });
});

export default router;

import { Router } from 'express';
import { Applications, Tuitions, Users } from '../config/db.js';
import { FREE_TUITION_LIMIT } from '../lib/constants.js';
import { HttpError, notFound } from '../lib/httpError.js';
import {
  applicantStatusSchema,
  createTuitionSchema,
  tuitionStatusSchema,
  updateTuitionSchema,
} from '../lib/schemas.js';
import { attachApplicantCounts, attachStudents, contains, pageParams, str, toPage } from '../lib/serialize.js';
import { parse, parseId } from '../lib/validate.js';
import { verifyTutor } from '../middleware/auth.js';

const router = Router();
router.use(verifyTutor);

const limitFor = (user) => (user.plan === 'pro' ? null : FREE_TUITION_LIMIT);
const remaining = (user, used) => (user.plan === 'pro' ? null : Math.max(0, FREE_TUITION_LIMIT - used));

async function ownTuition(req) {
  const tuition = await Tuitions().findOne({ _id: parseId(req.params.id, 'tuition id'), tutorEmail: req.user.email });
  if (!tuition) throw notFound('Tuition');
  return tuition;
}

router.get('/stats', async (req, res) => {
  const email = req.user.email;
  const [byStatus, activeApproved, totalApplicants, pendingApplicants, accepted, ratingRows] = await Promise.all([
    Tuitions().aggregate([{ $match: { tutorEmail: email } }, { $group: { _id: '$approvalStatus', count: { $sum: 1 } } }]).toArray(),
    Tuitions().countDocuments({ tutorEmail: email, approvalStatus: 'approved', isActive: true }),
    Applications().countDocuments({ tutorEmail: email }),
    Applications().countDocuments({ tutorEmail: email, status: 'pending' }),
    Applications().countDocuments({ tutorEmail: email, status: 'accepted' }),
    Tuitions()
      .aggregate([
        { $match: { tutorEmail: email, ratingCount: { $gt: 0 } } },
        { $group: { _id: null, count: { $sum: '$ratingCount' }, weighted: { $sum: { $multiply: ['$ratingAvg', '$ratingCount'] } } } },
      ])
      .toArray(),
  ]);
  const count = (status) => byStatus.find((row) => row._id === status)?.count ?? 0;
  const totalTuitions = byStatus.reduce((sum, row) => sum + row.count, 0);
  const rating = ratingRows[0];
  res.json({
    totalTuitions,
    activeApproved,
    pending: count('pending'),
    rejected: count('rejected'),
    totalApplicants,
    pendingApplicants,
    accepted,
    plan: req.user.plan,
    postLimit: limitFor(req.user),
    postsRemaining: remaining(req.user, totalTuitions),
    ratingAvg: rating ? Math.round((rating.weighted / rating.count) * 10) / 10 : 0,
    ratingCount: rating?.count ?? 0,
  });
});

router.get('/tuitions', async (req, res) => {
  const items = await Tuitions().find({ tutorEmail: req.user.email }).sort({ createdAt: -1 }).toArray();
  res.json({
    items: await attachApplicantCounts(items),
    total: items.length,
    postLimit: limitFor(req.user),
    postsRemaining: remaining(req.user, items.length),
  });
});

router.get('/tuitions/:id', async (req, res) => {
  res.json(await ownTuition(req));
});

router.post('/tuitions', async (req, res) => {
  const data = parse(createTuitionSchema, req.body);
  if (req.user.plan !== 'pro') {
    const used = await Tuitions().countDocuments({ tutorEmail: req.user.email });
    if (used >= FREE_TUITION_LIMIT) {
      throw new HttpError(
        403,
        `Free plan allows ${FREE_TUITION_LIMIT} tuition posts. Upgrade to Pro for unlimited posts.`,
        'PLAN_LIMIT',
      );
    }
  }
  const now = new Date();
  const tuition = {
    ...data,
    schedule: data.schedule ?? '',
    bannerImage: data.bannerImage ?? '',
    tutorName: req.user.name,
    tutorEmail: req.user.email,
    approvalStatus: 'pending',
    isActive: true,
    ratingAvg: 0,
    ratingCount: 0,
    createdAt: now,
    updatedAt: now,
  };
  const { insertedId } = await Tuitions().insertOne(tuition);
  res.status(201).json({ _id: insertedId, ...tuition });
});

router.patch('/tuitions/:id', async (req, res) => {
  const tuition = await ownTuition(req);
  const data = parse(updateTuitionSchema, req.body);
  const set = { ...data, updatedAt: new Date() };
  // A rejected listing goes back to moderation once the tutor fixes it.
  if (tuition.approvalStatus === 'rejected') set.approvalStatus = 'pending';
  await Tuitions().updateOne({ _id: tuition._id }, { $set: set });
  res.json(await Tuitions().findOne({ _id: tuition._id }));
});

router.patch('/tuitions/:id/status', async (req, res) => {
  const tuition = await ownTuition(req);
  const { isActive } = parse(tuitionStatusSchema, req.body);
  await Tuitions().updateOne({ _id: tuition._id }, { $set: { isActive, updatedAt: new Date() } });
  res.json(await Tuitions().findOne({ _id: tuition._id }));
});

router.delete('/tuitions/:id', async (req, res) => {
  const tuition = await ownTuition(req);
  await Promise.all([
    Tuitions().deleteOne({ _id: tuition._id }),
    Applications().deleteMany({ tuitionId: tuition._id }),
    Users().updateMany({ savedTuitions: tuition._id }, { $pull: { savedTuitions: tuition._id } }),
  ]);
  res.json({ success: true });
});

router.get('/applicants', async (req, res) => {
  const filter = { tutorEmail: req.user.email };
  if (req.query.tuitionId) filter.tuitionId = parseId(str(req.query.tuitionId), 'tuition id');
  const status = str(req.query.status);
  if (['pending', 'accepted', 'rejected'].includes(status)) filter.status = status;
  const search = str(req.query.search);
  if (search) {
    const rx = contains(search);
    filter.$or = [{ studentName: rx }, { studentEmail: rx }, { tuitionTitle: rx }];
  }
  const { page, limit, skip } = pageParams(req.query, { limit: 20 });
  const [items, total] = await Promise.all([
    Applications().find(filter).sort({ isPriority: -1, appliedAt: -1 }).skip(skip).limit(limit).toArray(),
    Applications().countDocuments(filter),
  ]);
  res.json(toPage(await attachStudents(items), total, page, limit));
});

router.patch('/applicants/:id/status', async (req, res) => {
  const _id = parseId(req.params.id, 'application id');
  const { status } = parse(applicantStatusSchema, req.body);
  const application = await Applications().findOne({ _id, tutorEmail: req.user.email });
  if (!application) throw notFound('Application');
  await Applications().updateOne({ _id }, { $set: { status, updatedAt: new Date() } });
  res.json(await Applications().findOne({ _id }));
});

export default router;

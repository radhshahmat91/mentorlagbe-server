import { Router } from 'express';
import { Applications, Tuitions, Users } from '../config/db.js';
import { HttpError, notFound } from '../lib/httpError.js';
import { applicationSchema, reviewSchema } from '../lib/schemas.js';
import { attachTutors, pageParams, recomputeRating, str, toPage } from '../lib/serialize.js';
import { parse, parseId } from '../lib/validate.js';
import { verifyStudent } from '../middleware/auth.js';

const router = Router();
router.use(verifyStudent);

router.get('/stats', async (req, res) => {
  const email = req.user.email;
  const [totalApplied, accepted, pending, rejected, me] = await Promise.all([
    Applications().countDocuments({ studentEmail: email }),
    Applications().countDocuments({ studentEmail: email, status: 'accepted' }),
    Applications().countDocuments({ studentEmail: email, status: 'pending' }),
    Applications().countDocuments({ studentEmail: email, status: 'rejected' }),
    Users().findOne({ email }, { projection: { savedTuitions: 1 } }),
  ]);
  res.json({ totalApplied, accepted, pending, rejected, saved: me?.savedTuitions?.length ?? 0, plan: req.user.plan });
});

router.get('/applications', async (req, res) => {
  const filter = { studentEmail: req.user.email };
  const status = str(req.query.status);
  if (['pending', 'accepted', 'rejected'].includes(status)) filter.status = status;
  const { page, limit, skip } = pageParams(req.query, { limit: 50 });
  const [items, total] = await Promise.all([
    Applications().find(filter).sort({ appliedAt: -1 }).skip(skip).limit(limit).toArray(),
    Applications().countDocuments(filter),
  ]);
  res.json(toPage(items, total, page, limit));
});

router.post('/applications', async (req, res) => {
  const data = parse(applicationSchema, req.body);
  const tuitionId = parseId(data.tuitionId, 'tuition id');
  const tuition = await Tuitions().findOne({ _id: tuitionId });
  if (!tuition || tuition.approvalStatus !== 'approved') throw notFound('Tuition');
  if (!tuition.isActive) throw new HttpError(409, 'This tuition is closed for new applications', 'TUITION_CLOSED');

  const duplicate = await Applications().findOne({ tuitionId, studentEmail: req.user.email });
  if (duplicate) throw new HttpError(409, 'You have already applied for this tuition.', 'DUPLICATE_APPLICATION');

  const now = new Date();
  const application = {
    tuitionId,
    tuitionTitle: tuition.title,
    subject: tuition.subject,
    monthlyFee: tuition.monthlyFee,
    tutorEmail: tuition.tutorEmail,
    tutorName: tuition.tutorName,
    studentName: req.user.name,
    studentEmail: req.user.email,
    studentPhone: data.studentPhone,
    preferredSchedule: data.preferredSchedule,
    studentNote: data.studentNote ?? '',
    status: 'pending',
    isPriority: req.user.plan === 'pro',
    appliedAt: now,
    updatedAt: now,
  };
  const { insertedId } = await Applications().insertOne(application);
  res.status(201).json({ _id: insertedId, ...application });
});

router.delete('/applications/:id', async (req, res) => {
  const _id = parseId(req.params.id, 'application id');
  const application = await Applications().findOne({ _id, studentEmail: req.user.email });
  if (!application) throw notFound('Application');
  if (application.status !== 'pending') {
    throw new HttpError(409, 'Only pending applications can be cancelled', 'NOT_PENDING');
  }
  await Applications().deleteOne({ _id });
  res.json({ success: true });
});

router.put('/applications/:id/review', async (req, res) => {
  const _id = parseId(req.params.id, 'application id');
  const data = parse(reviewSchema, req.body);
  const application = await Applications().findOne({ _id, studentEmail: req.user.email });
  if (!application) throw notFound('Application');
  if (application.status !== 'accepted') {
    throw new HttpError(409, 'You can review a tutor after your application is accepted', 'NOT_ACCEPTED');
  }
  await Applications().updateOne(
    { _id },
    { $set: { review: { rating: data.rating, feedback: data.feedback, reviewedAt: new Date() }, updatedAt: new Date() } },
  );
  await recomputeRating(application.tuitionId);
  res.json(await Applications().findOne({ _id }));
});

const savedIds = async (email) => (await Users().findOne({ email }, { projection: { savedTuitions: 1 } }))?.savedTuitions ?? [];

router.get('/bookmarks/ids', async (req, res) => {
  res.json({ ids: (await savedIds(req.user.email)).map(String) });
});

router.get('/bookmarks', async (req, res) => {
  const ids = await savedIds(req.user.email);
  const docs = ids.length ? await Tuitions().find({ _id: { $in: ids }, approvalStatus: 'approved' }).toArray() : [];
  const order = new Map(ids.map((id, index) => [String(id), index]));
  docs.sort((a, b) => order.get(String(b._id)) - order.get(String(a._id))); // newest saved first
  res.json({ items: await attachTutors(docs) });
});

router.put('/bookmarks/:tuitionId', async (req, res) => {
  const tuitionId = parseId(req.params.tuitionId, 'tuition id');
  if (!(await Tuitions().findOne({ _id: tuitionId }, { projection: { _id: 1 } }))) throw notFound('Tuition');
  await Users().updateOne({ email: req.user.email }, { $addToSet: { savedTuitions: tuitionId } });
  res.json({ saved: true, ids: (await savedIds(req.user.email)).map(String) });
});

router.delete('/bookmarks/:tuitionId', async (req, res) => {
  const tuitionId = parseId(req.params.tuitionId, 'tuition id');
  await Users().updateOne({ email: req.user.email }, { $pull: { savedTuitions: tuitionId } });
  res.json({ saved: false, ids: (await savedIds(req.user.email)).map(String) });
});

export default router;

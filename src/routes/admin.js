import { Router } from 'express';
import { Applications, Payments, Tuitions, Users } from '../config/db.js';
import { HttpError, notFound } from '../lib/httpError.js';
import { approvalSchema, roleSchema } from '../lib/schemas.js';
import { attachApplicantCounts, contains, pageParams, publicUser, str, toPage } from '../lib/serialize.js';
import { parse, parseId } from '../lib/validate.js';
import { verifyAdmin } from '../middleware/auth.js';

const router = Router();
router.use(verifyAdmin);

/** The last `count` months as 'YYYY-MM', oldest first. */
function lastMonths(count) {
  const now = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (count - 1 - i), 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  });
}

const monthly = (collection, dateField, valueExpr, months) =>
  collection
    .aggregate([
      { $match: { [dateField]: { $gte: new Date(`${months[0]}-01T00:00:00.000Z`) } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: `$${dateField}` } }, value: { $sum: valueExpr } } },
    ])
    .toArray();

router.get('/stats', async (req, res) => {
  const months = lastMonths(6);
  const [roles, proUsers, tuitionStatus, totalApplications, revenueRows, revenueMonthly, signupMonthly] = await Promise.all([
    Users().aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]).toArray(),
    Users().countDocuments({ plan: 'pro' }),
    Tuitions().aggregate([{ $group: { _id: '$approvalStatus', count: { $sum: 1 } } }]).toArray(),
    Applications().countDocuments({}),
    Payments().aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]).toArray(),
    monthly(Payments(), 'paidAt', '$amount', months),
    monthly(Users(), 'createdAt', 1, months),
  ]);
  const roleCount = (role) => roles.find((r) => r._id === role)?.count ?? 0;
  const statusCount = (status) => tuitionStatus.find((r) => r._id === status)?.count ?? 0;
  const series = (rows) => months.map((month) => ({ month, value: rows.find((r) => r._id === month)?.value ?? 0 }));

  res.json({
    totalUsers: roles.reduce((sum, r) => sum + r.count, 0),
    totalStudents: roleCount('student'),
    totalTutors: roleCount('tutor'),
    totalAdmins: roleCount('admin'),
    proUsers,
    pendingTuitions: statusCount('pending'),
    approvedTuitions: statusCount('approved'),
    rejectedTuitions: statusCount('rejected'),
    totalTuitions: tuitionStatus.reduce((sum, r) => sum + r.count, 0),
    totalApplications,
    totalRevenue: revenueRows[0]?.total ?? 0,
    revenueByMonth: series(revenueMonthly).map(({ month, value }) => ({ month, revenue: value })),
    signupsByMonth: series(signupMonthly).map(({ month, value }) => ({ month, count: value })),
  });
});

router.get('/users', async (req, res) => {
  const filter = {};
  const search = str(req.query.search);
  if (search) {
    const rx = contains(search);
    filter.$or = [{ name: rx }, { email: rx }];
  }
  if (['student', 'tutor', 'admin'].includes(req.query.role)) filter.role = req.query.role;
  if (['free', 'pro'].includes(req.query.plan)) filter.plan = req.query.plan;
  const { page, limit, skip } = pageParams(req.query);
  const [items, total] = await Promise.all([
    Users().find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
    Users().countDocuments(filter),
  ]);
  res.json(toPage(items.map(publicUser), total, page, limit));
});

router.patch('/users/:id/role', async (req, res) => {
  const _id = parseId(req.params.id, 'user id');
  const { role } = parse(roleSchema, req.body);
  if (String(_id) === req.user.id) {
    throw new HttpError(400, 'You cannot change your own role', 'SELF_ROLE_CHANGE');
  }
  const { matchedCount } = await Users().updateOne({ _id }, { $set: { role, updatedAt: new Date() } });
  if (!matchedCount) throw notFound('User');
  res.json(publicUser(await Users().findOne({ _id })));
});

router.get('/tuitions', async (req, res) => {
  const filter = {};
  const status = str(req.query.status);
  if (['pending', 'approved', 'rejected'].includes(status)) filter.approvalStatus = status;
  const search = str(req.query.search);
  if (search) {
    const rx = contains(search);
    filter.$or = [{ title: rx }, { subject: rx }, { tutorName: rx }, { tutorEmail: rx }];
  }
  const { page, limit, skip } = pageParams(req.query);
  const [items, total] = await Promise.all([
    Tuitions().find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
    Tuitions().countDocuments(filter),
  ]);
  res.json(toPage(await attachApplicantCounts(items), total, page, limit));
});

router.patch('/tuitions/:id/approval', async (req, res) => {
  const _id = parseId(req.params.id, 'tuition id');
  const { approvalStatus } = parse(approvalSchema, req.body);
  const { matchedCount } = await Tuitions().updateOne({ _id }, { $set: { approvalStatus, updatedAt: new Date() } });
  if (!matchedCount) throw notFound('Tuition');
  res.json(await Tuitions().findOne({ _id }));
});

router.get('/transactions', async (req, res) => {
  const filter = {};
  const search = str(req.query.search);
  if (search) {
    const rx = contains(search);
    filter.$or = [{ userName: rx }, { userEmail: rx }, { transactionId: rx }, { planName: rx }];
  }
  const { page, limit, skip } = pageParams(req.query);
  const [items, total, revenueRows] = await Promise.all([
    Payments().find(filter).sort({ paidAt: -1 }).skip(skip).limit(limit).toArray(),
    Payments().countDocuments(filter),
    Payments().aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]).toArray(),
  ]);
  res.json({ ...toPage(items, total, page, limit), totalRevenue: revenueRows[0]?.total ?? 0, currency: 'usd' });
});

export default router;

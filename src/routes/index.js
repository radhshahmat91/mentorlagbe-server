import { Router } from 'express';
import { accountRoutes } from './account.js';
import adminRoutes from './admin.js';
import publicRoutes from './public.js';
import studentRoutes from './student.js';
import tutorRoutes from './tutor.js';

/** Mounts every API router under `/api`. */
export default function buildApiRouter(deps) {
  const router = Router();
  router.use(publicRoutes);
  router.use(accountRoutes(deps));
  router.use('/student', studentRoutes);
  router.use('/tutor', tutorRoutes);
  router.use('/admin', adminRoutes);
  return router;
}

import { Router } from 'express';
import * as attendanceController from '../controllers/attendance.controller.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole, ROLES } from '../middleware/rbac.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/check-in-qr', requireRole(ROLES.ADMIN), asyncHandler(attendanceController.getGymQr));
router.post(
  '/check-in-qr/regenerate',
  requireRole(ROLES.ADMIN),
  asyncHandler(attendanceController.regenerateGymQr),
);

export default router;

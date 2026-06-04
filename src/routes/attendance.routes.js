import { Router } from 'express';
import * as attendanceController from '../controllers/attendance.controller.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole, ROLES } from '../middleware/rbac.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  checkInSchema,
  checkOutSchema,
  updateAttendanceSchema,
} from '../validators/attendance.validator.js';

const router = Router();

router.use(authenticate);

router.post(
  '/check-in',
  requireRole(ROLES.ADMIN, ROLES.TRAINER, ROLES.MEMBER),
  validate(checkInSchema),
  asyncHandler(attendanceController.checkIn),
);
router.post(
  '/:id/check-out',
  requireRole(ROLES.ADMIN, ROLES.TRAINER, ROLES.MEMBER),
  validate(checkOutSchema),
  asyncHandler(attendanceController.checkOut),
);
router.get(
  '/',
  requireRole(ROLES.ADMIN, ROLES.TRAINER, ROLES.MEMBER),
  asyncHandler(attendanceController.list),
);
router.get(
  '/:id',
  requireRole(ROLES.ADMIN, ROLES.TRAINER, ROLES.MEMBER),
  asyncHandler(attendanceController.getById),
);
router.patch(
  '/:id',
  requireRole(ROLES.ADMIN),
  validate(updateAttendanceSchema),
  asyncHandler(attendanceController.update),
);
router.delete('/:id', requireRole(ROLES.ADMIN), asyncHandler(attendanceController.remove));

export default router;

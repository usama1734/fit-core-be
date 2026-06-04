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
import { paginationQuerySchema } from '../validators/pagination.validator.js';
import { AppError } from '../utils/AppError.js';

const router = Router();

router.use(authenticate);

const RESERVED_IDS = new Set(['check-in']);

router.post(
  '/check-in',
  requireRole(ROLES.MEMBER),
  validate(checkInSchema),
  asyncHandler(attendanceController.checkIn),
);

router.get(
  '/',
  requireRole(ROLES.ADMIN, ROLES.TRAINER, ROLES.MEMBER),
  validate(paginationQuerySchema, 'query'),
  asyncHandler(attendanceController.list),
);

router.post(
  '/:id/check-out',
  requireRole(ROLES.ADMIN, ROLES.TRAINER, ROLES.MEMBER),
  validate(checkOutSchema),
  asyncHandler(attendanceController.checkOut),
);

function rejectReservedId(req, _res, next) {
  if (RESERVED_IDS.has(req.params.id)) {
    return next(new AppError('Not found', 404, 'NOT_FOUND'));
  }
  next();
}

router.get(
  '/:id',
  requireRole(ROLES.ADMIN, ROLES.TRAINER, ROLES.MEMBER),
  rejectReservedId,
  asyncHandler(attendanceController.getById),
);
router.patch(
  '/:id',
  requireRole(ROLES.ADMIN),
  rejectReservedId,
  validate(updateAttendanceSchema),
  asyncHandler(attendanceController.update),
);
router.delete(
  '/:id',
  requireRole(ROLES.ADMIN),
  rejectReservedId,
  asyncHandler(attendanceController.remove),
);

export default router;

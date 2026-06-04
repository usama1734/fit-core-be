import { Router } from 'express';
import * as dashboardController from '#controllers/dashboard.controller.js';
import { asyncHandler } from '#utils/asyncHandler.js';
import { authenticate } from '#middleware/auth.middleware.js';
import { requireRole, ROLES } from '#middleware/rbac.middleware.js';
import { validate } from '#middleware/validate.middleware.js';
import { dashboardQuerySchema } from '#validators/dashboard.validator.js';

const router = Router();

router.use(authenticate);

router.get(
  '/admin',
  requireRole(ROLES.ADMIN),
  validate(dashboardQuerySchema, 'query'),
  asyncHandler(dashboardController.admin),
);
router.get(
  '/trainer',
  requireRole(ROLES.TRAINER),
  validate(dashboardQuerySchema, 'query'),
  asyncHandler(dashboardController.trainer),
);

export default router;

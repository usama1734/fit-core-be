import { Router } from 'express';
import * as memberController from '#controllers/member.controller.js';
import { asyncHandler } from '#utils/asyncHandler.js';
import { authenticate } from '#middleware/auth.middleware.js';
import { requireRole, ROLES } from '#middleware/rbac.middleware.js';
import { validate } from '#middleware/validate.middleware.js';
import {
  createMemberSchema,
  updateMemberSchema,
  updateOwnProfileSchema,
  assignTrainerSchema,
  assignPlanSchema,
} from '#validators/member.validator.js';
import { paginationQuerySchema } from '#validators/pagination.validator.js';

const router = Router();

router.use(authenticate);

router.get('/me', requireRole(ROLES.MEMBER), asyncHandler(memberController.getMe));
router.patch(
  '/me',
  requireRole(ROLES.MEMBER),
  validate(updateOwnProfileSchema),
  asyncHandler(memberController.updateMe),
);

router.post(
  '/',
  requireRole(ROLES.ADMIN, ROLES.TRAINER),
  validate(createMemberSchema),
  asyncHandler(memberController.create),
);
router.get(
  '/',
  requireRole(ROLES.ADMIN, ROLES.TRAINER),
  validate(paginationQuerySchema, 'query'),
  asyncHandler(memberController.list),
);
router.get(
  '/:id',
  requireRole(ROLES.ADMIN, ROLES.TRAINER, ROLES.MEMBER),
  asyncHandler(memberController.getById),
);
router.patch(
  '/:id',
  requireRole(ROLES.ADMIN),
  validate(updateMemberSchema),
  asyncHandler(memberController.update),
);
router.patch(
  '/:id/assign-trainer',
  requireRole(ROLES.ADMIN),
  validate(assignTrainerSchema),
  asyncHandler(memberController.assignTrainer),
);
router.patch(
  '/:id/assign-plan',
  requireRole(ROLES.ADMIN),
  validate(assignPlanSchema),
  asyncHandler(memberController.assignPlan),
);
router.delete('/:id', requireRole(ROLES.ADMIN), asyncHandler(memberController.remove));

export default router;

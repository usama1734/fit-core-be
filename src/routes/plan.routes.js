import { Router } from 'express';
import * as planController from '#controllers/plan.controller.js';
import { asyncHandler } from '#utils/asyncHandler.js';
import { authenticate } from '#middleware/auth.middleware.js';
import { requireRole, ROLES } from '#middleware/rbac.middleware.js';
import { validate } from '#middleware/validate.middleware.js';
import { createPlanSchema, updatePlanSchema } from '#validators/plan.validator.js';
import { paginationQuerySchema } from '#validators/pagination.validator.js';

const router = Router();

router.use(authenticate);

router.get('/', validate(paginationQuerySchema, 'query'), asyncHandler(planController.list));
router.get('/:id', asyncHandler(planController.getById));
router.post(
  '/',
  requireRole(ROLES.ADMIN),
  validate(createPlanSchema),
  asyncHandler(planController.create),
);
router.patch(
  '/:id',
  requireRole(ROLES.ADMIN),
  validate(updatePlanSchema),
  asyncHandler(planController.update),
);
router.delete('/:id', requireRole(ROLES.ADMIN), asyncHandler(planController.remove));

export default router;

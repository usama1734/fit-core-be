import { Router } from 'express';
import * as paymentController from '../controllers/payment.controller.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole, ROLES } from '../middleware/rbac.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  createCheckoutSchema,
  confirmCheckoutSchema,
  updatePaymentSchema,
  createManualPaymentSchema,
} from '../validators/payment.validator.js';
import { paginationQuerySchema } from '../validators/pagination.validator.js';

const router = Router();

// Specific paths before /:id to avoid route shadowing
router.post(
  '/checkout',
  authenticate,
  requireRole(ROLES.MEMBER),
  validate(createCheckoutSchema),
  asyncHandler(paymentController.checkout),
);
router.post(
  '/confirm',
  authenticate,
  requireRole(ROLES.MEMBER),
  validate(confirmCheckoutSchema),
  asyncHandler(paymentController.confirm),
);
router.post(
  '/sync',
  authenticate,
  requireRole(ROLES.MEMBER),
  validate(paginationQuerySchema, 'query'),
  asyncHandler(paymentController.sync),
);
router.post(
  '/manual',
  authenticate,
  requireRole(ROLES.ADMIN),
  validate(createManualPaymentSchema),
  asyncHandler(paymentController.createManual),
);

router.get(
  '/',
  authenticate,
  requireRole(ROLES.ADMIN, ROLES.MEMBER),
  validate(paginationQuerySchema, 'query'),
  asyncHandler(paymentController.list),
);
router.get(
  '/:id',
  authenticate,
  requireRole(ROLES.ADMIN, ROLES.MEMBER),
  asyncHandler(paymentController.getById),
);
router.patch(
  '/:id',
  authenticate,
  requireRole(ROLES.ADMIN),
  validate(updatePaymentSchema),
  asyncHandler(paymentController.update),
);
router.delete(
  '/:id',
  authenticate,
  requireRole(ROLES.ADMIN),
  asyncHandler(paymentController.remove),
);

export default router;

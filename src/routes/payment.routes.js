import { Router } from 'express';
import * as paymentController from '../controllers/payment.controller.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole, ROLES } from '../middleware/rbac.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  createCheckoutSchema,
  updatePaymentSchema,
  createManualPaymentSchema,
} from '../validators/payment.validator.js';

const router = Router();

router.get(
  '/',
  authenticate,
  requireRole(ROLES.ADMIN, ROLES.TRAINER, ROLES.MEMBER),
  asyncHandler(paymentController.list),
);
router.get(
  '/:id',
  authenticate,
  requireRole(ROLES.ADMIN, ROLES.TRAINER, ROLES.MEMBER),
  asyncHandler(paymentController.getById),
);
router.post(
  '/checkout',
  authenticate,
  requireRole(ROLES.ADMIN, ROLES.MEMBER),
  validate(createCheckoutSchema),
  asyncHandler(paymentController.checkout),
);
router.post(
  '/manual',
  authenticate,
  requireRole(ROLES.ADMIN),
  validate(createManualPaymentSchema),
  asyncHandler(paymentController.createManual),
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

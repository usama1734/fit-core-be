import { Router } from 'express';
import * as trainerController from '../controllers/trainer.controller.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole, ROLES } from '../middleware/rbac.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { createTrainerSchema, updateTrainerSchema } from '../validators/trainer.validator.js';

const router = Router();

router.use(authenticate);

router.get('/me/members', requireRole(ROLES.TRAINER), asyncHandler(trainerController.myMembers));

router.post('/', requireRole(ROLES.ADMIN), validate(createTrainerSchema), asyncHandler(trainerController.create));
router.get('/', requireRole(ROLES.ADMIN), asyncHandler(trainerController.list));
router.get('/:id', requireRole(ROLES.ADMIN, ROLES.TRAINER), asyncHandler(trainerController.getById));
router.get('/:id/members', requireRole(ROLES.ADMIN, ROLES.TRAINER), asyncHandler(trainerController.assignedMembers));
router.patch('/:id', requireRole(ROLES.ADMIN), validate(updateTrainerSchema), asyncHandler(trainerController.update));
router.delete('/:id', requireRole(ROLES.ADMIN), asyncHandler(trainerController.remove));

export default router;

import { Router } from 'express';
import authRoutes from './auth.routes.js';
import trainerRoutes from './trainer.routes.js';
import memberRoutes from './member.routes.js';
import planRoutes from './plan.routes.js';
import attendanceRoutes from './attendance.routes.js';
import paymentRoutes from './payment.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import * as paymentController from '../controllers/payment.controller.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const apiRouter = Router();

apiRouter.use('/auth', authRoutes);
apiRouter.use('/trainers', trainerRoutes);
apiRouter.use('/members', memberRoutes);
apiRouter.use('/plans', planRoutes);
apiRouter.use('/attendance', attendanceRoutes);
apiRouter.use('/payments', paymentRoutes);
apiRouter.use('/dashboard', dashboardRoutes);

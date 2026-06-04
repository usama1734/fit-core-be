import express from 'express';
import cors from 'cors';
import { env } from '#config/env.js';
import { requestLogger } from '#middleware/requestLogger.middleware.js';
import { auditLoggerMiddleware } from '#middleware/auditLogger.middleware.js';
import { errorHandler } from '#middleware/errorHandler.middleware.js';
import { apiRouter } from '#routes/index.js';
import * as paymentController from '#controllers/payment.controller.js';
import { asyncHandler } from '#utils/asyncHandler.js';

const app = express();

app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
app.use(requestLogger);

app.post(
  '/api/payments/webhook',
  express.raw({ type: 'application/json' }),
  asyncHandler(paymentController.webhook),
);

app.use(express.json());
app.use(auditLoggerMiddleware);

app.get('/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok' }, message: 'FitCore API' });
});

app.use('/api', apiRouter);

app.use(errorHandler);

export default app;

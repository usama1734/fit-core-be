import * as authService from '../services/auth.service.js';
import { successResponse } from '../utils/apiResponse.js';
import { auditLog } from '../middleware/auditLogger.middleware.js';

export async function login(req, res, next) {
  try {
    const result = await authService.login(req.body.email, req.body.password);
    auditLog({ action: 'AUTH_LOGIN', actorId: result.user.id, resource: 'auth/login' });
    res.json(successResponse(result, 'Login successful'));
  } catch (err) {
    auditLog({ action: 'AUTH_FAILED', resource: 'auth/login', meta: { email: req.body.email } });
    next(err);
  }
}

export async function getMe(req, res) {
  const user = await authService.getMe(req.user.id);
  res.json(successResponse(user));
}

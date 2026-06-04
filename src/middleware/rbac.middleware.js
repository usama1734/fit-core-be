import { AppError } from '#utils/AppError.js';
import { auditLog } from './auditLogger.middleware.js';

export const ROLES = {
  ADMIN: 'ADMIN',
  TRAINER: 'TRAINER',
  MEMBER: 'MEMBER',
};

export function requireRole(...allowedRoles) {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      auditLog({
        action: 'RBAC_DENIED',
        actorId: req.user.id,
        resource: req.originalUrl,
        meta: { role: req.user.role, required: allowedRoles },
      });
      return next(new AppError('Insufficient permissions', 403, 'FORBIDDEN'));
    }

    next();
  };
}

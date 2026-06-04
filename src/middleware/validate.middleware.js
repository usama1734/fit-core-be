import { AppError } from '#utils/AppError.js';

export function validate(schema, source = 'body') {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const details = result.error.flatten();
      return next(new AppError('Validation failed', 400, 'VALIDATION_ERROR', details));
    }
    req[source] = result.data;
    next();
  };
}

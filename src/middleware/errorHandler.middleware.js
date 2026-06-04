import { errorResponse } from '#utils/apiResponse.js';
import { AppError } from '#utils/AppError.js';

export function errorHandler(err, _req, res, _next) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json(errorResponse(err.code, err.message, err.details));
  }

  if (err.code === 'P2002') {
    return res
      .status(409)
      .json(errorResponse('DUPLICATE', 'Resource already exists', { field: err.meta?.target }));
  }

  if (err.code === 'P2025') {
    return res.status(404).json(errorResponse('NOT_FOUND', 'Resource not found'));
  }

  if (process.env.NODE_ENV !== 'production') {
    console.error(err);
  }

  res.status(500).json(errorResponse('INTERNAL_ERROR', 'Internal server error'));
}

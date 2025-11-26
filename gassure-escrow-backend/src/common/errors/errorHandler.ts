import type { NextFunction, Request, Response } from 'express';
import { AppError } from './AppError';
import { logger } from '../../config/logger';

export const errorHandler = (
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (error instanceof AppError) {
    logger.warn({ error }, 'Handled AppError');
    return res.status(error.statusCode).json({
      error: error.message,
      details: error.details,
    });
  }

  logger.error({ error }, 'Unhandled error');
  return res.status(500).json({
    error: 'Internal server error',
  });
};


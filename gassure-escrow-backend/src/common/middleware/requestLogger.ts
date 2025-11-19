import type { NextFunction, Request, Response } from 'express';
import { logger } from '../../config/logger';

export const requestLogger = (req: Request, _res: Response, next: NextFunction) => {
  logger.info({ method: req.method, url: req.originalUrl }, 'Incoming request');
  next();
};


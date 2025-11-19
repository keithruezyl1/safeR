import type { RequestHandler } from 'express';

export type AsyncHandler = (...args: Parameters<RequestHandler>) => Promise<unknown>;

export const wrapAsync =
  (handler: AsyncHandler): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };


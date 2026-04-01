import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof AppError) {
    logger.warn('Operational error', {
      statusCode: err.statusCode,
      message: err.message,
      path: req.path,
      method: req.method,
    });
    res.status(err.statusCode).json({
      error: err.message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
    return;
  }

  // Postgres unique violation
  if ((err as any).code === '23505') {
    res.status(409).json({ error: 'Resource already exists' });
    return;
  }

  // Postgres foreign key violation
  if ((err as any).code === '23503') {
    res.status(400).json({ error: 'Referenced resource not found' });
    return;
  }

  logger.error('Unhandled error', {
    message: err.message,
    stack: err.stack,
    path: req.path,
  });

  res.status(500).json({
    error: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { detail: err.message }),
  });
};

export const notFound = (req: Request, res: Response): void => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
};

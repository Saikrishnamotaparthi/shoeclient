import { Request, Response, NextFunction } from 'express';

export const errorHandler = (err: any, req: Request, res: Response, _next: NextFunction) => {
  console.error('Global Error Handler:', err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  // Never expose stack traces to clients — log only
  res.status(statusCode).json({ error: message });
};

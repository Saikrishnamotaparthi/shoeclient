import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/auth';

export const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.user.admin !== true) {
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }

  next();
};

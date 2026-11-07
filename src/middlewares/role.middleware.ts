import { NextFunction, Request, Response } from 'express';
import { Role } from '@prisma/client';
import { ApiError } from '../utils/api-error';

export const authorize =
  (...roles: Role[]) => (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new ApiError(403, 'Anda tidak memiliki akses ke fitur ini');
    }
    next();
  };
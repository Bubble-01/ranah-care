import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { env } from '../config/env';
import { ApiError } from '../utils/api-error';

export const authenticate = (req: Request, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw new ApiError(401, 'Silakan login terlebih dahulu');
  }

  try {
    const payload = jwt.verify(header.slice(7), env.JWT_SECRET) as { sub: string; role: Role };
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    throw new ApiError(401, 'Sesi Anda sudah berakhir, silakan login lagi');
  }
};
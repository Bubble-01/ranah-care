import { NextFunction, Request, Response } from 'express';
import { ZodType } from 'zod';

export const validate =
  (schema: ZodType) => (req: Request, _res: Response, next: NextFunction) => {
    req.body = schema.parse(req.body); // ZodError ditangani errorHandler
    next();
  };
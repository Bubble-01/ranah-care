import { Request, Response } from 'express';
import { Role } from '@prisma/client';
import { userService } from './users.service';

export const userController = {
  list: async (req: Request, res: Response) => {
    const role = Object.values(Role).find((r) => r === req.query.role);
    res.json({ success: true, data: await userService.list(role) });
  },
  create: async (req: Request, res: Response) => {
    res.status(201).json({ success: true, message: 'Akun dibuat', data: await userService.create(req.body) });
  },
  setStatus: async (req: Request, res: Response) => {
    const data = await userService.setStatus(req.user!.id, String(req.params.id), req.body.isActive);
    res.json({ success: true, message: 'Status akun diperbarui', data });
  },
};
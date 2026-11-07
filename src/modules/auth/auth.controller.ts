import { Request, Response } from 'express';
import { authService } from './auth.service';

export const authController = {
  register: async (req: Request, res: Response) => {
    const data = await authService.register(req.body);
    res.status(201).json({ success: true, message: 'Registrasi berhasil', data });
  },
  login: async (req: Request, res: Response) => {
    const data = await authService.login(req.body.email, req.body.password);
    res.json({ success: true, message: 'Login berhasil', data });
  },
  me: async (req: Request, res: Response) => {
    const data = await authService.me(req.user!.id);
    res.json({ success: true, data });
  },
};
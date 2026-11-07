import { Request, Response } from 'express';
import { chatService } from './chat.service';

export const chatController = {
  sendMessage: async (req: Request, res: Response) => {
    const data = await chatService.sendMessage(req.user!.id, req.body);
    res.json({ success: true, data });
  },
  listSessions: async (req: Request, res: Response) => {
    res.json({ success: true, data: await chatService.listSessions(req.user!.id) });
  },
  getSession: async (req: Request, res: Response) => {
    res.json({ success: true, data: await chatService.getSession(req.user!.id, String(req.params.id)) });
  },
  summarize: async (req: Request, res: Response) => {
    res.json({ success: true, data: await chatService.summarize(req.user!.id, String(req.params.id)) });
  },
};
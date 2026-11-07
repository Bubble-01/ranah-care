import { Request, Response } from 'express';
import { QueueStatus } from '@prisma/client';
import { queueService } from './queue.service';

const id = (req: Request) => String(req.params.id);
const ok = (res: Response, data: unknown, message?: string, code = 200) =>
  res.status(code).json({ success: true, ...(message && { message }), data });

export const queueController = {
  book: async (req: Request, res: Response) =>
    ok(res, await queueService.book(req.user!.id, req.body), 'Booking antrean berhasil', 201),
  mine: async (req: Request, res: Response) => ok(res, await queueService.mine(req.user!.id)),
  cancel: async (req: Request, res: Response) =>
    ok(res, await queueService.cancel(req.user!.id, id(req)), 'Antrean dibatalkan'),

  today: async (req: Request, res: Response) => {
    const status = Object.values(QueueStatus).find((s) => s === req.query.status);
    ok(res, await queueService.listToday(req.user!.id, status));
  },
  checkIn: async (req: Request, res: Response) =>
    ok(res, await queueService.checkIn(req.user!.id, id(req)), 'Kedatangan pasien dikonfirmasi'),

  doctorToday: async (req: Request, res: Response) =>
    ok(res, await queueService.doctorToday(req.user!.id)),
  call: async (req: Request, res: Response) =>
    ok(res, await queueService.call(req.user!.id, id(req)), 'Pasien dipanggil'),
  doctorDetail: async (req: Request, res: Response) =>
    ok(res, await queueService.doctorDetail(req.user!.id, id(req))),
};
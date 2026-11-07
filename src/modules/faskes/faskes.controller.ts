import { Request, Response } from 'express';
import { faskesService } from './faskes.service';

const param = (req: Request, key: string) => String(req.params[key]);

export const faskesController = {
  list: async (req: Request, res: Response) => {
    const city = typeof req.query.city === 'string' ? req.query.city : undefined;
    const includeInactive = req.user!.role === 'ADMIN' && req.query.all === 'true';
    res.json({ success: true, data: await faskesService.list({ city, includeInactive }) });
  },
  get: async (req: Request, res: Response) => {
    res.json({ success: true, data: await faskesService.get(param(req, 'id')) });
  },
  create: async (req: Request, res: Response) => {
    res.status(201).json({ success: true, message: 'Faskes ditambahkan', data: await faskesService.create(req.body) });
  },
  update: async (req: Request, res: Response) => {
    res.json({ success: true, message: 'Faskes diperbarui', data: await faskesService.update(param(req, 'id'), req.body) });
  },
  createPoli: async (req: Request, res: Response) => {
    const data = await faskesService.createPoli(param(req, 'id'), req.body.name);
    res.status(201).json({ success: true, message: 'Poli ditambahkan', data });
  },
  updatePoli: async (req: Request, res: Response) => {
    res.json({ success: true, message: 'Poli diperbarui', data: await faskesService.updatePoli(param(req, 'poliId'), req.body) });
  },
};
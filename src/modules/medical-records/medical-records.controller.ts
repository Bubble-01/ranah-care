import { Request, Response } from 'express';
import { medicalRecordService } from './medical-records.service';

export const medicalRecordController = {
  create: async (req: Request, res: Response) => {
    const data = await medicalRecordService.create(req.user!.id, req.body);
    res.status(201).json({ success: true, message: 'Rekam medis tersimpan', data });
  },
  mine: async (req: Request, res: Response) => {
    res.json({ success: true, data: await medicalRecordService.mine(req.user!.id) });
  },
  patientHistory: async (req: Request, res: Response) => {
    const data = await medicalRecordService.patientHistory(req.user!.id, String(req.params.patientId));
    res.json({ success: true, data });
  },
};
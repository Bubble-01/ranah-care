import { z } from 'zod';

export const sendMessageSchema = z.object({
  sessionId: z.string().uuid().optional(),
  message: z.string().trim().min(1, 'Pesan tidak boleh kosong').max(2000),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

export const summaryResultSchema = z.object({
  title: z.string().max(100),
  summary: z.string(),
  urgency: z.enum(['RENDAH', 'SEDANG', 'TINGGI']),
});
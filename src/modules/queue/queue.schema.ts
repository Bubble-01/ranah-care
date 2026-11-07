import { z } from 'zod';

export const bookQueueSchema = z.object({
  faskesId: z.string().uuid(),
  poliId: z.string().uuid(),
  chatSessionId: z.string().uuid().optional(),
  complaint: z.string().trim().max(1000).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal: YYYY-MM-DD').optional(),
});
import { z } from 'zod';

export const createRecordSchema = z.object({
  queueId: z.string().uuid(),
  physicalExam: z.string().trim().max(5000).optional(),
  diagnosis: z.string().trim().min(3, 'Diagnosis wajib diisi').max(5000),
  prescription: z.string().trim().max(5000).optional(),
  notes: z.string().trim().max(5000).optional(),
});
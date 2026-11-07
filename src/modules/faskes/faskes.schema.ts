import { z } from 'zod';

export const createFaskesSchema = z.object({
  name: z.string().trim().min(3),
  type: z.enum(['PUSKESMAS', 'RUMAH_SAKIT', 'KLINIK']),
  address: z.string().trim().min(5),
  city: z.string().trim().min(2),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  phone: z.string().trim().optional(),
});

export const updateFaskesSchema = createFaskesSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const poliSchema = z.object({ name: z.string().trim().min(2) });
export const updatePoliSchema = poliSchema.partial().extend({ isActive: z.boolean().optional() });

export type CreateFaskesInput = z.infer<typeof createFaskesSchema>;
export type UpdateFaskesInput = z.infer<typeof updateFaskesSchema>;
export type UpdatePoliInput = z.infer<typeof updatePoliSchema>;
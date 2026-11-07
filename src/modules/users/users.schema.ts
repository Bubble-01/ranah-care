import { z } from 'zod';

export const createUserSchema = z
  .object({
    name: z.string().trim().min(2),
    email: z.string().email(),
    phone: z.string().trim().optional(),
    password: z.string().min(8, 'Password minimal 8 karakter'),
    role: z.enum(['ADMIN', 'PASIEN', 'RESEPSIONIS', 'DOKTER']),
    faskesId: z.string().uuid().optional(),
    poliId: z.string().uuid().optional(),
    specialization: z.string().trim().optional(),
    strNumber: z.string().trim().optional(),
  })
  .superRefine((d, ctx) => {
    const need = (field: 'faskesId' | 'poliId') =>
      ctx.addIssue({ code: 'custom', path: [field], message: `${field} wajib untuk role ${d.role}` });
    if (d.role === 'DOKTER') {
      if (!d.faskesId) need('faskesId');
      if (!d.poliId) need('poliId');
    }
    if (d.role === 'RESEPSIONIS' && !d.faskesId) need('faskesId');
  });

export const updateStatusSchema = z.object({ isActive: z.boolean() });

export type CreateUserInput = z.infer<typeof createUserSchema>;
import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../utils/api-error';
import { orNotFound } from '../../utils/prisma-errors';
import { CreateUserInput } from './users.schema';

// Password tidak pernah ikut dikirim keluar
const userSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  isActive: true,
  createdAt: true,
  doctorProfile: { select: { specialization: true, faskes: { select: { name: true } }, poli: { select: { name: true } } } },
  staffProfile: { select: { faskes: { select: { name: true } } } },
} as const;

export const userService = {
  list(role?: Role) {
    return prisma.user.findMany({
      where: role ? { role } : {},
      orderBy: { createdAt: 'desc' },
      select: userSelect,
    });
  },

  async create(input: CreateUserInput) {
    if (await prisma.user.findUnique({ where: { email: input.email } })) {
      throw new ApiError(409, 'Email sudah terdaftar');
    }

    if (input.role === 'DOKTER') {
      const poli = await prisma.poli.findFirst({ where: { id: input.poliId, faskesId: input.faskesId } });
      if (!poli) throw new ApiError(400, 'Poli tidak ditemukan di faskes tersebut');
    }
    if (input.role === 'RESEPSIONIS') {
      const faskes = await prisma.faskes.findUnique({ where: { id: input.faskesId } });
      if (!faskes) throw new ApiError(400, 'Faskes tidak ditemukan');
    }

    return prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        phone: input.phone,
        password: await bcrypt.hash(input.password, 10),
        role: input.role,
        ...(input.role === 'DOKTER' && {
          doctorProfile: {
            create: {
              faskesId: input.faskesId!,
              poliId: input.poliId!,
              specialization: input.specialization,
              strNumber: input.strNumber,
            },
          },
        }),
        ...(input.role === 'RESEPSIONIS' && {
          staffProfile: { create: { faskesId: input.faskesId! } },
        }),
      },
      select: userSelect,
    });
  },

  async setStatus(adminId: string, id: string, isActive: boolean) {
    if (adminId === id && !isActive) throw new ApiError(400, 'Anda tidak bisa menonaktifkan akun sendiri');
    return orNotFound(
      prisma.user.update({ where: { id }, data: { isActive }, select: userSelect }),
      'User tidak ditemukan',
    );
  },
};
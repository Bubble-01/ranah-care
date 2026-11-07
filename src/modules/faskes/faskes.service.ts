import { prisma } from '../../lib/prisma';
import { ApiError } from '../../utils/api-error';
import { isUniqueError, orNotFound } from '../../utils/prisma-errors';
import { CreateFaskesInput, UpdateFaskesInput, UpdatePoliInput } from './faskes.schema';

const POLI_EXISTS = 'Poli dengan nama itu sudah ada di faskes ini';

export const faskesService = {
  list({ city, includeInactive }: { city?: string; includeInactive?: boolean }) {
    return prisma.faskes.findMany({
      where: { ...(includeInactive ? {} : { isActive: true }), ...(city && { city }) },
      orderBy: { name: 'asc' },
      include: {
        polis: {
          where: includeInactive ? {} : { isActive: true },
          select: { id: true, name: true, isActive: true },
        },
      },
    });
  },

  async get(id: string) {
    const f = await prisma.faskes.findFirst({
      where: { id, isActive: true },
      include: { polis: { where: { isActive: true }, select: { id: true, name: true } } },
    });
    if (!f) throw new ApiError(404, 'Faskes tidak ditemukan');
    return f;
  },

  create: (data: CreateFaskesInput) => prisma.faskes.create({ data }),

  // Tidak ada DELETE: faskes dinonaktifkan (isActive:false) agar riwayat antrean dan rekam medis tetap utuh
  update: (id: string, data: UpdateFaskesInput) =>
    orNotFound(prisma.faskes.update({ where: { id }, data }), 'Faskes tidak ditemukan'),

  async createPoli(faskesId: string, name: string) {
    const f = await prisma.faskes.findUnique({ where: { id: faskesId } });
    if (!f) throw new ApiError(404, 'Faskes tidak ditemukan');
    try {
      return await prisma.poli.create({ data: { faskesId, name } });
    } catch (e) {
      if (isUniqueError(e)) throw new ApiError(409, POLI_EXISTS);
      throw e;
    }
  },

  async updatePoli(id: string, data: UpdatePoliInput) {
    try {
      return await orNotFound(prisma.poli.update({ where: { id }, data }), 'Poli tidak ditemukan');
    } catch (e) {
      if (isUniqueError(e)) throw new ApiError(409, POLI_EXISTS);
      throw e;
    }
  },
};
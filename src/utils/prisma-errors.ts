import { Prisma } from '@prisma/client';
import { ApiError } from './api-error';

export const isUniqueError = (e: unknown) =>
  e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002';

// Ubah error "data tidak ada" dari Prisma menjadi 404 yang rapi
export async function orNotFound<T>(promise: Promise<T>, message: string) {
  try {
    return await promise;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      throw new ApiError(404, message);
    }
    throw e;
  }
}
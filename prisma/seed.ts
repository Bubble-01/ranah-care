import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('password123', 10);

  const faskes = await prisma.faskes.create({
    data: {
      name: 'Puskesmas Contoh',
      type: 'PUSKESMAS',
      address: 'Jl. Contoh No. 1',
      city: 'Pekanbaru',
      latitude: 0.5071,
      longitude: 101.4478,
      polis: { create: [{ name: 'Poli Umum' }, { name: 'Poli Gigi' }] },
    },
    include: { polis: true },
  });

  await prisma.user.create({
    data: { name: 'Admin', email: 'admin@ranah.test', password, role: 'ADMIN' },
  });

  await prisma.user.create({
    data: {
      name: 'dr. Budi', email: 'dokter@ranah.test', password, role: 'DOKTER',
      doctorProfile: { create: { faskesId: faskes.id, poliId: faskes.polis[0].id } },
    },
  });

  await prisma.user.create({
    data: {
      name: 'Siti Resepsionis', email: 'resepsionis@ranah.test', password, role: 'RESEPSIONIS',
      staffProfile: { create: { faskesId: faskes.id } },
    },
  });

  console.log('✅ Seed selesai (password semua akun: password123)');
}

main().finally(() => prisma.$disconnect());
/// <reference types="node" />
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('password123', 10);

  const faskes =
    (await prisma.faskes.findFirst({ where: { name: 'Puskesmas Contoh' } })) ??
    (await prisma.faskes.create({
      data: {
        name: 'Puskesmas Contoh',
        type: 'PUSKESMAS',
        address: 'Jl. Contoh No. 1',
        city: 'Pekanbaru',
        latitude: 0.5071,
        longitude: 101.4478,
      },
    }));

  const poliUmum = await prisma.poli.upsert({
    where: { faskesId_name: { faskesId: faskes.id, name: 'Poli Umum' } },
    update: {},
    create: { faskesId: faskes.id, name: 'Poli Umum' },
  });
  await prisma.poli.upsert({
    where: { faskesId_name: { faskesId: faskes.id, name: 'Poli Gigi' } },
    update: {},
    create: { faskesId: faskes.id, name: 'Poli Gigi' },
  });

  const upsertUser = (name: string, email: string, role: 'ADMIN' | 'DOKTER' | 'RESEPSIONIS') =>
    prisma.user.upsert({ where: { email }, update: {}, create: { name, email, password, role } });

  await upsertUser('Admin', 'admin@ranah.test', 'ADMIN');
  const dokter = await upsertUser('dr. Budi', 'dokter@ranah.test', 'DOKTER');
  const resep = await upsertUser('Siti Resepsionis', 'resepsionis@ranah.test', 'RESEPSIONIS');

  // Dokter selalu di Poli Umum, resepsionis di faskes yang sama
  await prisma.doctorProfile.upsert({
    where: { userId: dokter.id },
    update: { faskesId: faskes.id, poliId: poliUmum.id },
    create: { userId: dokter.id, faskesId: faskes.id, poliId: poliUmum.id },
  });
  await prisma.staffProfile.upsert({
    where: { userId: resep.id },
    update: { faskesId: faskes.id },
    create: { userId: resep.id, faskesId: faskes.id },
  });

  console.log('Seed selesai (password semua akun: password123)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
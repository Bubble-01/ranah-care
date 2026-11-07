import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../utils/api-error';
import { todayWIB } from '../../utils/date';

async function doctorProfile(userId: string) {
  const p = await prisma.doctorProfile.findUnique({ where: { userId } });
  if (!p) throw new ApiError(403, 'Akun dokter belum terhubung ke poli');
  return p;
}

const recordSelect = {
  id: true,
  physicalExam: true,
  diagnosis: true,
  prescription: true,
  notes: true,
  createdAt: true,
  doctor: { select: { name: true } },
  queue: {
    select: {
      queueDate: true,
      faskes: { select: { name: true } },
      poli: { select: { name: true } },
    },
  },
} satisfies Prisma.MedicalRecordSelect;

export const medicalRecordService = {
  async create(
    doctorUserId: string,
    input: { queueId: string; physicalExam?: string; diagnosis: string; prescription?: string; notes?: string },
  ) {
    const doctor = await doctorProfile(doctorUserId);

    const queue = await prisma.queue.findFirst({
      where: { id: input.queueId, poliId: doctor.poliId },
    });
    if (!queue) throw new ApiError(404, 'Antrean tidak ditemukan di poli Anda');
    if (queue.status !== 'CALLED' && queue.status !== 'IN_CONSULTATION') {
      throw new ApiError(409, 'Pasien harus dipanggil dulu sebelum rekam medis diisi');
    }

    try {
      // Rekam medis + status DONE disimpan bersamaan: keduanya berhasil atau keduanya batal
      return await prisma.$transaction(async (tx) => {
        const record = await tx.medicalRecord.create({
          data: {
            queueId: queue.id,
            patientId: queue.patientId,
            doctorId: doctorUserId,
            physicalExam: input.physicalExam,
            diagnosis: input.diagnosis,
            prescription: input.prescription,
            notes: input.notes,
          },
        });
        await tx.queue.update({
          where: { id: queue.id },
          data: { status: 'DONE', finishedAt: new Date() },
        });
        return record;
      });
    } catch (err) {
      // queueId bersifat unique -> aman dari klik ganda
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ApiError(409, 'Rekam medis untuk antrean ini sudah ada');
      }
      throw err;
    }
  },

  mine(patientId: string) {
    return prisma.medicalRecord.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
      select: recordSelect,
    });
  },

  // Dokter melihat riwayat pasien, hanya jika pasien sedang di antrean poli dokter hari ini
  async patientHistory(doctorUserId: string, patientId: string) {
    const doctor = await doctorProfile(doctorUserId);
    const active = await prisma.queue.findFirst({
      where: {
        patientId,
        poliId: doctor.poliId,
        queueDate: todayWIB(),
        status: { in: ['CHECKED_IN', 'CALLED', 'IN_CONSULTATION'] },
      },
    });
    if (!active) {
      throw new ApiError(403, 'Anda hanya bisa melihat riwayat pasien yang sedang berada di antrean Anda');
    }
    return prisma.medicalRecord.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: recordSelect,
    });
  },
};
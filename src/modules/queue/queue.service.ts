import { Prisma, QueueStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { logger } from '../../config/logger';
import { ApiError } from '../../utils/api-error';
import { parseQueueDate, todayWIB } from '../../utils/date';
import { chatService } from '../chat/chat.service';

const ACTIVE: QueueStatus[] = ['BOOKED', 'CHECKED_IN', 'CALLED', 'IN_CONSULTATION'];

async function staffFaskesId(userId: string) {
  const p = await prisma.staffProfile.findUnique({ where: { userId } });
  if (!p) throw new ApiError(403, 'Akun resepsionis belum terhubung ke faskes');
  return p.faskesId;
}

async function doctorProfile(userId: string) {
  const p = await prisma.doctorProfile.findUnique({ where: { userId } });
  if (!p) throw new ApiError(403, 'Akun dokter belum terhubung ke poli');
  return p;
}

export const queueService = {
  // ============ PASIEN ============
  async book(
    patientId: string,
    input: { faskesId: string; poliId: string; chatSessionId?: string; complaint?: string; date?: string },
  ) {
    const queueDate = parseQueueDate(input.date);
    const { faskesId, poliId, chatSessionId, complaint } = input;

    const poli = await prisma.poli.findFirst({
      where: { id: poliId, faskesId, isActive: true, faskes: { isActive: true } },
    });
    if (!poli) throw new ApiError(404, 'Poli tidak ditemukan di faskes tersebut');

    if (chatSessionId) {
      const session = await prisma.chatSession.findFirst({ where: { id: chatSessionId, patientId } });
      if (!session) throw new ApiError(404, 'Sesi chat tidak ditemukan');
    }

    const duplicate = await prisma.queue.findFirst({
      where: { patientId, poliId, queueDate, status: { in: ACTIVE } },
    });
    if (duplicate) throw new ApiError(409, 'Anda sudah punya antrean aktif di poli ini pada tanggal tersebut');

    // Ringkasan chat untuk dokter (Continuity of Care). Gagal tidak boleh membatalkan booking.
    if (chatSessionId) {
      try {
        await chatService.summarize(patientId, chatSessionId);
      } catch (err) {
        logger.warn(err, 'Gagal membuat ringkasan chat, booking tetap dilanjutkan');
      }
    }

    // Nomor antrean dibuat di dalam transaksi. Jika dua pasien mendapat nomor sama,
    // unique constraint (poliId, queueDate, queueNumber) menolak salah satunya -> ulangi.
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        return await prisma.$transaction(async (tx) => {
          const last = await tx.queue.aggregate({
            where: { poliId, queueDate },
            _max: { queueNumber: true },
          });
          return tx.queue.create({
            data: {
              patientId,
              faskesId,
              poliId,
              chatSessionId,
              queueDate,
              complaint,
              queueNumber: (last._max.queueNumber ?? 0) + 1,
            },
            include: {
              faskes: { select: { name: true, address: true } },
              poli: { select: { name: true } },
            },
          });
        });
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') continue;
        throw err;
      }
    }
    throw new ApiError(503, 'Antrean sedang ramai, silakan coba lagi');
  },

  mine(patientId: string) {
    return prisma.queue.findMany({
      where: { patientId },
      orderBy: [{ queueDate: 'desc' }, { createdAt: 'desc' }],
      include: {
        faskes: { select: { name: true, address: true } },
        poli: { select: { name: true } },
      },
    });
  },

  async cancel(patientId: string, id: string) {
    const r = await prisma.queue.updateMany({
      where: { id, patientId, status: 'BOOKED' },
      data: { status: 'CANCELLED' },
    });
    if (r.count === 0) throw new ApiError(400, 'Antrean tidak ditemukan atau sudah tidak bisa dibatalkan');
    return prisma.queue.findUnique({ where: { id } });
  },

  // ============ RESEPSIONIS ============
  async listToday(staffUserId: string, status?: QueueStatus) {
    const faskesId = await staffFaskesId(staffUserId);
    return prisma.queue.findMany({
      where: { faskesId, queueDate: todayWIB(), ...(status && { status }) },
      orderBy: [{ poliId: 'asc' }, { queueNumber: 'asc' }],
      include: {
        patient: { select: { id: true, name: true, phone: true } },
        poli: { select: { name: true } },
      },
    });
  },

  async checkIn(staffUserId: string, id: string) {
    const faskesId = await staffFaskesId(staffUserId);
    const q = await prisma.queue.findFirst({ where: { id, faskesId } });
    if (!q) throw new ApiError(404, 'Antrean tidak ditemukan di faskes Anda');
    if (q.queueDate.getTime() !== todayWIB().getTime()) {
      throw new ApiError(400, 'Antrean ini bukan untuk hari ini');
    }

    // Update bersyarat: aman walau tombol check-in ditekan dua kali
    const r = await prisma.queue.updateMany({
      where: { id, status: 'BOOKED' },
      data: { status: 'CHECKED_IN', checkedInAt: new Date() },
    });
    if (r.count === 0) throw new ApiError(409, `Antrean sudah berstatus ${q.status}`);

    return prisma.queue.findUnique({
      where: { id },
      include: { patient: { select: { name: true } }, poli: { select: { name: true } } },
    });
  },

  // ============ DOKTER ============
  async doctorToday(doctorUserId: string) {
    const d = await doctorProfile(doctorUserId);
    return prisma.queue.findMany({
      where: {
        poliId: d.poliId,
        queueDate: todayWIB(),
        status: { in: ['CHECKED_IN', 'CALLED', 'IN_CONSULTATION'] },
      },
      orderBy: { queueNumber: 'asc' },
      include: {
        patient: { select: { id: true, name: true } },
        chatSession: { select: { title: true, urgency: true } },
      },
    });
  },

  async call(doctorUserId: string, id: string) {
    const d = await doctorProfile(doctorUserId);
    const q = await prisma.queue.findFirst({ where: { id, poliId: d.poliId } });
    if (!q) throw new ApiError(404, 'Antrean tidak ditemukan di poli Anda');

    const r = await prisma.queue.updateMany({
      where: { id, status: 'CHECKED_IN' },
      data: { status: 'CALLED', calledAt: new Date() },
    });
    if (r.count === 0) throw new ApiError(409, 'Pasien belum check-in atau sudah dipanggil');
    return prisma.queue.findUnique({ where: { id } });
  },

  // Continuity of Care: dokter membaca ringkasan + riwayat chat AI pasien
  async doctorDetail(doctorUserId: string, id: string) {
    const d = await doctorProfile(doctorUserId);
    const q = await prisma.queue.findFirst({
      where: { id, poliId: d.poliId },
      include: {
        patient: { select: { id: true, name: true, phone: true } },
        poli: { select: { name: true } },
        chatSession: {
          select: {
            title: true,
            summary: true,
            urgency: true,
            messages: {
              orderBy: { createdAt: 'asc' },
              select: { sender: true, content: true, createdAt: true },
            },
          },
        },
      },
    });
    if (!q) throw new ApiError(404, 'Antrean tidak ditemukan di poli Anda');
    // Privasi: data chat baru terbuka setelah pasien hadir
    if (q.status === 'BOOKED' || q.status === 'CANCELLED') {
      throw new ApiError(403, 'Data pasien baru bisa dibuka setelah pasien check-in');
    }
    return q;
  },
};
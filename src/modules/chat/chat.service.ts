import { prisma } from '../../lib/prisma';
import { gemini } from '../../lib/gemini';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { ApiError } from '../../utils/api-error';
import { haversineKm } from '../../utils/geo';
import { buildSymptomCheckerPrompt, SUMMARY_PROMPT } from './chat.prompt';
import { summaryResultSchema } from './chat.schema';

type Turn = { role: 'user' | 'model'; parts: { text: string }[] };

async function findNearbyFaskes(lat: number, lng: number, limit = 3) {
  const all = await prisma.faskes.findMany({
    where: { isActive: true },
    include: { polis: { where: { isActive: true }, select: { id: true, name: true } } },
  });

  return all
    .map((f) => ({
      id: f.id,
      name: f.name,
      type: f.type,
      address: f.address,
      distanceKm: Number(haversineKm(lat, lng, Number(f.latitude), Number(f.longitude)).toFixed(1)),
      polis: f.polis,
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit);
}

async function generate(contents: Turn[], systemInstruction: string, json = false) {
  try {
    const res = await gemini.models.generateContent({
      model: env.GEMINI_MODEL,
      contents,
      config: {
        systemInstruction,
        temperature: json ? 0.2 : 0.4,
        ...(json && { responseMimeType: 'application/json' }),
      },
    });
    const text = res.text?.trim();
    if (!text) throw new Error('Respons AI kosong');
    return text;
  } catch (err: any) {
    logger.error(err, 'Gemini error');
    if (err?.status === 429) throw new ApiError(429, 'AI sedang sibuk, coba lagi sebentar lagi');
    throw new ApiError(
    502,
    'Layanan AI sedang bermasalah, coba lagi nanti',
    env.NODE_ENV === 'development' ? err?.message : undefined,
    );
  }
}

export const chatService = {
  async sendMessage(
    patientId: string,
    input: { sessionId?: string; message: string; latitude?: number; longitude?: number },
  ) {
    // 1. Ambil sesi (milik pasien ini) + riwayat 30 pesan terakhir
    let sessionId = input.sessionId;
    let history: Turn[] = [];

    if (sessionId) {
      const session = await prisma.chatSession.findFirst({ where: { id: sessionId, patientId } });
      if (!session) throw new ApiError(404, 'Sesi chat tidak ditemukan');

      const rows = await prisma.chatMessage.findMany({
        where: { sessionId },
        orderBy: { createdAt: 'desc' },
        take: 30,
      });
      history = rows.reverse().map((m) => ({
        role: m.sender === 'USER' ? 'user' : 'model',
        parts: [{ text: m.content }],
      }));
    }

    // 2. Faskes terdekat (kalau lokasi dikirim) -> dimasukkan ke prompt
    const hasLocation = input.latitude !== undefined && input.longitude !== undefined;
    const nearby = hasLocation ? await findNearbyFaskes(input.latitude!, input.longitude!) : [];

    const faskesText = nearby.length
      ? nearby
          .map(
            (f, i) =>
              `${i + 1}. ${f.name} (${f.type}), ${f.distanceKm} km, poli: ${f.polis.map((p) => p.name).join(', ')}`,
          )
          .join('\n')
      : 'Lokasi pasien belum diketahui. Jika perlu rekomendasi faskes, minta pasien mengaktifkan lokasi.';

    // 3. Panggil Gemini SEBELUM menyimpan, supaya tidak ada pesan yatim jika AI gagal
    const userAt = new Date();
    const reply = await generate(
      [...history, { role: 'user', parts: [{ text: input.message }] }],
      buildSymptomCheckerPrompt(faskesText),
    );
    const aiAt = new Date();

    // 4. Simpan pesan pasien + balasan AI dalam satu transaksi
    sessionId = await prisma.$transaction(async (tx) => {
      const id =
        sessionId ??
        (
          await tx.chatSession.create({
            data: { patientId, title: input.message.slice(0, 60) },
          })
        ).id;

      await tx.chatMessage.create({
        data: { sessionId: id, sender: 'USER', content: input.message, createdAt: userAt },
      });
      await tx.chatMessage.create({
        data: { sessionId: id, sender: 'AI', content: reply, createdAt: aiAt },
      });
      await tx.chatSession.update({ where: { id }, data: { updatedAt: aiAt } });
      return id;
    });

    return { sessionId, reply, nearbyFaskes: nearby };
  },

  listSessions(patientId: string) {
    return prisma.chatSession.findMany({
      where: { patientId },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, title: true, urgency: true, createdAt: true, updatedAt: true },
    });
  },

  async getSession(patientId: string, id: string) {
    const session = await prisma.chatSession.findFirst({
      where: { id, patientId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!session) throw new ApiError(404, 'Sesi chat tidak ditemukan');
    return session;
  },

  // Dipanggil saat pasien mau booking -> ringkasan untuk dokter (Continuity of Care)
  async summarize(patientId: string, id: string) {
    const session = await this.getSession(patientId, id);
    if (session.messages.length === 0) throw new ApiError(400, 'Belum ada percakapan untuk diringkas');

    const transcript = session.messages
      .map((m) => `${m.sender === 'USER' ? 'Pasien' : 'AI'}: ${m.content}`)
      .join('\n');

    const raw = await generate([{ role: 'user', parts: [{ text: transcript }] }], SUMMARY_PROMPT, true);

    const parsed = summaryResultSchema.safeParse(JSON.parse(raw.replace(/```json|```/g, '').trim()));
    if (!parsed.success) throw new ApiError(502, 'Gagal membuat ringkasan, coba lagi');

    return prisma.chatSession.update({
      where: { id },
      data: parsed.data,
      select: { id: true, title: true, summary: true, urgency: true },
    });
  },
};
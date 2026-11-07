import { ApiError } from './api-error';

const DAY_MS = 24 * 60 * 60 * 1000;
const toUtcDate = (s: string) => new Date(`${s}T00:00:00.000Z`);

// "Hari ini" menurut WIB, disimpan sebagai tanggal (00:00 UTC) agar cocok dengan kolom DATE
export const todayWIB = () =>
  toUtcDate(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }));

export function parseQueueDate(input?: string) {
  const today = todayWIB();
  if (!input) return today;

  const date = toUtcDate(input);
  if (Number.isNaN(date.getTime())) throw new ApiError(400, 'Format tanggal tidak valid (YYYY-MM-DD)');
  if (date < today) throw new ApiError(400, 'Tanggal booking tidak boleh di masa lalu');
  if (date.getTime() - today.getTime() > 7 * DAY_MS) {
    throw new ApiError(400, 'Booking maksimal 7 hari ke depan');
  }
  return date;
}
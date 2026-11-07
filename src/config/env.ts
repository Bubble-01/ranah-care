import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL wajib diisi'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET minimal 16 karakter'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY wajib diisi'),
  GEMINI_MODEL: z.string().default('gemini-3.5-flash'),
  GEMINI_FALLBACK_MODEL: z.string().default('gemini-3.5-flash'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Konfigurasi .env tidak valid:', z.flattenError(parsed.error).fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
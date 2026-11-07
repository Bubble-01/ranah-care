import app from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { prisma } from './lib/prisma';

async function bootstrap() {
  try {
    await prisma.$connect();
    logger.info('✅ Terhubung ke database MySQL (XAMPP)');

    const server = app.listen(env.PORT, () => {
      logger.info(`🚀 Server berjalan di http://localhost:${env.PORT}/api/v1`);
    });

    const shutdown = async (signal: string) => {
      logger.warn(`${signal} diterima, mematikan server...`);
      server.close(async () => {
        await prisma.$disconnect();
        logger.info('Koneksi database ditutup. Sampai jumpa!');
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    logger.fatal(error, '❌ Gagal terhubung ke database. Pastikan MySQL di XAMPP sudah Start.');
    process.exit(1);
  }
}

bootstrap();
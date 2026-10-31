import net from 'net';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { app } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { prisma } from './config/prisma.js';

function checkPort(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(800);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, '127.0.0.1');
  });
}

async function ensureDatabase(): Promise<void> {
  if (env.DATABASE_URL.includes(':5433')) {
    const isUp = await checkPort(5433);
    if (!isUp) {
      const pgDataDir = path.resolve(process.cwd(), 'pgdata');
      if (fs.existsSync(pgDataDir)) {
        logger.info('Auto-starting local PostgreSQL on port 5433...');
        const pgCtl = 'C:\\Program Files\\PostgreSQL\\18\\bin\\pg_ctl.exe';
        if (fs.existsSync(pgCtl)) {
          exec(`"${pgCtl}" -D "${pgDataDir}" -o "-p 5433" start`);
          await new Promise((r) => setTimeout(r, 1500));
        }
      }
    }
  }
}

async function startServer() {
  await ensureDatabase();

  const server = app.listen(env.PORT, () => {
    logger.info(`🎵 [mq API Server] running on http://localhost:${env.PORT}`);
    logger.info(`📖 [Swagger Docs] available at http://localhost:${env.PORT}/api/docs`);
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      logger.error(`❌ Port ${env.PORT} is already in use by another process. Please terminate it or set a different PORT in .env`);
      process.exit(1);
    } else {
      logger.error({ err }, 'Server error');
    }
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Gracefully shutting down...`);
    server.close(async () => {
      logger.info('HTTP server closed.');
      await prisma.$disconnect();
      logger.info('Database connection closed.');
      process.exit(0);
    });

    setTimeout(() => {
      logger.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

startServer().catch((err) => {
  logger.error({ err }, 'Failed to start server');
  process.exit(1);
});

import type { Server } from 'http';
import app from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import './config/db';
import { ensureFoundationSeed } from './modules/foundation/seed';

let server: Server | null = null;

const start = async () => {
  try {
    await ensureFoundationSeed();
    server = app.listen(env.PORT, () => {
      logger.info(`Server listening on port ${env.PORT}`);
    });
  } catch (error) {
    logger.error({ error }, 'Failed to start server');
    process.exit(1);
  }
};

start();

const shutdown = () => {
  logger.info('Shutting down server');
  server?.close(() => {
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);


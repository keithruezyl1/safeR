import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

export const prisma = new PrismaClient();

prisma
  .$connect()
  .then(() => logger.info('Connected to Postgres via Prisma'))
  .catch((error: unknown) => {
    logger.error({ error }, 'Unable to connect to Postgres');
    process.exit(1);
  });


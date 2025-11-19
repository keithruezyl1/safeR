import { EscrowState } from '@prisma/client';
import { prisma } from '../../config/db';
import { logger } from '../../config/logger';
import { ESCROW_SINGLE_ID, SEED_DATA } from './constants';

export const ensureFoundationSeed = async () => {
  await prisma.$transaction(async (tx) => {
    const buyer = await tx.user.upsert({
      where: { gcashHandle: SEED_DATA.buyer.gcashHandle },
      update: {},
      create: {
        name: SEED_DATA.buyer.name,
        gcashHandle: SEED_DATA.buyer.gcashHandle,
        mockBalancePhp: SEED_DATA.buyer.initialBalance,
      },
    });

    const seller = await tx.user.upsert({
      where: { gcashHandle: SEED_DATA.seller.gcashHandle },
      update: {},
      create: {
        name: SEED_DATA.seller.name,
        gcashHandle: SEED_DATA.seller.gcashHandle,
        mockBalancePhp: SEED_DATA.seller.initialBalance,
      },
    });

    await tx.escrow.upsert({
      where: { id: ESCROW_SINGLE_ID },
      update: {
        blockchainEnabled: true,
      },
      create: {
        id: ESCROW_SINGLE_ID,
        buyerId: buyer.id,
        sellerId: seller.id,
        amount: 0,
        state: EscrowState.CREATED,
        blockchainEnabled: true,
      },
    });
  });

  logger.info('Foundation seed ready');
};


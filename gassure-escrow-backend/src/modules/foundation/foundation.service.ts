import { EscrowState, Prisma } from '@prisma/client';
import { prisma } from '../../config/db';
import { AppError } from '../../common/errors/AppError';
import { BlockchainService } from '../blockchain/blockchain.service';
import { logger } from '../../config/logger';
import { EVENT_ACTIONS, ESCROW_SINGLE_ID, SEED_DATA } from './constants';

const escrowWithRelations = Prisma.validator<Prisma.EscrowDefaultArgs>()({
  include: { buyer: true, seller: true },
});

type EscrowWithRelations = Prisma.EscrowGetPayload<typeof escrowWithRelations>;

type EventContext = {
  blockchainEnabled: boolean;
  eventId: string;
  payload: Prisma.JsonObject;
  memo: {
    escrowId: string;
    action: string;
    amount: number;
    buyerId: string;
    sellerId: string;
    timestamp: string;
  };
};

const formatState = (escrow: EscrowWithRelations) => ({
  blockchainEnabled: escrow.blockchainEnabled,
  escrow: {
    id: escrow.id,
    state: escrow.state,
    amount: escrow.amount,
  },
  buyer: {
    id: escrow.buyer.id,
    name: escrow.buyer.name,
    balancePhp: escrow.buyer.mockBalancePhp,
  },
  seller: {
    id: escrow.seller.id,
    name: escrow.seller.name,
    balancePhp: escrow.seller.mockBalancePhp,
  },
});

const getEscrowOrThrow = async (
  client: Prisma.TransactionClient | typeof prisma = prisma
): Promise<EscrowWithRelations> => {
  const escrow = await client.escrow.findUnique({
    where: { id: ESCROW_SINGLE_ID },
    ...escrowWithRelations,
  });
  if (!escrow) {
    throw new AppError('Escrow not initialized', 500);
  }
  return escrow;
};

const recordEvent = async (
  client: Prisma.TransactionClient,
  escrow: EscrowWithRelations,
  action: string,
  actor: string | null,
  details: Prisma.JsonObject,
  amountOverride?: number
): Promise<EventContext> => {
  const payload: Prisma.JsonObject = {
    ...details,
    escrowState: escrow.state,
    buyerBalancePhp: escrow.buyer.mockBalancePhp,
    sellerBalancePhp: escrow.seller.mockBalancePhp,
    timestamp: new Date().toISOString(),
  };

  const event = await client.escrowEvent.create({
    data: {
      escrowId: escrow.id,
      action,
      actor: actor ?? undefined,
      payload,
    },
  });

  return {
    blockchainEnabled: escrow.blockchainEnabled,
    eventId: event.id,
    payload,
    memo: {
      escrowId: escrow.id,
      action,
      amount: amountOverride ?? escrow.amount,
      buyerId: escrow.buyerId,
      sellerId: escrow.sellerId,
      timestamp: new Date().toISOString(),
    },
  };
};

const logBlockchainEvents = async (events: EventContext[]) => {
  await Promise.all(
    events.map(async (ctx) => {
      if (!ctx.blockchainEnabled) {
        return;
      }
      try {
        const result = await BlockchainService.logEventOnChain(ctx.memo);
        await prisma.escrowEvent.update({
          where: { id: ctx.eventId },
          data: {
            solanaSignature: result.signature,
            payload: {
              ...(ctx.payload as Prisma.JsonObject),
              blockchain: {
                hash: result.hash,
                txId: result.txId,
                signature: result.signature,
              },
            },
          },
        });
      } catch (error) {
        logger.error(
          { error },
          `Failed to log ${ctx.memo.action} on Solana devnet`
        );
        await prisma.escrowEvent.update({
          where: { id: ctx.eventId },
          data: {
            payload: {
              ...(ctx.payload as Prisma.JsonObject),
              blockchainError: (error as Error).message,
            },
          },
        });
      }
    })
  );
};

export const FoundationService = {
  async getState() {
    const escrow = await getEscrowOrThrow();
    return formatState(escrow);
  },

  async toggleBlockchain(enabled: boolean) {
    const escrow = await getEscrowOrThrow();
    if (escrow.state !== EscrowState.CREATED) {
      throw new AppError(
        'Cannot toggle blockchain mode during active escrow transaction.',
        400
      );
    }

    const updated = await prisma.escrow.update({
      where: { id: ESCROW_SINGLE_ID },
      data: { blockchainEnabled: enabled },
      ...escrowWithRelations,
    });

    return { blockchainEnabled: updated.blockchainEnabled };
  },

  async fundEscrow(amount: number) {
    const { escrow, events } = await prisma.$transaction(async (tx) => {
      const currentEscrow = await getEscrowOrThrow(tx);
      if (currentEscrow.state !== EscrowState.CREATED) {
        throw new AppError('Escrow must be in CREATED state to fund.', 400);
      }
      if (amount > currentEscrow.buyer.mockBalancePhp) {
        throw new AppError('Insufficient buyer balance.', 400);
      }

      await tx.user.update({
        where: { id: currentEscrow.buyerId },
        data: { mockBalancePhp: { decrement: amount } },
      });

      await tx.escrow.update({
        where: { id: ESCROW_SINGLE_ID },
        data: {
          amount,
          state: EscrowState.FUNDED,
        },
      });

      const updatedEscrow = await getEscrowOrThrow(tx);

      const event = await recordEvent(
        tx,
        updatedEscrow,
        EVENT_ACTIONS.FUNDED,
        'P1',
        { amount }
      );

      return { escrow: updatedEscrow, events: [event] };
    });

    await logBlockchainEvents(events);
    return formatState(escrow);
  },

  async confirmEscrow(actor: 'P1' | 'P2') {
    const { escrow, events } = await prisma.$transaction(async (tx) => {
      const currentEscrow = await getEscrowOrThrow(tx);

      if (currentEscrow.state === EscrowState.CREATED) {
        throw new AppError('Escrow must be funded before confirmations.', 400);
      }

      if (currentEscrow.state === EscrowState.RELEASED) {
        throw new AppError('Escrow already released.', 400);
      }

      const contexts: EventContext[] = [];

      const needsRelease =
        (actor === 'P1' && currentEscrow.state === EscrowState.P2_CONFIRMED) ||
        (actor === 'P2' && currentEscrow.state === EscrowState.P1_CONFIRMED);

      if (needsRelease) {
        const releaseAmount = currentEscrow.amount;

        await tx.user.update({
          where: { id: currentEscrow.sellerId },
          data: { mockBalancePhp: { increment: releaseAmount } },
        });

        await tx.escrow.update({
          where: { id: ESCROW_SINGLE_ID },
          data: {
            amount: 0,
            state: EscrowState.RELEASED,
          },
        });

        const postReleaseEscrow = await getEscrowOrThrow(tx);

        const confirmEvent = await recordEvent(
          tx,
          postReleaseEscrow,
          actor === 'P1'
            ? EVENT_ACTIONS.P1_CONFIRMED
            : EVENT_ACTIONS.P2_CONFIRMED,
          actor,
          { note: `${actor} confirmed escrow release` },
          releaseAmount
        );

        const releaseEvent = await recordEvent(
          tx,
          postReleaseEscrow,
          EVENT_ACTIONS.RELEASED,
          actor,
          { releasedAmount: releaseAmount },
          releaseAmount
        );

        contexts.push(confirmEvent, releaseEvent);
        return { escrow: postReleaseEscrow, events: contexts };
      }

      if (actor === 'P1' && currentEscrow.state !== EscrowState.FUNDED) {
        throw new AppError(
          'P1 can confirm only when escrow is FUNDED or P2 already confirmed.',
          400
        );
      }

      if (actor === 'P2' && currentEscrow.state !== EscrowState.FUNDED) {
        throw new AppError(
          'P2 can confirm only when escrow is FUNDED or P1 already confirmed.',
          400
        );
      }

      const nextState =
        actor === 'P1' ? EscrowState.P1_CONFIRMED : EscrowState.P2_CONFIRMED;

      await tx.escrow.update({
        where: { id: ESCROW_SINGLE_ID },
        data: { state: nextState },
      });

      const updatedEscrow = await getEscrowOrThrow(tx);

      const event = await recordEvent(
        tx,
        updatedEscrow,
        actor === 'P1'
          ? EVENT_ACTIONS.P1_CONFIRMED
          : EVENT_ACTIONS.P2_CONFIRMED,
        actor,
        { note: `${actor} confirmed escrow` },
        updatedEscrow.amount
      );

      contexts.push(event);

      return { escrow: updatedEscrow, events: contexts };
    });

    await logBlockchainEvents(events);
    return formatState(escrow);
  },

  async resetSystem() {
    const { escrow, events } = await prisma.$transaction(async (tx) => {
      const currentEscrow = await getEscrowOrThrow(tx);

      await tx.user.update({
        where: { id: currentEscrow.buyerId },
        data: { mockBalancePhp: SEED_DATA.buyer.initialBalance },
      });

      await tx.user.update({
        where: { id: currentEscrow.sellerId },
        data: { mockBalancePhp: SEED_DATA.seller.initialBalance },
      });

      await tx.escrow.update({
        where: { id: ESCROW_SINGLE_ID },
        data: {
          amount: 0,
          state: EscrowState.CREATED,
          blockchainEnabled: true,
        },
      });

      await tx.escrowEvent.deleteMany({
        where: { escrowId: ESCROW_SINGLE_ID },
      });

      const updatedEscrow = await getEscrowOrThrow(tx);

      const event = await recordEvent(
        tx,
        updatedEscrow,
        EVENT_ACTIONS.RESET,
        null,
        { note: 'System reset to initial state' },
        0
      );

      return { escrow: updatedEscrow, events: [event] };
    });

    await logBlockchainEvents(events);
    return formatState(escrow);
  },

  async fundAccount(target: 'P1' | 'P2', amount: number) {
    const { escrow, events } = await prisma.$transaction(async (tx) => {
      if (amount <= 0) {
        throw new AppError('Amount must be greater than zero', 400);
      }

      const currentEscrow = await getEscrowOrThrow(tx);
      const userId = target === 'P1' ? currentEscrow.buyerId : currentEscrow.sellerId;

      await tx.user.update({
        where: { id: userId },
        data: { mockBalancePhp: { increment: amount } },
      });

      const updatedEscrow = await getEscrowOrThrow(tx);

      const event = await recordEvent(
        tx,
        updatedEscrow,
        EVENT_ACTIONS.ACCOUNT_FUNDED,
        target,
        { amount, target },
        amount
      );

      return { escrow: updatedEscrow, events: [event] };
    });

    await logBlockchainEvents(events);
    return formatState(escrow);
  },

  async getLogs() {
    const events = await prisma.escrowEvent.findMany({
      where: { escrowId: ESCROW_SINGLE_ID },
      orderBy: { timestamp: 'desc' },
      take: 100,
    });
    return { events };
  },

  async clearLogs() {
    await prisma.escrowEvent.deleteMany({
      where: { escrowId: ESCROW_SINGLE_ID },
    });
    return { events: [] };
  },
};


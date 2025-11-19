import { Connection, Keypair, PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js';
import { prisma } from '../../config/db';
import { env } from '../../config/env';
import { logger } from '../../config/logger';

const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');

const connection = new Connection(env.SOLANA_RPC_URL, 'confirmed');

let signer: Keypair | null = null;

if (env.SOLANA_PRIVATE_KEY) {
  try {
    const secret = JSON.parse(env.SOLANA_PRIVATE_KEY) as number[];
    signer = Keypair.fromSecretKey(new Uint8Array(secret));
    logger.info('Solana signer initialized');
  } catch (error) {
    logger.warn({ error }, 'Failed to parse SOLANA_PRIVATE_KEY');
  }
} else {
  logger.warn('SOLANA_PRIVATE_KEY not provided, blockchain logging will be mocked');
}

type MemoPayload = {
  escrowId: string;
  action: string;
  amount: number;
  buyerId: string;
  sellerId: string;
  timestamp: string;
};

type BlockchainLogResult = {
  signature: string;
  txId: string;
  hash: string;
};

export const BlockchainService = {
  async logEventOnChain(payload: MemoPayload): Promise<BlockchainLogResult> {
    if (!signer) {
      throw new Error('SOLANA_PRIVATE_KEY is not configured');
    }

    const memo = JSON.stringify(payload);
    const instruction = new TransactionInstruction({
      keys: [],
      programId: MEMO_PROGRAM_ID,
      data: Buffer.from(memo, 'utf8'),
    });

    const latestBlockhash = await connection.getLatestBlockhash('confirmed');
    const transaction = new Transaction({
      feePayer: signer.publicKey,
      recentBlockhash: latestBlockhash.blockhash,
    }).add(instruction);

    const signature = await connection.sendTransaction(transaction, [signer], {
      skipPreflight: true,
    });

    await connection.confirmTransaction(
      {
        signature,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      },
      'confirmed'
    );

    return {
      signature,
      txId: signature,
      hash: latestBlockhash.blockhash,
    };
  },

  async listEvents(limit = 50) {
    return prisma.escrowEvent.findMany({
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  },

  async listEventsForEscrow(escrowId: string) {
    return prisma.escrowEvent.findMany({
      where: { escrowId },
      orderBy: { timestamp: 'desc' },
    });
  },
};


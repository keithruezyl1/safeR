export const ESCROW_SINGLE_ID = 'ESCROW_SINGLE';

export const SEED_DATA = {
  buyer: {
    name: 'Buyer Demo',
    gcashHandle: 'p1_demo_gcash',
    initialBalance: 200_000,
  },
  seller: {
    name: 'Seller Demo',
    gcashHandle: 'p2_demo_gcash',
    initialBalance: 0,
  },
} as const;

export const EVENT_ACTIONS = {
  FUNDED: 'ESCROW_FUNDED',
  P1_CONFIRMED: 'ESCROW_P1_CONFIRMED',
  P2_CONFIRMED: 'ESCROW_P2_CONFIRMED',
  RELEASED: 'ESCROW_RELEASED',
  RESET: 'SYSTEM_RESET',
  ACCOUNT_FUNDED: 'ACCOUNT_FUNDED',
} as const;


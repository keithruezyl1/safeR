import { z } from 'zod';

export const toggleBlockchainSchema = z.object({
  enabled: z.boolean(),
});

export const fundEscrowSchema = z.object({
  amount: z.coerce.number().int().positive('Amount must be greater than zero'),
});

export const confirmEscrowSchema = z.object({
  actor: z.enum(['P1', 'P2']),
});

export const fundAccountSchema = z.object({
  target: z.enum(['P1', 'P2']),
  amount: z.coerce.number().int().positive('Amount must be greater than zero'),
});

export type ToggleBlockchainInput = z.infer<typeof toggleBlockchainSchema>;
export type FundEscrowInput = z.infer<typeof fundEscrowSchema>;
export type ConfirmEscrowInput = z.infer<typeof confirmEscrowSchema>;
export type FundAccountInput = z.infer<typeof fundAccountSchema>;


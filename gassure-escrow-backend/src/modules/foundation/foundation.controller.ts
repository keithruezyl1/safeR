import type { Request, Response } from 'express';
import { FoundationService } from './foundation.service';
import {
  confirmEscrowSchema,
  fundEscrowSchema,
  fundAccountSchema,
  toggleBlockchainSchema,
} from './foundation.types';

export const getStateHandler = async (_req: Request, res: Response) => {
  const state = await FoundationService.getState();
  res.json(state);
};

export const toggleBlockchainHandler = async (req: Request, res: Response) => {
  const { enabled } = toggleBlockchainSchema.parse(req.body);
  const response = await FoundationService.toggleBlockchain(enabled);
  res.json(response);
};

export const fundEscrowHandler = async (req: Request, res: Response) => {
  const { amount } = fundEscrowSchema.parse(req.body);
  const state = await FoundationService.fundEscrow(amount);
  res.json(state);
};

export const confirmEscrowHandler = async (req: Request, res: Response) => {
  const { actor } = confirmEscrowSchema.parse(req.body);
  const state = await FoundationService.confirmEscrow(actor);
  res.json(state);
};

export const resetHandler = async (_req: Request, res: Response) => {
  const state = await FoundationService.resetSystem();
  res.json(state);
};

export const fundAccountHandler = async (req: Request, res: Response) => {
  const { target, amount } = fundAccountSchema.parse(req.body);
  const state = await FoundationService.fundAccount(target, amount);
  res.json(state);
};

export const getLogsHandler = async (_req: Request, res: Response) => {
  const logs = await FoundationService.getLogs();
  res.json(logs);
};

export const clearLogsHandler = async (_req: Request, res: Response) => {
  const logs = await FoundationService.clearLogs();
  res.json(logs);
};

